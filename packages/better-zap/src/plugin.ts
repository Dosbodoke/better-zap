import type {
  BetterZapDatabase,
  BetterZapPlugin,
  BetterZapPluginInitContext,
  BetterZapWebhookHooks,
} from "./better-zap.types";

type DefinedPlugin<
  TId extends string,
  TDatabase extends BetterZapDatabase,
  TContext extends object,
  TServices extends object,
> = Omit<BetterZapPlugin<TDatabase, TContext, TServices>, "id" | "hooks"> & {
  id: TId;
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
  const TId extends string = string,
>(
  plugin: {
    id: TId;
    hooks?: Partial<
      BetterZapWebhookHooks<
        NoInfer<TDatabase>,
        Record<string, unknown> & NoInfer<TContext>
      >
    >;
  } & DefinedPluginInit<TDatabase, TContext, TServices>,
): DefinedPlugin<TId, TDatabase, TContext, TServices> {
  return plugin as DefinedPlugin<TId, TDatabase, TContext, TServices>;
}
