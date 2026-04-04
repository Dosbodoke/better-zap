/**
 * Message Logger Service
 * LGPD-compliant logging of all WhatsApp messages.
 *
 * This service is generic and relies on interfaces for persistence and
 * optional sync event delivery.
 */

import type { SendResult } from "../types/whatsapp.types";
import type {
  Conversation,
  ConversationRecord,
  FreeformMessageWindow,
} from "../types/whatsapp.types";
import type { SyncEvent } from "../types/sync-events";
import { type Logger, serializeError } from "../logger";
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

/**
 * Interface for database persistence of WhatsApp logs.
 * Decouples Better Zap from any specific application database package.
 */
export interface WhatsAppLogStore {
  createWhatsAppLog(params: {
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
  }): Promise<WhatsAppLogRecord>;

  getMessageByWaId(waMessageId: string): Promise<WhatsAppLogRecord | null>;

  updateWhatsAppLogByWaMessageId(
    waMessageId: string,
    updates: Partial<WhatsAppLogRecord>,
  ): Promise<void>;

  /**
   * Atomically update status only if the new status advances the lifecycle.
   * Returns true if the row was updated, false if skipped (duplicate/regression).
   *
   * Progression: sent(1) → delivered(2) → read(3). failed(4) always wins.
   */
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

  /**
   * Check if there's a recent outgoing message to this phone within N hours.
   * Used for consumer-defined cooldown checks.
   */
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
    if (!this.notifier) {
      return;
    }

    try {
      await this.notifier.notify(event);
    } catch (err) {
      this.log.error("message_logger.sync_notify_failed", serializeError(err));
    }
  }

  async getConversationById(conversationId: string): Promise<Conversation | null> {
    const conversation = await this.store.getConversationById(conversationId);
    return conversation ? normalizeConversationRecord(conversation) : null;
  }

  async getConversationByPhone(phone: string): Promise<Conversation | null> {
    const conversation = await this.store.getConversationByPhone(phone);
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

  /**
   * Check if a message with this waMessageId was already processed.
   */
  async isDuplicate(waMessageId: string): Promise<boolean> {
    const existing = await this.store.getMessageByWaId(waMessageId);
    return !!existing;
  }

  /**
   * Log outgoing message for LGPD compliance
   */
  async logOutgoing(params: {
    phone: string;
    userId?: string;
    messageType: WhatsAppMessageType;
    content: string;
    result: SendResult;
    templateName?: string;
    metadata?: Record<string, any>;
  }): Promise<string> {
    const inserted = await this.store.createWhatsAppLog({
      phone: params.phone,
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

    const conversation = await this.getConversationById(inserted.conversationId);
    if (conversation) {
      await this.notify({
        type: "NEW_MESSAGE",
        message: inserted,
        conversation,
      });
    }
    return inserted.id;
  }

  /**
   * Update message status from webhook callback.
   * Only applies if the new status advances the lifecycle (atomic, no race conditions).
   * Returns true if the update was applied, false if skipped.
   */
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

  /**
   * Check if there's a recent outgoing message to this phone within N hours.
   *
   * @param {string} phone : The phone number to check (in E.164 format)
   * @param {number} [withinHours=24] : Time in hours to look for incoming messages
   */
  async hasRecentOutgoingMessage(
    phone: string,
    withinHours: number = 24,
  ): Promise<boolean> {
    return this.store.hasRecentOutgoingMessage(phone, withinHours);
  }

  /**
   * Log incoming message (for audit trail)
   */
  async logIncoming(params: {
    phone: string;
    waMessageId: string;
    content: string;
    sentAt: string;
    senderName?: string;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const inserted = await this.store.createWhatsAppLog({
      phone: params.phone,
      contactName: params.senderName,
      waMessageId: params.waMessageId,
      direction: "incoming",
      messageType: "incoming",
      content: params.content,
      status: "delivered",
      metadata: params.metadata,
      sentAt: params.sentAt,
    });

    const conversation = await this.getConversationById(inserted.conversationId);
    if (conversation) {
      await this.notify({
        type: "NEW_MESSAGE",
        message: inserted,
        conversation,
      });
    }
  }
}
