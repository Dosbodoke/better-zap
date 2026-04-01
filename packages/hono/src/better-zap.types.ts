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
  };
  basePath?: string;
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
