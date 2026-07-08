import { $ as UIMessage, A as createLogger, B as ConversationRecord, C as WhatsAppLogRecord, D as LogLevel, E as WhatsAppStatus, F as NewMessageEvent, G as MessageError, H as IncomingMessage, I as StatusUpdateEvent, J as SendMessageError, K as MessageStatus, L as SyncEvent, M as serializeError, N as ConversationSummary, O as Logger, P as ConversationUpdateEvent, Q as TemplateParameter, R as WhatsAppConfig, S as WhatsAppDirection, T as WhatsAppMessageType, U as InteractiveMediaCarouselCardInput, V as FreeformMessageWindow, W as MediaMessage, X as SendResult, Y as SendMessageResponse, Z as TemplateComponent, _ as OutgoingLoggingMetadata, a as SupportedTemplateParameterType, at as WebhookPayload, b as MessageLoggerService, c as TemplateName, ct as WhatsAppInteractiveButtonsMessage, d as TemplateParams, dt as WhatsAppLocationMessage, et as UIMessageStatus, f as TemplateRegistry, ft as WhatsAppTemplateMessage, g as serializeTemplateFromRegistry, h as hasConfiguredTemplates, i as EMPTY_TEMPLATE_REGISTRY, it as WebhookError, j as noopLogger, k as LoggerConfig, l as TemplateParameterDefinition, lt as WhatsAppInteractiveListMessage, m as getTemplateNames, mt as WhatsAppWebhookField, n as ZapClient, nt as WebhookContact, o as TemplateComponentDefinition, ot as WebhookValue, p as defineTemplates, pt as WhatsAppTextMessage, q as SendInteractiveMediaCarouselData, r as createZapClient, rt as WebhookEntry, s as TemplateDefinition, st as WhatsAppCarouselCard, t as BetterZapClientError, tt as WebhookChange, u as TemplateParameterInputMap, ut as WhatsAppInteractiveMediaCarouselMessage, v as WhatsAppService, w as WhatsAppLogStore, x as WHATSAPP_MESSAGE_TYPES, y as MessageLoggerNotifier, z as Conversation } from "./client-XMsOzllF.cjs";

//#region src/events.d.ts
type MessageContext = {
  message: IncomingMessage;
  contact: WebhookContact | undefined;
  content: string;
  phone: string;
};
type StatusContext = {
  status: MessageStatus;
  timestamp: string;
  errorMessage?: string;
  errorCode?: number;
};
//#endregion
//#region src/better-zap.types.d.ts
interface BetterZapDatabase {
  whatsappLog: WhatsAppLogStore;
  coexistence?: CoexistenceStore;
}
type BetterZapCoreConfig = WhatsAppConfig & {
  webhookToken: string;
  appSecret: string;
};
type UnionToIntersection<TUnion> = (TUnion extends unknown ? (value: TUnion) => void : never) extends ((value: infer TIntersection) => void) ? TIntersection : never;
type Simplify<TValue> = { [TKey in keyof TValue]: TValue[TKey] } & {};
type Awaitable<TValue> = TValue | Promise<TValue>;
type BetterZapCoreContext<TDatabase extends BetterZapDatabase = BetterZapDatabase> = {
  db: TDatabase;
  api: WhatsAppService;
  logger: MessageLoggerService;
};
type BetterZapContext<TDatabase extends BetterZapDatabase = BetterZapDatabase, TPluginContext extends Record<string, unknown> = {}> = Simplify<BetterZapCoreContext<TDatabase> & TPluginContext>;
type BetterZapCoreServices = {
  whatsapp: WhatsAppService;
  logger: MessageLoggerService;
};
type BetterZapServices<TPluginServices extends Record<string, unknown> = {}> = Simplify<BetterZapCoreServices & TPluginServices>;
interface BetterZapPluginInitResult<TContext extends Record<string, unknown> = {}, TServices extends Record<string, unknown> = {}> {
  context?: TContext;
  services?: TServices;
}
interface BetterZapPluginInitContext<TDatabase extends BetterZapDatabase = BetterZapDatabase> {
  database: TDatabase;
  config: BetterZapCoreConfig;
  context: BetterZapContext<TDatabase, Record<string, unknown>>;
  services: BetterZapServices<Record<string, unknown>>;
  log: Logger;
}
interface BetterZapPlugin<TDatabase extends BetterZapDatabase = BetterZapDatabase, TContext extends Record<string, unknown> = {}, TServices extends Record<string, unknown> = {}> {
  id: string;
  init?: (ctx: BetterZapPluginInitContext<TDatabase>) => BetterZapPluginInitResult<TContext, TServices> | void;
  hooks?: {
    onMessage?: (ctx: MessageContext & BetterZapContext<TDatabase, Record<string, unknown> & TContext>) => Promise<void>;
    onStatusUpdate?: (ctx: StatusContext & BetterZapContext<TDatabase, Record<string, unknown> & TContext>) => Promise<void>;
  };
}
type InferBetterZapPluginContext<TPlugins> = Simplify<UnionToIntersection<TPlugins extends readonly BetterZapPlugin<any, infer TContext, any>[] ? TContext : {}>>;
type InferBetterZapPluginServices<TPlugins> = Simplify<UnionToIntersection<TPlugins extends readonly BetterZapPlugin<any, any, infer TServices>[] ? TServices : {}>>;
type RawTemplateSendOptions = {
  language?: string;
  components?: TemplateComponent[];
  logging?: OutgoingLoggingMetadata;
};
type TypedTemplateSendOptions<TTemplates extends TemplateRegistry, TName extends TemplateName<TTemplates>> = {
  language?: string;
  params: TemplateParams<TTemplates[TName]>;
  logging?: OutgoingLoggingMetadata;
};
type BetterZapTemplateSendMethod<TTemplates extends TemplateRegistry> = [TemplateName<TTemplates>] extends [never] ? (to: string, templateName: string, opts?: RawTemplateSendOptions) => Promise<SendResult> : <TName extends TemplateName<TTemplates>>(to: string, templateName: TName, opts: TypedTemplateSendOptions<TTemplates, TName>) => Promise<SendResult>;
interface BetterZapApi<TTemplates extends TemplateRegistry = {}> {
  send: {
    text(to: string, body: string, opts?: Omit<OutgoingLoggingMetadata, "content">): Promise<SendResult>;
    template: BetterZapTemplateSendMethod<TTemplates>;
    templateRaw(to: string, templateName: string, opts?: RawTemplateSendOptions): Promise<SendResult>;
    interactiveButtons(to: string, body: string, buttons: Array<{
      id: string;
      title: string;
    }>, opts?: Omit<OutgoingLoggingMetadata, "content">): Promise<SendResult>;
    interactiveList(to: string, body: string, buttonLabel: string, sections: Array<{
      title: string;
      rows: Array<{
        id: string;
        title: string;
        description?: string;
      }>;
    }>, opts?: Omit<OutgoingLoggingMetadata, "content">): Promise<SendResult>;
    interactiveMediaCarousel(data: SendInteractiveMediaCarouselData, opts?: Omit<OutgoingLoggingMetadata, "content">): Promise<SendResult>;
    location(to: string, location: {
      latitude: number;
      longitude: number;
      name: string;
      address: string;
    }, opts?: Omit<OutgoingLoggingMetadata, "content">): Promise<SendResult>;
    markAsRead(messageId: string): Promise<SendResult>;
    reaction(to: string, messageId: string, emoji: string): Promise<SendResult>;
  };
  conversations: {
    list(): Promise<Conversation[]>;
    get(phone: string): Promise<Conversation | null>;
    messages(phone: string, opts?: {
      cursor?: string;
      limit?: number;
    }): Promise<UIMessage[]>;
  };
}
//#endregion
//#region src/types/coexistence.types.d.ts
type CoexistenceFeatureType = "whatsapp_business_app_onboarding";
type CoexistenceSessionInfoVersion = "3";
interface CoexistenceEmbeddedSignupConfigInput {
  configId: string;
  setup?: CoexistenceEmbeddedSignupSetup;
}
interface CoexistenceEmbeddedSignupSetup {
  business?: {
    id?: string;
    name?: string;
  };
  phone?: {
    displayPhoneNumber?: string;
    phoneNumberId?: string;
  };
  [key: string]: unknown;
}
interface CoexistenceEmbeddedSignupConfig {
  config_id: string;
  response_type: "code";
  override_default_response_type: true;
  extras: {
    setup?: CoexistenceEmbeddedSignupSetup;
    featureType: CoexistenceFeatureType;
    sessionInfoVersion: CoexistenceSessionInfoVersion;
  };
}
interface CoexistenceSessionEventPayload {
  event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" | "CANCEL_WHATSAPP_BUSINESS_APP_ONBOARDING" | "ERROR_WHATSAPP_BUSINESS_APP_ONBOARDING" | (string & {});
  data?: {
    waba_id?: string;
    business_id?: string;
    phone_number_id?: string;
    display_phone_number?: string;
    code?: string;
    error_message?: string;
    [key: string]: unknown;
  };
}
type CoexistencePreflightFailureCode = "unsupported_country" | "unsupported_app_version" | "low_activity_number" | "prior_provider_waba_registration" | "missing_payment_setup";
type CoexistenceEligibilityStatus = "eligible" | "ineligible" | "unknown";
type CoexistenceBillingStatus = "ready" | "missing_payment_setup" | "unknown";
interface CoexistencePreflightStateRecord {
  phoneNumberId?: string;
  wabaId?: string;
  displayPhoneNumber?: string;
  eligibilityStatus?: CoexistenceEligibilityStatus;
  billingStatus?: CoexistenceBillingStatus;
  unsupportedCountry?: boolean;
  unsupportedAppVersion?: boolean;
  lowActivityNumber?: boolean;
  priorProviderWabaRegistration?: boolean;
  missingPaymentSetup?: boolean;
  failureCodes?: CoexistencePreflightFailureCode[];
  checkedAt?: Date | string;
  metadata?: Record<string, unknown>;
}
interface CoexistenceConnectedAccountIdentifiers {
  wabaId: string;
  businessId?: string;
  phoneNumberId: string;
  displayPhoneNumber?: string;
}
interface CoexistencePhoneStatusResponse {
  id: string;
  is_on_biz_app?: boolean;
  platform_type?: "CLOUD_API" | "ON_PREMISE" | "NOT_APPLICABLE" | (string & {});
}
type CoexistenceSyncType = "smb_app_state_sync" | "history";
interface CoexistenceSyncRequest {
  sync_type: CoexistenceSyncType;
}
interface CoexistenceSyncResponse {
  success?: boolean;
  request_id?: string;
  id?: string;
  error?: MetaGraphApiErrorBody["error"];
}
interface MetaGraphApiErrorBody {
  error: {
    message: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
    error_data?: Record<string, unknown>;
  };
}
interface CoexistenceGraphResult<TData> {
  success: boolean;
  data?: TData;
  error?: string;
  errorCode?: number;
  httpStatus?: number;
  details?: unknown;
}
interface MetaAccessTokenProvider {
  getAccessToken(input: {
    wabaId?: string;
    phoneNumberId?: string;
    accountId?: string;
  }): Awaitable<string>;
}
interface CoexistenceCredentialProvider extends MetaAccessTokenProvider {
  exchangeEmbeddedSignupCode(input: {
    code: string;
    redirectUri?: string;
  }): Awaitable<CoexistenceTokenExchangeResult>;
}
interface CoexistenceTokenExchangeResult {
  accessToken: string;
  tokenType?: string;
  expiresIn?: number;
  raw?: unknown;
}
type CoexistenceWebhookPayload = CoexistenceHistoryWebhook | CoexistenceSmbAppStateSyncWebhook | CoexistenceSmbMessageEchoesWebhook | CoexistenceAccountUpdateWebhook | CoexistenceMessageEditWebhook | CoexistenceMessageRevokeWebhook | CoexistenceUnsupportedWebhook | CoexistenceErrorWebhook;
interface CoexistenceWebhookBase<TField extends string, TValue> {
  object: "whatsapp_business_account";
  entry: Array<{
    id: string;
    changes: Array<{
      field: TField;
      value: TValue;
    }>;
  }>;
}
interface CoexistenceWebhookValueBase {
  messaging_product?: "whatsapp";
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: Array<{
    profile?: {
      name?: string;
    };
    wa_id: string;
  }>;
  errors?: WebhookError[];
}
interface CoexistenceHistoryValue extends CoexistenceWebhookValueBase {
  request_id?: string;
  history?: Array<{
    messages?: IncomingMessage[];
    statuses?: MessageStatus[];
    errors?: WebhookError[];
    [key: string]: unknown;
  }>;
}
type CoexistenceHistoryWebhook = CoexistenceWebhookBase<"history", CoexistenceHistoryValue>;
interface CoexistenceSmbAppStateSyncValue extends CoexistenceWebhookValueBase {
  request_id?: string;
  sync_type?: "smb_app_state_sync";
  contacts?: Array<{
    wa_id: string;
    profile?: {
      name?: string;
    };
    phone_number?: string;
    removed?: boolean;
    [key: string]: unknown;
  }>;
}
type CoexistenceSmbAppStateSyncWebhook = CoexistenceWebhookBase<"smb_app_state_sync", CoexistenceSmbAppStateSyncValue>;
interface CoexistenceSmbMessageEchoesValue extends CoexistenceWebhookValueBase {
  messages: IncomingMessage[];
}
type CoexistenceSmbMessageEchoesWebhook = CoexistenceWebhookBase<"smb_message_echoes", CoexistenceSmbMessageEchoesValue>;
interface CoexistenceAccountUpdateValue extends CoexistenceWebhookValueBase {
  event?: "PARTNER_ADDED" | "PARTNER_REMOVED" | "ACCOUNT_DISABLED" | (string & {});
  waba_info?: {
    waba_id?: string;
    owner_business_id?: string;
    [key: string]: unknown;
  };
  phone_number_id?: string;
}
type CoexistenceAccountUpdateWebhook = CoexistenceWebhookBase<"account_update", CoexistenceAccountUpdateValue>;
interface CoexistenceMessageEditValue extends CoexistenceWebhookValueBase {
  messages: Array<IncomingMessage & {
    edited?: boolean;
  }>;
}
type CoexistenceMessageEditWebhook = CoexistenceWebhookBase<"messages", CoexistenceMessageEditValue>;
interface CoexistenceMessageRevokeValue extends CoexistenceWebhookValueBase {
  messages: Array<IncomingMessage & {
    revoked?: boolean;
  }>;
}
type CoexistenceMessageRevokeWebhook = CoexistenceWebhookBase<"messages", CoexistenceMessageRevokeValue>;
interface CoexistenceUnsupportedValue extends CoexistenceWebhookValueBase {
  unsupported?: true;
  reason?: string;
  [key: string]: unknown;
}
type CoexistenceUnsupportedWebhook = CoexistenceWebhookBase<string, CoexistenceUnsupportedValue>;
interface CoexistenceErrorValue extends CoexistenceWebhookValueBase {
  errors: WebhookError[];
}
type CoexistenceErrorWebhook = CoexistenceWebhookBase<string, CoexistenceErrorValue>;
interface CoexistenceConnectedAccountRecord extends CoexistenceConnectedAccountIdentifiers {
  accountId?: string;
  isOnBizApp?: boolean;
  platformType?: CoexistencePhoneStatusResponse["platform_type"];
  preflight?: CoexistencePreflightStateRecord;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  metadata?: Record<string, unknown>;
}
interface CoexistenceOnboardingSessionRecord {
  id: string;
  event: CoexistenceSessionEventPayload["event"];
  accountId?: string;
  wabaId?: string;
  phoneNumberId?: string;
  payload: CoexistenceSessionEventPayload;
  preflight?: CoexistencePreflightStateRecord;
  createdAt?: Date | string;
}
type CoexistenceSyncJobStatus = "requested" | "processing" | "completed" | "failed" | "deadline_exceeded" | (string & {});
interface CoexistenceSyncJobRecord {
  requestId: string;
  syncType: CoexistenceSyncType;
  onboardingSessionId?: string;
  wabaId?: string;
  phoneNumberId: string;
  status: CoexistenceSyncJobStatus;
  requestedAt?: Date | string;
  deadlineAt?: Date | string;
  completedAt?: Date | string;
  failedAt?: Date | string;
  failureReason?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  metadata?: Record<string, unknown>;
}
interface CoexistenceContactRecord {
  waId: string;
  phoneNumberId?: string;
  displayName?: string;
  removed?: boolean;
  updatedAt?: Date | string;
  metadata?: Record<string, unknown>;
}
interface CoexistenceLifecycleEventRecord {
  id?: string;
  accountId?: string;
  wabaId?: string;
  phoneNumberId?: string;
  event: string;
  payload: unknown;
  createdAt?: Date | string;
}
interface CoexistenceRawEventStatusRecord {
  id: string;
  status: "pending" | "processed" | "failed" | (string & {});
  error?: string;
  updatedAt?: Date | string;
}
interface CoexistenceStore {
  upsertConnectedAccount(account: CoexistenceConnectedAccountRecord): Awaitable<void>;
  getConnectedAccountByWabaId(wabaId: string): Awaitable<CoexistenceConnectedAccountRecord | null>;
  getConnectedAccountByPhoneNumberId(phoneNumberId: string): Awaitable<CoexistenceConnectedAccountRecord | null>;
  recordOnboardingSession(session: CoexistenceOnboardingSessionRecord): Awaitable<void>;
  upsertPreflightState?(state: CoexistencePreflightStateRecord): Awaitable<void>;
  getPreflightStateByPhoneNumberId?(phoneNumberId: string): Awaitable<CoexistencePreflightStateRecord | null>;
  createSyncJob(job: CoexistenceSyncJobRecord): Awaitable<void>;
  getInFlightSyncJob?(input: {
    phoneNumberId: string;
    syncType: CoexistenceSyncType;
    now?: Date | string;
  }): Awaitable<CoexistenceSyncJobRecord | null>;
  updateSyncJobByRequestId(requestId: string, patch: Partial<CoexistenceSyncJobRecord>): Awaitable<void>;
  upsertContact(contact: CoexistenceContactRecord): Awaitable<void>;
  removeContact(input: {
    waId: string;
    phoneNumberId?: string;
  }): Awaitable<void>;
  recordLifecycleEvent(event: CoexistenceLifecycleEventRecord): Awaitable<void>;
  updateRawEventStatus?(status: CoexistenceRawEventStatusRecord): Awaitable<void>;
}
//#endregion
//#region src/freeform-message-window.d.ts
declare const FREEFORM_MESSAGE_WINDOW_MS: number;
declare function createFreeformMessageWindow(lastIncomingMessageAt: string | null, now?: Date): FreeformMessageWindow;
declare function normalizeConversationRecord(record: ConversationRecord, now?: Date): Conversation;
declare function normalizeConversationRecords(records: ConversationRecord[], now?: Date): Conversation[];
declare function getLatestIncomingMessageAt(messages: UIMessage[] | undefined): string | null;
declare function resolveConversationFreeformMessageWindow(conversation: Pick<Conversation, "freeformMessageWindow" | "lastIncomingMessageAt"> | null | undefined, messages?: UIMessage[], now?: Date): FreeformMessageWindow;
//#endregion
//#region src/services/coexistence.service.d.ts
interface CoexistenceServiceConfig {
  accessToken?: string;
  appId?: string;
  appSecret?: string;
  graphApiVersion?: string;
  graphBaseUrl?: string;
  fetch?: typeof fetch;
  tokenProvider?: MetaAccessTokenProvider;
  credentialProvider?: CoexistenceCredentialProvider;
}
declare class CoexistenceService {
  private readonly accessToken?;
  private readonly appId?;
  private readonly appSecret?;
  private readonly graphApiVersion;
  private readonly graphBaseUrl;
  private readonly fetchImpl;
  private readonly tokenProvider?;
  private readonly credentialProvider?;
  constructor(config: CoexistenceServiceConfig);
  exchangeEmbeddedSignupCode(input: {
    code: string;
    redirectUri?: string;
  }): Promise<CoexistenceGraphResult<CoexistenceTokenExchangeResult>>;
  subscribeWaba(input: {
    wabaId: string;
    accessToken?: string;
  }): Promise<CoexistenceGraphResult<{
    success?: boolean;
  }>>;
  getPhoneStatus(input: {
    phoneNumberId: string;
    accessToken?: string;
  }): Promise<CoexistenceGraphResult<CoexistencePhoneStatusResponse>>;
  startContactsSync(input: {
    phoneNumberId: string;
    accessToken?: string;
  }): Promise<CoexistenceGraphResult<CoexistenceSyncResponse>>;
  startHistorySync(input: {
    phoneNumberId: string;
    accessToken?: string;
  }): Promise<CoexistenceGraphResult<CoexistenceSyncResponse>>;
  private startSmbAppDataSync;
  private resolveAccessToken;
  private request;
}
//#endregion
//#region src/coexistence/index.d.ts
declare function createCoexistenceEmbeddedSignupConfig(input: CoexistenceEmbeddedSignupConfigInput): CoexistenceEmbeddedSignupConfig;
//#endregion
//#region src/coexistence/memory-store.d.ts
declare class InMemoryCoexistenceStore implements CoexistenceStore {
  readonly connectedAccounts: Map<string, CoexistenceConnectedAccountRecord>;
  readonly onboardingSessions: Map<string, CoexistenceOnboardingSessionRecord>;
  readonly syncJobs: Map<string, CoexistenceSyncJobRecord>;
  readonly contacts: Map<string, CoexistenceContactRecord>;
  readonly lifecycleEvents: CoexistenceLifecycleEventRecord[];
  readonly rawEventStatuses: Map<string, CoexistenceRawEventStatusRecord>;
  readonly preflightStates: Map<string, CoexistencePreflightStateRecord>;
  upsertConnectedAccount(account: CoexistenceConnectedAccountRecord): Promise<void>;
  getConnectedAccountByWabaId(wabaId: string): Promise<CoexistenceConnectedAccountRecord | null>;
  getConnectedAccountByPhoneNumberId(phoneNumberId: string): Promise<CoexistenceConnectedAccountRecord | null>;
  recordOnboardingSession(session: CoexistenceOnboardingSessionRecord): Promise<void>;
  upsertPreflightState(state: CoexistencePreflightStateRecord): Promise<void>;
  getPreflightStateByPhoneNumberId(phoneNumberId: string): Promise<CoexistencePreflightStateRecord | null>;
  createSyncJob(job: CoexistenceSyncJobRecord): Promise<void>;
  getInFlightSyncJob(input: {
    phoneNumberId: string;
    syncType: CoexistenceSyncType;
    now?: Date | string;
  }): Promise<CoexistenceSyncJobRecord | null>;
  updateSyncJobByRequestId(requestId: string, patch: Partial<CoexistenceSyncJobRecord>): Promise<void>;
  upsertContact(contact: CoexistenceContactRecord): Promise<void>;
  removeContact(input: {
    waId: string;
    phoneNumberId?: string;
  }): Promise<void>;
  recordLifecycleEvent(event: CoexistenceLifecycleEventRecord): Promise<void>;
  updateRawEventStatus(status: CoexistenceRawEventStatusRecord): Promise<void>;
}
//#endregion
//#region src/utils/phone.d.ts
/**
 * Formats a phone number to the international format required by Meta Cloud API.
 * Currently defaults to Brazilian country code (55) if not provided.
 * Normalizes Brazilian numbers to always include the 9th digit.
 */
declare function formatPhone(phone: string): string;
//#endregion
//#region src/utils/delay.d.ts
/**
 * Utility function to pause execution for a given number of milliseconds.
 * Useful for exponential backoff or rate limiting.
 */
declare function delay(ms: number): Promise<void>;
//#endregion
export { type Awaitable, type BetterZapApi, BetterZapClientError, type BetterZapContext, type BetterZapCoreConfig, type BetterZapCoreContext, type BetterZapCoreServices, type BetterZapDatabase, type BetterZapPlugin, type BetterZapPluginInitContext, type BetterZapPluginInitResult, type BetterZapServices, type CoexistenceAccountUpdateValue, type CoexistenceAccountUpdateWebhook, type CoexistenceBillingStatus, type CoexistenceConnectedAccountIdentifiers, type CoexistenceConnectedAccountRecord, type CoexistenceContactRecord, type CoexistenceCredentialProvider, type CoexistenceEligibilityStatus, type CoexistenceEmbeddedSignupConfig, type CoexistenceEmbeddedSignupConfigInput, type CoexistenceEmbeddedSignupSetup, type CoexistenceErrorValue, type CoexistenceErrorWebhook, type CoexistenceFeatureType, type CoexistenceGraphResult, type CoexistenceHistoryValue, type CoexistenceHistoryWebhook, type CoexistenceLifecycleEventRecord, type CoexistenceMessageEditValue, type CoexistenceMessageEditWebhook, type CoexistenceMessageRevokeValue, type CoexistenceMessageRevokeWebhook, type CoexistenceOnboardingSessionRecord, type CoexistencePhoneStatusResponse, type CoexistencePreflightFailureCode, type CoexistencePreflightStateRecord, type CoexistenceRawEventStatusRecord, CoexistenceService, type CoexistenceServiceConfig, type CoexistenceSessionEventPayload, type CoexistenceSessionInfoVersion, type CoexistenceSmbAppStateSyncValue, type CoexistenceSmbAppStateSyncWebhook, type CoexistenceSmbMessageEchoesValue, type CoexistenceSmbMessageEchoesWebhook, type CoexistenceStore, type CoexistenceSyncJobRecord, type CoexistenceSyncJobStatus, type CoexistenceSyncRequest, type CoexistenceSyncResponse, type CoexistenceSyncType, type CoexistenceTokenExchangeResult, type CoexistenceUnsupportedValue, type CoexistenceUnsupportedWebhook, type CoexistenceWebhookBase, type CoexistenceWebhookPayload, type CoexistenceWebhookValueBase, type Conversation, type ConversationRecord, type ConversationSummary, type ConversationUpdateEvent, EMPTY_TEMPLATE_REGISTRY, FREEFORM_MESSAGE_WINDOW_MS, type FreeformMessageWindow, InMemoryCoexistenceStore, type IncomingMessage, type InferBetterZapPluginContext, type InferBetterZapPluginServices, type InteractiveMediaCarouselCardInput, type LogLevel, type Logger, type LoggerConfig, type MediaMessage, type MessageContext, type MessageError, type MessageLoggerNotifier, MessageLoggerService, type MessageStatus, type MetaAccessTokenProvider, type MetaGraphApiErrorBody, type NewMessageEvent, type OutgoingLoggingMetadata, type SendInteractiveMediaCarouselData, type SendMessageError, type SendMessageResponse, type SendResult, type StatusContext, type StatusUpdateEvent, type SupportedTemplateParameterType, type SyncEvent, type TemplateComponent, type TemplateComponentDefinition, type TemplateDefinition, type TemplateName, type TemplateParameter, type TemplateParameterDefinition, type TemplateParameterInputMap, type TemplateParams, type TemplateRegistry, type UIMessage, type UIMessageStatus, WHATSAPP_MESSAGE_TYPES, type WebhookChange, type WebhookContact, type WebhookEntry, type WebhookError, type WebhookPayload, type WebhookValue, type WhatsAppCarouselCard, type WhatsAppConfig, type WhatsAppDirection, type WhatsAppInteractiveButtonsMessage, type WhatsAppInteractiveListMessage, type WhatsAppInteractiveMediaCarouselMessage, type WhatsAppLocationMessage, type WhatsAppLogRecord, type WhatsAppLogStore, type WhatsAppMessageType, WhatsAppService, type WhatsAppStatus, type WhatsAppTemplateMessage, type WhatsAppTextMessage, type WhatsAppWebhookField, type ZapClient, createCoexistenceEmbeddedSignupConfig, createFreeformMessageWindow, createLogger, createZapClient, defineTemplates, delay, formatPhone, getLatestIncomingMessageAt, getTemplateNames, hasConfiguredTemplates, noopLogger, normalizeConversationRecord, normalizeConversationRecords, resolveConversationFreeformMessageWindow, serializeError, serializeTemplateFromRegistry };