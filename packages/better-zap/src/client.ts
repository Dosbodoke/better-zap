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
  baseURL?: string;
  basePath?: string;
  fetch?: typeof fetch;
  transport?: ZapTransport;
  templates?: TTemplates;
}

export interface ZapTransport {
  headers?(): Record<string, string> | Promise<Record<string, string>>;
  credentials?: RequestCredentials;
}

export function sessionTransport(): ZapTransport {
  return { credentials: "include" };
}

export function apiKeyTransport(apiKey: string): ZapTransport {
  return { headers: () => ({ Authorization: `Bearer ${apiKey}` }) };
}

type BetterZapErrorBody = {
  error?: string;
  code?: string;
  details?: unknown;
  httpStatus?: number;
};

export class BetterZapClientError extends Error {
  status: number;
  code?: string;
  details?: unknown;
  body?: unknown;

  constructor(
    message: string,
    options: {
      status: number;
      code?: string;
      details?: unknown;
      body?: unknown;
    },
  ) {
    super(message);
    this.name = "BetterZapClientError";
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
    this.body = options.body;
  }
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

  const transport = options?.transport;

  async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const url = `${baseURL}${basePath}${path}`;
    const transportHeaders = transport?.headers ? await transport.headers() : undefined;
    const requestInit: RequestInit =
      transportHeaders || transport?.credentials
        ? {
            ...init,
            ...(transport?.credentials ? { credentials: transport.credentials } : {}),
            headers: {
              ...(init?.headers as Record<string, string> | undefined),
              ...transportHeaders,
            },
          }
        : (init ?? {});
    const response = await fetchFn(url, requestInit);
    const payload = (await response.json().catch(() => null)) as BetterZapErrorBody | T | null;

    if (!response.ok) {
      const error = payload as BetterZapErrorBody | null;
      throw new BetterZapClientError(
        error?.error || `Request failed: ${response.status}`,
        {
          status: response.status,
          code: error?.code,
          details: error?.details,
          body: payload,
        },
      );
    }

    return payload as T;
  }

  function post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

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
          if (err instanceof BetterZapClientError && err.status === 404) {
            return null;
          }
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
