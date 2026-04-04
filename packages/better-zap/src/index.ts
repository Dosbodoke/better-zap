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
  BetterZapClientError,
  createZapClient,
  type ZapClient,
} from "./client";
export { WhatsAppService, type OutgoingLoggingMetadata } from "./services/whatsapp.service";
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
