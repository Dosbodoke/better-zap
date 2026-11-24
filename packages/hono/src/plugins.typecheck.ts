import { definePlugin } from "better-zap";
import type {
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
