import { $ as UIMessage, A as createLogger, B as ConversationRecord, C as WhatsAppLogRecord, D as LogLevel, E as WhatsAppStatus, F as NewMessageEvent, G as MessageError, H as IncomingMessage, I as StatusUpdateEvent, J as SendMessageError, K as MessageStatus, L as SyncEvent, M as serializeError, N as ConversationSummary, O as Logger, P as ConversationUpdateEvent, Q as TemplateParameter, R as WhatsAppConfig, S as WhatsAppDirection, T as WhatsAppMessageType, U as InteractiveMediaCarouselCardInput, V as FreeformMessageWindow, W as MediaMessage, X as SendResult, Y as SendMessageResponse, Z as TemplateComponent, _ as OutgoingLoggingMetadata, a as SupportedTemplateParameterType, at as WebhookPayload, b as MessageLoggerService, c as TemplateName, ct as WhatsAppInteractiveButtonsMessage, d as TemplateParams, dt as WhatsAppLocationMessage, et as UIMessageStatus, f as TemplateRegistry, ft as WhatsAppTemplateMessage, g as serializeTemplateFromRegistry, h as hasConfiguredTemplates, i as EMPTY_TEMPLATE_REGISTRY, it as WebhookError, j as noopLogger, k as LoggerConfig, l as TemplateParameterDefinition, lt as WhatsAppInteractiveListMessage, m as getTemplateNames, n as ZapClient, nt as WebhookContact, o as TemplateComponentDefinition, ot as WebhookValue, p as defineTemplates, pt as WhatsAppTextMessage, q as SendInteractiveMediaCarouselData, r as createZapClient, rt as WebhookEntry, s as TemplateDefinition, st as WhatsAppCarouselCard, t as BetterZapClientError, tt as WebhookChange, u as TemplateParameterInputMap, ut as WhatsAppInteractiveMediaCarouselMessage, v as WhatsAppService, w as WhatsAppLogStore, x as WHATSAPP_MESSAGE_TYPES, y as MessageLoggerNotifier, z as Conversation } from "./client-s6x3lYea.mjs";

//#region src/freeform-message-window.d.ts
declare const FREEFORM_MESSAGE_WINDOW_MS: number;
declare function createFreeformMessageWindow(lastIncomingMessageAt: string | null, now?: Date): FreeformMessageWindow;
declare function normalizeConversationRecord(record: ConversationRecord, now?: Date): Conversation;
declare function normalizeConversationRecords(records: ConversationRecord[], now?: Date): Conversation[];
declare function getLatestIncomingMessageAt(messages: UIMessage[] | undefined): string | null;
declare function resolveConversationFreeformMessageWindow(conversation: Pick<Conversation, "freeformMessageWindow" | "lastIncomingMessageAt"> | null | undefined, messages?: UIMessage[], now?: Date): FreeformMessageWindow;
//#endregion
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
export { type Awaitable, type BetterZapApi, BetterZapClientError, type BetterZapContext, type BetterZapCoreConfig, type BetterZapCoreContext, type BetterZapCoreServices, type BetterZapDatabase, type BetterZapPlugin, type BetterZapPluginInitContext, type BetterZapPluginInitResult, type BetterZapServices, type Conversation, type ConversationRecord, type ConversationSummary, type ConversationUpdateEvent, EMPTY_TEMPLATE_REGISTRY, FREEFORM_MESSAGE_WINDOW_MS, type FreeformMessageWindow, type IncomingMessage, type InferBetterZapPluginContext, type InferBetterZapPluginServices, type InteractiveMediaCarouselCardInput, type LogLevel, type Logger, type LoggerConfig, type MediaMessage, type MessageContext, type MessageError, type MessageLoggerNotifier, MessageLoggerService, type MessageStatus, type NewMessageEvent, type OutgoingLoggingMetadata, type SendInteractiveMediaCarouselData, type SendMessageError, type SendMessageResponse, type SendResult, type StatusContext, type StatusUpdateEvent, type SupportedTemplateParameterType, type SyncEvent, type TemplateComponent, type TemplateComponentDefinition, type TemplateDefinition, type TemplateName, type TemplateParameter, type TemplateParameterDefinition, type TemplateParameterInputMap, type TemplateParams, type TemplateRegistry, type UIMessage, type UIMessageStatus, WHATSAPP_MESSAGE_TYPES, type WebhookChange, type WebhookContact, type WebhookEntry, type WebhookError, type WebhookPayload, type WebhookValue, type WhatsAppCarouselCard, type WhatsAppConfig, type WhatsAppDirection, type WhatsAppInteractiveButtonsMessage, type WhatsAppInteractiveListMessage, type WhatsAppInteractiveMediaCarouselMessage, type WhatsAppLocationMessage, type WhatsAppLogRecord, type WhatsAppLogStore, type WhatsAppMessageType, WhatsAppService, type WhatsAppStatus, type WhatsAppTemplateMessage, type WhatsAppTextMessage, type ZapClient, createFreeformMessageWindow, createLogger, createZapClient, defineTemplates, delay, formatPhone, getLatestIncomingMessageAt, getTemplateNames, hasConfiguredTemplates, noopLogger, normalizeConversationRecord, normalizeConversationRecords, resolveConversationFreeformMessageWindow, serializeError, serializeTemplateFromRegistry };