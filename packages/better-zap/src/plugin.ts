import type {
  BetterZapDatabase,
  BetterZapPlugin,
  BetterZapPluginInitContext,
  BetterZapPluginInitResult,
  BetterZapWebhookHooks,
} from "./better-zap.types";

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
}): BetterZapPlugin<TDatabase, TContext, TServices> {
  return plugin;
}
