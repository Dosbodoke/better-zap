/**
 * Meta WhatsApp Cloud API v25.0 Type Definitions
 * https://developers.facebook.com/docs/whatsapp/cloud-api/reference/messages
 */

// ============================================
// Outgoing Message Types
// ============================================

export interface WhatsAppTextMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "text";
  text: {
    preview_url?: boolean;
    body: string;
  };
}

export interface WhatsAppTemplateMessage {
  messaging_product: "whatsapp";
  to: string;
  type: "template";
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: TemplateComponent[];
  };
}

export interface WhatsAppInteractiveButtonsMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "interactive";
  interactive: {
    type: "button";
    body: { text: string };
    action: {
      buttons: Array<{
        type: "reply";
        reply: { id: string; title: string };
      }>;
    };
  };
}

export interface WhatsAppInteractiveListMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "interactive";
  interactive: {
    type: "list";
    body: { text: string };
    action: {
      button: string;
      sections: Array<{
        title: string;
        rows: Array<{
          id: string;
          title: string;
          description?: string;
        }>;
      }>;
    };
  };
}

export interface WhatsAppInteractiveMediaCarouselMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "interactive";
  interactive: {
    type: "carousel";
    body: { text: string };
    action: {
      cards: WhatsAppCarouselCard[];
    };
  };
}

export interface InteractiveMediaCarouselCardInput {
  header: {
    type: "image" | "video";
    link: string;
  };
  bodyText?: string;
  button: {
    displayText: string;
    url: string;
  };
}

export interface SendInteractiveMediaCarouselData {
  to: string;
  body: string;
  cards: InteractiveMediaCarouselCardInput[];
}

export interface WhatsAppCarouselCard {
  card_index: number;
  type: "cta_url";
  header: {
    type: "image" | "video";
    image?: { link: string };
    video?: { link: string };
  };
  body?: {
    text: string;
  };
  action: {
    name: "cta_url";
    parameters: {
      display_text: string;
      url: string;
    };
  };
}

export interface WhatsAppLocationMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "location";
  location: {
    latitude: number;
    longitude: number;
    name: string;
    address: string;
  };
}

export interface WhatsAppReactionMessage {
  messaging_product: "whatsapp";
  recipient_type: "individual";
  to: string;
  type: "reaction";
  reaction: {
    message_id: string;
    emoji: string; // empty string removes reaction
  };
}

export interface TemplateComponent {
  type: "header" | "body" | "button";
  sub_type?: "url" | "quick_reply";
  index?: string;
  parameters: TemplateParameter[];
}

export interface TemplateParameter {
  type:
    | "text"
    | "currency"
    | "date_time"
    | "image"
    | "document"
    | "video"
    | "location"
    | "payload";
  parameter_name?: string;
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link: string;
  };
  video?: {
    link: string;
  };
  document?: {
    link: string;
  };
  location?: {
    latitude: number;
    longitude: number;
    name: string;
    address: string;
  };
  payload?: string;
}

// ============================================
// API Response Types
// ============================================

export interface SendMessageResponse {
  messaging_product: "whatsapp";
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export interface SendMessageError {
  error: {
    message: string;
    type: string;
    code: number;
    error_subcode?: number;
    error_data?: {
      messaging_product: string;
      details: string;
    };
    fbtrace_id: string;
  };
}

// ============================================
// Webhook Payload Types
// ============================================

export interface WebhookPayload {
  object: "whatsapp_business_account";
  entry: WebhookEntry[];
}

export interface WebhookEntry {
  id: string;
  changes: WebhookChange[];
}

export interface WebhookChange {
  value: WebhookValue;
  field: "messages";
}

export interface WebhookValue {
  messaging_product: "whatsapp";
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: WebhookContact[];
  messages?: IncomingMessage[];
  statuses?: MessageStatus[];
  errors?: WebhookError[];
}

export interface WebhookContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type:
    | "text"
    | "image"
    | "audio"
    | "video"
    | "document"
    | "location"
    | "contacts"
    | "interactive"
    | "button"
    | "reaction"
    | "sticker";
  text?: {
    body: string;
  };
  image?: MediaMessage;
  audio?: MediaMessage;
  video?: MediaMessage;
  document?: MediaMessage & { filename?: string };
  location?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
  button?: {
    text: string;
    payload: string;
  };
  interactive?: {
    type: "button_reply" | "list_reply";
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
  context?: {
    from: string;
    id: string;
  };
  referral?: {
    source_url: string;
    source_type: "ad" | "post";
    source_id: string;
    headline: string;
    body: string;
    ctwa_clid?: string;
  };
}

export interface MediaMessage {
  id: string;
  mime_type: string;
  sha256?: string;
  caption?: string;
}

export interface MessageStatus {
  id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin: {
      type: "business_initiated" | "user_initiated" | "referral_conversion";
    };
    expiration_timestamp?: string;
  };
  pricing?: {
    billable: boolean;
    pricing_model: "CBP";
    category: "business_initiated" | "user_initiated" | "referral_conversion";
  };
  errors?: MessageError[];
}

export interface MessageError {
  code: number;
  title: string;
  message: string;
  error_data?: {
    details: string;
  };
}

export interface WebhookError {
  code: number;
  title: string;
  message: string;
  error_data: {
    details: string;
  };
}

// ============================================
// Internal Types
// ============================================

export interface SendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  errorCode?: number;
  httpStatus?: number;
}

// ============================================
// UI Types
// ============================================

export type Conversation = {
  id: string;
  phone: string;
  contactName: string | null;
  unreadCount: number;
  status: string;
  lastMessageAt: string;
  lastMessagePreview: string | null;
  lastDirection: string;
  messageCount: number;
  lastIncomingMessageAt: string | null;
};

export type UIMessageStatus = "sent" | "delivered" | "read" | "failed";

export type UIMessage = {
  id: string;
  phone?: string;
  content: string | null;
  direction: "incoming" | "outgoing";
  status: UIMessageStatus | string;
  sentAt: string;
  templateName?: string | null;
  messageType?: string | null;
  metadata?: Record<string, any> | null;
};
