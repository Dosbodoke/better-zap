import type { Logger } from "./logger";
import type {
  MessageLoggerService,
  WhatsAppLogStore,
} from "./services/message-logger.service";
import type {
  OutgoingLoggingMetadata,
  WhatsAppService,
} from "./services/whatsapp.service";
import type { WhatsAppConfig } from "./types/config";
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
import type { MessageContext, StatusContext } from "./events";

export interface BetterZapDatabase {
  whatsappLog: WhatsAppLogStore;
}

export type BetterZapCoreConfig = WhatsAppConfig & {
  webhookToken: string;
  appSecret: string;
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

export interface BetterZapPlugin<
  TDatabase extends BetterZapDatabase = BetterZapDatabase,
  TContext extends Record<string, unknown> = {},
  TServices extends Record<string, unknown> = {},
> {
  id: string;
  init?: (
    ctx: BetterZapPluginInitContext<TDatabase>,
  ) => BetterZapPluginInitResult<TContext, TServices> | void;
  hooks?: {
    onMessage?: (
      ctx: MessageContext &
        BetterZapContext<TDatabase, Record<string, unknown> & TContext>,
    ) => Promise<void>;
    onStatusUpdate?: (
      ctx: StatusContext &
        BetterZapContext<TDatabase, Record<string, unknown> & TContext>,
    ) => Promise<void>;
  };
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
}
