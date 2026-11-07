/**
 * Media storage contract.
 *
 * Meta deletes webhook media after 7 days, so Better Zap downloads each file
 * once, when it arrives, and keeps it in storage the app provides. Like
 * `WhatsAppLogStore`, the app implements this interface (or uses
 * `createS3MediaStore` from `better-zap/s3`) and passes it as
 * `database.media`.
 */

export interface MediaStorePutInfo {
  /** MIME type reported by Meta, e.g. `image/jpeg` or `audio/ogg; codecs=opus`. */
  contentType: string;
  /** Size in bytes, when known. */
  size?: number;
  /** Hex SHA-256 of the file, when known. */
  sha256?: string;
  /** Aborts when the transfer times out. Pass it to `fetch` to cancel the upload. */
  signal?: AbortSignal;
}

export interface MediaStoreObject {
  body: ReadableStream<Uint8Array>;
  contentType: string;
  size?: number;
}

export interface MediaStore {
  /** Store a file under `key`. Overwrites any existing file with the same key. */
  put(
    key: string,
    body: ReadableStream<Uint8Array> | ArrayBuffer,
    info: MediaStorePutInfo,
  ): Promise<void>;
  /** Read a file. Returns `null` when the key doesn't exist. */
  get(key: string): Promise<MediaStoreObject | null>;
  delete?(key: string): Promise<void>;
  /**
   * Optional. When present, the media route redirects to this URL instead of
   * streaming the file through your server, for types that are safe to show
   * inline (images, audio, video, PDF). Other types are always streamed with
   * download headers.
   *
   * The URL must stay valid for at least `expiresInSeconds`. Better Zap never
   * asks for more than {@link MAX_SIGNED_URL_EXPIRES_IN} (7 days, the S3 limit).
   */
  getSignedUrl?(key: string, expiresInSeconds: number): Promise<string>;
}

/** Longest signed URL lifetime Better Zap requests: 7 days, the S3 maximum. */
export const MAX_SIGNED_URL_EXPIRES_IN = 604_800;

/** Clamps a requested signed URL lifetime to 1 second through 7 days. */
export function clampSignedUrlExpiry(seconds: number): number {
  if (!Number.isFinite(seconds)) return MAX_SIGNED_URL_EXPIRES_IN;
  return Math.min(Math.max(1, Math.floor(seconds)), MAX_SIGNED_URL_EXPIRES_IN);
}

/** Message types whose media Better Zap downloads. */
export const STORABLE_MEDIA_TYPES = [
  "image",
  "audio",
  "video",
  "document",
  "sticker",
] as const;

export type StorableMediaType = (typeof STORABLE_MEDIA_TYPES)[number];

/** Default `maxBytes` for media downloads: 25 MiB. */
export const DEFAULT_MEDIA_MAX_BYTES = 25 * 1024 * 1024;

/** Default time limit for one file's download and upload: 30 seconds. */
export const DEFAULT_MEDIA_TIMEOUT_MS = 30_000;

/** Default number of files downloaded at the same time. */
export const DEFAULT_MEDIA_CONCURRENCY = 3;

/** The file was downloaded and stored. */
export interface StoredMessageMedia {
  status: "stored";
  /** Key in the `MediaStore`. */
  key: string;
  contentType: string;
  size: number;
  /** Hex SHA-256 of the stored file. */
  sha256: string;
  /** Original file name, for documents. */
  filename?: string;
  /** Meta media id the file was downloaded from. */
  mediaId: string;
  storedAt: string;
}

/** The download or upload failed. Meta's media id may still work for a while. */
export interface FailedMessageMedia {
  status: "failed";
  error: string;
  mediaId: string;
  failedAt: string;
}

/** The file was larger than `maxBytes` and was not downloaded. */
export interface SkippedMessageMedia {
  status: "skipped";
  reason: "too_large";
  /** Size reported by Meta, when known. */
  size?: number;
  maxBytes: number;
  mediaId: string;
  skippedAt: string;
}

/** Shape of `metadata.media` on a stored log record. */
export type MessageMedia =
  | StoredMessageMedia
  | FailedMessageMedia
  | SkippedMessageMedia;

/** Result of `WhatsAppService.downloadMedia`. */
export type MediaDownloadResult =
  | {
      status: "downloaded";
      body: ArrayBuffer;
      contentType: string;
      size: number;
      /** Hex SHA-256 of `body`. */
      sha256: string;
    }
  | { status: "too_large"; size?: number; maxBytes: number }
  | { status: "failed"; error: string };

export interface MediaDownloadOptions {
  /** Files larger than this are not downloaded. Defaults to 25 MiB. */
  maxBytes?: number;
  /**
   * SHA-256 from the webhook (hex or base64). Checked when Meta's media
   * lookup doesn't return one.
   */
  expectedSha256?: string;
  /** Overrides the configured access token, e.g. for another business's number. */
  accessToken?: string;
  /** Retries for network errors, 429 and 5xx responses. Defaults to 2. */
  retries?: number;
  /** Cancels the lookup and download, e.g. on a timeout. */
  signal?: AbortSignal;
}
