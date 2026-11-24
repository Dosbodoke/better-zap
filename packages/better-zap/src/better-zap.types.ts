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
  media?: MediaStore;
}

export type BetterZapCoreConfig = WhatsAppConfig & {
  webhookToken: string;
  appSecret: string;
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
  TPluginContext extends object = {},
> = Simplify<BetterZapCoreContext<TDatabase> & TPluginContext>;

export type BetterZapCoreServices = {
  whatsapp: WhatsAppService;
  logger: MessageLoggerService;
};

export type BetterZapServices<
  TPluginServices extends object = {},
> = Simplify<BetterZapCoreServices & TPluginServices>;

export interface BetterZapPluginInitResult<
  TContext extends object = {},
  TServices extends object = {},
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

export type BetterZapWebhookEvents = Omit<WebhookProcessorHooks, "onError">;

export type BetterZapWebhookEventName = keyof BetterZapWebhookEvents;

export type BetterZapWebhookEventContext<
  TName extends BetterZapWebhookEventName,
> = Parameters<NonNullable<BetterZapWebhookEvents[TName]>>[0];

type MergeEventContext<TEvent, TContext> = string extends keyof TContext
  ? TEvent & TContext
  : [Extract<keyof TEvent, keyof TContext>] extends [never]
    ? TEvent & TContext
    : Omit<TEvent, keyof TContext> & TContext;

export type BetterZapWebhookHooks<
  TDatabase extends BetterZapDatabase = BetterZapDatabase,
  TPluginContext extends object = {},
> = {
  [TName in keyof BetterZapWebhookEvents]: (
    ctx: MergeEventContext<
      BetterZapWebhookEventContext<TName>,
      BetterZapContext<TDatabase, TPluginContext>
    >,
  ) => Promise<void>;
};

export interface BetterZapPlugin<
  TDatabase extends BetterZapDatabase = BetterZapDatabase,
  TContext extends object = {},
  TServices extends object = {},
> {
  id: string;
  init?: (
    ctx: BetterZapPluginInitContext<TDatabase>,
  ) => BetterZapPluginInitResult<TContext, TServices> | void;
  hooks?: Partial<
    BetterZapWebhookHooks<TDatabase, Record<string, unknown> & TContext>
  >;
}

export interface AnyBetterZapPlugin<
  TDatabase extends BetterZapDatabase = BetterZapDatabase,
> {
  id: string;
  init?: (
    ctx: BetterZapPluginInitContext<TDatabase>,
  ) => { context?: object; services?: object } | void;
  hooks?: {
    [TName in BetterZapWebhookEventName]?: (ctx: never) => Promise<void>;
  };
}

export interface BetterZapPluginFor<
  TDatabase extends BetterZapDatabase = BetterZapDatabase,
> extends AnyBetterZapPlugin<TDatabase> {
  hooks?: {
    [TName in BetterZapWebhookEventName]?: (
      ctx: BetterZapWebhookEventContext<TName> &
        BetterZapCoreContext<TDatabase> &
        Record<string, unknown>,
    ) => Promise<void>;
  };
}

type InferPluginInitResult<TPlugin> = TPlugin extends {
  init?: (...args: never[]) => infer TResult;
}
  ? Exclude<TResult, void | undefined>
  : never;

type InferPluginInitKey<
  TPlugin,
  TKey extends "context" | "services",
> = InferPluginInitResult<TPlugin> extends infer TResult
  ? TResult extends { [TProperty in TKey]?: infer TValue }
    ? NonNullable<TValue>
    : never
  : never;

export type InferBetterZapPluginContext<TPlugins> = Simplify<
  Omit<
    UnionToIntersection<
      TPlugins extends readonly unknown[]
        ? InferPluginInitKey<TPlugins[number], "context">
        : never
    >,
    keyof BetterZapCoreContext
  >
>;

export type InferBetterZapPluginServices<TPlugins> = Simplify<
  Omit<
    UnionToIntersection<
      TPlugins extends readonly unknown[]
        ? InferPluginInitKey<TPlugins[number], "services">
        : never
    >,
    keyof BetterZapCoreServices
  >
>;

type PluginHookCheck<
  TDatabase extends BetterZapDatabase,
  TContext extends object,
> = {
  hooks?: {
    [TName in BetterZapWebhookEventName]?: (
      ctx: MergeEventContext<
        BetterZapWebhookEventContext<TName>,
        BetterZapContext<TDatabase, TContext>
      > &
        Record<string, unknown>,
    ) => Promise<void>;
  };
};

export type ValidateBetterZapPlugins<
  TPlugins extends readonly unknown[],
  TDatabase extends BetterZapDatabase,
> = readonly BetterZapPluginFor<TDatabase>[] extends TPlugins
  ? readonly BetterZapPluginFor<TDatabase>[]
  : {
      [TIndex in keyof TPlugins]: TPlugins[TIndex] &
        PluginHookCheck<TDatabase, InferBetterZapPluginContext<TPlugins>>;
    };

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

export type BetterZapTemplatesApi = Pick<
  TemplateService,
  | "list"
  | "listAll"
  | "get"
  | "create"
  | "update"
  | "delete"
  | "deleteAllLanguages"
  | "uploadHeaderMedia"
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
  templates: BetterZapTemplatesApi;
}
