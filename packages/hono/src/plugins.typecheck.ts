import type { BetterZapDatabase, BetterZapPlugin } from "better-zap";
import { betterZap } from "./better-zap";

declare const database: BetterZapDatabase;

type Audit = { record(event: string): void };

// Annotate the plugin. `satisfies` does not work here: the `plugins` option
// compares against `BetterZapPlugin<TDatabase, any, any>`, which rejects it.
const auditPlugin: BetterZapPlugin<BetterZapDatabase, { audit: Audit }> = {
  id: "audit",
  init() {
    const audit: Audit = { record() {} };
    return { context: { audit } };
  },
  hooks: {
    // Plugin context and core context are both typed on a coexistence event.
    onSmbMessageEcho: async (ctx) => {
      ctx.audit.record("echo");
      ctx.db.whatsappLog;
      ctx.api;
    },
    onCoexistenceMessageRevoke: async (ctx) => {
      ctx.audit.record("revoke");
    },
  },
};

betterZap({
  database,
  config: { token: "t", phoneId: "p", webhookToken: "w", appSecret: "s" },
  plugins: [auditPlugin] as const,
  webhook: {
    // The app's hooks see the plugin context too.
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
  config: { token: "t", phoneId: "p", webhookToken: "w", appSecret: "s" },
  plugins: [auditPlugin] as const,
  webhook: {
    onMessage: async (ctx) => {
      // @ts-expect-error no plugin provides `missing`
      ctx.missing.record("x");
    },
    onStatusUpdate: async () => {},
  },
});

const asyncInitPlugin: BetterZapPlugin = {
  id: "async-init",
  // @ts-expect-error init must be synchronous
  init: async () => ({ context: {} }),
};
void asyncInitPlugin;
