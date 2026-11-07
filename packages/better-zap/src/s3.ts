/**
 * S3-compatible `MediaStore` for AWS S3, Cloudflare R2, MinIO and Backblaze B2.
 *
 * Uses `aws4fetch` for SigV4 signing over `fetch`, so it runs on Cloudflare
 * Workers, Node 20+, Deno and Bun without the AWS SDK.
 *
 * @example
 * ```ts
 * import { createS3MediaStore } from "better-zap/s3";
 *
 * const media = createS3MediaStore({
 *   endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
 *   bucket: "whatsapp-media",
 *   accessKeyId: env.R2_ACCESS_KEY_ID,
 *   secretAccessKey: env.R2_SECRET_ACCESS_KEY,
 * });
 * ```
 */

import { AwsClient } from "aws4fetch";
import {
  clampSignedUrlExpiry,
  type MediaStore,
  type MediaStoreObject,
  type MediaStorePutInfo,
} from "./media/types";
import { sha256Hex } from "./utils/hash";
import { discardBody, fetchWithRetry, toNumber } from "./utils/http";
import { tryCatch } from "./utils/result";

export type { MediaStore, MediaStoreObject, MediaStorePutInfo } from "./media/types";

export interface S3MediaStoreConfig {
  /**
   * S3 API endpoint, without the bucket. Examples:
   * - R2: `https://<account-id>.r2.cloudflarestorage.com`
   * - AWS: `https://s3.us-east-1.amazonaws.com` (optional for AWS when `region` is set)
   * - MinIO: `http://localhost:9000`
   * - B2: `https://s3.us-west-004.backblazeb2.com`
   */
  endpoint?: string;
  bucket: string;
  /**
   * Signing region. Defaults to `auto` for R2, the region in the host name for
   * AWS and B2, and `us-east-1` otherwise.
   */
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** For temporary AWS credentials. */
  sessionToken?: string;
  /**
   * Put the bucket in the path (`endpoint/bucket/key`) rather than the host
   * name (`bucket.endpoint/key`). Defaults to `false` for AWS endpoints and
   * `true` for everything else (R2, MinIO, B2).
   */
  forcePathStyle?: boolean;
  /** Prefix added to every key, e.g. `"prod/"`. */
  keyPrefix?: string;
  /**
   * Add `getSignedUrl`, so the media route redirects to a presigned bucket
   * URL rather than streaming the file through your server. Defaults to
   * `false`.
   */
  signedUrls?: boolean;
  /** Retries for network errors, 429 and 5xx responses. Defaults to 2. */
  retries?: number;
  /** Custom `fetch`, e.g. for tests. Defaults to the global `fetch`. */
  fetch?: typeof fetch;
}

export class S3MediaStoreError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = "S3MediaStoreError";
  }
}

export function createS3MediaStore(config: S3MediaStoreConfig): MediaStore {
  if (!config.bucket) {
    throw new TypeError("createS3MediaStore: bucket is required");
  }

  const endpoint = resolveEndpoint(config);
  const region = config.region ?? inferRegion(endpoint);
  const pathStyle = config.forcePathStyle ?? !isAwsHost(endpoint.hostname);
  const fetchImpl: (request: Request) => Promise<Response> =
    config.fetch ?? ((request) => fetch(request));
  const retries = config.retries ?? 2;
  const client = new AwsClient({
    accessKeyId: config.accessKeyId,
    secretAccessKey: config.secretAccessKey,
    sessionToken: config.sessionToken,
    service: "s3",
    region,
  });

  const objectUrl = (key: string): URL => {
    const fullKey = `${config.keyPrefix ?? ""}${key}`;
    const encodedKey = fullKey.split("/").map(encodeRfc3986).join("/");
    const url = new URL(endpoint.href);
    const basePath = url.pathname.replace(/\/+$/, "");
    if (pathStyle) {
      url.pathname = `${basePath}/${encodeRfc3986(config.bucket)}/${encodedKey}`;
      return url;
    }
    url.hostname = `${config.bucket}.${url.hostname}`;
    url.pathname = `${basePath}/${encodedKey}`;
    return url;
  };

  /** Signs and sends a request. Throws only when every attempt hit a network error. */
  const send = async (
    url: URL,
    init: { method: string; headers?: Record<string, string>; body?: ArrayBuffer },
  ): Promise<Response> => {
    const [response, error] = await fetchWithRetry(
      async () => fetchImpl(await client.sign(url.toString(), init)),
      { retries },
    );
    if (error) {
      throw new S3MediaStoreError(`S3 ${init.method} failed: ${error.message}`, 0);
    }
    return response;
  };

  const store: MediaStore = {
    async put(key, body, info: MediaStorePutInfo) {
      // S3 needs a Content-Length, so streams are read into memory first.
      const bytes =
        body instanceof ArrayBuffer ? body : await new Response(body).arrayBuffer();
      const headers: Record<string, string> = {
        "Content-Type": info.contentType || "application/octet-stream",
        // Sign the payload hash so the bucket rejects a corrupted upload.
        "X-Amz-Content-Sha256": await sha256Hex(bytes),
      };
      if (info.sha256) {
        headers["x-amz-meta-sha256"] = info.sha256;
      }

      const response = await send(objectUrl(key), {
        method: "PUT",
        headers,
        body: bytes,
      });
      if (!response.ok) {
        throw await toError("PUT", key, response);
      }
      await discardBody(response);
    },

    async get(key): Promise<MediaStoreObject | null> {
      const response = await send(objectUrl(key), { method: "GET" });
      if (response.status === 404) {
        await discardBody(response);
        return null;
      }
      if (!response.ok || !response.body) {
        throw await toError("GET", key, response);
      }

      return {
        body: response.body,
        contentType:
          response.headers.get("content-type") || "application/octet-stream",
        size: toNumber(response.headers.get("content-length")),
      };
    },

    async delete(key) {
      const response = await send(objectUrl(key), { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        throw await toError("DELETE", key, response);
      }
      await discardBody(response);
    },
  };

  if (config.signedUrls) {
    store.getSignedUrl = async (key, expiresInSeconds) => {
      const url = objectUrl(key);
      url.searchParams.set("X-Amz-Expires", String(clampSignedUrlExpiry(expiresInSeconds)));
      const signed = await client.sign(url.toString(), {
        method: "GET",
        aws: { signQuery: true },
      });
      return signed.url;
    };
  }

  return store;
}

function resolveEndpoint(config: S3MediaStoreConfig): URL {
  if (config.endpoint) {
    return new URL(config.endpoint);
  }
  if (config.region && config.region !== "auto") {
    return new URL(`https://s3.${config.region}.amazonaws.com`);
  }
  throw new TypeError(
    "createS3MediaStore: endpoint is required (or region, for AWS S3)",
  );
}

function isAwsHost(hostname: string): boolean {
  return /(^|\.)amazonaws\.com(\.cn)?$/.test(hostname);
}

function inferRegion(endpoint: URL): string {
  const host = endpoint.hostname;
  if (host.endsWith(".r2.cloudflarestorage.com")) {
    return "auto";
  }
  const aws = host.match(/(?:^|\.)s3[.-]([a-z0-9-]+)\.amazonaws\.com(?:\.cn)?$/);
  if (aws?.[1] && aws[1] !== "external-1" && aws[1] !== "accelerate") {
    return aws[1];
  }
  const b2 = host.match(/(?:^|\.)s3\.([a-z0-9-]+)\.backblazeb2\.com$/);
  if (b2?.[1]) {
    return b2[1];
  }
  return "us-east-1";
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

async function toError(
  method: string,
  key: string,
  response: Response,
): Promise<S3MediaStoreError> {
  const [text] = await tryCatch(() => response.text());
  const code = text?.match(/<Code>([^<]+)<\/Code>/)?.[1];
  const detail = text?.match(/<Message>([^<]+)<\/Message>/)?.[1];
  return new S3MediaStoreError(
    `S3 ${method} ${key} failed: HTTP ${response.status}${code ? ` ${code}` : ""}${detail ? `: ${detail}` : ""}`,
    response.status,
    code,
  );
}
