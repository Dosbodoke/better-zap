import { describe, expect, it, vi } from "vitest";
import { downloadMetaMedia as downloadWithGraphUrl } from "./download";
import {
  getMediaStorageKey,
  getMessageMedia,
  getMessageMediaPayload,
  getStoredMessageMedia,
} from "./message-media";

const bytes = new TextEncoder().encode("fake image bytes");
// sha256("fake image bytes")
const BYTES_SHA256_HEX = await sha256Hex(bytes);
const BYTES_SHA256_BASE64 = btoa(
  String.fromCharCode(...(BYTES_SHA256_HEX.match(/../g) ?? []).map((h) => parseInt(h, 16))),
);

async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data as BufferSource));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

const downloadMetaMedia = (input: Omit<Parameters<typeof downloadWithGraphUrl>[0], "graphUrl">) =>
  downloadWithGraphUrl({ graphUrl: "https://graph.facebook.com/v25.0", ...input });

type Route = (request: Request) => Response | Promise<Response>;

function createMetaFetch(routes: {
  lookup?: Route;
  download?: Route;
}) {
  const calls: Request[] = [];
  const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    calls.push(request);
    const url = new URL(request.url);
    if (url.hostname === "graph.facebook.com") {
      return (
        routes.lookup?.(request) ??
        Response.json({
          url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1",
          mime_type: "image/jpeg",
          sha256: BYTES_SHA256_HEX,
          file_size: bytes.byteLength,
          id: "media_1",
        })
      );
    }
    return routes.download?.(request) ?? new Response(bytes);
  });
  return { fetchImpl: fetchImpl as unknown as typeof fetch, calls };
}

describe("downloadMetaMedia", () => {
  it("ignores a hash with padding atob would reject instead of throwing", async () => {
    const { fetchImpl } = createMetaFetch({
      lookup: () =>
        Response.json({
          url: "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1",
          mime_type: "image/jpeg",
          sha256: "ab=",
        }),
    });

    const result = await downloadMetaMedia({
      mediaId: "media_1",
      accessToken: "token-1",
      fetch: fetchImpl,
    });

    expect(result.status).toBe("downloaded");
  });

  it("fails cleanly when the lookup JSON is null", async () => {
    const { fetchImpl } = createMetaFetch({ lookup: () => Response.json(null) });

    const result = await downloadMetaMedia({
      mediaId: "media_1",
      accessToken: "token-1",
      fetch: fetchImpl,
    });

    expect(result).toEqual({ status: "failed", error: "Media lookup returned no url" });
  });

  it("does not throw when cancelling a body rejects", async () => {
    const rejectingBody = () =>
      new ReadableStream({
        cancel() {
          throw new Error("cancel failed");
        },
      });
    const { fetchImpl } = createMetaFetch({
      download: () => new Response(rejectingBody(), { status: 404 }),
    });

    const result = await downloadMetaMedia({
      mediaId: "media_1",
      accessToken: "token-1",
      fetch: fetchImpl,
    });

    expect(result).toEqual({ status: "failed", error: "Media download failed: HTTP 404" });
  });

  it("returns a failed result when fetch throws synchronously", async () => {
    const result = await downloadMetaMedia({
      mediaId: "media_1",
      accessToken: "token-1",
      options: { retries: 0 },
      fetch: (() => {
        throw new Error("bad fetch");
      }) as unknown as typeof fetch,
    });

    expect(result).toMatchObject({ status: "failed" });
  });

  it("fails cleanly when the lookup response is not JSON", async () => {
    const { fetchImpl } = createMetaFetch({ lookup: () => new Response("<html>") });

    const result = await downloadMetaMedia({
      mediaId: "media_1",
      accessToken: "token-1",
      fetch: fetchImpl,
    });

    expect(result).toMatchObject({ status: "failed" });
    expect(result.status === "failed" && result.error).toMatch(/invalid JSON/);
  });

  it("looks up the media id and downloads with the bearer token", async () => {
    const { fetchImpl, calls } = createMetaFetch({});

    const result = await downloadMetaMedia({
      mediaId: "media_1",
      accessToken: "token-1",
      fetch: fetchImpl,
    });

    expect(result).toMatchObject({
      status: "downloaded",
      contentType: "image/jpeg",
      size: bytes.byteLength,
      sha256: BYTES_SHA256_HEX,
    });
    expect(calls.map((call) => call.url)).toEqual([
      "https://graph.facebook.com/v25.0/media_1",
      "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=1",
    ]);
    for (const call of calls) {
      expect(call.headers.get("authorization")).toBe("Bearer token-1");
    }
  });

  it("uses an access token override", async () => {
    const { fetchImpl, calls } = createMetaFetch({});
    await downloadMetaMedia({
      mediaId: "media_1",
      accessToken: "token-1",
      options: { accessToken: "token-2" },
      fetch: fetchImpl,
    });
    expect(calls[0]?.headers.get("authorization")).toBe("Bearer token-2");
  });

  it("requests a new URL once when the download returns 404", async () => {
    let downloads = 0;
    const { fetchImpl, calls } = createMetaFetch({
      download: () => {
        downloads += 1;
        return downloads === 1 ? new Response("gone", { status: 404 }) : new Response(bytes);
      },
    });

    const result = await downloadMetaMedia({ mediaId: "media_1", accessToken: "t", fetch: fetchImpl });

    expect(result.status).toBe("downloaded");
    expect(calls).toHaveLength(4);
  });

  it("fails after the second 404", async () => {
    const { fetchImpl, calls } = createMetaFetch({
      download: () => new Response("gone", { status: 404 }),
    });

    const result = await downloadMetaMedia({ mediaId: "media_1", accessToken: "t", fetch: fetchImpl });

    expect(result).toEqual({ status: "failed", error: "Media download failed: HTTP 404" });
    expect(calls).toHaveLength(4);
  });

  it("reports Graph API errors from the lookup", async () => {
    const { fetchImpl } = createMetaFetch({
      lookup: () =>
        Response.json(
          { error: { message: "Unsupported get request", code: 100 } },
          { status: 400 },
        ),
    });

    const result = await downloadMetaMedia({ mediaId: "media_1", accessToken: "t", fetch: fetchImpl });

    expect(result).toEqual({
      status: "failed",
      error: "Media lookup failed: HTTP 400: Unsupported get request",
    });
  });

  it("retries 5xx responses", async () => {
    let lookups = 0;
    const { fetchImpl } = createMetaFetch({
      lookup: () => {
        lookups += 1;
        return lookups === 1
          ? new Response("down", { status: 503 })
          : Response.json({ url: "https://cdn.example/file", mime_type: "image/jpeg" });
      },
    });

    const result = await downloadMetaMedia({
      mediaId: "media_1",
      accessToken: "t",
      options: { retries: 1 },
      fetch: fetchImpl,
    });
    expect(result.status).toBe("downloaded");
  });

  it("returns network errors as failures", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error("socket hang up"));
    const result = await downloadMetaMedia({
      mediaId: "media_1",
      accessToken: "t",
      options: { retries: 0 },
      fetch: fetchImpl as unknown as typeof fetch,
    });
    expect(result).toEqual({ status: "failed", error: "Media lookup failed: socket hang up" });
  });

  it("skips files whose reported size is over maxBytes", async () => {
    const { fetchImpl, calls } = createMetaFetch({
      lookup: () =>
        Response.json({ url: "https://cdn.example/file", mime_type: "video/mp4", file_size: 2048 }),
    });

    const result = await downloadMetaMedia({
      mediaId: "media_1",
      accessToken: "t",
      options: { maxBytes: 1024 },
      fetch: fetchImpl,
    });

    expect(result).toEqual({ status: "too_large", size: 2048, maxBytes: 1024 });
    expect(calls).toHaveLength(1);
  });

  it("stops reading a body that grows past maxBytes", async () => {
    const { fetchImpl } = createMetaFetch({
      lookup: () => Response.json({ url: "https://cdn.example/file", mime_type: "video/mp4" }),
      download: () =>
        new Response(
          new ReadableStream({
            pull(controller) {
              controller.enqueue(new Uint8Array(512));
            },
          }),
        ),
    });

    const result = await downloadMetaMedia({
      mediaId: "media_1",
      accessToken: "t",
      options: { maxBytes: 1024 },
      fetch: fetchImpl,
    });

    expect(result).toEqual({ status: "too_large", size: undefined, maxBytes: 1024 });
  });

  it("accepts a base64 SHA-256 from the webhook", async () => {
    const { fetchImpl } = createMetaFetch({
      lookup: () => Response.json({ url: "https://cdn.example/file", mime_type: "image/jpeg" }),
    });

    const result = await downloadMetaMedia({
      mediaId: "media_1",
      accessToken: "t",
      options: { expectedSha256: BYTES_SHA256_BASE64 },
      fetch: fetchImpl,
    });
    expect(result.status).toBe("downloaded");
  });

  it("fails on a SHA-256 mismatch", async () => {
    const { fetchImpl } = createMetaFetch({
      lookup: () =>
        Response.json({
          url: "https://cdn.example/file",
          mime_type: "image/jpeg",
          sha256: "0".repeat(64),
        }),
    });

    const result = await downloadMetaMedia({ mediaId: "media_1", accessToken: "t", fetch: fetchImpl });
    expect(result).toMatchObject({ status: "failed", error: expect.stringContaining("SHA-256 mismatch") });
  });

  it("ignores a hash that is neither hex nor base64 SHA-256", async () => {
    const { fetchImpl } = createMetaFetch({
      lookup: () => Response.json({ url: "https://cdn.example/file", sha256: "fixture-media-sha256" }),
    });

    const result = await downloadMetaMedia({ mediaId: "media_1", accessToken: "t", fetch: fetchImpl });
    expect(result).toMatchObject({ status: "downloaded", contentType: "application/octet-stream" });
  });
});

describe("media helpers", () => {
  it("reads the media object of storable message types", () => {
    expect(
      getMessageMediaPayload({
        type: "document",
        document: { id: "doc_1", mime_type: "application/pdf", filename: "a.pdf", sha256: "h" },
      }),
    ).toEqual({ type: "document", id: "doc_1", mimeType: "application/pdf", filename: "a.pdf", sha256: "h" });
    expect(getMessageMediaPayload({ type: "sticker", sticker: { id: "s_1" } })?.id).toBe("s_1");
    expect(getMessageMediaPayload({ type: "text", text: { body: "hi" } })).toBeUndefined();
    expect(getMessageMediaPayload({ type: "media_placeholder" })).toBeUndefined();
    expect(getMessageMediaPayload({ type: "image" })).toBeUndefined();
  });

  it("builds stable, encoded storage keys", () => {
    expect(getMediaStorageKey({ phoneNumberId: "123", waMessageId: "wamid.ab/c+d==" })).toBe(
      "whatsapp/123/wamid.ab%2Fc%2Bd%3D%3D",
    );
    expect(getMediaStorageKey({ waMessageId: "wamid.1" })).toBe("whatsapp/unknown/wamid.1");
  });

  it("reads metadata.media from records", () => {
    const media = { status: "stored", key: "k", contentType: "image/jpeg", size: 1, sha256: "h", mediaId: "m", storedAt: "t" };
    expect(getStoredMessageMedia({ metadata: { media } })).toEqual(media);
    expect(getMessageMedia({ metadata: { media: { status: "failed", error: "x" } } })?.status).toBe("failed");
    expect(getStoredMessageMedia({ metadata: { media: { status: "failed" } } })).toBeUndefined();
    expect(getMessageMedia({ metadata: { media: "nope" } })).toBeUndefined();
    expect(getMessageMedia(null)).toBeUndefined();
  });
});
