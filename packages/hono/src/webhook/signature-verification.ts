const textEncoder = new TextEncoder();
let cachedMetaAppSecret: string | null = null;
let cachedMetaHmacKey: Promise<CryptoKey> | null = null;

export async function verifyMetaWebhookSignature({
  rawBody,
  signatureHeader,
  appSecret,
}: {
  rawBody: ArrayBuffer;
  signatureHeader: string | undefined;
  appSecret: string;
}): Promise<boolean> {
  if (!signatureHeader) {
    return false;
  }

  const [algorithm, signatureHexRaw] = signatureHeader.split("=", 2);
  if (algorithm?.toLowerCase() !== "sha256" || !signatureHexRaw) {
    return false;
  }

  const signatureBytes = hexToBytes(signatureHexRaw.trim());
  if (!signatureBytes) {
    return false;
  }

  const key = await getMetaHmacKey(appSecret);
  const expectedSignatureBuffer = await crypto.subtle.sign("HMAC", key, rawBody);
  const expectedSignature = new Uint8Array(expectedSignatureBuffer);

  return constantTimeEqual(expectedSignature, signatureBytes);
}

function getMetaHmacKey(appSecret: string): Promise<CryptoKey> {
  if (cachedMetaAppSecret === appSecret && cachedMetaHmacKey) {
    return cachedMetaHmacKey;
  }

  cachedMetaAppSecret = appSecret;
  cachedMetaHmacKey = crypto.subtle.importKey(
    "raw",
    textEncoder.encode(appSecret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return cachedMetaHmacKey;
}

function hexToBytes(hex: string): Uint8Array | null {
  if (hex.length % 2 !== 0) {
    return null;
  }

  const bytes = new Uint8Array(hex.length / 2);

  for (let i = 0; i < bytes.length; i += 1) {
    const value = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    if (Number.isNaN(value)) {
      return null;
    }
    bytes[i] = value;
  }

  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}
