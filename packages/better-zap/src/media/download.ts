import { bytesToHex, sha256Hex } from "../utils/hash";
import { discardBody, fetchWithRetry, toNumber } from "../utils/http";
import { asRecord } from "../utils/record";
import { type Result, tryCatch } from "../utils/result";
import {
  DEFAULT_MEDIA_MAX_BYTES,
  type MediaDownloadOptions,
  type MediaDownloadResult,
} from "./types";

type DownloadContext = {
  lookupUrl: string;
  headers: Record<string, string>;
  maxBytes: number;
  retries: number;
  expectedSha256?: string;
  fetch: typeof fetch;
};

/** Returned by one download pass when the 5-minute URL expired before use. */
const URL_EXPIRED = Symbol("url_expired");

class TooLargeError extends Error {
  constructor(readonly size: number | undefined) {
    super("too_large");
  }
}

/**
 * Downloads a WhatsApp media file:
 * 1. `GET /{media-id}` returns a download URL that expires after 5 minutes.
 * 2. The URL is fetched with the same bearer token. On 404 a new URL is
 *    requested once.
 *
 * Never throws. Files over `maxBytes` are not read.
 */
export async function downloadMetaMedia(input: {
  mediaId: string;
  accessToken: string;
  /** Versioned Graph API base, e.g. `https://graph.facebook.com/v25.0`. */
  graphUrl: string;
  options?: MediaDownloadOptions;
  fetch?: typeof fetch;
}): Promise<MediaDownloadResult> {
  // Every step reports its own errors; this guard keeps the "never throws"
  // promise for anything unexpected (e.g. a custom fetch that throws synchronously).
  const [result, error] = await tryCatch(() => download(input));
  if (error) return failed(`Media download failed: ${error.message}`);
  return result;
}

async function download(
  input: Parameters<typeof downloadMetaMedia>[0],
): Promise<MediaDownloadResult> {
  const token = input.options?.accessToken ?? input.accessToken;
  const context: DownloadContext = {
    lookupUrl: `${input.graphUrl}/${encodeURIComponent(input.mediaId)}`,
    headers: { Authorization: `Bearer ${token}` },
    maxBytes: input.options?.maxBytes ?? DEFAULT_MEDIA_MAX_BYTES,
    retries: input.options?.retries ?? 2,
    expectedSha256: input.options?.expectedSha256,
    fetch: input.fetch ?? fetch,
  };

  const first = await downloadOnce(context);
  if (first !== URL_EXPIRED) return first;

  const second = await downloadOnce(context);
  if (second !== URL_EXPIRED) return second;

  return failed("Media download failed: HTTP 404");
}

async function downloadOnce(
  context: DownloadContext,
): Promise<MediaDownloadResult | typeof URL_EXPIRED> {
  const { headers, maxBytes, retries } = context;

  const [lookup, lookupError] = await fetchWithRetry(
    () => context.fetch(context.lookupUrl, { method: "GET", headers }),
    { retries },
  );
  if (lookupError) return failed(`Media lookup failed: ${lookupError.message}`);
  if (!lookup.ok) return failed(`Media lookup failed: ${await describeError(lookup)}`);

  const [json, jsonError] = await tryCatch(() => lookup.json());
  if (jsonError) return failed(`Media lookup returned invalid JSON: ${jsonError.message}`);

  const info = asRecord(json);
  const fileUrl = info.url;
  if (typeof fileUrl !== "string" || !fileUrl) return failed("Media lookup returned no url");

  const reportedSize = toNumber(info.file_size);
  if (reportedSize !== undefined && reportedSize > maxBytes) {
    return { status: "too_large", size: reportedSize, maxBytes };
  }

  const [response, downloadError] = await fetchWithRetry(
    () => context.fetch(fileUrl, { method: "GET", headers }),
    { retries },
  );
  if (downloadError) return failed(`Media download failed: ${downloadError.message}`);

  if (response.status === 404) {
    await discardBody(response);
    return URL_EXPIRED;
  }
  if (!response.ok) {
    return failed(`Media download failed: ${await describeError(response)}`);
  }

  const [body, readError] = await readLimited(response, maxBytes);
  if (readError instanceof TooLargeError) {
    return { status: "too_large", size: readError.size ?? reportedSize, maxBytes };
  }
  if (readError) return failed(`Media download failed: ${readError.message}`);

  const sha256 = await sha256Hex(body);
  const expected = stringOrUndefined(info.sha256) ?? context.expectedSha256;
  if (expected && !sha256Matches(sha256, expected)) {
    return failed(`SHA-256 mismatch: expected ${expected}, got ${sha256}`);
  }

  return {
    status: "downloaded",
    body,
    contentType:
      stringOrUndefined(info.mime_type) ||
      response.headers.get("content-type") ||
      "application/octet-stream",
    size: body.byteLength,
    sha256,
  };
}

function failed(error: string): MediaDownloadResult {
  return { status: "failed", error };
}

function stringOrUndefined(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

async function describeError(response: Response): Promise<string> {
  const [data] = await tryCatch(
    () => response.json() as Promise<{ error?: { message?: string } }>,
  );
  const message = data?.error?.message;
  if (!message) return `HTTP ${response.status}`;
  return `HTTP ${response.status}: ${message}`;
}

/** Reads the body, stopping with a `TooLargeError` once it passes `maxBytes`. */
async function readLimited(
  response: Response,
  maxBytes: number,
): Promise<Result<ArrayBuffer>> {
  const declared = toNumber(response.headers.get("content-length"));
  if (declared !== undefined && declared > maxBytes) {
    await discardBody(response);
    return [null, new TooLargeError(declared)];
  }
  if (!response.body) return [new ArrayBuffer(0), null];

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  for (;;) {
    const [chunk, error] = await tryCatch(() => reader.read());
    if (error) return [null, error];
    if (chunk.done) break;

    total += chunk.value.byteLength;
    if (total > maxBytes) {
      await tryCatch(() => reader.cancel());
      return [null, new TooLargeError(declared)];
    }
    chunks.push(chunk.value);
  }

  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return [out.buffer, null];
}

/**
 * Meta's docs don't say whether the hash is hex or base64, so both are
 * accepted. Values that are neither (e.g. test fixtures) are ignored rather
 * than failing the download.
 */
function sha256Matches(actualHex: string, expected: string): boolean {
  const trimmed = expected.trim();
  if (/^[0-9a-f]{64}$/i.test(trimmed)) return trimmed.toLowerCase() === actualHex;

  const bytes = decodeBase64(trimmed);
  if (bytes?.length !== 32) return true;
  return bytesToHex(bytes) === actualHex;
}

/** Decodes standard or URL-safe base64. Returns `undefined` for anything else. */
function decodeBase64(value: string): Uint8Array | undefined {
  if (!/^[A-Za-z0-9+/_-]+={0,2}$/.test(value)) return undefined;

  const standard = value.replace(/-/g, "+").replace(/_/g, "/");
  // The two inputs atob rejects once the alphabet is valid (forgiving-base64):
  // padding on a length that isn't a multiple of 4, and 1 dangling character.
  if (standard.includes("=") && standard.length % 4 !== 0) return undefined;
  if (standard.replace(/=+$/, "").length % 4 === 1) return undefined;

  const binary = atob(standard);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
