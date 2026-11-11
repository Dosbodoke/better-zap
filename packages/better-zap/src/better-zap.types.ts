import type { Logger } from "./logger";
import type {
  MessageLoggerService,
  WhatsAppLogStore,
} from "./services/message-logger.service";
import type { TemplateService } from "./services/template.service";
import type {
  OutgoingLoggingMetadata,
  WhatsAppService,
} from "./services/whatsapp.service";
import type { WhatsAppConfig } from "./types/config";
import type { CoexistenceStore } from "./types/coexistence.types";
import type { MediaStore } from "./media/types";
import type {
  Conversation,
  SendInteractiveMediaCarouselData,
  SendResult,
  TemplateComponent,
  UIMessage,
} from "./types/whatsapp.types";
import type {
  TemplateName,
  TemplateParams,
  TemplateRegistry,
} from "./template-registry";
import type { WebhookProcessorHooks } from "./webhook/webhook-processor";

export interface BetterZapDatabase {
  whatsappLog: WhatsAppLogStore;
  coexistence?: CoexistenceStore;
  /**
   * Storage for incoming media files. When set, image, audio, video, document
   * and sticker files are downloaded from Meta when they arrive and referenced
   * in `metadata.media`. Without it, only the text label and Meta's media id
   * are stored, and Meta deletes the file after 7 days.
   */
  media?: MediaStore;
}

export type BetterZapCoreConfig = WhatsAppConfig & {
  webhookToken: string;
  appSecret: string;
  /**
   * WhatsApp Business Account ID. `api.templates` uses it when a call passes
   * no `wabaId`. Messaging does not need it.
   */
  wabaId?: string;
};

type UnionToIntersection<TUnion> = (
  TUnion extends unknown ? (value: TUnion) => void : never
) extends (value: infer TIntersection) => void
  ? TIntersection
  : never;

type Simplify<TValue> = { [TKey in keyof TValue]: TValue[TKey] } & {};

export type Awaitable<TValue> = TValue | Promise<TValue>;

export type BetterZapCoreContext<
  TDatabase extends BetterZapDatabase = BetterZapDatabase,
> = {
  db: TDatabase;
  api: WhatsAppService;
  logger: MessageLoggerService;
};

export type BetterZapContext<
  TDatabase extends BetterZapDatabase = BetterZapDatabase,
  TPluginContext extends Record<string, unknown> = {},
> = Simplify<BetterZapCoreContext<TDatabase> & TPluginContext>;

export type BetterZapCoreServices = {
  whatsapp: WhatsAppService;
  logger: MessageLoggerService;
};

export type BetterZapServices<
  TPluginServices extends Record<string, unknown> = {},
> = Simplify<BetterZapCoreServices & TPluginServices>;

export interface BetterZapPluginInitResult<
  TContext extends Record<string, unknown> = {},
  TServices extends Record<string, unknown> = {},
> {
  context?: TContext;
  services?: TServices;
}

export interface BetterZapPluginInitContext<
  TDatabase extends BetterZapDatabase = BetterZapDatabase,
> {
  database: TDatabase;
  config: BetterZapCoreConfig;
  context: BetterZapContext<TDatabase, Record<string, unknown>>;
  services: BetterZapServices<Record<string, unknown>>;
  log: Logger;
}

/**
 * Every webhook event an app or a plugin can hook. Derived from the
 * processor's hook list, so a new event is declared in one place.
 */
export type BetterZapWebhookEvents = Omit<WebhookProcessorHooks, "onError">;

export type BetterZapWebhookEventName = keyof BetterZapWebhookEvents;

/** The context the processor passes to one event's hook. */
export type BetterZapWebhookEventContext<
  TName extends BetterZapWebhookEventName,
> = Parameters<NonNullable<BetterZapWebhookEvents[TName]>>[0];

/**
 * Hook signatures for every webhook event, with the Better Zap context (`db`,
 * `api`, `logger` and the plugin context) merged into each event's context.
 * `onMessage` and `onStatusUpdate` are required and the rest are optional,
 * as in `WebhookProcessorHooks`.
 */
export type BetterZapWebhookHooks<
  TDatabase extends BetterZapDatabase = BetterZapDatabase,
  TPluginContext extends Record<string, unknown> = {},
> = {
  [TName in keyof BetterZapWebhookEvents]: (
    ctx: BetterZapWebhookEventContext<TName> &
      BetterZapContext<TDatabase, TPluginContext>,
  ) => Promise<void>;
};

export interface BetterZapPlugin<
  TDatabase extends BetterZapDatabase = BetterZapDatabase,
  TContext extends Record<string, unknown> = {},
  TServices extends Record<string, unknown> = {},
> {
  /** Unique among the plugins passed to `betterZap()`. */
  id: string;
  /**
   * Runs once, synchronously, when `betterZap()` is called. Plugins run in
   * array order and each sees the context and services of the ones before it.
   * Returned keys must not collide with core keys or another plugin's keys.
   */
  init?: (
    ctx: BetterZapPluginInitContext<TDatabase>,
  ) => BetterZapPluginInitResult<TContext, TServices> | void;
  /**
   * Webhook hooks. For each event, plugin hooks run in array order before the
   * app's own hook. A hook that throws is logged and does not stop the others.
   */
  hooks?: Partial<
    BetterZapWebhookHooks<TDatabase, Record<string, unknown> & TContext>
  >;
}

export type InferBetterZapPluginContext<TPlugins> = Simplify<
  UnionToIntersection<
    TPlugins extends readonly BetterZapPlugin<any, infer TContext, any>[]
      ? TContext
      : {}
  >
>;

export type InferBetterZapPluginServices<TPlugins> = Simplify<
  UnionToIntersection<
    TPlugins extends readonly BetterZapPlugin<any, any, infer TServices>[]
      ? TServices
      : {}
  >
>;

type RawTemplateSendOptions = {
  language?: string;
  components?: TemplateComponent[];
  logging?: OutgoingLoggingMetadata;
};

type TypedTemplateSendOptions<
  TTemplates extends TemplateRegistry,
  TName extends TemplateName<TTemplates>,
> = {
  language?: string;
  params: TemplateParams<TTemplates[TName]>;
  logging?: OutgoingLoggingMetadata;
};

type BetterZapTemplateSendMethod<TTemplates extends TemplateRegistry> =
  [TemplateName<TTemplates>] extends [never]
    ? (
        to: string,
        templateName: string,
        opts?: RawTemplateSendOptions,
      ) => Promise<SendResult>
    : <TName extends TemplateName<TTemplates>>(
        to: string,
        templateName: TName,
        opts: TypedTemplateSendOptions<TTemplates, TName>,
      ) => Promise<SendResult>;

/** Template management methods. See `TemplateService`. */
export type BetterZapTemplatesApi = Pick<
  TemplateService,
  "list" | "listAll" | "get" | "create" | "update" | "delete" | "deleteAllLanguages"
>;

export interface BetterZapApi<TTemplates extends TemplateRegistry = {}> {
  send: {
    text(
      to: string,
      body: string,
      opts?: Omit<OutgoingLoggingMetadata, "content">,
    ): Promise<SendResult>;
    template: BetterZapTemplateSendMethod<TTemplates>;
    templateRaw(
      to: string,
      templateName: string,
      opts?: RawTemplateSendOptions,
    ): Promise<SendResult>;
    interactiveButtons(
      to: string,
      body: string,
      buttons: Array<{ id: string; title: string }>,
      opts?: Omit<OutgoingLoggingMetadata, "content">,
    ): Promise<SendResult>;
    interactiveList(
      to: string,
      body: string,
      buttonLabel: string,
      sections: Array<{
        title: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>,
      opts?: Omit<OutgoingLoggingMetadata, "content">,
    ): Promise<SendResult>;
    interactiveMediaCarousel(
      data: SendInteractiveMediaCarouselData,
      opts?: Omit<OutgoingLoggingMetadata, "content">,
    ): Promise<SendResult>;
    location(
      to: string,
      location: {
        latitude: number;
        longitude: number;
        name: string;
        address: string;
      },
      opts?: Omit<OutgoingLoggingMetadata, "content">,
    ): Promise<SendResult>;
    markAsRead(messageId: string): Promise<SendResult>;
    reaction(to: string, messageId: string, emoji: string): Promise<SendResult>;
  };
  conversations: {
    list(): Promise<Conversation[]>;
    get(phone: string): Promise<Conversation | null>;
    messages(
      phone: string,
      opts?: { cursor?: string; limit?: number },
    ): Promise<UIMessage[]>;
  };
  /**
   * Create, list, edit and delete message templates in Meta.
   * Not to be confused with the `templates` option of `betterZap()`, which is
   * the typed registry used by `send.template`.
   */
  templates: BetterZapTemplatesApi;
}
