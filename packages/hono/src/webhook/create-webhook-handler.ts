import { Hono } from "hono";
import { serializeError } from "better-zap";
import type {
  IncomingMessage,
  Logger,
  MessageStatus,
  MessageContext,
  MessageLoggerService,
  StatusContext,
  WebhookChange,
  WebhookContact,
  WebhookEntry,
  WebhookError,
  WebhookPayload,
} from "better-zap";
import { verifyMetaWebhookSignature } from "./signature-verification";
import { getMessageContent } from "./message-content";

/**
 * Configuration for {@link createWebhookHandler}.
 *
 * @typeParam Env - Hono bindings type (e.g. Cloudflare Worker env).
 */
export type WebhookConfig = {
  /** Token for the Meta verification challenge (`GET /webhook`). */
  verifyToken: string;
  /** App secret used for HMAC-SHA256 signature verification. */
  appSecret: string;
  /** logger for automatic message storage. */
  logger: MessageLoggerService;
  /** Structured logger for operational logging. */
  log: Logger;
  /** Called once per incoming message, after SDK pre-processing. */
  onMessage: (ctx: MessageContext) => Promise<void>;
  /** Called once per delivery status update (sent → delivered → read → failed). */
  onStatusUpdate: (ctx: StatusContext) => Promise<void>;
  /**
   * Called for Meta platform-level errors.
   * @default Uses the configured {@link WebhookConfig.log} logger's {@code error} method.
   */
  onError?: (error: WebhookError) => void;
};

// ============================================
// Factory
// ============================================

const textDecoder = new TextDecoder();

/**
 * Creates a Hono router that handles the full WhatsApp webhook lifecycle.
 *
 * **SDK guarantees (non-hookable):**
 * - Signature is always verified before any processing
 * - Meta always receives a fast 200 OK (processing runs via `waitUntil`)
 * - Hook errors never crash the webhook (wrapped in try/catch)
 * - Contact is resolved and content is extracted before `onMessage`
 * - Status timestamp is parsed to ISO before `onStatusUpdate`
 *
 * @typeParam Env - Hono bindings type (e.g. Cloudflare Worker env).
 */
export function createWebhookHandler(
  config: WebhookConfig,
): Hono<{ Bindings: Record<string, any> }> {
  const log = config.log;
  const webhook = new Hono<{ Bindings: Record<string, any> }>();

  webhook.get("/", (c) => {
    const mode = c.req.query("hub.mode");
    const token = c.req.query("hub.verify_token");
    const challenge = c.req.query("hub.challenge");

    if (mode === "subscribe" && token === config.verifyToken) {
      log.info("webhook.verification_successful");
      return c.text(challenge || "", 200);
    }

    log.warn("webhook.verification_failed");
    return c.text("Forbidden", 403);
  });

  webhook.post("/", async (c) => {
    try {
      if (!config.appSecret) {
        log.error("webhook.missing_app_secret");
        return c.text("Server Misconfigured", 500);
      }

      const rawBody = await c.req.raw.arrayBuffer();
      const signatureHeader = c.req.header("x-hub-signature-256");
      const isValid = await verifyMetaWebhookSignature({
        rawBody,
        signatureHeader,
        appSecret: config.appSecret,
      });

      if (!isValid) {
        log.warn("webhook.invalid_signature");
        return c.text("Unauthorized", 401);
      }

      let payload: WebhookPayload;
      try {
        payload = JSON.parse(textDecoder.decode(rawBody)) as WebhookPayload;
      } catch {
        log.warn("webhook.invalid_payload");
        return c.text("Bad Request", 400);
      }

      // Respond immediately — Meta enforces a 20s timeout.
      if (c.executionCtx) {
        c.executionCtx.waitUntil(processPayload(payload, c.env, config, log));
      } else {
        // Fallback for environments where executionCtx is missing (e.g. some Next.js route simulations)
        await processPayload(payload, c.env, config, log);
      }
      return c.text("OK", 200);
    } catch (error) {
      log.error("webhook.request_error", serializeError(error));
      return c.text("Internal Server Error", 500);
    }
  });

  return webhook;
}

// ============================================
// Internal Pipeline
// ============================================

/** Top-level dispatcher — iterates entries in the webhook payload. */
async function processPayload<Env extends Record<string, any>>(
  payload: WebhookPayload,
  env: Env,
  config: WebhookConfig,
  log: Logger,
): Promise<void> {
  try {
    if (payload.object !== "whatsapp_business_account") {
      log.debug("webhook.ignored_payload", { object: payload.object });
      return;
    }

    for (const entry of payload.entry) {
      await processEntry(entry, env, config, log);
    }
  } catch (error) {
    log.error("webhook.async_process_error", serializeError(error));
  }
}

/** Iterates changes within a single entry. */
async function processEntry<Env extends Record<string, any>>(
  entry: WebhookEntry,
  env: Env,
  config: WebhookConfig,
  log: Logger,
): Promise<void> {
  for (const change of entry.changes) {
    await processChange(change, env, config, log);
  }
}

/** Routes messages, statuses, and errors to the appropriate handler. */
async function processChange<Env extends Record<string, any>>(
  change: WebhookChange,
  env: Env,
  config: WebhookConfig,
  log: Logger,
): Promise<void> {
  const value = change.value;

  if (value.messages && value.messages.length > 0) {
    for (const message of value.messages) {
      const contact = resolveContact(value.contacts, message);
      await processIncomingMessage(message, contact, config, log);
    }
  }

  if (value.statuses && value.statuses.length > 0) {
    for (const status of value.statuses) {
      await processStatusUpdate(status, config, log);
    }
  }

  if (value.errors && value.errors.length > 0) {
    const errorHandler =
      config.onError ??
      ((err: WebhookError) => {
        log.error("webhook.meta_error", { error: err });
      });
    for (const error of value.errors) {
      try {
        errorHandler(error);
      } catch (hookError) {
        log.error("webhook.on_error_hook_failed", {
          metaError: error,
          hookError: serializeError(hookError),
        });
      }
    }
  }
}

/**
 * Processes a single incoming message:
 * 1. Deduplicates by waMessageId
 * 2. Extracts human-readable content
 * 3. Logs the message for audit trail
 * 4. Calls {@link WebhookConfig.onMessage}
 */
async function processIncomingMessage(
  message: IncomingMessage,
  contact: WebhookContact | undefined,
  config: WebhookConfig,
  log: Logger,
): Promise<void> {
  const phone = message.from;

  log.info("webhook.message_received", {
    waMessageId: message.id,
    phone,
    messageType: message.type,
  });

  // Deduplication: skip if this waMessageId was already logged
  if (await config.logger.isDuplicate(message.id)) {
    log.info("webhook.duplicate_ignored", {
      waMessageId: message.id,
      phone,
    });
    return;
  }

  const content = getMessageContent(message);
  const sentAt = new Date(parseInt(message.timestamp, 10) * 1000);
  const normalizedSentAt = Number.isNaN(sentAt.getTime())
    ? new Date().toISOString()
    : sentAt.toISOString();

  // Automatic logging (audit trail)
  const { id, type, text, from, timestamp, ...rawMetadata } = message;
  await config.logger.logIncoming({
    phone,
    waMessageId: message.id,
    content,
    sentAt: normalizedSentAt,
    senderName: contact?.profile?.name,
    metadata: Object.keys(rawMetadata).length > 0 ? rawMetadata : undefined,
  });

  const ctx: MessageContext = {
    message,
    contact,
    content,
    phone,
  };

  try {
    await config.onMessage(ctx);
  } catch (error) {
    log.error("webhook.on_message_hook_failed", {
      waMessageId: message.id,
      phone,
      ...serializeError(error),
    });
  }
}

/**
 * Processes a single delivery status update:
 * 1. Parses Unix timestamp to ISO-8601
 * 2. Extracts first error (if any)
 * 3. Atomically updates status only if it advances the lifecycle
 * 4. Calls {@link WebhookConfig.onStatusUpdate} only if the update was applied
 */
async function processStatusUpdate(
  status: MessageStatus,
  config: WebhookConfig,
  log: Logger,
): Promise<void> {
  const firstError = status.errors?.[0];
  const timestamp = new Date(parseInt(status.timestamp) * 1000).toISOString();
  const errorMessage = firstError?.message;
  const errorCode = firstError?.code;

  // Atomic conditional update — skips duplicates and regressions in a single query
  const applied = await config.logger.updateStatus(
    status.id,
    status.status,
    timestamp,
    errorMessage,
  );

  if (!applied) return;

  log.info("webhook.status_updated", {
    waMessageId: status.id,
    status: status.status,
  });

  const ctx: StatusContext = {
    status,
    timestamp,
    errorMessage,
    errorCode,
  };

  try {
    await config.onStatusUpdate(ctx);
  } catch (error) {
    log.error("webhook.on_status_update_hook_failed", {
      waMessageId: status.id,
      ...serializeError(error),
    });
  }
}

/** Matches a contact to a message by `wa_id`, falling back to the first contact. */
function resolveContact(
  contacts: WebhookContact[] | undefined,
  message: IncomingMessage,
): WebhookContact | undefined {
  if (!contacts || contacts.length === 0) {
    return undefined;
  }
  return contacts.find((c) => c.wa_id === message.from) ?? contacts[0];
}
