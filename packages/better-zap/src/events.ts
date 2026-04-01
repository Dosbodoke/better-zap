import type {
  IncomingMessage,
  MessageStatus,
  WebhookContact,
} from "./types/whatsapp.types";

export type MessageContext = {
  message: IncomingMessage;
  contact: WebhookContact | undefined;
  content: string;
  phone: string;
};

export type StatusContext = {
  status: MessageStatus;
  timestamp: string;
  errorMessage?: string;
  errorCode?: number;
};
