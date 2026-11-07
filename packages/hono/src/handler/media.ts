import type { Context } from "hono";
import {
  clampSignedUrlExpiry,
  getStoredMessageMedia,
  serializeError,
  tryCatch,
} from "better-zap";
import type { BetterZapEnv } from "./types";

/** Stored files never change, so browsers may cache them for a year. */
const IMMUTABLE_CACHE_CONTROL = "private, max-age=31536000, immutable";

/** Default lifetime of the presigned URL the route redirects to. */
export const DEFAULT_MEDIA_SIGNED_URL_EXPIRES_IN = 3600;

/**
 * Types shown inline. Everything else (HTML, SVG, scripts, unknown files) is
 * served as a download with a sandbox CSP, so a file sent by a contact can't
 * run script on the app's origin.
 */
const INLINE_TYPES = /^(image\/(jpeg|png|gif|webp|avif)|audio\/[\w.+-]+|video\/[\w.+-]+|application\/pdf)$/i;

/**
 * `GET {basePath}/media/:waMessageId`
 *
 * Serves the stored media of a message. Redirects inline-safe types to a
 * presigned URL when the `MediaStore` has `getSignedUrl`; streams everything
 * else.
 */
export async function handleGetMedia(c: Context<BetterZapEnv>) {
  const mediaStore = c.get("mediaStore");
  const waMessageId = c.req.param("waMessageId");
  if (!mediaStore || !waMessageId) return notFound(c);

  const [record, recordError] = await tryCatch(() =>
    c.get("store").getMessageByWaId(waMessageId),
  );
  if (recordError) return internalError(c, recordError);

  const media = getStoredMessageMedia(record);
  if (!media) return notFound(c);

  // Only inline-safe types redirect: the bucket would serve anything else
  // (HTML, SVG) without the download headers set below.
  const getSignedUrl = mediaStore.getSignedUrl?.bind(mediaStore);
  if (getSignedUrl && isInlineType(media.contentType)) {
    const expiresIn = clampSignedUrlExpiry(
      c.get("mediaSignedUrlExpiresIn") ?? DEFAULT_MEDIA_SIGNED_URL_EXPIRES_IN,
    );
    const [url, signError] = await tryCatch(() => getSignedUrl(media.key, expiresIn));
    if (signError) return internalError(c, signError);

    // Cache the redirect for less time than the signed URL lives.
    const maxAge = Math.max(0, Math.floor(expiresIn - 60));
    return new Response(null, {
      status: 302,
      headers: { Location: url, "Cache-Control": `private, max-age=${maxAge}` },
    });
  }

  const etag = `"${media.sha256}"`;
  if (c.req.header("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, "Cache-Control": IMMUTABLE_CACHE_CONTROL },
    });
  }

  const [object, getError] = await tryCatch(() => mediaStore.get(media.key));
  if (getError) return internalError(c, getError);
  if (!object) return notFound(c);

  const contentType = object.contentType || media.contentType;
  const inline = isInlineType(contentType);
  const headers = new Headers({
    "Content-Type": contentType,
    "Cache-Control": IMMUTABLE_CACHE_CONTROL,
    ETag: etag,
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": contentDisposition(
      inline ? "inline" : "attachment",
      media.filename,
    ),
  });
  if (!inline) headers.set("Content-Security-Policy", "default-src 'none'; sandbox");
  if (object.size !== undefined) headers.set("Content-Length", String(object.size));

  return new Response(object.body, { status: 200, headers });
}

function isInlineType(contentType: string): boolean {
  return INLINE_TYPES.test(contentType.split(";")[0]?.trim() ?? "");
}

function notFound(c: Context<BetterZapEnv>) {
  return c.json({ error: "Media not found" }, 404);
}

function internalError(c: Context<BetterZapEnv>, error: Error) {
  c.get("logger").error("media.get_error", serializeError(error));
  return c.json({ error: "Internal error fetching media" }, 500);
}

function contentDisposition(type: "inline" | "attachment", filename?: string) {
  if (!filename) {
    return type;
  }
  const fallback = filename.replace(/[^\x20-\x7e]|["\\]/g, "_");
  return `${type}; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(filename).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)}`;
}
