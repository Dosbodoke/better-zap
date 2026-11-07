import { type Logger, serializeError } from "../logger";
import type { MessageLoggerService } from "../services/message-logger.service";
import type { IncomingMessage } from "../types/whatsapp.types";
import { tryCatch } from "../utils/result";
import {
  getMediaStorageKey,
  getMessageMediaPayload,
  type MessageMediaPayload,
} from "./message-media";
import {
  DEFAULT_MEDIA_MAX_BYTES,
  type MediaDownloadOptions,
  type MediaDownloadResult,
  type MediaStore,
  type MessageMedia,
} from "./types";

/** Media download settings for the webhook processor. */
export type WebhookMediaConfig = {
  store: MediaStore;
  /** Downloads a Meta media id. `betterZap()` uses `WhatsAppService.downloadMedia`. */
  download: (
    mediaId: string,
    options: MediaDownloadOptions & { phoneNumberId?: string },
  ) => Promise<MediaDownloadResult>;
  /** Files larger than this are skipped. Defaults to 25 MiB. */
  maxBytes?: number;
  /** Used in the storage key when the webhook has no `phone_number_id`. */
  phoneNumberId?: string;
};

/**
 * Downloads a message's media, stores it, and records the result in
 * `metadata.media`. Does nothing for messages without media and for history
 * media placeholders. Never throws.
 */
export async function storeMessageMedia(input: {
  message: IncomingMessage;
  phoneNumberId?: string;
  media: WebhookMediaConfig | undefined;
  logger: MessageLoggerService;
  log: Logger;
}): Promise<MessageMedia | undefined> {
  if (!input.media) return undefined;

  const payload = getMessageMediaPayload(input.message);
  if (!payload) return undefined;

  const result = await downloadAndStore(input.media, input, payload);

  const [, updateError] = await tryCatch(() =>
    input.logger.setMessageMedia(input.message.id, result),
  );
  if (updateError) {
    input.log.error("webhook.media_metadata_update_failed", {
      waMessageId: input.message.id,
      ...serializeError(updateError),
    });
  }

  return result;
}

async function downloadAndStore(
  media: WebhookMediaConfig,
  input: { message: IncomingMessage; phoneNumberId?: string; log: Logger },
  payload: MessageMediaPayload,
): Promise<MessageMedia> {
  const { message, log } = input;
  const phoneNumberId = input.phoneNumberId ?? media.phoneNumberId;
  const logContext = {
    waMessageId: message.id,
    mediaId: payload.id,
    mediaType: payload.type,
  };

  // `download` is app-provided in custom setups, so it may throw.
  const [download, downloadError] = await tryCatch(() =>
    media.download(payload.id, {
      maxBytes: media.maxBytes ?? DEFAULT_MEDIA_MAX_BYTES,
      expectedSha256: payload.sha256,
      phoneNumberId,
    }),
  );
  if (downloadError) {
    log.error("webhook.media_download_failed", { ...logContext, ...serializeError(downloadError) });
    return failed(payload.id, downloadError.message);
  }

  if (download.status === "failed") {
    log.error("webhook.media_download_failed", { ...logContext, error: download.error });
    return failed(payload.id, download.error);
  }

  if (download.status === "too_large") {
    log.warn("webhook.media_skipped_too_large", {
      ...logContext,
      size: download.size,
      maxBytes: download.maxBytes,
    });
    return {
      status: "skipped",
      reason: "too_large",
      ...(download.size !== undefined ? { size: download.size } : {}),
      maxBytes: download.maxBytes,
      mediaId: payload.id,
      skippedAt: new Date().toISOString(),
    };
  }

  const key = getMediaStorageKey({ phoneNumberId, waMessageId: message.id });
  const [, putError] = await tryCatch(() =>
    media.store.put(key, download.body, {
      contentType: download.contentType,
      size: download.size,
      sha256: download.sha256,
    }),
  );
  if (putError) {
    log.error("webhook.media_store_failed", { ...logContext, ...serializeError(putError) });
    return failed(payload.id, putError.message);
  }

  log.info("webhook.media_stored", { ...logContext, key, size: download.size });
  return {
    status: "stored",
    key,
    contentType: download.contentType,
    size: download.size,
    sha256: download.sha256,
    ...(payload.filename ? { filename: payload.filename } : {}),
    mediaId: payload.id,
    storedAt: new Date().toISOString(),
  };
}

function failed(mediaId: string, error: string): MessageMedia {
  return {
    status: "failed",
    error,
    mediaId,
    failedAt: new Date().toISOString(),
  };
}
