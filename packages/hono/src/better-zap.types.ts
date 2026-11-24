import type {
  BetterZapApi,
  BetterZapCoreConfig,
  BetterZapDatabase,
  BetterZapPlugin,
  BetterZapServices,
  BetterZapWebhookHooks,
  IncomingMessage,
  InferBetterZapPluginContext,
  InferBetterZapPluginServices,
  LoggerConfig,
  TemplateRegistry,
} from "better-zap";
import type {
  CoexistenceCredentialProvider,
  CoexistenceService,
  TemplateService,
} from "better-zap";

export type BetterZapAuthorizeAppRequest = (input: {
  request: Request;
  env?: unknown;
}) => boolean | Promise<boolean>;

export type BetterZapVerifySignupState = (input: {
  state: string | undefined;
  nonce: string | undefined;
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
  webhook: BetterZapWebhookHooks<
    TDatabase,
    InferBetterZapPluginContext<TPlugins>
  > & {
    runInBackground?: (work: Promise<void>) => void | Promise<void>;
    resolveMessageContent?: (message: IncomingMessage) => string;
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
    subscribeWabaAfterCodeExchange?: boolean;
    verifySignupState?: BetterZapVerifySignupState;
  };
  templateService?: TemplateService;
  media?: {
    maxBytes?: number;
    timeoutMs?: number;
    concurrency?: number;
    signedUrlExpiresIn?: number;
  };
  basePath?: string;
  authorizeAppRequest?: BetterZapAuthorizeAppRequest | "public";
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
