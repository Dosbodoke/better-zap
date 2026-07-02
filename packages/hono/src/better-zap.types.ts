import type {
  BetterZapApi,
  BetterZapContext,
  BetterZapCoreConfig,
  BetterZapDatabase,
  BetterZapPlugin,
  BetterZapServices,
  InferBetterZapPluginContext,
  InferBetterZapPluginServices,
  LoggerConfig,
  MessageContext,
  StatusContext,
  TemplateRegistry,
} from "better-zap";
import type {
  CoexistenceCredentialProvider,
  CoexistenceService,
} from "better-zap";
import type {
  CoexistenceAccountUpdateContext,
  CoexistenceHistoryContext,
  CoexistenceUnsupportedMessageContext,
  SmbAppStateSyncContext,
  SmbMessageEchoContext,
} from "./webhook/create-webhook-handler";

export type BetterZapAuthorizeAppRequest = (input: {
  request: Request;
  env?: unknown;
}) => boolean | Promise<boolean>;

export interface BetterZapConfig<
  TDatabase extends BetterZapDatabase = BetterZapDatabase,
  TPlugins extends readonly BetterZapPlugin<TDatabase, any, any>[] =
    readonly [],
  TTemplates extends TemplateRegistry = {},
> {
  database: TDatabase;
  config: BetterZapCoreConfig;
  plugins?: TPlugins;
  templates?: TTemplates;
  conversationSync?: DurableObjectNamespace<any>;
  webhook: {
    onMessage: (
      ctx: MessageContext &
        BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    ) => Promise<void>;
    onStatusUpdate: (
      ctx: StatusContext &
        BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    ) => Promise<void>;
    onCoexistenceHistory?: (
      ctx: CoexistenceHistoryContext &
        BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    ) => Promise<void>;
    onSmbAppStateSync?: (
      ctx: SmbAppStateSyncContext &
        BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    ) => Promise<void>;
    onSmbMessageEcho?: (
      ctx: SmbMessageEchoContext &
        BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    ) => Promise<void>;
    onCoexistenceAccountUpdate?: (
      ctx: CoexistenceAccountUpdateContext &
        BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    ) => Promise<void>;
    onCoexistenceUnsupportedMessage?: (
      ctx: CoexistenceUnsupportedMessageContext &
        BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    ) => Promise<void>;
  };
  coexistence?: {
    enabled?: boolean;
    service?: CoexistenceService;
    credentials?: CoexistenceCredentialProvider;
    accessToken?: string;
    appId?: string;
    appSecret?: string;
    graphApiVersion?: string;
    graphBaseUrl?: string;
    fetch?: typeof fetch;
  };
  basePath?: string;
  authorizeAppRequest?: BetterZapAuthorizeAppRequest;
  logger?: LoggerConfig;
}

export interface BetterZap<
  TPluginServices extends Record<string, unknown> = {},
  TTemplates extends TemplateRegistry = {},
> {
  handler: (
    request: Request,
    env?: any,
    executionCtx?: any,
  ) => Promise<Response>;
  api: BetterZapApi<TTemplates>;
  services: BetterZapServices<TPluginServices>;
}

export type {
  BetterZapApi,
  BetterZapContext,
  BetterZapCoreConfig,
  BetterZapDatabase,
  BetterZapPlugin,
  BetterZapServices,
  InferBetterZapPluginContext,
  InferBetterZapPluginServices,
  MessageContext,
  StatusContext,
  TemplateRegistry,
} from "better-zap";
