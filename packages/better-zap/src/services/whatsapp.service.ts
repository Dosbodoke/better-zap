/**
 * WhatsApp Cloud API Service
 * Direct integration with Meta's API (no third-party providers).
 */

import type { WhatsAppConfig } from "../types/config";
import { formatPhone } from "../utils/phone";
import { delay } from "../utils/delay";
import type {
  WhatsAppTextMessage,
  WhatsAppTemplateMessage,
  WhatsAppInteractiveButtonsMessage,
  WhatsAppInteractiveListMessage,
  WhatsAppInteractiveMediaCarouselMessage,
  WhatsAppCarouselCard,
  SendInteractiveMediaCarouselData,
  WhatsAppLocationMessage,
  WhatsAppReactionMessage,
  SendMessageResponse,
  SendMessageError,
  TemplateComponent,
  SendResult,
} from "../types/whatsapp.types";
import {
  MessageLoggerService,
  type WhatsAppMessageType,
} from "./message-logger.service";
import { type Logger, serializeError } from "../logger";

const META_API_VERSION = "v25.0";
const META_BASE_URL = "https://graph.facebook.com";

export interface OutgoingLoggingMetadata {
  userId?: string;
  messageType: WhatsAppMessageType;
  /** Human-readable content of the message to be stored in the log */
  content: string;
  /** Optional metadata for the log entry (e.g. campaign ID, additional context) */
  metadata?: Record<string, any>;
}

const CONTEXT_WINDOW_CLOSED_ERROR = "Free-form message window is closed.";

export class WhatsAppService {
  private baseUrl: string;
  private token: string;
  private isDev: boolean;
  private logger: MessageLoggerService;
  private log: Logger;

  constructor(
    config: WhatsAppConfig,
    logger: MessageLoggerService,
    log: Logger,
  ) {
    this.baseUrl = `${META_BASE_URL}/${META_API_VERSION}/${config.phoneId}/messages`;
    this.token = config.token;
    this.isDev = config.environment === "development";
    this.logger = logger;
    this.log = log;
  }

  /** Send a text message within the 24h free-form message window only. */
  async sendText(
    to: string,
    body: string,
    logging?: Omit<OutgoingLoggingMetadata, "content">,
  ): Promise<SendResult> {
    const normalizedPhone = formatPhone(to);
    const freeformMessageWindow = await this.logger.getFreeformMessageWindow(
      normalizedPhone,
    );

    if (!freeformMessageWindow.isOpen) {
      const result: SendResult = {
        success: false,
        error: CONTEXT_WINDOW_CLOSED_ERROR,
        code: "CONTEXT_WINDOW_CLOSED",
        httpStatus: 409,
        details: { freeformMessageWindow },
      };

      await this.logSendResult(
        normalizedPhone,
        logging
          ? {
              ...logging,
              messageType: logging.messageType || "bot_reply",
              content: body,
            }
          : undefined,
        result,
      );

      return result;
    }

    const hasUrl = /https?:\/\/\S+/i.test(body);
    const payload: WhatsAppTextMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: normalizedPhone,
      type: "text",
      text: hasUrl ? { body, preview_url: true } : { body },
    };

    return this.send(payload, {
      ...logging,
      messageType: logging?.messageType || "bot_reply",
      content: body,
    });
  }

  /** Send a template message (works outside service window). */
  async sendTemplate(
    to: string,
    templateName: string,
    languageCode: string = "pt_BR",
    components?: TemplateComponent[],
    logging?: OutgoingLoggingMetadata,
  ): Promise<SendResult> {
    const payload: WhatsAppTemplateMessage = {
      messaging_product: "whatsapp",
      to: formatPhone(to),
      type: "template",
      template: {
        name: templateName,
        language: { code: languageCode },
        ...(components && { components }),
      },
    };

    return this.send(payload, logging);
  }

  /** Send an interactive message with reply buttons (up to 3). */
  async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
    logging?: Omit<OutgoingLoggingMetadata, "content">,
  ): Promise<SendResult> {
    const payload: WhatsAppInteractiveButtonsMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formatPhone(to),
      type: "interactive",
      interactive: {
        type: "button",
        body: { text: bodyText },
        action: {
          buttons: buttons.map((b) => ({
            type: "reply" as const,
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    };

    return this.send(payload, {
      ...logging,
      messageType: logging?.messageType || "bot_reply",
      content: bodyText,
    });
  }

  /** Send an interactive list message with sections and rows. */
  async sendInteractiveList(
    to: string,
    bodyText: string,
    buttonLabel: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
    logging?: Omit<OutgoingLoggingMetadata, "content">,
  ): Promise<SendResult> {
    const payload: WhatsAppInteractiveListMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formatPhone(to),
      type: "interactive",
      interactive: {
        type: "list",
        body: { text: bodyText },
        action: {
          button: buttonLabel,
          sections,
        },
      },
    };

    return this.send(payload, {
      ...logging,
      messageType: logging?.messageType || "bot_reply",
      content: bodyText,
    });
  }

  /** Send an interactive media carousel message (2-10 cards). */
  async sendInteractiveMediaCarousel(
    data: SendInteractiveMediaCarouselData,
    logging?: Omit<OutgoingLoggingMetadata, "content">,
  ): Promise<SendResult> {
    const { to, body, cards } = data;

    if (cards.length < 2 || cards.length > 10) {
      return {
        success: false,
        error:
          "[sendInteractiveMediaCarousel] cards must contain between 2 and 10 items",
      };
    }

    const mappedCards: WhatsAppCarouselCard[] = cards.map((card, index) => ({
      card_index: index,
      type: "cta_url",
      header: {
        type: card.header.type,
        ...(card.header.type === "image"
          ? { image: { link: card.header.link } }
          : { video: { link: card.header.link } }),
      },
      ...(card.bodyText ? { body: { text: card.bodyText } } : {}),
      action: {
        name: "cta_url",
        parameters: {
          display_text: card.button.displayText,
          url: card.button.url,
        },
      },
    }));

    const payload: WhatsAppInteractiveMediaCarouselMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formatPhone(to),
      type: "interactive",
      interactive: {
        type: "carousel",
        body: { text: body },
        action: { cards: mappedCards },
      },
    };

    return this.send(payload, {
      ...logging,
      messageType: logging?.messageType || "bot_reply",
      content: body,
    });
  }

  /** Send a location pin message. */
  async sendLocation(
    to: string,
    latitude: number,
    longitude: number,
    name: string,
    address: string,
    logging?: Omit<OutgoingLoggingMetadata, "content">,
  ): Promise<SendResult> {
    const payload: WhatsAppLocationMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formatPhone(to),
      type: "location",
      location: { latitude, longitude, name, address },
    };

    return this.send(payload, {
      ...logging,
      messageType: logging?.messageType || "bot_reply",
      content: `[Localização: ${name} - ${address}]`,
    });
  }

  /**
   * Mark an inbound message as read.
   *
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/messages/mark-messages-as-read
   */
  async markAsRead(messageId: string): Promise<SendResult> {
    const payload = {
      messaging_product: "whatsapp" as const,
      status: "read" as const,
      message_id: messageId,
    };

    if (this.isDev) {
      this.log.debug("whatsapp.dev_send", { action: "mark_as_read", payload });
      return { success: true, messageId: `dev-${Date.now()}` };
    }

    return this.performRequest(payload, 0);
  }

  /**
   * Show or hide a typing indicator in the chat.
   * When starting, the indicator auto-dismisses after 25 seconds or when a message is sent.
   *
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/typing-indicators/
   */
  async typingIndicator(
    messageId: string,
    action: "typing_on" | "typing_off" = "typing_on",
  ): Promise<SendResult> {
    const payload = {
      messaging_product: "whatsapp" as const,
      status: "read" as const,
      message_id: messageId,
      typing_indicator: {
        type: action === "typing_on" ? ("text" as const) : undefined,
      },
    };

    if (this.isDev) {
      this.log.debug("whatsapp.dev_send", {
        action: "typing_indicator",
        typingAction: action,
        payload,
      });
      return { success: true, messageId: `dev-${Date.now()}` };
    }

    return this.performRequest(payload, 0);
  }

  /**
   * Add a reaction to a message.
   *
   * @see https://developers.facebook.com/docs/whatsapp/cloud-api/messages/reaction-messages
   */
  async sendReaction(
    to: string,
    messageId: string,
    emoji: string,
  ): Promise<SendResult> {
    const payload: WhatsAppReactionMessage = {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: formatPhone(to),
      type: "reaction",
      reaction: {
        message_id: messageId,
        emoji,
      },
    };

    return this.send(payload);
  }

  /** Core send method with retry logic (2 retries, exponential backoff). */
  private async send(
    payload:
      | WhatsAppTextMessage
      | WhatsAppTemplateMessage
      | WhatsAppInteractiveButtonsMessage
      | WhatsAppInteractiveListMessage
      | WhatsAppInteractiveMediaCarouselMessage
      | WhatsAppLocationMessage
      | WhatsAppReactionMessage,
    logging?: OutgoingLoggingMetadata,
    retries: number = 2,
  ): Promise<SendResult> {
    if (this.isDev) {
      this.log.debug("whatsapp.dev_send", { action: "send", payload });
      return {
        success: true,
        messageId: `dev-${Date.now()}`,
      };
    }

    const result = await this.performRequest(payload, retries);
    await this.logSendResult(
      payload.to,
      logging,
      result,
      payload.type === "template" ? payload.template.name : undefined,
    );

    return result;
  }

  private async logSendResult(
    phone: string,
    logging: OutgoingLoggingMetadata | undefined,
    result: SendResult,
    templateName?: string,
  ) {
    if (!logging) {
      return;
    }

    try {
      await this.logger.logOutgoing({
        phone,
        userId: logging.userId,
        messageType: logging.messageType,
        content: logging.content,
        templateName,
        result,
        metadata: logging.metadata,
      });
    } catch (logError) {
      this.log.error("whatsapp.log_failed", serializeError(logError));
    }
  }

  /** Actually performs the network request with retries. */
  private async performRequest(
    payload: any,
    retries: number,
  ): Promise<SendResult> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(this.baseUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          let errorData: SendMessageError | null = null;
          try {
            errorData = (await response.json()) as SendMessageError;
          } catch {
            errorData = null;
          }

          if (response.status === 429 && attempt < retries) {
            await delay(1000 * (attempt + 1));
            continue;
          }

          if (response.status >= 500 && attempt < retries) {
            await delay(500 * (attempt + 1));
            continue;
          }

          return {
            success: false,
            error: errorData?.error?.message || `HTTP ${response.status}`,
            errorCode: errorData?.error?.code,
            httpStatus: response.status,
          };
        }

        const data = (await response.json()) as SendMessageResponse;
        return {
          success: true,
          messageId: data.messages[0]?.id,
        };
      } catch (error) {
        if (attempt < retries) {
          await delay(500 * (attempt + 1));
          continue;
        }
        return {
          success: false,
          error: error instanceof Error ? error.message : "Network error",
        };
      }
    }

    return { success: false, error: "Max retries exceeded" };
  }
}
