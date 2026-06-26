export { betterZap } from "./better-zap";
export type { BetterZap, BetterZapConfig } from "./better-zap.types";

export {
  createWebhookHandler,
  type CoexistenceAccountUpdateContext,
  type CoexistenceHistoryContext,
  type CoexistenceUnsupportedMessageContext,
  type SmbAppStateSyncContext,
  type SmbMessageEchoContext,
  type WebhookConfig,
} from "./webhook/create-webhook-handler";
export { verifyMetaWebhookSignature } from "./webhook/signature-verification";
export { getMessageContent } from "./webhook/message-content";

export type { BetterZapEnv } from "./handler/types";

export type {
  BetterZapApi,
  BetterZapContext,
  BetterZapCoreConfig,
  BetterZapDatabase,
  BetterZapPlugin,
  BetterZapPluginInitContext,
  BetterZapPluginInitResult,
  BetterZapServices,
  InferBetterZapPluginContext,
  InferBetterZapPluginServices,
  MessageContext,
  StatusContext,
} from "better-zap";
