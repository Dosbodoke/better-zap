import type {
  BetterZapDatabase,
  BetterZapPlugin,
  BetterZapPluginInitContext,
  BetterZapPluginInitResult,
  BetterZapWebhookHooks,
} from "./better-zap.types";

type DefinedPlugin<
  TDatabase extends BetterZapDatabase,
  TContext extends object,
  TServices extends object,
> = Omit<BetterZapPlugin<TDatabase, TContext, TServices>, "hooks"> & {
  hooks?: BetterZapPlugin<TDatabase>["hooks"];
};

export function definePlugin<
  TContext extends object = {},
  TServices extends object = {},
  TDatabase extends BetterZapDatabase = BetterZapDatabase,
>(plugin: {
  id: string;
  init?: (
    ctx: BetterZapPluginInitContext<TDatabase>,
  ) => BetterZapPluginInitResult<TContext, TServices> | void;
  hooks?: Partial<
    BetterZapWebhookHooks<
      NoInfer<TDatabase>,
      Record<string, unknown> & NoInfer<TContext>
    >
  >;
}): DefinedPlugin<TDatabase, TContext, TServices> {
  return plugin as DefinedPlugin<TDatabase, TContext, TServices>;
}
