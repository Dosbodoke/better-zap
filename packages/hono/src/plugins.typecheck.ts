import { definePlugin } from "better-zap";
import type {
  AnyBetterZapPlugin,
  BetterZapDatabase,
  BetterZapPlugin,
  BetterZapPluginInitContext,
  InferBetterZapPluginContext,
  MessageContext,
} from "better-zap";
import { betterZap } from "./better-zap";

declare const database: BetterZapDatabase;

const config = { token: "t", phoneId: "p", webhookToken: "w", appSecret: "s" };

const noopWebhook = {
  onMessage: async () => {},
  onStatusUpdate: async () => {},
};

type Audit = { record(event: string): void };

const auditPlugin = definePlugin({
  id: "audit",
  init() {
    const audit: Audit = { record() {} };
    return { context: { audit } };
  },
  hooks: {
    onSmbMessageEcho: async (ctx) => {
      ctx.audit.record("echo");
      ctx.db.whatsappLog;
      ctx.api;
    },
    onCoexistenceMessageRevoke: async (ctx) => {
      ctx.audit.record("revoke");
    },
  },
});

betterZap({
  database,
  config,
  plugins: [auditPlugin],
  webhook: {
    onMessage: async (ctx) => {
      ctx.audit.record(ctx.phone);
    },
    onStatusUpdate: async () => {},
    onCoexistenceHistory: async (ctx) => {
      ctx.audit.record("history");
    },
  },
});

betterZap({
  database,
  config,
  plugins: [auditPlugin],
  webhook: {
    onMessage: async (ctx) => {
      // @ts-expect-error no plugin provides `missing`
      ctx.missing.record("x");
    },
    onStatusUpdate: async () => {},
  },
});

type Metrics = { increment(name: string): void };

const metricsPlugin = {
  id: "metrics",
  init({ log }) {
    log.info("metrics.ready");
    const metrics: Metrics = { increment() {} };
    return { context: { metrics }, services: { metrics } };
  },
  hooks: {
    onMessage: async (ctx) => {
      ctx.metrics.increment(ctx.phone);
    },
  },
} satisfies BetterZapPlugin<BetterZapDatabase, { metrics: Metrics }>;

const flagsPlugin = (options: { enabled: string[] }) =>
  ({
    id: "flags",
    init() {
      return { services: { flags: new Set(options.enabled) } };
    },
  }) satisfies BetterZapPlugin;

const annotatedPlugin: BetterZapPlugin<
  BetterZapDatabase,
  { annotated: true }
> = {
  id: "annotated",
  init: () => ({ context: { annotated: true } }),
};

const zap = betterZap({
  database,
  config,
  plugins: [
    auditPlugin,
    metricsPlugin,
    flagsPlugin({ enabled: ["beta"] }),
    annotatedPlugin,
  ],
  webhook: {
    onMessage: async (ctx) => {
      ctx.audit.record(ctx.phone);
      ctx.metrics.increment("message");
      const annotated: true = ctx.annotated;
      void annotated;
    },
    onStatusUpdate: async () => {},
  },
});

zap.services.metrics.increment("boot");
zap.services.flags.has("beta");
zap.services.whatsapp;
// @ts-expect-error the audit plugin returns no services
zap.services.audit;

type TicketDatabase = BetterZapDatabase & {
  tickets: { open(phone: string): Promise<void> };
};

const ticketPlugin = definePlugin({
  id: "tickets",
  init({ database }: BetterZapPluginInitContext<TicketDatabase>) {
    return { context: { tickets: database.tickets } };
  },
  hooks: {
    onMessage: async (ctx) => {
      await ctx.db.tickets.open(ctx.phone);
      await ctx.tickets.open(ctx.phone);
    },
  },
});

declare const ticketDatabase: TicketDatabase;

betterZap({
  database: ticketDatabase,
  config,
  plugins: [ticketPlugin, auditPlugin],
  webhook: {
    onMessage: async (ctx) => {
      await ctx.tickets.open(ctx.phone);
      ctx.audit.record(ctx.phone);
    },
    onStatusUpdate: async () => {},
  },
});

betterZap({
  database,
  config,
  // @ts-expect-error the ticket plugin needs a database with tickets
  plugins: [ticketPlugin],
  webhook: {
    onMessage: async () => {},
    onStatusUpdate: async () => {},
  },
});

definePlugin({
  id: "async-init",
  // @ts-expect-error init must be synchronous
  init: async () => ({ context: {} }),
});

const asyncInitPlugin: BetterZapPlugin = {
  id: "async-init",
  // @ts-expect-error init must be synchronous
  init: async () => ({ context: {} }),
};
void asyncInitPlugin;

const auditReader = {
  id: "audit-reader",
  hooks: {
    onMessage: async (ctx) => {
      ctx.audit.record(ctx.phone);
    },
  },
} satisfies BetterZapPlugin<BetterZapDatabase, { audit: Audit }>;

betterZap({
  database,
  config,
  plugins: [auditPlugin, auditReader],
  webhook: noopWebhook,
});

betterZap({
  database,
  config,
  // @ts-expect-error no plugin provides the audit context the hook reads
  plugins: [auditReader],
  webhook: noopWebhook,
});

definePlugin({
  id: "audit-reader",
  hooks: {
    // @ts-expect-error a hook cannot declare context that its init does not return
    onMessage: async (ctx: MessageContext & { audit: Audit }) => {
      ctx.audit.record(ctx.phone);
    },
  },
});

const ticketHooksOnly = {
  id: "ticket-hooks",
  hooks: {
    onMessage: async (ctx) => {
      await ctx.db.tickets.open(ctx.phone);
    },
  },
} satisfies BetterZapPlugin<TicketDatabase>;

betterZap({
  database: ticketDatabase,
  config,
  plugins: [ticketHooksOnly],
  webhook: noopWebhook,
});

betterZap({
  database,
  config,
  // @ts-expect-error the hooks need a database with tickets
  plugins: [ticketHooksOnly],
  webhook: noopWebhook,
});

betterZap({
  database: ticketDatabase,
  config,
  plugins: [metricsPlugin],
  webhook: noopWebhook,
});

betterZap<TicketDatabase>({
  database: ticketDatabase,
  config,
  plugins: [auditPlugin, ticketPlugin],
  webhook: noopWebhook,
});

betterZap({
  database,
  config,
  plugins: [
    {
      id: "inline",
      init: () => ({ context: { inline: 1 } }),
      hooks: {
        onMessage: async (ctx) => {
          ctx.db.whatsappLog;
        },
      },
    },
  ],
  webhook: {
    onMessage: async (ctx) => {
      const inline: number = ctx.inline;
      void inline;
    },
    onStatusUpdate: async () => {},
  },
});

interface ReportContext {
  report: Audit;
}

declare const reportContext: ReportContext;

const reportPlugin = definePlugin({
  id: "report",
  init: () => ({ context: reportContext }),
  hooks: {
    onMessage: async (ctx) => {
      ctx.report.record(ctx.phone);
    },
  },
});

const pluginList = [auditPlugin, reportPlugin];

betterZap({
  database,
  config,
  plugins: pluginList,
  webhook: {
    onMessage: async (ctx) => {
      ctx.report.record(ctx.phone);
      ctx.audit.record(ctx.phone);
    },
    onStatusUpdate: async () => {},
  },
});

const reservedPlugin = {
  id: "reserved",
  init: () => ({ context: { db: 1 } }),
} satisfies BetterZapPlugin;

betterZap({
  database,
  config,
  plugins: [reservedPlugin],
  webhook: {
    onMessage: async (ctx) => {
      const db: BetterZapDatabase = ctx.db;
      void db;
    },
    onStatusUpdate: async () => {},
  },
});

betterZap({
  database,
  config,
  webhook: {
    onMessage: async (ctx) => {
      // @ts-expect-error no plugins, so no plugin context
      ctx.audit;
    },
    onStatusUpdate: async () => {},
  },
});

type SinglePluginContext<TPlugin> = InferBetterZapPluginContext<TPlugin>;
const singlePluginContext: SinglePluginContext<typeof auditPlugin> = {};
void singlePluginContext;

betterZap<BetterZapDatabase>({
  database,
  config,
  // @ts-expect-error explicit type arguments still check the hooks' database
  plugins: [ticketHooksOnly],
  webhook: noopWebhook,
});

betterZap<TicketDatabase>({
  database: ticketDatabase,
  config,
  // @ts-expect-error with explicit type arguments, hooks cannot read plugin context
  plugins: [metricsPlugin],
  webhook: noopWebhook,
});

const erasedPlugins: readonly AnyBetterZapPlugin[] = [ticketHooksOnly];

betterZap({
  database,
  config,
  // @ts-expect-error a list typed AnyBetterZapPlugin[] has lost its hook types
  plugins: erasedPlugins,
  webhook: noopWebhook,
});

const partialAuditReader = {
  id: "partial-audit-reader",
  hooks: {
    onMessage: async (ctx: MessageContext & { audit: Audit }) => {
      ctx.audit.record(ctx.phone);
    },
  },
};

betterZap({
  database,
  config,
  plugins: [auditPlugin, partialAuditReader],
  webhook: noopWebhook,
});

betterZap({
  database,
  config,
  // @ts-expect-error no plugin provides the audit context the hook reads
  plugins: [partialAuditReader],
  webhook: noopWebhook,
});

const legacyPlugins: BetterZapPlugin[] = [
  {
    id: "legacy",
    hooks: {
      onMessage: async (ctx) => {
        ctx.db.whatsappLog;
      },
    },
  },
];

betterZap({
  database: ticketDatabase,
  config,
  plugins: legacyPlugins,
  webhook: noopWebhook,
});

const counter = <TName extends string>(name: TName) =>
  definePlugin({
    id: name,
    init: () => ({ services: { [name]: 0 } as Record<TName, number> }),
  });

const counted = betterZap({
  database,
  config,
  plugins: [counter("visits")],
  webhook: noopWebhook,
});

const visits: number = counted.services.visits;
void visits;

betterZap({
  database,
  config,
  // @ts-expect-error a plugin without hooks does not hide another plugin's missing dependency
  plugins: [flagsPlugin({ enabled: ["beta"] }), auditReader],
  webhook: noopWebhook,
});

betterZap({
  database,
  config,
  // @ts-expect-error a plugin without hooks does not hide another plugin's database
  plugins: [flagsPlugin({ enabled: ["beta"] }), ticketHooksOnly],
  webhook: noopWebhook,
});

const mixedPlugins = [flagsPlugin({ enabled: ["beta"] }), auditReader];

betterZap({
  database,
  config,
  // @ts-expect-error the same holds for a list kept in a variable
  plugins: mixedPlugins,
  webhook: noopWebhook,
});

betterZap({
  database: ticketDatabase,
  config,
  plugins: [
    {
      id: "inline-tickets",
      hooks: {
        onMessage: async (ctx) => {
          await ctx.db.tickets.open(ctx.phone);
        },
      },
    },
  ],
  webhook: noopWebhook,
});

const countPlugin = {
  id: "count",
  init: () => ({ services: { count: 1 } }),
} satisfies BetterZapPlugin;

const idOnlyPlugin = { id: "id-only" };

const withIdOnly = betterZap({
  database,
  config,
  plugins: [countPlugin, idOnlyPlugin],
  webhook: noopWebhook,
});

const count: number = withIdOnly.services.count;
void count;

// @ts-expect-error a plugin that declares context needs an init that returns it
definePlugin<{ audit: Audit }>({
  id: "ghost",
  hooks: {
    onMessage: async (ctx) => {
      ctx.audit.record(ctx.phone);
    },
  },
});

declare const auditEnabled: boolean;

definePlugin({
  id: "maybe-audit",
  // @ts-expect-error init must always return the context it declares
  init: () => (auditEnabled ? { context: { audit: {} as Audit } } : undefined),
});

const phonePlugin = {
  id: "phone",
  init: () => ({ context: { phone: 1 } }),
} satisfies BetterZapPlugin;

const phoneReader = {
  id: "phone-reader",
  hooks: {
    onMessage: async (ctx: MessageContext) => {
      ctx.phone.toUpperCase();
    },
  },
};

betterZap({
  database,
  config,
  plugins: [phonePlugin, phoneReader],
  webhook: {
    onMessage: async (ctx) => {
      ctx.phone.toUpperCase();
      ctx.message.id;
    },
    onStatusUpdate: async () => {},
  },
});

const definedPhonePlugin = definePlugin({
  id: "defined-phone",
  init: () => ({ context: { phone: 1 } }),
  hooks: {
    onMessage: async (ctx) => {
      ctx.phone.toUpperCase();
    },
  },
});

betterZap<BetterZapDatabase>({
  database,
  config,
  plugins: [definedPhonePlugin, phonePlugin, phoneReader],
  webhook: noopWebhook,
});

const loggingPlugin = definePlugin({
  id: "logging",
  hooks: {
    onMessage: async () => {},
  },
});

const withLogging = betterZap({
  database,
  config,
  plugins: [loggingPlugin, metricsPlugin],
  webhook: {
    onMessage: async (ctx) => {
      ctx.metrics.increment(ctx.phone);
    },
    onStatusUpdate: async () => {},
  },
});

withLogging.services.metrics.increment("boot");

const loggingList = [loggingPlugin, auditPlugin];

betterZap({
  database,
  config,
  plugins: loggingList,
  webhook: {
    onMessage: async (ctx) => {
      ctx.audit.record(ctx.phone);
    },
    onStatusUpdate: async () => {},
  },
});

const legacyPlugin: BetterZapPlugin = { id: "legacy" };

betterZap({
  database,
  config,
  plugins: [legacyPlugin, loggingPlugin, auditPlugin, auditReader],
  webhook: {
    onMessage: async (ctx) => {
      ctx.audit.record(ctx.phone);
    },
    onStatusUpdate: async () => {},
  },
});

const auditId: "audit" = auditPlugin.id;
void auditId;

const basePlugins = [loggingPlugin, countPlugin] as const;

betterZap({
  database,
  config,
  plugins: [...basePlugins, auditPlugin, auditReader],
  webhook: noopWebhook,
});

type CrmContact = { id: string; name: string };

const crmPlugin = definePlugin({
  id: "crm",
  init: () => ({ context: { contact: {} as CrmContact } }),
});

const statusLogPlugin = definePlugin({
  id: "status-log",
  hooks: {
    onStatusUpdate: async (ctx) => {
      ctx.status.id;
    },
  },
});

const legacyCrmPlugin: BetterZapPlugin<
  BetterZapDatabase,
  { contact: CrmContact }
> = {
  id: "legacy-crm",
  init: () => ({ context: { contact: {} as CrmContact } }),
};

betterZap({
  database,
  config,
  plugins: [statusLogPlugin, crmPlugin],
  webhook: {
    onMessage: async (ctx) => {
      ctx.contact?.wa_id;
    },
    onStatusUpdate: async () => {},
    onTemplateStatusUpdate: async (ctx) => {
      ctx.contact.name;
    },
  },
});

betterZap({
  database,
  config,
  plugins: [legacyCrmPlugin],
  webhook: noopWebhook,
});

declare const computedKey: string;

const indexedPlugin = definePlugin({
  id: "indexed",
  init: () => ({ context: { phone: 1 } as Record<string, number> }),
  hooks: {
    onMessage: async (ctx) => {
      // @ts-expect-error a computed key may hit an event field, so it is unknown
      ctx[computedKey]!.toFixed();
      ctx.phone.toUpperCase();
    },
  },
});

betterZap({
  database,
  config,
  plugins: [indexedPlugin],
  webhook: {
    onMessage: async (ctx) => {
      // @ts-expect-error a computed key may hit an event field, so it is unknown
      ctx[computedKey]!.toFixed();
      ctx.phone.toUpperCase();
    },
    onStatusUpdate: async () => {},
  },
});

const withInline = betterZap({
  database: ticketDatabase,
  config,
  plugins: [
    legacyCrmPlugin,
    {
      id: "inline-untyped",
      init: () => ({ services: { inlineCount: 1 } }),
      hooks: {
        onMessage: async (ctx) => {
          await ctx.db.tickets.open(ctx.phone);
        },
      },
    },
  ],
  webhook: {
    onMessage: async () => {},
    onStatusUpdate: async () => {},
    onTemplateStatusUpdate: async (ctx) => {
      ctx.contact.name;
    },
  },
});

withInline.services.inlineCount.toFixed();

betterZap({
  database,
  config,
  plugins: [
    auditPlugin,
    auditReader,
    {
      id: "inline-untyped",
      hooks: {
        onMessage: async (ctx) => {
          ctx.db.whatsappLog;
        },
      },
    },
  ],
  webhook: {
    onMessage: async (ctx) => {
      ctx.audit.record(ctx.phone);
    },
    onStatusUpdate: async () => {},
  },
});

betterZap({
  database,
  config,
  plugins: [
    // @ts-expect-error an inline plugin does not hide another plugin's missing dependency
    auditReader,
    {
      id: "inline-untyped",
      hooks: {
        onMessage: async (ctx) => {
          ctx.db.whatsappLog;
        },
      },
    },
  ],
  webhook: noopWebhook,
});

betterZap({
  database,
  config,
  plugins: [
    legacyCrmPlugin,
    {
      id: "inline-untyped",
      hooks: {
        onMessage: async (ctx) => {
          // @ts-expect-error the inline hook's ctx is typed with the app's database
          await ctx.db.tickets.open(ctx.phone);
        },
      },
    },
  ],
  webhook: noopWebhook,
});

betterZap<BetterZapDatabase>({
  database,
  config,
  plugins: [
    // @ts-expect-error with explicit type arguments, an inline plugin does not relax the check of its siblings
    legacyCrmPlugin,
    {
      id: "inline-untyped",
      hooks: {
        onMessage: async (ctx) => {
          ctx.db.whatsappLog;
        },
      },
    },
  ],
  webhook: noopWebhook,
});

betterZap({
  database,
  config,
  plugins: [
    legacyCrmPlugin,
    definePlugin({
      id: "inline-defined",
      hooks: {
        onMessage: async (ctx) => {
          ctx.phone;
        },
      },
    }),
  ],
  webhook: noopWebhook,
});

const declaredIndexedPlugin = definePlugin({
  id: "declared-indexed",
  init: () => ({
    context: { count: 1 } as { [key: string]: number; count: number },
    services: { total: 1 } as { [key: string]: number; total: number },
  }),
  hooks: {
    onMessage: async (ctx) => {
      ctx.count.toFixed();
    },
  },
});

const declaredIndexed = betterZap({
  database,
  config,
  plugins: [declaredIndexedPlugin],
  webhook: {
    onMessage: async (ctx) => {
      ctx.count.toFixed();
      ctx.phone.toUpperCase();
      ctx.db.whatsappLog;
    },
    onStatusUpdate: async () => {},
  },
});

declaredIndexed.services.total.toFixed();
declaredIndexed.services.whatsapp;
