import { formatPhone } from "../utils/phone";
import { isMediaPlaceholder } from "../utils/media-placeholder";
import { type Logger, serializeError } from "../logger";
import type { BetterZapDatabase } from "../better-zap.types";
import type { MessageContext, StatusContext } from "../events";
import type { MessageLoggerService } from "../services/message-logger.service";
import type {
  ImportMessageResult,
  WhatsAppDirection,
} from "../services/message-logger.service";
import type {
  CoexistenceAccountOffboardedValue,
  CoexistenceAccountReconnectedValue,
  CoexistenceAccountUpdateValue,
  CoexistenceContactRecord,
  CoexistenceHistoryChunk,
  CoexistenceHistoryThread,
  CoexistenceHistoryValue,
  CoexistenceMessageEditValue,
  CoexistenceMessageRevokeValue,
  CoexistenceSmbAppStateSyncValue,
  CoexistenceSmbMessageEchoesValue,
  CoexistenceStateSyncItem,
  CoexistenceSyncType,
  CoexistenceUnsupportedValue,
  CoexistenceWebhookMessage,
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
import { storeMessageMedia, type WebhookMediaConfig } from "../media/store-message-media";

// ============================================
// Hook context types
// ============================================

export interface CoexistenceHistoryContext {
  value: CoexistenceHistoryValue;
  change: WebhookChange;
  importedMessages: number;
  /** Already stored, or repeated within this webhook. */
  duplicateMessages: number;
  /** Stored media placeholders replaced by the real media in this webhook. */
  upgradedMessages: number;
  /** Messages or statuses that could not be stored. Any failure fails the sync job. */
  failedMessages: number;
  /** From `request_id`, or the in-flight history job for this phone number. */
  requestId?: string;
  /** Highest `history[].metadata.progress` in this webhook (100 = complete). */
  progress?: number;
  phase?: number;
  chunkOrder?: number;
}

export interface SmbAppStateSyncContext {
  value: CoexistenceSmbAppStateSyncValue;
  change: WebhookChange;
  upsertedContacts: number;
  removedContacts: number;
  /** Non-contact items, unknown actions, or contacts without any identity. */
  skippedContacts: number;
  /** Contacts the store failed to write. Any failure fails the sync job. */
  failedContacts: number;
}

export interface SmbMessageEchoContext {
  /** `messages` holds the merged `message_echoes` and legacy `messages`. */
  value: CoexistenceSmbMessageEchoesValue;
  change: WebhookChange;
  importedMessages: number;
  duplicateMessages: number;
  /** Stored media placeholders replaced by real media. */
  upgradedMessages: number;
  failedMessages: number;
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
  profile?: { name?: string; username?: string };
  wa_id?: string;
  user_id?: string;
};

type ImportOutcome = ImportMessageResult | "skipped" | "failed";

type ImportTally = {
  importedMessages: number;
  duplicateMessages: number;
  upgradedMessages: number;
  failedMessages: number;
};

type ContactChange =
  | { kind: "upsert"; record: CoexistenceContactRecord }
  | { kind: "remove"; waId: string }
  | { kind: "skip"; reason: string; type?: string; action?: string };

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
  /**
   * Download incoming media into a `MediaStore`. Covers `messages`,
   * `smb_message_echoes` and `history`, including follow-up media that
   * replaces a placeholder. Omit to keep only the text label and media id.
   */
  media?: WebhookMediaConfig;
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
      await processIncomingMessage(
        message,
        contact,
        value.metadata?.phone_number_id,
        config,
        log,
      );
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
  const store = config.database?.coexistence;
  const chunks = value.history ?? [];
  const requestId = await resolveSyncRequestId(value, "history", config);
  const progress = readHistoryProgress(chunks);
  const tally: ImportTally = {
    importedMessages: 0,
    duplicateMessages: 0,
    upgradedMessages: 0,
    failedMessages: 0,
  };
  // Ids from documented thread messages; legacy flat copies of them are skipped.
  const threadMessageIds = new Set<string>();
  const historyErrors: WebhookError[] = [...(value.errors ?? [])];

  if (requestId && store) {
    await store.updateSyncJobByRequestId(requestId, {
      status: "processing",
      metadata: { field: "history" },
    });
  }

  if (historyErrors.length > 0) {
    await processCoexistenceErrors(change, value, config, log, requestId);
  }

  const importHistoryMessage = (
    message: CoexistenceWebhookMessage,
    thread?: CoexistenceHistoryThread,
  ) =>
    processHistoryMessage({
      message,
      thread,
      value,
      change,
      requestId,
      tally,
      config,
      log,
    });

  for (const chunk of chunks) {
    if (chunk.errors && chunk.errors.length > 0) {
      historyErrors.push(...chunk.errors);
      await processCoexistenceErrors(
        change,
        { ...value, errors: chunk.errors },
        config,
        log,
        requestId,
      );
    }

    for (const thread of chunk.threads ?? []) {
      for (const message of thread.messages ?? []) {
        if (isNonEmptyString(message?.id)) {
          threadMessageIds.add(message.id);
        }
        await importHistoryMessage(message, thread);
      }
    }

    for (const message of chunk.messages ?? []) {
      if (isNonEmptyString(message?.id) && threadMessageIds.has(message.id)) {
        tally.duplicateMessages += 1;
        continue;
      }
      await importHistoryMessage(message);
    }

    for (const status of chunk.statuses ?? []) {
      try {
        await processStatusUpdate(status, config, log);
      } catch (error) {
        tally.failedMessages += 1;
        log.error("webhook.coexistence_import_failed", {
          field: "history",
          waMessageId: status.id,
          requestId,
          ...serializeError(error),
        });
      }
    }
  }

  // Media asset deliveries for earlier media_placeholder history messages.
  for (const message of value.messages ?? []) {
    await importHistoryMessage(message);
  }

  if (requestId && store) {
    const hasHistoryErrors = historyErrors.length > 0;
    const failed = hasHistoryErrors || tally.failedMessages > 0;
    // Older payloads without chunk metadata complete per webhook, as before.
    const isLegacyShape =
      chunks.length > 0 &&
      chunks.every((chunk) => chunk.metadata === undefined && chunk.threads === undefined);
    const completed =
      !failed &&
      (progress.progress === 100 ||
        (progress.progress === undefined && isLegacyShape));
    const updatedAt = new Date();

    await store.updateSyncJobByRequestId(requestId, {
      status: failed ? "failed" : completed ? "completed" : "processing",
      ...(failed
        ? {
            failedAt: updatedAt,
            failureReason: hasHistoryErrors ? "history_errors" : "import_failed",
          }
        : completed
          ? { completedAt: updatedAt }
          : {}),
      updatedAt,
      metadata: {
        field: "history",
        ...tally,
        ...progress,
        ...(hasHistoryErrors
          ? {
              errors: historyErrors,
              isHistoryOptOut: historyErrors.some((error) => error.code === 2593109),
            }
          : {}),
      },
    });
  }

  await runOptionalHook(
    () =>
      config.hooks.onCoexistenceHistory?.({
        value,
        change,
        ...tally,
        requestId,
        ...progress,
      }),
    "webhook.on_coexistence_history_hook_failed",
    log,
  );
}

async function processHistoryMessage(input: {
  message: CoexistenceWebhookMessage;
  thread?: CoexistenceHistoryThread;
  value: CoexistenceHistoryValue;
  change: WebhookChange;
  requestId?: string;
  tally: ImportTally;
  config: WebhookProcessorConfig;
  log: Logger;
}): Promise<void> {
  const { message, value, change, config, log, tally } = input;

  if (!isNonEmptyString(message?.id)) {
    tally.failedMessages += 1;
    log.warn("webhook.coexistence_message_missing_id", { field: "history" });
    return;
  }

  if (isRevokeMessage(message)) {
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
    return;
  }

  if (isEditMessage(message)) {
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
    return;
  }

  if (isUnsupportedMessage(message)) {
    await runOptionalHook(
      () =>
        config.hooks.onCoexistenceUnsupportedMessage?.({
          value: {
            ...value,
            unsupported: true,
            errors: (message.errors ?? []).map(toWebhookError),
          },
          change,
          errors: (message.errors ?? []).map(toWebhookError),
        }),
      "webhook.on_coexistence_unsupported_hook_failed",
      log,
    );
    return;
  }

  const outcome = await importCoexistenceMessage({
    message,
    thread: input.thread,
    contacts: value.contacts,
    metadata: value.metadata,
    requestId: input.requestId,
    source: "history",
    config,
    log,
  });
  countImportOutcome(tally, outcome);
}

async function processSmbAppStateSyncChange(
  change: WebhookChange,
  config: WebhookProcessorConfig,
  log: Logger,
): Promise<void> {
  const value = change.value as CoexistenceSmbAppStateSyncValue;
  const store = config.database?.coexistence;
  const requestId = await resolveSyncRequestId(value, "smb_app_state_sync", config);
  const phoneNumberId = value.metadata?.phone_number_id;
  let upsertedContacts = 0;
  let removedContacts = 0;
  let skippedContacts = 0;
  let failedContacts = 0;
  const hasSyncErrors = (value.errors?.length ?? 0) > 0;

  if (requestId && store) {
    await store.updateSyncJobByRequestId(requestId, {
      status: "processing",
      metadata: { field: "smb_app_state_sync" },
    });
  }

  if (hasSyncErrors) {
    await processCoexistenceErrors(change, value, config, log, requestId);
  }

  if (!hasSyncErrors && store) {
    for (const contactChange of listContactChanges(value, phoneNumberId)) {
      if (contactChange.kind === "skip") {
        skippedContacts += 1;
        log.warn("webhook.coexistence_contact_skipped", {
          reason: contactChange.reason,
          type: contactChange.type,
          action: contactChange.action,
        });
        continue;
      }

      try {
        if (contactChange.kind === "remove") {
          await store.removeContact({ waId: contactChange.waId, phoneNumberId });
          removedContacts += 1;
        } else {
          await store.upsertContact(contactChange.record);
          upsertedContacts += 1;
        }
      } catch (error) {
        failedContacts += 1;
        log.error("webhook.coexistence_contact_failed", {
          field: "smb_app_state_sync",
          action: contactChange.kind === "remove" ? "remove" : "add",
          requestId,
          ...serializeError(error),
        });
      }
    }
  }

  if (requestId && store) {
    const failed = hasSyncErrors || failedContacts > 0;
    const updatedAt = new Date();
    await store.updateSyncJobByRequestId(requestId, {
      status: failed ? "failed" : "completed",
      ...(failed
        ? {
            failedAt: updatedAt,
            failureReason: hasSyncErrors ? "sync_errors" : "contact_storage_failed",
          }
        : { completedAt: updatedAt }),
      updatedAt,
      metadata: {
        field: "smb_app_state_sync",
        upsertedContacts,
        removedContacts,
        skippedContacts,
        failedContacts,
        errors: value.errors,
      },
    });
  }

  await runOptionalHook(
    () =>
      config.hooks.onSmbAppStateSync?.({
        value,
        change,
        upsertedContacts,
        removedContacts,
        skippedContacts,
        failedContacts,
      }),
    "webhook.on_smb_app_state_sync_hook_failed",
    log,
  );
}

/** Documented `state_sync` items first; legacy `contacts` only fill gaps. */
function listContactChanges(
  value: CoexistenceSmbAppStateSyncValue,
  phoneNumberId: string | undefined,
): ContactChange[] {
  const stateSyncChanges = (value.state_sync ?? []).map((item) =>
    toStateSyncContactChange(item, phoneNumberId),
  );
  const stateSyncIds = new Set(
    stateSyncChanges.flatMap((contactChange) =>
      contactChange.kind === "upsert"
        ? [contactChange.record.waId]
        : contactChange.kind === "remove"
          ? [contactChange.waId]
          : [],
    ),
  );
  const legacyChanges = (value.contacts ?? [])
    .filter((contact) => !stateSyncIds.has(contact.wa_id))
    .map((contact): ContactChange => {
      if (!isNonEmptyString(contact.wa_id)) {
        return { kind: "skip", reason: "missing_identity" };
      }
      if (contact.removed) {
        return { kind: "remove", waId: contact.wa_id };
      }
      return {
        kind: "upsert",
        record: {
          waId: contact.wa_id,
          phoneNumberId,
          displayName: contact.profile?.name,
          removed: false,
          updatedAt: new Date().toISOString(),
          metadata: contact,
        },
      };
    });

  return [...stateSyncChanges, ...legacyChanges];
}

function toStateSyncContactChange(
  item: CoexistenceStateSyncItem,
  phoneNumberId: string | undefined,
): ContactChange {
  const type = typeof item?.type === "string" ? item.type : undefined;
  const action = typeof item?.action === "string" ? item.action : undefined;

  if (type !== "contact") {
    return { kind: "skip", reason: "unsupported_type", type, action };
  }
  if (action !== "add" && action !== "remove") {
    return { kind: "skip", reason: "unsupported_action", type, action };
  }

  const contact = item.contact ?? {};
  // Meta omits the phone number when it is unavailable; fall back to the BSUID.
  const waId = [contact.phone_number, contact.user_id].find(isNonEmptyString);
  if (!waId) {
    return { kind: "skip", reason: "missing_identity", type, action };
  }

  if (action === "remove") {
    return { kind: "remove", waId };
  }

  return {
    kind: "upsert",
    record: {
      waId,
      phoneNumberId,
      displayName: contact.full_name ?? contact.first_name ?? contact.username,
      firstName: contact.first_name,
      userId: contact.user_id,
      parentUserId: contact.parent_user_id,
      username: contact.username,
      removed: false,
      updatedAt:
        parseWebhookTimestamp(item.metadata?.timestamp) ?? new Date().toISOString(),
      metadata: item,
    },
  };
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
  const rawValue = change.value as CoexistenceSmbMessageEchoesValue;
  const tally: ImportTally = {
    importedMessages: 0,
    duplicateMessages: 0,
    upgradedMessages: 0,
    failedMessages: 0,
  };
  // Documented message_echoes first; legacy messages only fill gaps.
  const echoes = rawValue.message_echoes ?? [];
  const echoIds = new Set(echoes.map((message) => message?.id).filter(isNonEmptyString));
  const messages: CoexistenceWebhookMessage[] = [...echoes];

  for (const message of rawValue.messages ?? []) {
    if (isNonEmptyString(message?.id) && echoIds.has(message.id)) {
      tally.duplicateMessages += 1;
      continue;
    }
    messages.push(message);
  }

  const value = { ...rawValue, messages };

  for (const message of messages) {
    const outcome = await importCoexistenceMessage({
      message,
      contacts: value.contacts,
      metadata: value.metadata,
      source: "smb_message_echoes",
      forceDirection: "outgoing",
      config,
      log,
    });
    countImportOutcome(tally, outcome);
  }

  await runOptionalHook(
    () => config.hooks.onSmbMessageEcho?.({ value, change, ...tally }),
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
  resolvedRequestId?: string,
): Promise<void> {
  const errors = value.errors ?? [];
  const requestId =
    resolvedRequestId ??
    ("request_id" in value && typeof value.request_id === "string"
      ? value.request_id
      : undefined);

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

/**
 * Meta's history and state sync webhooks do not carry `request_id`, so fall
 * back to the store's in-flight job for this phone number and sync type.
 */
async function resolveSyncRequestId(
  value: { request_id?: string; metadata?: { phone_number_id?: string } },
  syncType: CoexistenceSyncType,
  config: WebhookProcessorConfig,
): Promise<string | undefined> {
  if (isNonEmptyString(value.request_id)) {
    return value.request_id;
  }

  const store = config.database?.coexistence;
  const phoneNumberId = value.metadata?.phone_number_id;
  if (!store?.getInFlightSyncJob || !phoneNumberId) {
    return undefined;
  }

  const job = await store.getInFlightSyncJob({ phoneNumberId, syncType });
  return job?.requestId;
}

function readHistoryProgress(chunks: CoexistenceHistoryChunk[]): {
  progress?: number;
  phase?: number;
  chunkOrder?: number;
} {
  let latest: { progress?: number; phase?: number; chunkOrder?: number } = {};

  for (const chunk of chunks) {
    const metadata = chunk.metadata;
    if (typeof metadata?.progress !== "number") {
      continue;
    }
    if (latest.progress === undefined || metadata.progress >= latest.progress) {
      latest = {
        progress: metadata.progress,
        ...(typeof metadata.phase === "number" ? { phase: metadata.phase } : {}),
        ...(typeof metadata.chunk_order === "number"
          ? { chunkOrder: metadata.chunk_order }
          : {}),
      };
    }
  }

  return latest;
}

function countImportOutcome(tally: ImportTally, outcome: ImportOutcome) {
  if (outcome === "skipped") return;
  tally[TALLY_KEY[outcome]] += 1;
}

const TALLY_KEY = {
  created: "importedMessages",
  duplicate: "duplicateMessages",
  upgraded: "upgradedMessages",
  failed: "failedMessages",
} as const satisfies Record<Exclude<ImportOutcome, "skipped">, keyof ImportTally>;

async function importCoexistenceMessage(input: {
  message: CoexistenceWebhookMessage;
  thread?: CoexistenceHistoryThread;
  contacts?: CoexistenceWebhookContact[];
  metadata?: { display_phone_number?: string; phone_number_id?: string };
  requestId?: string;
  source: "history" | "smb_message_echoes";
  forceDirection?: WhatsAppDirection;
  config: WebhookProcessorConfig;
  log: Logger;
}): Promise<ImportOutcome> {
  if (!input.config.database?.coexistence) {
    return "skipped";
  }

  const { message, thread, log } = input;

  try {
    const direction =
      input.forceDirection ??
      resolveMessageDirection(message, input.metadata?.display_phone_number);
    const contact = resolveCoexistenceContact(input.contacts, message);
    const phone = resolveConversationPhone(message, direction, contact, thread);
    if (!phone) {
      throw new Error("Coexistence message has no conversation identity");
    }

    const resolveMessageContent =
      input.config.resolveMessageContent ?? defaultGetMessageContent;
    const sentAt = parseWebhookTimestamp(message.timestamp);
    if (!sentAt) {
      log.warn("webhook.coexistence_invalid_timestamp", {
        field: input.source,
        waMessageId: message.id,
      });
    }

    const userId = [
      message.from_user_id,
      message.to_user_id,
      thread?.context?.user_id,
    ].find(isNonEmptyString);
    const result = await input.config.logger.importMessage({
      phone,
      waMessageId: message.id,
      direction,
      content: resolveMessageContent(message),
      sentAt: sentAt ?? new Date().toISOString(),
      senderName:
        contact?.profile?.name ??
        contact?.profile?.username ??
        thread?.context?.username,
      metadata: {
        source: input.source,
        requestId: input.requestId,
        phoneNumberId: input.metadata?.phone_number_id,
        ...(userId ? { userId } : {}),
        ...(message.history_context?.status
          ? { historyStatus: message.history_context.status }
          : {}),
        ...(sentAt ? {} : { invalidTimestamp: true }),
        ...(isMediaPlaceholder(message) ? { mediaPending: true } : {}),
        raw: message,
      },
    });

    // New rows and upgraded placeholders get their media. Duplicates are
    // skipped so a replayed webhook never downloads twice.
    if (result === "created" || result === "upgraded") {
      await storeMessageMedia({
        message,
        phoneNumberId: input.metadata?.phone_number_id,
        media: input.config.media,
        logger: input.config.logger,
        log,
      });
    }
    return result;
  } catch (error) {
    log.error("webhook.coexistence_import_failed", {
      field: input.source,
      waMessageId: message.id,
      requestId: input.requestId,
      ...serializeError(error),
    });
    return "failed";
  }
}

function resolveMessageDirection(
  message: CoexistenceWebhookMessage,
  businessDisplayPhoneNumber: string | undefined,
): WhatsAppDirection {
  // Meta only sets from_user_id on messages sent by the WhatsApp user.
  if (isNonEmptyString(message.from_user_id)) {
    return "incoming";
  }

  if (!isNonEmptyString(message.from) || !businessDisplayPhoneNumber) {
    return "incoming";
  }

  return formatPhone(message.from) === formatPhone(businessDisplayPhoneNumber)
    ? "outgoing"
    : "incoming";
}

/** Phone numbers first, then business-scoped user IDs when Meta hides the phone. */
function resolveConversationPhone(
  message: CoexistenceWebhookMessage,
  direction: WhatsAppDirection,
  contact: CoexistenceWebhookContact | undefined,
  thread: CoexistenceHistoryThread | undefined,
): string | undefined {
  const candidates =
    direction === "incoming"
      ? [
          message.from,
          thread?.context?.wa_id,
          thread?.id,
          message.from_user_id,
          thread?.context?.user_id,
        ]
      : [
          message.to,
          message.recipient_id,
          thread?.id,
          thread?.context?.wa_id,
          message.to_user_id,
          thread?.context?.user_id,
          contact?.wa_id,
        ];

  return candidates.find(isNonEmptyString);
}

function parseWebhookTimestamp(timestamp: unknown): string | null {
  if (typeof timestamp !== "string" || !/^\d+$/.test(timestamp)) {
    return null;
  }

  const sentAt = new Date(Number(timestamp) * 1000);
  return Number.isNaN(sentAt.getTime()) ? null : sentAt.toISOString();
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
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
 * 3. Downloads its media when a `MediaStore` is configured
 * 4. Calls {@link WebhookProcessorHooks.onMessage}
 */
async function processIncomingMessage(
  message: IncomingMessage,
  contact: WebhookContact | undefined,
  phoneNumberId: string | undefined,
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

  await storeMessageMedia({
    message,
    phoneNumberId,
    media: config.media,
    logger: config.logger,
    log,
  });

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
  message: CoexistenceWebhookMessage,
): CoexistenceWebhookContact | undefined {
  if (!contacts || contacts.length === 0) {
    return undefined;
  }

  const identities = [
    message.from,
    message.to,
    message.from_user_id,
    message.to_user_id,
  ].filter(isNonEmptyString);
  const match = contacts.find(
    (contact) =>
      (contact.wa_id !== undefined && identities.includes(contact.wa_id)) ||
      (contact.user_id !== undefined && identities.includes(contact.user_id)),
  );
  if (match) {
    return match;
  }

  // Only legacy payloads without business-scoped IDs fall back to the first contact.
  const hasScopedIdentity =
    isNonEmptyString(message.from_user_id) || isNonEmptyString(message.to_user_id);
  return hasScopedIdentity ? undefined : contacts[0];
}

function isRevokeMessage(message: IncomingMessage) {
  return (
    message.revoked === true ||
    message.type === "revoke" ||
    message.type === "revoked"
  );
}

function isEditMessage(message: IncomingMessage) {
  return (
    message.edited === true ||
    message.type === "edit" ||
    message.type === "message_edit"
  );
}

function isUnsupportedMessage(message: IncomingMessage) {
  return (
    message.unsupported === true ||
    message.type === "unsupported" ||
    (message.errors?.length ?? 0) > 0
  );
}

function classifyCoexistenceMessages(
  messages: IncomingMessage[] | undefined,
): "edit" | "revoke" | "unsupported" | "ordinary" {
  if (!messages || messages.length === 0) {
    return "ordinary";
  }
  if (messages.some(isRevokeMessage)) {
    return "revoke";
  }
  if (messages.some(isEditMessage)) {
    return "edit";
  }
  if (messages.some(isUnsupportedMessage)) {
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
