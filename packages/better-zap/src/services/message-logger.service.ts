import type { SendResult } from "../types/whatsapp.types";
import type {
  Conversation,
  ConversationRecord,
  FreeformMessageWindow,
} from "../types/whatsapp.types";
import type { SyncEvent } from "../types/sync-events";
import { type Logger, serializeError } from "../logger";
import { hasPendingMedia } from "../utils/media-placeholder";
import { asRecord, mergeDefined } from "../utils/record";
import { normalizeWaId } from "../utils/phone";
import { tryCatch } from "../utils/result";
import { getMessageMedia } from "../media/message-media";
import type { MessageMedia } from "../media/types";
import {
  createFreeformMessageWindow,
  normalizeConversationRecord,
  normalizeConversationRecords,
} from "../freeform-message-window";

export type WhatsAppDirection = "incoming" | "outgoing";
export type WhatsAppStatus = "sent" | "delivered" | "read" | "failed";

export const WHATSAPP_MESSAGE_TYPES = [
  "queue_position",
  "next_in_line",
  "queue_optin",
  "marketing",
  "bot_reply",
  "reminder",
  "satisfaction",
  "incoming",
] as const;

export type WhatsAppMessageType = (typeof WHATSAPP_MESSAGE_TYPES)[number];

export interface WhatsAppLogRecord {
  id: string;
  conversationId: string;
  userId?: string | null;
  phone: string;
  waMessageId?: string | null;
  direction: WhatsAppDirection;
  messageType: WhatsAppMessageType;
  content: string | null;
  templateName?: string | null;
  status: WhatsAppStatus;
  errorMessage?: string | null;
  metadata?: any;
  sentAt: string;
  deliveredAt?: string | null;
  readAt?: string | null;
}

export type CreateWhatsAppLogParams = {
  phone: string;
  userId?: string;
  contactName?: string;
  direction: WhatsAppDirection;
  messageType: WhatsAppMessageType;
  content: string;
  templateName?: string;
  waMessageId?: string;
  status: WhatsAppStatus;
  errorMessage?: string;
  metadata?: any;
  sentAt: string;
};

export interface WhatsAppLogStore {
  createWhatsAppLog(
    params: CreateWhatsAppLogParams,
  ): Promise<{ record: WhatsAppLogRecord; created: boolean }>;

  getMessageByWaId(waMessageId: string): Promise<WhatsAppLogRecord | null>;

  updateWhatsAppLogByWaMessageId(
    waMessageId: string,
    updates: Partial<WhatsAppLogRecord>,
  ): Promise<void>;

  updateStatusIfProgressed(
    waMessageId: string,
    newStatus: WhatsAppStatus,
    updates: Partial<WhatsAppLogRecord>,
  ): Promise<boolean>;

  getConversationById(conversationId: string): Promise<ConversationRecord | null>;

  getConversationByPhone(phone: string): Promise<ConversationRecord | null>;

  getConversations(): Promise<ConversationRecord[]>;

  getMessagesByConversationPaginated(
    conversationId: string,
    cursor?: string | null,
    limit?: number,
  ): Promise<
    Array<{
      id: string;
      phone?: string;
      content: string | null;
      direction: string;
      status: string;
      sentAt: string;
      templateName?: string | null;
      messageType?: string | null;
      metadata?: any;
    }>
  >;

  hasRecentOutgoingMessage(
    phone: string,
    withinHours: number,
  ): Promise<boolean>;
}

export interface MessageLoggerNotifier {
  notify(event: SyncEvent): Promise<void>;
}

export class MessageLoggerService {
  private log: Logger;

  constructor(
    private store: WhatsAppLogStore,
    log: Logger,
    private notifier?: MessageLoggerNotifier,
  ) {
    this.log = log;
  }

  private async notify(event: SyncEvent) {
    const notifier = this.notifier;
    if (!notifier) return;

    const [, error] = await tryCatch(() => notifier.notify(event));
    if (error) this.log.error("message_logger.sync_notify_failed", serializeError(error));
  }

  private async notifyNewMessage(message: WhatsAppLogRecord) {
    const conversation = await this.getConversationById(message.conversationId);
    if (!conversation) return;
    await this.notify({ type: "NEW_MESSAGE", message, conversation });
  }

  async getConversationById(conversationId: string): Promise<Conversation | null> {
    const conversation = await this.store.getConversationById(conversationId);
    return conversation ? normalizeConversationRecord(conversation) : null;
  }

  async getConversationByPhone(phone: string): Promise<Conversation | null> {
    const conversation = await this.store.getConversationByPhone(normalizeWaId(phone));
    return conversation ? normalizeConversationRecord(conversation) : null;
  }

  async getConversations(): Promise<Conversation[]> {
    const conversations = await this.store.getConversations();
    return normalizeConversationRecords(conversations);
  }

  /** @deprecated Prefer `getFreeformMessageWindow()`. */
  async getCustomerCareWindow(phone: string): Promise<FreeformMessageWindow> {
    return this.getFreeformMessageWindow(phone);
  }

  async getFreeformMessageWindow(phone: string): Promise<FreeformMessageWindow> {
    const conversation = await this.getConversationByPhone(phone);
    return (
      conversation?.freeformMessageWindow ??
      createFreeformMessageWindow(null)
    );
  }

  async isDuplicate(waMessageId: string): Promise<boolean> {
    const existing = await this.store.getMessageByWaId(waMessageId);
    return !!existing;
  }

  async logOutgoing(params: {
    phone: string;
    userId?: string;
    messageType: WhatsAppMessageType;
    content: string;
    result: SendResult;
    templateName?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const { record: inserted } = await this.store.createWhatsAppLog({
      phone: normalizeWaId(params.phone),
      userId: params.userId,
      direction: "outgoing",
      messageType: params.messageType,
      content: params.content,
      templateName: params.templateName,
      waMessageId: params.result.messageId,
      status: params.result.success ? "sent" : "failed",
      errorMessage: params.result.error,
      sentAt: new Date().toISOString(),
      metadata: params.metadata,
    });

    await this.notifyNewMessage(inserted);
    return inserted.id;
  }

  async updateStatus(
    waMessageId: string,
    status: WhatsAppStatus,
    timestamp: string,
    errorMessage?: string,
  ): Promise<boolean> {
    const updates: Partial<WhatsAppLogRecord> = { status };

    if (status === "sent") {
      updates.sentAt = timestamp;
    } else if (status === "delivered") {
      updates.deliveredAt = timestamp;
    } else if (status === "read") {
      updates.readAt = timestamp;
    } else if (status === "failed") {
      updates.errorMessage = errorMessage;
    }

    const updated = await this.store.updateStatusIfProgressed(
      waMessageId,
      status,
      updates,
    );

    if (updated) {
      await this.notify({
        type: "STATUS_UPDATE",
        waMessageId,
        status,
        timestamp,
        deliveredAt: updates.deliveredAt,
        readAt: updates.readAt,
      });
    }

    return updated;
  }

  async hasRecentOutgoingMessage(
    phone: string,
    withinHours: number = 24,
  ): Promise<boolean> {
    return this.store.hasRecentOutgoingMessage(normalizeWaId(phone), withinHours);
  }

  async logIncoming(params: {
    phone: string;
    waMessageId: string;
    content: string;
    sentAt: string;
    senderName?: string;
    metadata?: Record<string, unknown>;
  }): Promise<boolean> {
    const { record: inserted, created } = await this.store.createWhatsAppLog({
      phone: normalizeWaId(params.phone),
      contactName: params.senderName,
      waMessageId: params.waMessageId,
      direction: "incoming",
      messageType: "incoming",
      content: params.content,
      status: "delivered",
      metadata: params.metadata,
      sentAt: params.sentAt,
    });

    if (!created) {
      return false;
    }

    await this.notifyNewMessage(inserted);
    return true;
  }

  async logImportedMessage(params: ImportMessageParams): Promise<boolean> {
    return (await this.importMessage(params)) === "created";
  }

  async importMessage(params: ImportMessageParams): Promise<ImportMessageResult> {
    const { record, created } = await this.store.createWhatsAppLog({
      phone: normalizeWaId(params.phone),
      contactName: params.senderName,
      waMessageId: params.waMessageId,
      direction: params.direction,
      messageType:
        params.messageType ??
        (params.direction === "incoming" ? "incoming" : "bot_reply"),
      content: params.content,
      status: params.direction === "incoming" ? "delivered" : "sent",
      metadata: params.metadata,
      sentAt: params.sentAt,
    });

    if (!created) {
      const upgraded = await this.replaceMediaPlaceholder(record, params);
      return upgraded ? "upgraded" : "duplicate";
    }

    await this.notifyNewMessage(record);
    return "created";
  }

  async setMessageMedia(
    waMessageId: string,
    media: MessageMedia,
  ): Promise<WhatsAppLogRecord | null> {
    const existing = await this.store.getMessageByWaId(waMessageId);
    if (!existing) return null;

    const alreadyStored = getMessageMedia(existing)?.status === "stored";
    if (alreadyStored && media.status !== "stored") return null;

    return this.updateMessage(waMessageId, existing, {
      metadata: { ...asRecord(existing.metadata), media },
    });
  }

  private async updateMessage(
    waMessageId: string,
    existing: WhatsAppLogRecord,
    updates: Partial<WhatsAppLogRecord>,
  ): Promise<WhatsAppLogRecord> {
    await this.store.updateWhatsAppLogByWaMessageId(waMessageId, updates);
    const message = { ...existing, ...updates };
    await this.notify({ type: "MESSAGE_UPDATE", message });
    return message;
  }

  private async replaceMediaPlaceholder(
    existing: WhatsAppLogRecord | undefined,
    params: ImportMessageParams,
  ): Promise<boolean> {
    if (!existing || !hasPendingMedia(existing)) return false;
    if (hasPendingMedia({ metadata: params.metadata })) return false;

    const metadata = mergeDefined(asRecord(existing.metadata), params.metadata);
    delete metadata.mediaPending;

    await this.updateMessage(params.waMessageId, existing, {
      content: params.content,
      metadata,
    });
    return true;
  }
}

export type ImportMessageParams = {
  phone: string;
  waMessageId: string;
  direction: WhatsAppDirection;
  content: string;
  sentAt: string;
  senderName?: string;
  messageType?: WhatsAppMessageType;
  metadata?: Record<string, unknown>;
};

export type ImportMessageResult = "created" | "duplicate" | "upgraded";
