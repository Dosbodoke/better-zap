export interface MediaStorePutInfo {
  contentType: string;
  size?: number;
  sha256?: string;
  signal?: AbortSignal;
}

export interface MediaStoreObject {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  size?: number;
}

export interface MediaStore {
  put(
    key: string,
    body: ReadableStream<Uint8Array> | ArrayBuffer,
    info: MediaStorePutInfo,
  ): Promise<void>;
  get(key: string): Promise<MediaStoreObject | null>;
  delete?(key: string): Promise<void>;
  getSignedUrl?(key: string, expiresInSeconds: number): Promise<string>;
}

export const MAX_SIGNED_URL_EXPIRES_IN = 604_800;

export function clampSignedUrlExpiry(seconds: number): number {
  if (!Number.isFinite(seconds)) return MAX_SIGNED_URL_EXPIRES_IN;
  return Math.min(Math.max(1, Math.floor(seconds)), MAX_SIGNED_URL_EXPIRES_IN);
}

export const STORABLE_MEDIA_TYPES = [
  "image",
  "audio",
  "video",
  "document",
  "sticker",
] as const;

export type StorableMediaType = (typeof STORABLE_MEDIA_TYPES)[number];

export const DEFAULT_MEDIA_MAX_BYTES = 25 * 1024 * 1024;

export const DEFAULT_MEDIA_TIMEOUT_MS = 30_000;

export const DEFAULT_MEDIA_CONCURRENCY = 3;

export interface StoredMessageMedia {
  status: "stored";
  key: string;
  contentType: string;
  size: number;
  sha256: string;
  filename?: string;
  mediaId: string;
  storedAt: string;
}

export interface FailedMessageMedia {
  status: "failed";
  error: string;
  mediaId: string;
  failedAt: string;
}

export interface SkippedMessageMedia {
  status: "skipped";
  reason: "too_large";
  size?: number;
  maxBytes: number;
  mediaId: string;
  skippedAt: string;
}

export type MessageMedia =
  | StoredMessageMedia
  | FailedMessageMedia
  | SkippedMessageMedia;

export type MediaDownloadResult =
  | {
      status: "downloaded";
      body: ArrayBuffer;
      contentType: string;
      size: number;
      sha256: string;
    }
  | { status: "too_large"; size?: number; maxBytes: number }
  | { status: "failed"; error: string };

export interface MediaDownloadOptions {
  maxBytes?: number;
  expectedSha256?: string;
  accessToken?: string;
  retries?: number;
  signal?: AbortSignal;
}
