import { $ as WebhookContact, A as noopLogger, B as InteractiveMediaCarouselCardInput, C as WhatsAppLogStore, D as Logger, E as LogLevel, F as StatusUpdateEvent, G as SendMessageError, H as MessageError, I as SyncEvent, J as TemplateComponent, K as SendMessageResponse, L as WhatsAppConfig, M as ConversationSummary, N as ConversationUpdateEvent, O as LoggerConfig, P as NewMessageEvent, Q as WebhookChange, R as Conversation, S as WhatsAppLogRecord, T as WhatsAppStatus, U as MessageStatus, V as MediaMessage, W as SendInteractiveMediaCarouselData, X as UIMessage, Y as TemplateParameter, Z as UIMessageStatus, _ as WhatsAppService, a as TemplateComponentDefinition, at as WhatsAppInteractiveButtonsMessage, b as WHATSAPP_MESSAGE_TYPES, c as TemplateParameterDefinition, ct as WhatsAppLocationMessage, d as TemplateRegistry, et as WebhookEntry, f as defineTemplates, g as OutgoingLoggingMetadata, h as serializeTemplateFromRegistry, i as SupportedTemplateParameterType, it as WhatsAppCarouselCard, j as serializeError, k as createLogger, l as TemplateParameterInputMap, lt as WhatsAppTemplateMessage, m as hasConfiguredTemplates, n as createZapClient, nt as WebhookPayload, o as TemplateDefinition, ot as WhatsAppInteractiveListMessage, p as getTemplateNames, q as SendResult, r as EMPTY_TEMPLATE_REGISTRY, rt as WebhookValue, s as TemplateName, st as WhatsAppInteractiveMediaCarouselMessage, t as ZapClient, tt as WebhookError, u as TemplateParams, ut as WhatsAppTextMessage, v as MessageLoggerNotifier, w as WhatsAppMessageType, x as WhatsAppDirection, y as MessageLoggerService, z as IncomingMessage } from "./client-ColqW3Zc.mjs";

//#region src/events.d.ts
type MessageContext = {
  message: IncomingMessage;
  contact: WebhookContact | undefined;
  content: string;
  phone: string;
};
type StatusContext = {
  status: MessageStatus;
  timestamp: string;
  errorMessage?: string;
  errorCode?: number;
};
//#endregion
//#region src/utils/phone.d.ts
/**
 * Formats a phone number to the international format required by Meta Cloud API.
 * Currently defaults to Brazilian country code (55) if not provided.
 * Normalizes Brazilian numbers to always include the 9th digit.
 */
declare function formatPhone(phone: string): string;
//#endregion
//#region src/utils/delay.d.ts
/**
 * Utility function to pause execution for a given number of milliseconds.
 * Useful for exponential backoff or rate limiting.
 */
declare function delay(ms: number): Promise<void>;
//#endregion
//#region src/better-zap.types.d.ts
interface BetterZapDatabase {
  whatsappLog: WhatsAppLogStore;
}
type BetterZapCoreConfig = WhatsAppConfig & {
  webhookToken: string;
  appSecret: string;
};
type UnionToIntersection<TUnion> = (TUnion extends unknown ? (value: TUnion) => void : never) extends ((value: infer TIntersection) => void) ? TIntersection : never;
type Simplify<TValue> = { [TKey in keyof TValue]: TValue[TKey] } & {};
type Awaitable<TValue> = TValue | Promise<TValue>;
type BetterZapCoreContext<TDatabase extends BetterZapDatabase = BetterZapDatabase> = {
  db: TDatabase;
  api: WhatsAppService;
  logger: MessageLoggerService;
};
type BetterZapContext<TDatabase extends BetterZapDatabase = BetterZapDatabase, TPluginContext extends Record<string, unknown> = {}> = Simplify<BetterZapCoreContext<TDatabase> & TPluginContext>;
type BetterZapCoreServices = {
  whatsapp: WhatsAppService;
  logger: MessageLoggerService;
};
type BetterZapServices<TPluginServices extends Record<string, unknown> = {}> = Simplify<BetterZapCoreServices & TPluginServices>;
interface BetterZapPluginInitResult<TContext extends Record<string, unknown> = {}, TServices extends Record<string, unknown> = {}> {
  context?: TContext;
  services?: TServices;
}
interface BetterZapPluginInitContext<TDatabase extends BetterZapDatabase = BetterZapDatabase> {
  database: TDatabase;
  config: BetterZapCoreConfig;
  context: BetterZapContext<TDatabase, Record<string, unknown>>;
  services: BetterZapServices<Record<string, unknown>>;
  log: Logger;
}
interface BetterZapPlugin<TDatabase extends BetterZapDatabase = BetterZapDatabase, TContext extends Record<string, unknown> = {}, TServices extends Record<string, unknown> = {}> {
  id: string;
  init?: (ctx: BetterZapPluginInitContext<TDatabase>) => BetterZapPluginInitResult<TContext, TServices> | void;
  hooks?: {
    onMessage?: (ctx: MessageContext & BetterZapContext<TDatabase, Record<string, unknown> & TContext>) => Promise<void>;
    onStatusUpdate?: (ctx: StatusContext & BetterZapContext<TDatabase, Record<string, unknown> & TContext>) => Promise<void>;
  };
}
type InferBetterZapPluginContext<TPlugins> = Simplify<UnionToIntersection<TPlugins extends readonly BetterZapPlugin<any, infer TContext, any>[] ? TContext : {}>>;
type InferBetterZapPluginServices<TPlugins> = Simplify<UnionToIntersection<TPlugins extends readonly BetterZapPlugin<any, any, infer TServices>[] ? TServices : {}>>;
type RawTemplateSendOptions = {
  language?: string;
  components?: TemplateComponent[];
  logging?: OutgoingLoggingMetadata;
};
type TypedTemplateSendOptions<TTemplates extends TemplateRegistry, TName extends TemplateName<TTemplates>> = {
  language?: string;
  params: TemplateParams<TTemplates[TName]>;
  logging?: OutgoingLoggingMetadata;
};
type BetterZapTemplateSendMethod<TTemplates extends TemplateRegistry> = [TemplateName<TTemplates>] extends [never] ? (to: string, templateName: string, opts?: RawTemplateSendOptions) => Promise<SendResult> : <TName extends TemplateName<TTemplates>>(to: string, templateName: TName, opts: TypedTemplateSendOptions<TTemplates, TName>) => Promise<SendResult>;
interface BetterZapApi<TTemplates extends TemplateRegistry = {}> {
  send: {
    text(to: string, body: string, opts?: Omit<OutgoingLoggingMetadata, "content">): Promise<SendResult>;
    template: BetterZapTemplateSendMethod<TTemplates>;
    templateRaw(to: string, templateName: string, opts?: RawTemplateSendOptions): Promise<SendResult>;
    interactiveButtons(to: string, body: string, buttons: Array<{
      id: string;
      title: string;
    }>, opts?: Omit<OutgoingLoggingMetadata, "content">): Promise<SendResult>;
    interactiveList(to: string, body: string, buttonLabel: string, sections: Array<{
      title: string;
      rows: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
    }>, opts?: Omit<OutgoingLoggingMetadata, "content">): Promise<SendResult>;
    interactiveMediaCarousel(data: SendInteractiveMediaCarouselData, opts?: Omit<OutgoingLoggingMetadata, "content">): Promise<SendResult>;
    location(to: string, location: {
      latitude: number;
      longitude: number;
      name: string;
      address: string;
    }, opts?: Omit<OutgoingLoggingMetadata, "content">): Promise<SendResult>;
    markAsRead(messageId: string): Promise<SendResult>;
    reaction(to: string, messageId: string, emoji: string): Promise<SendResult>;
  };
  conversations: {
    list(): Promise<Conversation[]>;
    get(phone: string): Promise<Conversation | null>;
    messages(phone: string, opts?: {
      cursor?: string;
      limit?: number;
    }): Promise<UIMessage[]>;
  };
}
//#endregion
export { type Awaitable, type BetterZapApi, type BetterZapContext, type BetterZapCoreConfig, type BetterZapCoreContext, type BetterZapCoreServices, type BetterZapDatabase, type BetterZapPlugin, type BetterZapPluginInitContext, type BetterZapPluginInitResult, type BetterZapServices, type Conversation, type ConversationSummary, type ConversationUpdateEvent, EMPTY_TEMPLATE_REGISTRY, type IncomingMessage, type InferBetterZapPluginContext, type InferBetterZapPluginServices, type InteractiveMediaCarouselCardInput, type LogLevel, type Logger, type LoggerConfig, type MediaMessage, type MessageContext, type MessageError, type MessageLoggerNotifier, MessageLoggerService, type MessageStatus, type NewMessageEvent, type OutgoingLoggingMetadata, type SendInteractiveMediaCarouselData, type SendMessageError, type SendMessageResponse, type SendResult, type StatusContext, type StatusUpdateEvent, type SupportedTemplateParameterType, type SyncEvent, type TemplateComponent, type TemplateComponentDefinition, type TemplateDefinition, type TemplateName, type TemplateParameter, type TemplateParameterDefinition, type TemplateParameterInputMap, type TemplateParams, type TemplateRegistry, type UIMessage, type UIMessageStatus, WHATSAPP_MESSAGE_TYPES, type WebhookChange, type WebhookContact, type WebhookEntry, type WebhookError, type WebhookPayload, type WebhookValue, type WhatsAppCarouselCard, type WhatsAppConfig, type WhatsAppDirection, type WhatsAppInteractiveButtonsMessage, type WhatsAppInteractiveListMessage, type WhatsAppInteractiveMediaCarouselMessage, type WhatsAppLocationMessage, type WhatsAppLogRecord, type WhatsAppLogStore, type WhatsAppMessageType, WhatsAppService, type WhatsAppStatus, type WhatsAppTemplateMessage, type WhatsAppTextMessage, type ZapClient, createLogger, createZapClient, defineTemplates, delay, formatPhone, getTemplateNames, hasConfiguredTemplates, noopLogger, serializeError, serializeTemplateFromRegistry };