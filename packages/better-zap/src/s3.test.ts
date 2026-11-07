import { createHash, createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createS3MediaStore, S3MediaStoreError, type S3MediaStoreConfig } from "./s3";

const ACCESS_KEY_ID = "AKIAIOSFODNN7EXAMPLE";
const SECRET_ACCESS_KEY = "wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY";

type StoredObject = { body: Uint8Array<ArrayBuffer>; contentType: string; meta: Record<string, string> };

/**
 * A fake S3 endpoint. It recomputes each SigV4 signature from scratch (not
 * with aws4fetch) and answers like S3: 403 SignatureDoesNotMatch on a bad
 * signature, 404 NoSuchKey for missing objects.
 */
function createFakeS3(options: {
  region: string;
  bucket: string;
  addressing: "path" | "virtual";
  secretAccessKey?: string;
  failFirst?: number;
}) {
  const objects = new Map<string, StoredObject>();
  const requests: Request[] = [];
  let failuresLeft = options.failFirst ?? 0;
  const secret = options.secretAccessKey ?? SECRET_ACCESS_KEY;

  const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    requests.push(request.clone());
    if (failuresLeft > 0) {
      failuresLeft -= 1;
      return xmlError(503, "SlowDown", "Please reduce your request rate.");
    }

    const url = new URL(request.url);
    const body = new Uint8Array(await request.arrayBuffer());
    const auth = verifySignature(request, url, body, options.region, secret);
    if (auth !== true) {
      return xmlError(403, "SignatureDoesNotMatch", auth);
    }

    const segments = url.pathname.split("/").slice(1).map(decodeURIComponent);
    let bucket: string;
    if (options.addressing === "virtual") {
      bucket = url.hostname.split(".")[0] ?? "";
    } else {
      bucket = segments.shift() ?? "";
    }
    if (bucket !== options.bucket) {
      return xmlError(404, "NoSuchBucket", `Bucket ${bucket} does not exist`);
    }
    const key = segments.join("/");

    switch (request.method) {
      case "PUT": {
        const meta: Record<string, string> = {};
        request.headers.forEach((value, name) => {
          if (name.startsWith("x-amz-meta-")) meta[name] = value;
        });
        objects.set(key, {
          body,
          contentType: request.headers.get("content-type") ?? "binary/octet-stream",
          meta,
        });
        return new Response(null, { status: 200, headers: { ETag: '"etag"' } });
      }
      case "GET": {
        const object = objects.get(key);
        if (!object) return xmlError(404, "NoSuchKey", "The specified key does not exist.");
        return new Response(object.body, {
          status: 200,
          headers: {
            "Content-Type": object.contentType,
            "Content-Length": String(object.body.byteLength),
          },
        });
      }
      case "DELETE":
        objects.delete(key);
        return new Response(null, { status: 204 });
      default:
        return xmlError(405, "MethodNotAllowed", "");
    }
  };

  return { fetch: fetchImpl as typeof fetch, objects, requests };
}

function xmlError(status: number, code: string, message: string) {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Error><Code>${code}</Code><Message>${message}</Message></Error>`,
    { status, headers: { "Content-Type": "application/xml" } },
  );
}

function verifySignature(
  request: Request,
  url: URL,
  body: Uint8Array,
  region: string,
  secret: string,
): true | string {
  const presigned = url.searchParams.has("X-Amz-Signature");
  let credential: string;
  let signedHeaders: string;
  let signature: string;
  let datetime: string;
  let payloadHash: string;

  if (presigned) {
    credential = url.searchParams.get("X-Amz-Credential") ?? "";
    signedHeaders = url.searchParams.get("X-Amz-SignedHeaders") ?? "";
    signature = url.searchParams.get("X-Amz-Signature") ?? "";
    datetime = url.searchParams.get("X-Amz-Date") ?? "";
    payloadHash = "UNSIGNED-PAYLOAD";
    const expires = Number(url.searchParams.get("X-Amz-Expires"));
    if (url.searchParams.get("X-Amz-Algorithm") !== "AWS4-HMAC-SHA256") return "bad algorithm";
    if (!(expires > 0 && expires <= 604800)) return "bad expiry";
    if (parseAmzDate(datetime) + expires * 1000 < Date.now()) return "Request has expired";
  } else {
    const header = request.headers.get("authorization") ?? "";
    const match = header.match(
      /^AWS4-HMAC-SHA256 Credential=([^,]+), SignedHeaders=([^,]+), Signature=([0-9a-f]{64})$/,
    );
    if (!match) return `malformed Authorization header: ${header}`;
    [, credential = "", signedHeaders = "", signature = ""] = match;
    datetime = request.headers.get("x-amz-date") ?? "";
    payloadHash = request.headers.get("x-amz-content-sha256") ?? "";
    if (!payloadHash) return "missing x-amz-content-sha256";
    if (payloadHash !== "UNSIGNED-PAYLOAD" && payloadHash !== sha256Hex(body)) {
      return "XAmzContentSHA256Mismatch";
    }
  }

  const [accessKeyId, date, credRegion, service, terminator] = credential.split("/");
  if (accessKeyId !== ACCESS_KEY_ID) return "InvalidAccessKeyId";
  if (credRegion !== region) return `wrong region ${credRegion}, expected ${region}`;
  if (service !== "s3" || terminator !== "aws4_request") return "bad credential scope";
  if (date !== datetime.slice(0, 8)) return "date mismatch";

  const headerNames = signedHeaders.split(";");
  if (!headerNames.includes("host")) return "host not signed";

  const canonicalUri = url.pathname
    .split("/")
    .map((segment) => rfc3986(decodeURIComponent(segment)))
    .join("/");
  const canonicalQuery = [...url.searchParams]
    .filter(([name]) => name !== "X-Amz-Signature")
    .map(([name, value]) => [rfc3986(name), rfc3986(value)] as const)
    .sort(([a, av], [b, bv]) => (a < b ? -1 : a > b ? 1 : av < bv ? -1 : av > bv ? 1 : 0))
    .map(([name, value]) => `${name}=${value}`)
    .join("&");
  const canonicalHeaders = headerNames
    .map((name) => {
      const value = name === "host" ? url.host : (request.headers.get(name) ?? "");
      return `${name}:${value.trim().replace(/\s+/g, " ")}\n`;
    })
    .join("");

  const canonicalRequest = [
    request.method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    datetime,
    `${date}/${credRegion}/s3/aws4_request`,
    sha256Hex(new TextEncoder().encode(canonicalRequest)),
  ].join("\n");

  const kDate = hmac(`AWS4${secret}`, date ?? "");
  const kRegion = hmac(kDate, credRegion ?? "");
  const kService = hmac(kRegion, "s3");
  const kSigning = hmac(kService, "aws4_request");
  const expected = createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  return expected === signature ? true : "The request signature we calculated does not match";
}

function hmac(key: string | Buffer, data: string): Buffer {
  return createHmac("sha256", key).update(data).digest();
}

function sha256Hex(data: Uint8Array): string {
  return createHash("sha256").update(data).digest("hex");
}

function rfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/g,
    (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function parseAmzDate(value: string): number {
  const m = value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/);
  if (!m) return Number.NaN;
  return Date.UTC(+m[1]!, +m[2]! - 1, +m[3]!, +m[4]!, +m[5]!, +m[6]!);
}

const providers: Array<{
  name: string;
  config: Omit<S3MediaStoreConfig, "fetch" | "accessKeyId" | "secretAccessKey">;
  region: string;
  addressing: "path" | "virtual";
  objectUrl: string;
}> = [
  {
    name: "Cloudflare R2",
    config: { endpoint: "https://acc123.r2.cloudflarestorage.com", bucket: "media" },
    region: "auto",
    addressing: "path",
    objectUrl: "https://acc123.r2.cloudflarestorage.com/media/whatsapp/phone_1/wamid.1",
  },
  {
    name: "AWS S3 (region only)",
    config: { region: "eu-west-1", bucket: "media" },
    region: "eu-west-1",
    addressing: "virtual",
    objectUrl: "https://media.s3.eu-west-1.amazonaws.com/whatsapp/phone_1/wamid.1",
  },
  {
    name: "AWS S3 (path-style)",
    config: {
      endpoint: "https://s3.us-east-2.amazonaws.com",
      bucket: "media",
      forcePathStyle: true,
    },
    region: "us-east-2",
    addressing: "path",
    objectUrl: "https://s3.us-east-2.amazonaws.com/media/whatsapp/phone_1/wamid.1",
  },
  {
    name: "MinIO",
    config: { endpoint: "http://localhost:9000", bucket: "media" },
    region: "us-east-1",
    addressing: "path",
    objectUrl: "http://localhost:9000/media/whatsapp/phone_1/wamid.1",
  },
  {
    name: "Backblaze B2",
    config: { endpoint: "https://s3.us-west-004.backblazeb2.com", bucket: "media" },
    region: "us-west-004",
    addressing: "path",
    objectUrl: "https://s3.us-west-004.backblazeb2.com/media/whatsapp/phone_1/wamid.1",
  },
];

afterEach(() => {
  vi.useRealTimers();
});

describe.each(providers)("createS3MediaStore against $name", (provider) => {
  function setup(extra: Partial<S3MediaStoreConfig> = {}, fake: { failFirst?: number } = {}) {
    const s3 = createFakeS3({
      region: provider.region,
      bucket: "media",
      addressing: provider.addressing,
      ...fake,
    });
    const store = createS3MediaStore({
      ...provider.config,
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
      fetch: s3.fetch,
      ...extra,
    });
    return { s3, store };
  }

  it("stores and reads back a file with signed requests", async () => {
    const { s3, store } = setup();
    const body = new TextEncoder().encode("jpeg bytes").buffer;

    await store.put("whatsapp/phone_1/wamid.1", body, {
      contentType: "image/jpeg",
      size: body.byteLength,
      sha256: "abc123",
    });

    const put = s3.requests[0]!;
    expect(put.method).toBe("PUT");
    expect(put.url).toBe(provider.objectUrl);
    expect(put.headers.get("x-amz-content-sha256")).toBe(sha256Hex(new Uint8Array(body)));
    expect(put.headers.get("authorization")).toContain(`/${provider.region}/s3/aws4_request`);
    expect(s3.objects.get("whatsapp/phone_1/wamid.1")?.meta).toEqual({
      "x-amz-meta-sha256": "abc123",
    });

    const object = await store.get("whatsapp/phone_1/wamid.1");
    expect(object?.contentType).toBe("image/jpeg");
    expect(object?.size).toBe(body.byteLength);
    expect(await new Response(object?.body).text()).toBe("jpeg bytes");
  });

  it("returns null for a missing key and deletes files", async () => {
    const { store } = setup();
    expect(await store.get("whatsapp/phone_1/missing")).toBeNull();

    await store.put("whatsapp/phone_1/wamid.1", new ArrayBuffer(3), { contentType: "audio/ogg" });
    await store.delete?.("whatsapp/phone_1/wamid.1");
    expect(await store.get("whatsapp/phone_1/wamid.1")).toBeNull();
    // Deleting a missing key is not an error.
    await expect(store.delete?.("whatsapp/phone_1/wamid.1")).resolves.toBeUndefined();
  });

  it("round-trips keys with encoded characters", async () => {
    const { s3, store } = setup();
    const key = "whatsapp/123/wamid.HBg%2Bab%3D%3D (1)";
    await store.put(key, new TextEncoder().encode("x").buffer, { contentType: "image/png" });

    expect(s3.objects.has(key)).toBe(true);
    expect(await new Response((await store.get(key))?.body).text()).toBe("x");
  });

  it("presigns GET URLs the endpoint accepts when signedUrls is on", async () => {
    const { s3, store } = setup({ signedUrls: true });
    await store.put("whatsapp/phone_1/wamid.1", new TextEncoder().encode("pdf").buffer, {
      contentType: "application/pdf",
    });

    const signed = await store.getSignedUrl!("whatsapp/phone_1/wamid.1", 300);
    const url = new URL(signed);
    expect(`${url.origin}${url.pathname}`).toBe(provider.objectUrl);
    expect(url.searchParams.get("X-Amz-Expires")).toBe("300");

    const response = await s3.fetch(signed);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("pdf");
  });
});

describe("createS3MediaStore", () => {
  it("has no getSignedUrl unless signedUrls is on", () => {
    const store = createS3MediaStore({
      endpoint: "https://acc.r2.cloudflarestorage.com",
      bucket: "media",
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
    });
    expect(store.getSignedUrl).toBeUndefined();
  });

  it("matches AWS's published presigned URL example", async () => {
    // https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2013-05-24T00:00:00Z"));
    const store = createS3MediaStore({
      endpoint: "https://s3.amazonaws.com",
      bucket: "examplebucket",
      region: "us-east-1",
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
      signedUrls: true,
    });

    const url = new URL(await store.getSignedUrl!("test.txt", 86400));

    expect(url.host).toBe("examplebucket.s3.amazonaws.com");
    expect(url.pathname).toBe("/test.txt");
    expect(url.searchParams.get("X-Amz-Credential")).toBe(
      "AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request",
    );
    expect(url.searchParams.get("X-Amz-Signature")).toBe(
      "aeeed9bbccd4d02ee5c0109b86d86835f995330da4c265957d157751f604d404",
    );
  });

  it("caps presigned URL expiry at 7 days", async () => {
    const store = createS3MediaStore({
      endpoint: "https://acc.r2.cloudflarestorage.com",
      bucket: "media",
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
      signedUrls: true,
    });
    const url = new URL(await store.getSignedUrl!("k", 10_000_000));
    expect(url.searchParams.get("X-Amz-Expires")).toBe("604800");
  });

  it("throws S3MediaStoreError with the S3 error code", async () => {
    const s3 = createFakeS3({
      region: "auto",
      bucket: "media",
      addressing: "path",
      secretAccessKey: "a-different-secret",
    });
    const store = createS3MediaStore({
      endpoint: "https://acc.r2.cloudflarestorage.com",
      bucket: "media",
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
      fetch: s3.fetch,
    });

    const error = await store
      .put("k", new ArrayBuffer(1), { contentType: "image/jpeg" })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(S3MediaStoreError);
    expect(error).toMatchObject({ status: 403, code: "SignatureDoesNotMatch" });
  });

  it("retries 5xx responses", async () => {
    const s3 = createFakeS3({ region: "auto", bucket: "media", addressing: "path", failFirst: 1 });
    const store = createS3MediaStore({
      endpoint: "https://acc.r2.cloudflarestorage.com",
      bucket: "media",
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
      fetch: s3.fetch,
    });

    await store.put("k", new ArrayBuffer(1), { contentType: "image/jpeg" });
    expect(s3.requests).toHaveLength(2);
    expect(s3.objects.has("k")).toBe(true);
  });

  it("uploads ReadableStream bodies and applies keyPrefix", async () => {
    const s3 = createFakeS3({ region: "auto", bucket: "media", addressing: "path" });
    const store = createS3MediaStore({
      endpoint: "https://acc.r2.cloudflarestorage.com",
      bucket: "media",
      accessKeyId: ACCESS_KEY_ID,
      secretAccessKey: SECRET_ACCESS_KEY,
      keyPrefix: "prod/",
      fetch: s3.fetch,
    });

    await store.put("whatsapp/1/a", new Response("streamed").body!, { contentType: "text/plain" });
    expect(new TextDecoder().decode(s3.objects.get("prod/whatsapp/1/a")?.body)).toBe("streamed");
    expect(await new Response((await store.get("whatsapp/1/a"))?.body).text()).toBe("streamed");
  });

  it("requires an endpoint unless an AWS region is given", () => {
    expect(() =>
      createS3MediaStore({ bucket: "b", accessKeyId: "a", secretAccessKey: "s" }),
    ).toThrow(/endpoint is required/);
  });
});
