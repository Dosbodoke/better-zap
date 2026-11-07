import type { Logger } from "../logger";
import type { MessageLoggerService } from "../services/message-logger.service";
import type { IncomingMessage } from "../types/whatsapp.types";
import { createLimiter } from "../utils/limit";
import { getMessageMediaPayload } from "./message-media";
import { storeMessageMedia, type WebhookMediaConfig } from "./store-message-media";
import { DEFAULT_MEDIA_CONCURRENCY } from "./types";

export interface MediaQueue {
  /**
   * Starts storing a message's media without waiting for it. At most
   * `media.concurrency` files transfer at once; the rest wait in order.
   *
   * Returns a promise that settles when this message's media is stored or
   * has failed. It never rejects. A message that is already queued isn't
   * queued again.
   */
  add(message: IncomingMessage, phoneNumberId: string | undefined): Promise<void>;
}

/** Runs media downloads in the background so they never delay webhook hooks. */
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
