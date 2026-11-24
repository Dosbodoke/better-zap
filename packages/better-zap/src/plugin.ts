import type {
  BetterZapDatabase,
  BetterZapPlugin,
  BetterZapPluginInitContext,
  BetterZapWebhookHooks,
} from "./better-zap.types";

type DefinedPlugin<
  TDatabase extends BetterZapDatabase,
  TContext extends object,
  TServices extends object,
> = Omit<BetterZapPlugin<TDatabase, TContext, TServices>, "hooks"> & {
  hooks?: BetterZapPlugin<TDatabase>["hooks"];
};

type DefinedPluginInit<
  TDatabase extends BetterZapDatabase,
  TContext extends object,
  TServices extends object,
> = {} extends TContext
  ? {
      init?: (
        ctx: BetterZapPluginInitContext<TDatabase>,
      ) => { context?: TContext; services?: TServices } | void;
    }
  : {
      init: (ctx: BetterZapPluginInitContext<TDatabase>) => {
        context: TContext;
        services?: TServices;
      };
    };

export function definePlugin<
  TContext extends object = {},
  TServices extends object = {},
  TDatabase extends BetterZapDatabase = BetterZapDatabase,
>(
  plugin: {
    id: string;
    hooks?: Partial<
      BetterZapWebhookHooks<
        NoInfer<TDatabase>,
        Record<string, unknown> & NoInfer<TContext>
      >
    >;
  } & DefinedPluginInit<TDatabase, TContext, TServices>,
): DefinedPlugin<TDatabase, TContext, TServices> {
  return plugin as DefinedPlugin<TDatabase, TContext, TServices>;
}
