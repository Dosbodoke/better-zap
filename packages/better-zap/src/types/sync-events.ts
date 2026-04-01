import type { WhatsAppLogRecord, WhatsAppStatus } from "../services/message-logger.service";
import type { Conversation } from "./whatsapp.types";

export type ConversationSummary = Conversation;

export type NewMessageEvent = {
  type: "NEW_MESSAGE";
  message: WhatsAppLogRecord;
  conversation: ConversationSummary;
};

export type StatusUpdateEvent = {
  type: "STATUS_UPDATE";
  waMessageId: string;
  status: WhatsAppStatus;
  timestamp: string;
  deliveredAt?: string | null;
  readAt?: string | null;
};

export type ConversationUpdateEvent = {
  type: "CONVERSATION_UPDATE";
  conversationId: string;
  updates: Partial<ConversationSummary>;
};

export type SyncEvent = NewMessageEvent | StatusUpdateEvent | ConversationUpdateEvent;
