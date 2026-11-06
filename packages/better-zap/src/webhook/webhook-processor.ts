import { formatPhone } from "../utils/phone";
import { type Logger, serializeError } from "../logger";
import type { BetterZapDatabase } from "../better-zap.types";
import type { MessageContext, StatusContext } from "../events";
import type { MessageLoggerService } from "../services/message-logger.service";
import type { WhatsAppDirection } from "../services/message-logger.service";
import type {
  CoexistenceAccountOffboardedValue,
  CoexistenceAccountReconnectedValue,
  CoexistenceAccountUpdateValue,
  CoexistenceHistoryValue,
  CoexistenceMessageEditValue,
  CoexistenceMessageRevokeValue,
  CoexistenceSmbAppStateSyncValue,
  CoexistenceSmbMessageEchoesValue,
  CoexistenceUnsupportedValue,
} from "../types/coexistence.types";
import type {
  IncomingMessage,
  MessageStatus,
  WebhookChange,
  WebhookContact,
  WebhookEntry,
  WebhookError,
  WebhookPayload,
} from "../types/whatsapp.types";
import { getMessageContent as defaultGetMessageContent } from "./message-content";

// ============================================
// Hook context types
// ============================================

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

export interface CoexistenceAccountOffboardedContext {
  value: CoexistenceAccountOffboardedValue;
  change: WebhookChange;
}

export interface CoexistenceAccountReconnectedContext {
  value: CoexistenceAccountReconnectedValue;
  change: WebhookChange;
}

export interface CoexistenceMessageEditContext {
  value: CoexistenceMessageEditValue;
  change: WebhookChange;
  editedMessages: number;
}

export interface CoexistenceMessageRevokeContext {
  value: CoexistenceMessageRevokeValue;
  change: WebhookChange;
  revokedMessages: number;
}

export interface CoexistenceUnsupportedMessageContext {
  value:
    | CoexistenceHistoryValue
    | CoexistenceSmbAppStateSyncValue
    | CoexistenceUnsupportedValue;
  change: WebhookChange;
  errors: WebhookError[];
}

type CoexistenceWebhookContact = {
  profile?: { name?: string };
  wa_id: string;
};

// ============================================
// Processor interface
// ============================================

export interface WebhookProcessorHooks {
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
  /** Called once per coexistence offboarding lifecycle webhook. */
  onCoexistenceAccountOffboarded?: (
    ctx: CoexistenceAccountOffboardedContext,
  ) => Promise<void>;
  /** Called once per coexistence background reconnection lifecycle webhook. */
  onCoexistenceAccountReconnected?: (
    ctx: CoexistenceAccountReconnectedContext,
  ) => Promise<void>;
  /** Called for coexistence message edit webhooks. */
  onCoexistenceMessageEdit?: (
    ctx: CoexistenceMessageEditContext,
  ) => Promise<void>;
  /** Called for coexistence message revoke webhooks. */
  onCoexistenceMessageRevoke?: (
    ctx: CoexistenceMessageRevokeContext,
  ) => Promise<void>;
  /** Called when a coexistence webhook contains unsupported/error content. */
  onCoexistenceUnsupportedMessage?: (
    ctx: CoexistenceUnsupportedMessageContext,
  ) => Promise<void>;
  /**
   * Called for Meta platform-level errors.
   * @default Uses the configured {@link WebhookProcessorConfig.log} logger's {@code error} method.
   */
  onError?: (error: WebhookError) => void;
}

export interface WebhookProcessorConfig {
  /** logger for automatic message storage. */
  logger: MessageLoggerService;
  /** Structured logger for operational logging. */
  log: Logger;
  /** Optional database contracts used for automatic coexistence persistence. */
  database?: BetterZapDatabase;
  /** The dispatch hooks called for each webhook event. */
  hooks: WebhookProcessorHooks;
  /** Seam for human-readable message content. Defaults to the built-in pt-BR resolver. */
  resolveMessageContent?: (message: IncomingMessage) => string;
}

export interface WebhookProcessor {
  /** Dispatches one Meta webhook payload. Never throws: all errors are logged. */
  process(payload: WebhookPayload): Promise<void>;
}

export function createWebhookProcessor(
  config: WebhookProcessorConfig,
): WebhookProcessor {
  return {
    process: (payload: WebhookPayload) => processPayload(payload, config),
  };
}

// ============================================
// Internal Pipeline
// ============================================

/** Top-level dispatcher — iterates entries in the webhook payload. */
async function processPayload(
  payload: WebhookPayload,
  config: WebhookProcessorConfig,
): Promise<void> {
  const log = config.log;
  try {
    if (payload.object !== "whatsapp_business_account") {
      log.debug("webhook.ignored_payload", { object: payload.object });
      return;
    }

    for (const entry of payload.entry) {
      await processEntry(entry, config, log);
    }
  } catch (error) {
    log.error("webhook.async_process_error", serializeError(error));
  }
}

/** Iterates changes within a single entry. */
async function processEntry(
  entry: WebhookEntry,
  config: WebhookProcessorConfig,
  log: Logger,
): Promise<void> {
  for (const change of entry.changes) {
    await processChange(change, config, log);
  }
}

/** Routes webhook changes to field-specific processors. */
async function processChange(
  change: WebhookChange,
  config: WebhookProcessorConfig,
  log: Logger,
): Promise<void> {
  switch (change.field) {
    case "messages":
      await processMessagesChange(change, config, log);
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
    case "account_offboarded":
      await processAccountOffboardedChange(change, config, log);
      return;
    case "account_reconnected":
      await processAccountReconnectedChange(change, config, log);
      return;
    default:
      log.debug("webhook.unknown_field_ignored", { field: change.field });
      return;
  }
}

/** Routes ordinary messages, statuses, and errors to the existing handlers. */
async function processMessagesChange(
  change: WebhookChange,
  config: WebhookProcessorConfig,
  log: Logger,
): Promise<void> {
  const value = change.value;

  const messageClassification = classifyCoexistenceMessages(value.messages);
  if (messageClassification === "edit") {
    await processMessageEditChange(change, config, log);
    return;
  }
  if (messageClassification === "revoke") {
    await processMessageRevokeChange(change, config, log);
    return;
  }
  if (messageClassification === "unsupported") {
    await processUnsupportedMessagesChange(change, config, log);
    return;
  }

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
      config.hooks.onError ??
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
  config: WebhookProcessorConfig,
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
      if (message.revoked || message.type === "revoked") {
        await runOptionalHook(
          () =>
            config.hooks.onCoexistenceMessageRevoke?.({
              value: { ...value, messages: [message] },
              change,
              revokedMessages: 1,
            }),
          "webhook.on_coexistence_message_revoke_hook_failed",
          log,
        );
        continue;
      }

      if (message.edited || message.type === "message_edit") {
        await runOptionalHook(
          () =>
            config.hooks.onCoexistenceMessageEdit?.({
              value: { ...value, messages: [message] },
              change,
              editedMessages: 1,
            }),
          "webhook.on_coexistence_message_edit_hook_failed",
          log,
        );
        continue;
      }

      if (
        message.unsupported ||
        message.type === "unsupported" ||
        (message.errors?.length ?? 0) > 0
      ) {
        await processCoexistenceErrors(
          change,
          {
            ...value,
            unsupported: true,
            errors: (message.errors ?? []).map(toWebhookError),
          },
          config,
          log,
        );
        continue;
      }

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
    const updatedAt = new Date();
    await config.database.coexistence.updateSyncJobByRequestId(requestId, {
      status: hasHistoryErrors ? "failed" : "completed",
      ...(hasHistoryErrors
        ? { failedAt: updatedAt }
        : { completedAt: updatedAt }),
      updatedAt,
      metadata: {
        field: "history",
        importedMessages,
        duplicateMessages,
      },
    });
  }

  await runOptionalHook(
    () =>
      config.hooks.onCoexistenceHistory?.({
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
  config: WebhookProcessorConfig,
  log: Logger,
): Promise<void> {
  const value = change.value as CoexistenceSmbAppStateSyncValue;
  let upsertedContacts = 0;
  let removedContacts = 0;
  const hasSyncErrors = (value.errors?.length ?? 0) > 0;

  if (value.request_id && config.database?.coexistence) {
    await config.database.coexistence.updateSyncJobByRequestId(
      value.request_id,
      {
        status: "processing",
        metadata: { field: "smb_app_state_sync" },
      },
    );
  }

  if (hasSyncErrors) {
    await processCoexistenceErrors(change, value, config, log);
  }

  if (!hasSyncErrors && config.database?.coexistence) {
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
    const updatedAt = new Date();
    await config.database.coexistence.updateSyncJobByRequestId(
      value.request_id,
      {
        status: hasSyncErrors ? "failed" : "completed",
        ...(hasSyncErrors
          ? { failedAt: updatedAt }
          : { completedAt: updatedAt }),
        updatedAt,
        metadata: {
          field: "smb_app_state_sync",
          upsertedContacts,
          removedContacts,
          errors: value.errors,
        },
      },
    );
  }

  await runOptionalHook(
    () =>
      config.hooks.onSmbAppStateSync?.({
        value,
        change,
        upsertedContacts,
        removedContacts,
      }),
    "webhook.on_smb_app_state_sync_hook_failed",
    log,
  );
}

async function processMessageEditChange(
  change: WebhookChange,
  config: WebhookProcessorConfig,
  log: Logger,
): Promise<void> {
  const value = change.value as CoexistenceMessageEditValue;
  const editedMessages = value.messages.length;

  await runOptionalHook(
    () =>
      config.hooks.onCoexistenceMessageEdit?.({ value, change, editedMessages }),
    "webhook.on_coexistence_message_edit_hook_failed",
    log,
  );
}

async function processMessageRevokeChange(
  change: WebhookChange,
  config: WebhookProcessorConfig,
  log: Logger,
): Promise<void> {
  const value = change.value as CoexistenceMessageRevokeValue;
  const revokedMessages = value.messages.length;

  await runOptionalHook(
    () =>
      config.hooks.onCoexistenceMessageRevoke?.({
        value,
        change,
        revokedMessages,
      }),
    "webhook.on_coexistence_message_revoke_hook_failed",
    log,
  );
}

async function processUnsupportedMessagesChange(
  change: WebhookChange,
  config: WebhookProcessorConfig,
  log: Logger,
): Promise<void> {
  const value = change.value as CoexistenceUnsupportedValue;
  const errors = [
    ...(value.errors ?? []),
    ...((value.messages ?? []) as IncomingMessage[]).flatMap((message) =>
      (message.errors ?? []).map(toWebhookError),
    ),
  ];

  await runOptionalHook(
    () =>
      config.hooks.onCoexistenceUnsupportedMessage?.({
        value,
        change,
        errors,
      }),
    "webhook.on_coexistence_unsupported_hook_failed",
    log,
  );
}

async function processSmbMessageEchoesChange(
  change: WebhookChange,
  config: WebhookProcessorConfig,
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
      config.hooks.onSmbMessageEcho?.({
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
  config: WebhookProcessorConfig,
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
    () => config.hooks.onCoexistenceAccountUpdate?.({ value, change }),
    "webhook.on_coexistence_account_update_hook_failed",
    log,
  );
}

async function processAccountOffboardedChange(
  change: WebhookChange,
  config: WebhookProcessorConfig,
  log: Logger,
): Promise<void> {
  const value = change.value as CoexistenceAccountOffboardedValue;
  const now = new Date().toISOString();

  if (config.database?.coexistence) {
    await config.database.coexistence.recordLifecycleEvent({
      wabaId: value.waba_info?.waba_id,
      phoneNumberId: value.phone_number_id ?? value.metadata?.phone_number_id,
      accountId: value.waba_info?.owner_business_id,
      event: value.event ?? "ACCOUNT_OFFBOARDED",
      payload: value,
      createdAt: now,
    });
    await upsertLifecycleAccountState(value, config, {
      status: "offboarded",
      usable: false,
      offboardedAt: now,
      updatedAt: now,
      metadata: {
        lifecycleEvent: "account_offboarded",
        reason: value.reason,
        raw: value,
      },
    });
  }

  await runOptionalHook(
    () => config.hooks.onCoexistenceAccountOffboarded?.({ value, change }),
    "webhook.on_coexistence_account_offboarded_hook_failed",
    log,
  );
}

async function processAccountReconnectedChange(
  change: WebhookChange,
  config: WebhookProcessorConfig,
  log: Logger,
): Promise<void> {
  const value = change.value as CoexistenceAccountReconnectedValue;
  const now = new Date().toISOString();

  if (config.database?.coexistence) {
    await config.database.coexistence.recordLifecycleEvent({
      wabaId: value.waba_info?.waba_id,
      phoneNumberId: value.phone_number_id ?? value.metadata?.phone_number_id,
      accountId: value.waba_info?.owner_business_id,
      event: value.event ?? "ACCOUNT_RECONNECTED",
      payload: value,
      createdAt: now,
    });
    await upsertLifecycleAccountState(value, config, {
      status: "reconnected",
      usable: true,
      reconnectedAt: now,
      updatedAt: now,
      metadata: {
        lifecycleEvent: "account_reconnected",
        reconnectReason: value.reconnect_reason,
        cloudApiProducts: value.cloud_api_products,
        raw: value,
      },
    });
  }

  await runOptionalHook(
    () => config.hooks.onCoexistenceAccountReconnected?.({ value, change }),
    "webhook.on_coexistence_account_reconnected_hook_failed",
    log,
  );
}

async function processCoexistenceErrors(
  change: WebhookChange,
  value:
    | CoexistenceHistoryValue
    | CoexistenceSmbAppStateSyncValue
    | CoexistenceUnsupportedValue,
  config: WebhookProcessorConfig,
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
      config.hooks.onCoexistenceUnsupportedMessage?.({
        value,
        change,
        errors,
      }),
    "webhook.on_coexistence_unsupported_hook_failed",
    log,
  );
}

async function upsertLifecycleAccountState(
  value: CoexistenceAccountOffboardedValue | CoexistenceAccountReconnectedValue,
  config: WebhookProcessorConfig,
  patch: {
    status: "offboarded" | "reconnected";
    usable: boolean;
    offboardedAt?: string;
    reconnectedAt?: string;
    updatedAt: string;
    metadata: Record<string, unknown>;
  },
) {
  const store = config.database?.coexistence;
  const phoneNumberId = value.phone_number_id ?? value.metadata?.phone_number_id;
  const wabaId = value.waba_info?.waba_id;

  if (!store || !phoneNumberId || !wabaId) {
    return;
  }

  const existing =
    (await store.getConnectedAccountByPhoneNumberId(phoneNumberId)) ??
    (await store.getConnectedAccountByWabaId(wabaId));

  await store.upsertConnectedAccount({
    wabaId,
    phoneNumberId,
    accountId: value.waba_info?.owner_business_id ?? existing?.accountId,
    businessId: existing?.businessId,
    displayPhoneNumber:
      value.metadata?.display_phone_number ?? existing?.displayPhoneNumber,
    ...existing,
    ...patch,
    metadata: {
      ...existing?.metadata,
      ...patch.metadata,
    },
  });
}

async function importCoexistenceMessage(input: {
  message: IncomingMessage;
  contacts?: CoexistenceWebhookContact[];
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  requestId?: string;
  source: "history" | "smb_message_echoes";
  forceDirection?: WhatsAppDirection;
  config: WebhookProcessorConfig;
}): Promise<"created" | "duplicate" | "skipped"> {
  if (!input.config.database?.coexistence) {
    return "skipped";
  }

  const direction =
    input.forceDirection ??
    resolveMessageDirection(input.message, input.metadata?.display_phone_number);
  const contact = resolveCoexistenceContact(input.contacts, input.message);
  const phone = resolveConversationPhone(input.message, direction, contact);
  const resolveMessageContent =
    input.config.resolveMessageContent ?? defaultGetMessageContent;
  const created = await input.config.logger.logImportedMessage({
    phone,
    waMessageId: input.message.id,
    direction,
    content: resolveMessageContent(input.message),
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
 * 3. Calls {@link WebhookProcessorHooks.onMessage}
 */
async function processIncomingMessage(
  message: IncomingMessage,
  contact: WebhookContact | undefined,
  config: WebhookProcessorConfig,
  log: Logger,
): Promise<void> {
  const phone = message.from;

  log.info("webhook.message_received", {
    waMessageId: message.id,
    phone,
    messageType: message.type,
  });

  const resolveMessageContent =
    config.resolveMessageContent ?? defaultGetMessageContent;
  const content = resolveMessageContent(message);
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
    await config.hooks.onMessage(ctx);
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
 * 4. Calls {@link WebhookProcessorHooks.onStatusUpdate} only if the update was applied
 */
async function processStatusUpdate(
  status: MessageStatus,
  config: WebhookProcessorConfig,
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
    await config.hooks.onStatusUpdate(ctx);
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

function classifyCoexistenceMessages(
  messages: IncomingMessage[] | undefined,
): "edit" | "revoke" | "unsupported" | "ordinary" {
  if (!messages || messages.length === 0) {
    return "ordinary";
  }
  if (
    messages.some((message) => message.revoked || message.type === "revoked")
  ) {
    return "revoke";
  }
  if (
    messages.some(
      (message) => message.edited || message.type === "message_edit",
    )
  ) {
    return "edit";
  }
  if (
    messages.some(
      (message) =>
        message.unsupported ||
        message.type === "unsupported" ||
        (message.errors?.length ?? 0) > 0,
    )
  ) {
    return "unsupported";
  }
  return "ordinary";
}

function toWebhookError(error: {
  code: number;
  title: string;
  message: string;
  error_data?: { details: string };
}): WebhookError {
  return {
    ...error,
    error_data: error.error_data ?? { details: error.message },
  };
}
