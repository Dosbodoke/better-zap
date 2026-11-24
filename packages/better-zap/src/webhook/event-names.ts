import type { BetterZapWebhookEventName } from "../better-zap.types";

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
  "onTemplateStatusUpdate",
  "onTemplateQualityUpdate",
  "onTemplateCategoryUpdate",
  "onTemplateComponentsUpdate",
] as const satisfies readonly BetterZapWebhookEventName[];

type MissingEventName = Exclude<
  BetterZapWebhookEventName,
  (typeof WEBHOOK_EVENT_NAMES)[number]
>;
const allEventNamesListed: [MissingEventName] extends [never] ? true : never =
  true;
void allEventNamesListed;
