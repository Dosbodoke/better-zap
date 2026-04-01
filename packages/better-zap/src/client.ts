/**
 * Client-side SDK for Better Zap.
 *
 * Usage:
 * ```ts
 * import { createZapClient } from "better-zap/client";
 *
 * export const zapClient = createZapClient();
 *
 * // Then anywhere in your app:
 * await zapClient.send.text({ to: "5511...", body: "Hello!" });
 * const conversations = await zapClient.conversations.list();
 * const messages = await zapClient.conversations.messages("5511999998888");
 * ```
 */

import type {
  SendResult,
  Conversation,
  UIMessage,
  SendInteractiveMediaCarouselData,
} from "./types/whatsapp.types";
import type { OutgoingLoggingMetadata } from "./services/whatsapp.service";
import type {
  TemplateName,
  TemplateParams,
  TemplateRegistry,
} from "./template-registry";

interface ZapClientOptions<TTemplates extends TemplateRegistry = {}> {
  /**
   * Base URL for the API. Defaults to `window.location.origin` in the browser.
   * Useful for SSR or custom proxy setups.
   */
  baseURL?: string;
  /**
   * Base path for all routes. Must match the `basePath` used in `betterZap()`.
   * @default "/api/whatsapp"
   */
  basePath?: string;
  /**
   * Custom fetch implementation. Defaults to the global `fetch`.
   */
  fetch?: typeof fetch;
  /**
   * Optional template registry used only for type inference.
   * The HTTP server still owns runtime serialization and validation.
   */
  templates?: TTemplates;
}

interface SendTextParams {
  to: string;
  body: string;
  messageType?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

interface SendTemplateRawParams {
  to: string;
  template: string;
  language?: string;
  components?: unknown[];
  logging?: OutgoingLoggingMetadata;
}

type SendTemplateTypedParams<
  TTemplates extends TemplateRegistry,
  TName extends TemplateName<TTemplates>,
> = {
  to: string;
  template: TName;
  language?: string;
  params: TemplateParams<TTemplates[TName]>;
  logging?: OutgoingLoggingMetadata;
};

type SendTemplateMethod<TTemplates extends TemplateRegistry> =
  [TemplateName<TTemplates>] extends [never]
    ? (params: SendTemplateRawParams) => Promise<SendResult>
    : <TName extends TemplateName<TTemplates>>(
        params: SendTemplateTypedParams<TTemplates, TName>,
      ) => Promise<SendResult>;

type RuntimeSendTemplateParams =
  | SendTemplateRawParams
  | {
      to: string;
      template: string;
      language?: string;
      params?: Record<string, unknown>;
      logging?: OutgoingLoggingMetadata;
    };

interface SendInteractiveParams {
  to: string;
  type: "button" | "list" | "carousel";
  body: string;
  buttons?: Array<{ id: string; title: string }>;
  buttonLabel?: string;
  sections?: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }>;
  cards?: SendInteractiveMediaCarouselData["cards"];
  messageType?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

interface SendLocationParams {
  to: string;
  latitude: number;
  longitude: number;
  name: string;
  address: string;
  messageType?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
}

interface GetMessagesOptions {
  cursor?: string;
  limit?: number;
}

export interface ZapClient<TTemplates extends TemplateRegistry = {}> {
  send: {
    text(params: SendTextParams): Promise<SendResult>;
    template: SendTemplateMethod<TTemplates>;
    templateRaw(params: SendTemplateRawParams): Promise<SendResult>;
    interactive(params: SendInteractiveParams): Promise<SendResult>;
    location(params: SendLocationParams): Promise<SendResult>;
  };
  conversations: {
    list(): Promise<Conversation[]>;
    get(phone: string): Promise<Conversation | null>;
    messages(phone: string, opts?: GetMessagesOptions): Promise<UIMessage[]>;
  };
}

export function createZapClient<TTemplates extends TemplateRegistry = {}>(
  options?: ZapClientOptions<TTemplates>,
): ZapClient<TTemplates> {
  const baseURL =
    options?.baseURL ??
    (typeof window !== "undefined" ? window.location.origin : "");
  const basePath = options?.basePath ?? "/api/whatsapp";
  const fetchFn = options?.fetch ?? fetch;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${baseURL}${basePath}${path}`;
    const response = await fetchFn(url, init);

    if (!response.ok) {
      const error = (await response.json().catch(() => ({}))) as {
        error?: string;
      };
      throw new Error(error.error || `Request failed: ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  function post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  /** Strip non-digits to get the canonical 13-digit phone for URL paths. */
  function normalizePhone(phone: string): string {
    return phone.replace(/\D/g, "");
  }

  return {
    send: {
      text: (params) => post<SendResult>("/send/text", params),
      template: ((params: RuntimeSendTemplateParams) =>
        post<SendResult>("/send/template", params)) as SendTemplateMethod<TTemplates>,
      templateRaw: (params) => post<SendResult>("/send/template", params),
      interactive: (params) => post<SendResult>("/send/interactive", params),
      location: (params) => post<SendResult>("/send/location", params),
    },
    conversations: {
      list: () => request<Conversation[]>("/conversations"),
      get: (phone) =>
        request<Conversation | null>(
          `/conversations/${normalizePhone(phone)}`,
        ).catch((err) => {
          if (err.message?.includes("Conversation not found")) return null;
          throw err;
        }),
      messages: (phone, opts) => {
        const params = new URLSearchParams();
        if (opts?.cursor) params.set("cursor", opts.cursor);
        if (opts?.limit) params.set("limit", String(opts.limit));
        const qs = params.toString();
        return request<UIMessage[]>(
          `/conversations/${normalizePhone(phone)}/messages${qs ? `?${qs}` : ""}`,
        );
      },
    },
  };
}
