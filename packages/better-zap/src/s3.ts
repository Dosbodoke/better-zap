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
  endpoint?: string;
  bucket: string;
  region?: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  forcePathStyle?: boolean;
  keyPrefix?: string;
  signedUrls?: boolean;
  retries?: number;
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

  const send = async (
    url: URL,
    init: {
      method: string;
      headers?: Record<string, string>;
      body?: ArrayBuffer;
      signal?: AbortSignal;
    },
  ): Promise<Response> => {
    const [response, error] = await fetchWithRetry(
      async () => fetchImpl(await client.sign(url.toString(), init)),
      { retries, signal: init.signal },
    );
    if (error) {
      throw new S3MediaStoreError(`S3 ${init.method} failed: ${error.message}`, 0);
    }
    return response;
  };

  const store: MediaStore = {
    async put(key, body, info: MediaStorePutInfo) {
      const bytes =
        body instanceof ArrayBuffer ? body : await new Response(body).arrayBuffer();
      const headers: Record<string, string> = {
        "Content-Type": info.contentType || "application/octet-stream",
        "X-Amz-Content-Sha256": await sha256Hex(bytes),
      };
      if (info.sha256) {
        headers["x-amz-meta-sha256"] = info.sha256;
      }

      const response = await send(objectUrl(key), {
        method: "PUT",
        headers,
        body: bytes,
        signal: info.signal,
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
