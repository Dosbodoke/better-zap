import { serializeError, WEBHOOK_EVENT_NAMES } from "better-zap";
import type {
  BetterZapContext,
  BetterZapCoreConfig,
  BetterZapCoreContext,
  BetterZapCoreServices,
  BetterZapDatabase,
  BetterZapPlugin,
  BetterZapServices,
  BetterZapWebhookEventName,
  BetterZapWebhookEvents,
  InferBetterZapPluginContext,
  InferBetterZapPluginServices,
  Logger,
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

const RESERVED_CONTEXT_KEYS: ReadonlySet<string> = new Set([
  "db",
  "api",
  "logger",
]);
const RESERVED_SERVICE_KEYS: ReadonlySet<string> = new Set([
  "whatsapp",
  "logger",
]);

export function initializePlugins<
  TDatabase extends BetterZapDatabase,
  TPlugins extends readonly BetterZapPlugin<TDatabase, any, any>[],
>(
  options: InitializePluginsOptions<TDatabase, TPlugins>,
): {
  context: BetterZapContext<TDatabase, InferBetterZapPluginContext<TPlugins>>;
  services: BetterZapServices<InferBetterZapPluginServices<TPlugins>>;
} {
  assertUniquePluginIds(options.plugins);

  const pluginContext: Record<string, unknown> = {};
  const pluginServices: Record<string, unknown> = {};
  // Which plugin provided each key, so a collision can name it.
  const contextOwners = new Map<string, string>();
  const serviceOwners = new Map<string, string>();

  for (const plugin of options.plugins) {
    if (!plugin.init) {
      continue;
    }

    let result: unknown;
    try {
      result = plugin.init({
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
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(
        `[betterZap] Plugin "${plugin.id}": init() failed: ${message}`,
        { cause: error },
      );
    }

    if (!result) {
      continue;
    }

    if (isThenable(result)) {
      throw new Error(
        `[betterZap] Plugin "${plugin.id}": init() must be synchronous, but it returned a Promise.`,
      );
    }

    const { context, services } = result as {
      context?: Record<string, unknown>;
      services?: Record<string, unknown>;
    };

    if (context) {
      for (const key of Object.keys(context)) {
        if (RESERVED_CONTEXT_KEYS.has(key)) {
          throw new Error(
            `[betterZap] Plugin "${plugin.id}": context key "${key}" is reserved by better-zap.`,
          );
        }
        const owner = contextOwners.get(key);
        if (owner !== undefined) {
          throw new Error(
            `[betterZap] Plugin "${plugin.id}": context key "${key}" is already provided by plugin "${owner}".`,
          );
        }
        contextOwners.set(key, plugin.id);
      }
      Object.assign(pluginContext, context);
    }

    if (services) {
      for (const key of Object.keys(services)) {
        if (RESERVED_SERVICE_KEYS.has(key)) {
          throw new Error(
            `[betterZap] Plugin "${plugin.id}": service "${key}" is reserved by better-zap.`,
          );
        }
        const owner = serviceOwners.get(key);
        if (owner !== undefined) {
          throw new Error(
            `[betterZap] Plugin "${plugin.id}": service "${key}" is already provided by plugin "${owner}".`,
          );
        }
        serviceOwners.set(key, plugin.id);
      }
      Object.assign(pluginServices, services);
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

function assertUniquePluginIds(
  plugins: readonly BetterZapPlugin<any, any, any>[],
): void {
  const seen = new Set<string>();
  for (const plugin of plugins) {
    if (seen.has(plugin.id)) {
      throw new Error(
        `[betterZap] Duplicate plugin id "${plugin.id}". Plugin ids must be unique.`,
      );
    }
    seen.add(plugin.id);
  }
}

function isThenable(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { then?: unknown }).then === "function"
  );
}

/** Hooks keyed by event name, with the context left open. Internal to this file. */
type AnyWebhookHooks = Partial<
  Record<BetterZapWebhookEventName, (ctx: any) => Promise<void>>
>;

/**
 * Builds the processor's hooks from the plugins and the app's own hooks.
 * For each event: merge the Better Zap context into the event context, run
 * every plugin hook in order (isolating failures), then run the app's hook.
 */
export function composeWebhookHooks<TDatabase extends BetterZapDatabase>(options: {
  plugins: readonly BetterZapPlugin<TDatabase, any, any>[];
  /** The app's own hooks (`options.webhook`). Extra keys are ignored. */
  userHooks: AnyWebhookHooks;
  /** Core context plus everything plugins returned from `init`. */
  context: BetterZapContext<TDatabase, Record<string, unknown>>;
  log: Logger;
}): Required<BetterZapWebhookEvents> {
  const hooks = {} as Record<
    BetterZapWebhookEventName,
    (ctx: any) => Promise<void>
  >;

  for (const name of WEBHOOK_EVENT_NAMES) {
    hooks[name] = async (eventContext) => {
      const ctx = { ...eventContext, ...options.context };

      for (const plugin of options.plugins) {
        const hook = (plugin.hooks as AnyWebhookHooks | undefined)?.[name];
        if (!hook) {
          continue;
        }

        try {
          await hook(ctx);
        } catch (error) {
          options.log.error(`plugin.${toSnakeCase(name)}_failed`, {
            pluginId: plugin.id,
            ...describeEvent(name, eventContext),
            ...serializeError(error),
          });
        }
      }

      await options.userHooks[name]?.(ctx);
    };
  }

  return hooks as Required<BetterZapWebhookEvents>;
}

/** `onCoexistenceMessageEdit` → `on_coexistence_message_edit`. */
function toSnakeCase(name: string): string {
  return name.replace(/[A-Z]/g, (letter) => "_" + letter.toLowerCase());
}

/** Log fields that identify the event a failing plugin hook received. */
function describeEvent(
  name: BetterZapWebhookEventName,
  eventContext: any,
): Record<string, unknown> {
  switch (name) {
    case "onMessage":
      return {
        waMessageId: eventContext.message.id,
        phone: eventContext.phone,
      };
    case "onStatusUpdate":
      return {
        waMessageId: eventContext.status.id,
        status: eventContext.status.status,
      };
    default:
      return {};
  }
}
