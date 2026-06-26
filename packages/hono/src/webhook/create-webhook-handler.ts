import { Hono } from "hono";
import { formatPhone, serializeError } from "better-zap";
import type {
  BetterZapDatabase,
  CoexistenceAccountUpdateValue,
  CoexistenceHistoryValue,
  CoexistenceSmbAppStateSyncValue,
  CoexistenceSmbMessageEchoesValue,
  CoexistenceUnsupportedValue,
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
  WhatsAppDirection,
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
  /** Optional database contracts used for automatic coexistence persistence. */
  database?: BetterZapDatabase;
  /** Called once per incoming message, after SDK pre-processing. */
  onMessage: (ctx: MessageContext) => Promise<void>;
  /** Called once per delivery status update (sent → delivered → read → failed). */
  onStatusUpdate: (ctx: StatusContext) => Promise<void>;
  /** Called once per history webhook after SDK pre-processing. */
  onCoexistenceHistory?: (ctx: CoexistenceHistoryContext) => Promise<void>;
  /** Called once per SMB app state sync webhook after SDK pre-processing. */
  onSmbAppStateSync?: (ctx: SmbAppStateSyncContext) => Promise<void>;
  /** Called once per app message echo webhook after SDK pre-processing. */
  onSmbMessageEcho?: (ctx: SmbMessageEchoContext) => Promise<void>;
  /** Called once per coexistence account lifecycle webhook. */
  onCoexistenceAccountUpdate?: (
    ctx: CoexistenceAccountUpdateContext,
  ) => Promise<void>;
  /** Called when a coexistence webhook contains unsupported/error content. */
  onCoexistenceUnsupportedMessage?: (
    ctx: CoexistenceUnsupportedMessageContext,
  ) => Promise<void>;
  /**
   * Called for Meta platform-level errors.
   * @default Uses the configured {@link WebhookConfig.log} logger's {@code error} method.
   */
  onError?: (error: WebhookError) => void;
};

export interface CoexistenceHistoryContext {
  value: CoexistenceHistoryValue;
  change: WebhookChange;
  importedMessages: number;
  duplicateMessages: number;
}

export interface SmbAppStateSyncContext {
  value: CoexistenceSmbAppStateSyncValue;
  change: WebhookChange;
  upsertedContacts: number;
  removedContacts: number;
}

export interface SmbMessageEchoContext {
  value: CoexistenceSmbMessageEchoesValue;
  change: WebhookChange;
  importedMessages: number;
  duplicateMessages: number;
}

export interface CoexistenceAccountUpdateContext {
  value: CoexistenceAccountUpdateValue;
  change: WebhookChange;
}

export interface CoexistenceUnsupportedMessageContext {
  value: CoexistenceHistoryValue | CoexistenceUnsupportedValue;
  change: WebhookChange;
  errors: WebhookError[];
}

type CoexistenceWebhookContact = {
  profile?: { name?: string };
  wa_id: string;
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

/** Routes webhook changes to field-specific processors. */
async function processChange<Env extends Record<string, any>>(
  change: WebhookChange,
  env: Env,
  config: WebhookConfig,
  log: Logger,
): Promise<void> {
  switch (change.field) {
    case "messages":
      await processMessagesChange(change, env, config, log);
      return;
    case "history":
      await processHistoryChange(change, config, log);
      return;
    case "smb_app_state_sync":
      await processSmbAppStateSyncChange(change, config, log);
      return;
    case "smb_message_echoes":
      await processSmbMessageEchoesChange(change, config, log);
      return;
    case "account_update":
      await processAccountUpdateChange(change, config, log);
      return;
    default:
      await processMessagesChange(change, env, config, log);
      log.debug("webhook.unknown_field_ignored", { field: change.field });
      return;
  }
}

/** Routes ordinary messages, statuses, and errors to the existing handlers. */
async function processMessagesChange<Env extends Record<string, any>>(
  change: WebhookChange,
  _env: Env,
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

async function processHistoryChange(
  change: WebhookChange,
  config: WebhookConfig,
  log: Logger,
): Promise<void> {
  const value = change.value as CoexistenceHistoryValue;
  const requestId = value.request_id;
  let importedMessages = 0;
  let duplicateMessages = 0;
  let hasHistoryErrors = (value.errors?.length ?? 0) > 0;

  if (requestId && config.database?.coexistence) {
    await config.database.coexistence.updateSyncJobByRequestId(requestId, {
      status: "processing",
      metadata: { field: "history" },
    });
  }

  if (value.errors && value.errors.length > 0) {
    await processCoexistenceErrors(change, value, config, log);
  }

  for (const chunk of value.history ?? []) {
    if (chunk.errors && chunk.errors.length > 0) {
      hasHistoryErrors = true;
      await processCoexistenceErrors(
        change,
        { ...value, errors: chunk.errors },
        config,
        log,
      );
    }

    for (const message of chunk.messages ?? []) {
      const result = await importCoexistenceMessage({
        message,
        contacts: value.contacts,
        metadata: value.metadata,
        requestId,
        source: "history",
        config,
      });

      if (result === "created") {
        importedMessages += 1;
      } else if (result === "duplicate") {
        duplicateMessages += 1;
      }
    }

    for (const status of chunk.statuses ?? []) {
      await processStatusUpdate(status, config, log);
    }
  }

  if (requestId && config.database?.coexistence) {
    await config.database.coexistence.updateSyncJobByRequestId(requestId, {
      status: hasHistoryErrors ? "failed" : "completed",
      metadata: {
        field: "history",
        importedMessages,
        duplicateMessages,
      },
    });
  }

  await runOptionalHook(
    () =>
      config.onCoexistenceHistory?.({
        value,
        change,
        importedMessages,
        duplicateMessages,
      }),
    "webhook.on_coexistence_history_hook_failed",
    log,
  );
}

async function processSmbAppStateSyncChange(
  change: WebhookChange,
  config: WebhookConfig,
  log: Logger,
): Promise<void> {
  const value = change.value as CoexistenceSmbAppStateSyncValue;
  let upsertedContacts = 0;
  let removedContacts = 0;

  if (value.request_id && config.database?.coexistence) {
    await config.database.coexistence.updateSyncJobByRequestId(value.request_id, {
      status: "processing",
      metadata: { field: "smb_app_state_sync" },
    });
  }

  if (config.database?.coexistence) {
    for (const contact of value.contacts ?? []) {
      if (contact.removed) {
        await config.database.coexistence.removeContact({
          waId: contact.wa_id,
          phoneNumberId: value.metadata?.phone_number_id,
        });
        removedContacts += 1;
        continue;
      }

      await config.database.coexistence.upsertContact({
        waId: contact.wa_id,
        phoneNumberId: value.metadata?.phone_number_id,
        displayName: contact.profile?.name,
        removed: false,
        updatedAt: new Date().toISOString(),
        metadata: contact,
      });
      upsertedContacts += 1;
    }
  }

  if (value.request_id && config.database?.coexistence) {
    await config.database.coexistence.updateSyncJobByRequestId(value.request_id, {
      status: "completed",
      metadata: {
        field: "smb_app_state_sync",
        upsertedContacts,
        removedContacts,
      },
    });
  }

  await runOptionalHook(
    () =>
      config.onSmbAppStateSync?.({
        value,
        change,
        upsertedContacts,
        removedContacts,
      }),
    "webhook.on_smb_app_state_sync_hook_failed",
    log,
  );
}

async function processSmbMessageEchoesChange(
  change: WebhookChange,
  config: WebhookConfig,
  log: Logger,
): Promise<void> {
  const value = change.value as CoexistenceSmbMessageEchoesValue;
  let importedMessages = 0;
  let duplicateMessages = 0;

  for (const message of value.messages ?? []) {
    const result = await importCoexistenceMessage({
      message,
      contacts: value.contacts,
      metadata: value.metadata,
      source: "smb_message_echoes",
      forceDirection: "outgoing",
      config,
    });

    if (result === "created") {
      importedMessages += 1;
    } else if (result === "duplicate") {
      duplicateMessages += 1;
    }
  }

  await runOptionalHook(
    () =>
      config.onSmbMessageEcho?.({
        value,
        change,
        importedMessages,
        duplicateMessages,
      }),
    "webhook.on_smb_message_echo_hook_failed",
    log,
  );
}

async function processAccountUpdateChange(
  change: WebhookChange,
  config: WebhookConfig,
  log: Logger,
): Promise<void> {
  const value = change.value as CoexistenceAccountUpdateValue;

  if (config.database?.coexistence) {
    await config.database.coexistence.recordLifecycleEvent({
      wabaId: value.waba_info?.waba_id,
      phoneNumberId: value.phone_number_id,
      accountId: value.waba_info?.owner_business_id,
      event: value.event ?? "account_update",
      payload: value,
      createdAt: new Date().toISOString(),
    });
  }

  await runOptionalHook(
    () => config.onCoexistenceAccountUpdate?.({ value, change }),
    "webhook.on_coexistence_account_update_hook_failed",
    log,
  );
}

async function processCoexistenceErrors(
  change: WebhookChange,
  value: CoexistenceHistoryValue | CoexistenceUnsupportedValue,
  config: WebhookConfig,
  log: Logger,
): Promise<void> {
  const errors = value.errors ?? [];
  const requestId =
    "request_id" in value && typeof value.request_id === "string"
      ? value.request_id
      : undefined;

  if (requestId && config.database?.coexistence) {
    await config.database.coexistence.updateSyncJobByRequestId(requestId, {
      status: "failed",
      metadata: {
        field: change.field,
        errors,
        isHistoryOptOut: errors.some((error) => error.code === 2593109),
      },
    });
  }

  await runOptionalHook(
    () =>
      config.onCoexistenceUnsupportedMessage?.({
        value,
        change,
        errors,
      }),
    "webhook.on_coexistence_unsupported_hook_failed",
    log,
  );
}

async function importCoexistenceMessage(input: {
  message: IncomingMessage;
  contacts?: CoexistenceWebhookContact[];
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  requestId?: string;
  source: "history" | "smb_message_echoes";
  forceDirection?: WhatsAppDirection;
  config: WebhookConfig;
}): Promise<"created" | "duplicate" | "skipped"> {
  if (!input.config.database?.coexistence) {
    return "skipped";
  }

  const direction =
    input.forceDirection ??
    resolveMessageDirection(input.message, input.metadata?.display_phone_number);
  const contact = resolveCoexistenceContact(input.contacts, input.message);
  const phone = resolveConversationPhone(input.message, direction, contact);
  const created = await input.config.logger.logImportedMessage({
    phone,
    waMessageId: input.message.id,
    direction,
    content: getMessageContent(input.message),
    sentAt: parseWebhookTimestamp(input.message.timestamp),
    senderName: contact?.profile?.name,
    metadata: {
      source: input.source,
      requestId: input.requestId,
      phoneNumberId: input.metadata?.phone_number_id,
      raw: input.message,
    },
  });

  return created ? "created" : "duplicate";
}

function resolveMessageDirection(
  message: IncomingMessage,
  businessDisplayPhoneNumber: string | undefined,
): WhatsAppDirection {
  if (!businessDisplayPhoneNumber) {
    return "incoming";
  }

  return formatPhone(message.from) === formatPhone(businessDisplayPhoneNumber)
    ? "outgoing"
    : "incoming";
}

function resolveConversationPhone(
  message: IncomingMessage,
  direction: WhatsAppDirection,
  contact: CoexistenceWebhookContact | undefined,
): string {
  if (direction === "incoming") {
    return message.from;
  }

  const messageWithRecipient = message as IncomingMessage & {
    to?: string;
    recipient_id?: string;
  };

  return (
    messageWithRecipient.to ??
    messageWithRecipient.recipient_id ??
    contact?.wa_id ??
    message.from
  );
}

function parseWebhookTimestamp(timestamp: string): string {
  const sentAt = new Date(parseInt(timestamp, 10) * 1000);
  return Number.isNaN(sentAt.getTime())
    ? new Date().toISOString()
    : sentAt.toISOString();
}

async function runOptionalHook(
  run: () => Promise<void> | undefined,
  logEvent: string,
  log: Logger,
): Promise<void> {
  try {
    await run();
  } catch (error) {
    log.error(logEvent, serializeError(error));
  }
}

/**
 * Processes a single incoming message:
 * 1. Extracts human-readable content
 * 2. Atomically logs and deduplicates by waMessageId
 * 3. Calls {@link WebhookConfig.onMessage}
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

  const content = getMessageContent(message);
  const sentAt = new Date(parseInt(message.timestamp, 10) * 1000);
  const normalizedSentAt = Number.isNaN(sentAt.getTime())
    ? new Date().toISOString()
    : sentAt.toISOString();

  // Automatic logging (audit trail)
  const { id, type, text, from, timestamp, ...rawMetadata } = message;
  const created = await config.logger.logIncoming({
    phone,
    waMessageId: message.id,
    content,
    sentAt: normalizedSentAt,
    senderName: contact?.profile?.name,
    metadata: Object.keys(rawMetadata).length > 0 ? rawMetadata : undefined,
  });
  if (!created) {
    log.info("webhook.duplicate_ignored", {
      waMessageId: message.id,
      phone,
    });
    return;
  }

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

function resolveCoexistenceContact(
  contacts: CoexistenceWebhookContact[] | undefined,
  message: IncomingMessage,
): CoexistenceWebhookContact | undefined {
  if (!contacts || contacts.length === 0) {
    return undefined;
  }
  return contacts.find((c) => c.wa_id === message.from) ?? contacts[0];
}
