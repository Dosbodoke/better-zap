export type { WhatsAppConfig } from "./types/config";

export type {
  WhatsAppTextMessage,
  WhatsAppTemplateMessage,
  WhatsAppInteractiveButtonsMessage,
  WhatsAppInteractiveListMessage,
  WhatsAppInteractiveMediaCarouselMessage,
  WhatsAppCarouselCard,
  InteractiveMediaCarouselCardInput,
  SendInteractiveMediaCarouselData,
  WhatsAppLocationMessage,
  TemplateComponent,
  TemplateParameter,
  SendMessageResponse,
  SendMessageError,
  SendResult,
  WebhookPayload,
  WebhookEntry,
  WebhookChange,
  WhatsAppWebhookField,
  WebhookValue,
  WebhookContact,
  IncomingMessage,
  MediaMessage,
  MessageStatus,
  MessageError,
  WebhookError,
  ConversationRecord,
  Conversation,
  FreeformMessageWindow,
  UIMessage,
  UIMessageStatus,
} from "./types/whatsapp.types";

export type {
  CoexistenceAccountUpdateValue,
  CoexistenceAccountUpdateWebhook,
  CoexistenceAccountOffboardedValue,
  CoexistenceAccountOffboardedWebhook,
  CoexistenceAccountReconnectedValue,
  CoexistenceAccountReconnectedWebhook,
  CoexistenceConnectedAccountIdentifiers,
  CoexistenceConnectedAccountRecord,
  CoexistenceContactRecord,
  CoexistenceCredentialProvider,
  CoexistenceEmbeddedSignupConfig,
  CoexistenceEmbeddedSignupConfigInput,
  CoexistenceEmbeddedSignupSetup,
  CoexistenceErrorValue,
  CoexistenceErrorWebhook,
  CoexistenceFeatureType,
  CoexistenceGenericSessionEvent,
  CoexistenceGraphResult,
  CoexistenceHistoryValue,
  CoexistenceHistoryWebhook,
  CoexistenceLegacySessionEvent,
  CoexistenceLifecycleEventRecord,
  CoexistenceMessageEditValue,
  CoexistenceMessageEditWebhook,
  CoexistenceMessageRevokeValue,
  CoexistenceMessageRevokeWebhook,
  CoexistenceOnboardingSessionRecord,
  CoexistencePhoneStatusResponse,
  CoexistenceRawEventStatusRecord,
  CoexistenceBillingStatus,
  CoexistenceEligibilityStatus,
  CoexistencePreflightFailureCode,
  CoexistencePreflightStateRecord,
  CoexistenceSessionEventPayload,
  CoexistenceSessionInfoVersion,
  CoexistenceSmbAppStateSyncValue,
  CoexistenceSmbAppStateSyncWebhook,
  CoexistenceSmbMessageEchoesValue,
  CoexistenceSmbMessageEchoesWebhook,
  CoexistenceStore,
  CoexistenceSyncJobRecord,
  CoexistenceSyncJobStatus,
  CoexistenceSyncRequest,
  CoexistenceSyncResponse,
  CoexistenceSyncType,
  CoexistenceTokenExchangeResult,
  CoexistenceUnsupportedValue,
  CoexistenceUnsupportedWebhook,
  CoexistenceWebhookBase,
  CoexistenceWebhookPayload,
  CoexistenceWebhookValueBase,
  MetaAccessTokenProvider,
  MetaGraphApiErrorBody,
} from "./types/coexistence.types";

export {
  FREEFORM_MESSAGE_WINDOW_MS,
  createFreeformMessageWindow,
  getLatestIncomingMessageAt,
  normalizeConversationRecord,
  normalizeConversationRecords,
  resolveConversationFreeformMessageWindow,
} from "./freeform-message-window";

export type {
  SyncEvent,
  NewMessageEvent,
  StatusUpdateEvent,
  ConversationUpdateEvent,
  ConversationSummary,
} from "./types/sync-events";

export type { MessageContext, StatusContext } from "./events";

export {
  createLogger,
  noopLogger,
  serializeError,
  type Logger,
  type LoggerConfig,
  type LogLevel,
} from "./logger";

export {
  apiKeyTransport,
  BetterZapClientError,
  createZapClient,
  sessionTransport,
  type ZapClient,
  type ZapTransport,
} from "./client";
export { WhatsAppService, type OutgoingLoggingMetadata } from "./services/whatsapp.service";
export {
  CoexistenceService,
  type CoexistenceServiceConfig,
} from "./services/coexistence.service";
export {
  createCoexistenceEmbeddedSignupConfig,
  launchCoexistenceEmbeddedSignup,
  normalizeCoexistenceSessionEvent,
  normalizeCoexistenceSessionPayload,
  toLegacyCoexistenceSessionEvent,
  type CoexistenceEmbeddedSignupCallbacks,
  type CoexistenceEmbeddedSignupController,
  type CoexistenceEmbeddedSignupMessageEvent,
  type CoexistenceEmbeddedSignupResult,
  type CoexistenceEmbeddedSignupWindow,
  type CoexistenceFacebookInitOptions,
  type CoexistenceFacebookLoginResponse,
  type CoexistenceFacebookSdk,
  type LaunchCoexistenceEmbeddedSignupInput,
  type NormalizedCoexistenceSessionEvent,
} from "./coexistence";
export { InMemoryCoexistenceStore } from "./coexistence/memory-store";
export {
  MessageLoggerService,
  WHATSAPP_MESSAGE_TYPES,
  type MessageLoggerNotifier,
  type WhatsAppLogStore,
  type WhatsAppLogRecord,
  type WhatsAppMessageType,
  type WhatsAppDirection,
  type WhatsAppStatus,
} from "./services/message-logger.service";

export {
  EMPTY_TEMPLATE_REGISTRY,
  defineTemplates,
  getTemplateNames,
  hasConfiguredTemplates,
  serializeTemplateFromRegistry,
} from "./template-registry";
export type {
  SupportedTemplateParameterType,
  TemplateComponentDefinition,
  TemplateDefinition,
  TemplateName,
  TemplateParameterDefinition,
  TemplateParameterInputMap,
  TemplateParams,
  TemplateRegistry,
} from "./template-registry";

export { formatPhone } from "./utils/phone";
export { delay } from "./utils/delay";

export { getMessageContent } from "./webhook/message-content";
export {
  createWebhookProcessor,
  type CoexistenceAccountOffboardedContext,
  type CoexistenceAccountReconnectedContext,
  type CoexistenceAccountUpdateContext,
  type CoexistenceHistoryContext,
  type CoexistenceMessageEditContext,
  type CoexistenceMessageRevokeContext,
  type CoexistenceUnsupportedMessageContext,
  type SmbAppStateSyncContext,
  type SmbMessageEchoContext,
  type WebhookProcessor,
  type WebhookProcessorConfig,
  type WebhookProcessorHooks,
} from "./webhook/webhook-processor";

export type {
  Awaitable,
  BetterZapApi,
  BetterZapContext,
  BetterZapCoreConfig,
  BetterZapCoreContext,
  BetterZapCoreServices,
  BetterZapDatabase,
  BetterZapPlugin,
  BetterZapPluginInitContext,
  BetterZapPluginInitResult,
  BetterZapServices,
  InferBetterZapPluginContext,
  InferBetterZapPluginServices,
} from "./better-zap.types";
