import type {
  BetterZapDatabase,
  BetterZapPlugin,
} from "./better-zap.types";

export function definePlugin<
  TContext extends Record<string, unknown> = {},
  TServices extends Record<string, unknown> = {},
  TDatabase extends BetterZapDatabase = BetterZapDatabase,
>(
  plugin: BetterZapPlugin<TDatabase, TContext, TServices>,
): BetterZapPlugin<TDatabase, TContext, TServices> {
  return plugin;
}
