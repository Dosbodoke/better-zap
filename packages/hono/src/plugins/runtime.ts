import { serializeError } from "better-zap";
import type {
  BetterZapContext,
  BetterZapCoreConfig,
  BetterZapCoreContext,
  BetterZapCoreServices,
  BetterZapDatabase,
  BetterZapPlugin,
  BetterZapServices,
  InferBetterZapPluginContext,
  InferBetterZapPluginServices,
  Logger,
  MessageContext,
  StatusContext,
} from "better-zap";

interface InitializePluginsOptions<
  TDatabase extends BetterZapDatabase,
  TPlugins extends readonly BetterZapPlugin<TDatabase, any, any>[],
> {
  plugins: TPlugins;
  database: TDatabase;
  config: BetterZapCoreConfig;
  coreContext: BetterZapCoreContext<TDatabase>;
  coreServices: BetterZapCoreServices;
  log: Logger;
}

export function initializePlugins<
  TDatabase extends BetterZapDatabase,
  TPlugins extends readonly BetterZapPlugin<TDatabase, any, any>[],
>(
  options: InitializePluginsOptions<TDatabase, TPlugins>,
): {
  context: BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>;
  services: BetterZapServices<InferBetterZapPluginServices<TPlugins>>;
} {
  let pluginContext: Record<string, unknown> = {};
  let pluginServices: Record<string, unknown> = {};

  for (const plugin of options.plugins) {
    const result = plugin.init?.({
      database: options.database,
      config: options.config,
      context: {
        ...options.coreContext,
        ...pluginContext,
      },
      services: {
        ...options.coreServices,
        ...pluginServices,
      },
      log: options.log,
    });

    if (!result) {
      continue;
    }

    if (result.context) {
      pluginContext = {
        ...pluginContext,
        ...result.context,
      };
    }

    if (result.services) {
      pluginServices = {
        ...pluginServices,
        ...result.services,
      };
    }
  }

  return {
    context: {
      ...options.coreContext,
      ...pluginContext,
    } as BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>,
    services: {
      ...options.coreServices,
      ...pluginServices,
    } as BetterZapServices<InferBetterZapPluginServices<TPlugins>>,
  };
}

interface RunPluginMessageHooksOptions<
  TDatabase extends BetterZapDatabase,
  TPlugins extends readonly BetterZapPlugin<TDatabase, any, any>[],
> {
  plugins: TPlugins;
  ctx: MessageContext & BetterZapContext<TDatabase, Record<string, unknown>>;
  log: Logger;
}

export async function runPluginMessageHooks<
  TDatabase extends BetterZapDatabase,
  TPlugins extends readonly BetterZapPlugin<TDatabase, any, any>[],
>(options: RunPluginMessageHooksOptions<TDatabase, TPlugins>): Promise<void> {
  for (const plugin of options.plugins) {
    if (!plugin.hooks?.onMessage) {
      continue;
    }

    try {
      await plugin.hooks.onMessage(options.ctx);
    } catch (error) {
      options.log.error("plugin.on_message_failed", {
        pluginId: plugin.id,
        waMessageId: options.ctx.message.id,
        phone: options.ctx.phone,
        ...serializeError(error),
      });
    }
  }
}

interface RunPluginStatusHooksOptions<
  TDatabase extends BetterZapDatabase,
  TPlugins extends readonly BetterZapPlugin<TDatabase, any, any>[],
> {
  plugins: TPlugins;
  ctx: StatusContext & BetterZapContext<TDatabase, Record<string, unknown>>;
  log: Logger;
}

export async function runPluginStatusHooks<
  TDatabase extends BetterZapDatabase,
  TPlugins extends readonly BetterZapPlugin<TDatabase, any, any>[],
>(options: RunPluginStatusHooksOptions<TDatabase, TPlugins>): Promise<void> {
  for (const plugin of options.plugins) {
    if (!plugin.hooks?.onStatusUpdate) {
      continue;
    }

    try {
      await plugin.hooks.onStatusUpdate(options.ctx);
    } catch (error) {
      options.log.error("plugin.on_status_update_failed", {
        pluginId: plugin.id,
        waMessageId: options.ctx.status.id,
        status: options.ctx.status.status,
        ...serializeError(error),
      });
    }
  }
}
