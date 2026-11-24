import type { Logger } from "../logger";
import type { MessageLoggerService } from "../services/message-logger.service";
import type { IncomingMessage } from "../types/whatsapp.types";
import { createLimiter } from "../utils/limit";
import { getMessageMediaPayload } from "./message-media";
import { storeMessageMedia, type WebhookMediaConfig } from "./store-message-media";
import { DEFAULT_MEDIA_CONCURRENCY } from "./types";

export interface MediaQueue {
  add(message: IncomingMessage, phoneNumberId: string | undefined): Promise<void>;
}

export function createMediaQueue(input: {
  media: WebhookMediaConfig;
  logger: MessageLoggerService;
  log: Logger;
}): MediaQueue {
  const run = createLimiter(input.media.concurrency ?? DEFAULT_MEDIA_CONCURRENCY);
  const queued = new Map<string, Promise<void>>();

  return {
    add(message, phoneNumberId) {
      if (!getMessageMediaPayload(message)) return Promise.resolve();

      const existing = queued.get(message.id);
      if (existing) return existing;

      const job = run(() => storeMessageMedia({ ...input, message, phoneNumberId })).then(() => {
        queued.delete(message.id);
      });
      queued.set(message.id, job);
      return job;
    },
  };
}
