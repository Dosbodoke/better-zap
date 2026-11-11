import type { BetterZapWebhookEventName } from "../better-zap.types";

/** Runtime list of every hookable webhook event, in dispatch-table order. */
export const WEBHOOK_EVENT_NAMES = [
  "onMessage",
  "onStatusUpdate",
  "onCoexistenceHistory",
  "onSmbAppStateSync",
  "onSmbMessageEcho",
  "onCoexistenceAccountUpdate",
  "onCoexistenceAccountOffboarded",
  "onCoexistenceAccountReconnected",
  "onCoexistenceMessageEdit",
  "onCoexistenceMessageRevoke",
  "onCoexistenceUnsupportedMessage",
] as const satisfies readonly BetterZapWebhookEventName[];

// Fails to compile when a hook is added to WebhookProcessorHooks but not here.
type MissingEventName = Exclude<
  BetterZapWebhookEventName,
  (typeof WEBHOOK_EVENT_NAMES)[number]
>;
const allEventNamesListed: [MissingEventName] extends [never] ? true : never =
  true;
void allEventNamesListed;
