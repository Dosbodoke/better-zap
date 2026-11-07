import { $ as SendInteractiveMediaCarouselData, A as WhatsAppMessageType, B as MessageUpdateEvent, C as ImportMessageResult, D as WhatsAppDirection, E as WHATSAPP_MESSAGE_TYPES, F as createLogger, G as Conversation, H as StatusUpdateEvent, I as noopLogger, J as IncomingMessage, K as ConversationRecord, L as serializeError, M as LogLevel, N as Logger, O as WhatsAppLogRecord, P as LoggerConfig, Q as MessageStatus, R as ConversationSummary, S as ImportMessageParams, T as MessageLoggerService, U as SyncEvent, V as NewMessageEvent, W as WhatsAppConfig, X as MediaMessage, Y as InteractiveMediaCarouselCardInput, Z as MessageError, _ as getTemplateNames, _t as WhatsAppLocationMessage, a as createZapClient, at as UIMessage, b as OutgoingLoggingMetadata, bt as WhatsAppWebhookField, c as SupportedTemplateParameterType, ct as WebhookContact, d as TemplateName, dt as WebhookPayload, et as SendMessageError, f as TemplateParameterDefinition, ft as WebhookValue, g as defineTemplates, gt as WhatsAppInteractiveMediaCarouselMessage, h as TemplateRegistry, ht as WhatsAppInteractiveListMessage, i as apiKeyTransport, it as TemplateParameter, j as WhatsAppStatus, k as WhatsAppLogStore, l as TemplateComponentDefinition, lt as WebhookEntry, m as TemplateParams, mt as WhatsAppInteractiveButtonsMessage, n as ZapClient, nt as SendResult, o as sessionTransport, ot as UIMessageStatus, p as TemplateParameterInputMap, pt as WhatsAppCarouselCard, q as FreeformMessageWindow, r as ZapTransport, rt as TemplateComponent, s as EMPTY_TEMPLATE_REGISTRY, st as WebhookChange, t as BetterZapClientError, tt as SendMessageResponse, u as TemplateDefinition, ut as WebhookError, v as hasConfiguredTemplates, vt as WhatsAppTemplateMessage, w as MessageLoggerNotifier, x as WhatsAppService, y as serializeTemplateFromRegistry, yt as WhatsAppTextMessage, z as ConversationUpdateEvent } from "./client-BOzEekAI.cjs";

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
type CoexistenceGenericSessionEvent = "FINISH" | "CANCEL" | "ERROR" | "PROGRESS";
type CoexistenceLegacySessionEvent = "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING" | "CANCEL_WHATSAPP_BUSINESS_APP_ONBOARDING" | "ERROR_WHATSAPP_BUSINESS_APP_ONBOARDING";
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
  event: CoexistenceGenericSessionEvent | CoexistenceLegacySessionEvent | (string & {});
  data?: {
    waba_id?: string;
    business_id?: string;
    phone_number_id?: string;
    display_phone_number?: string;
    code?: string;
    current_step?: string;
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
    is_transient?: boolean;
    error_data?: Record<string, unknown>;
  };
}
type CoexistenceGraphFailureKind = "graph_error" | "http_error" | "network_error" | "malformed_response" | "configuration_error" | "credential_provider_error";
/**
 * Log-safe failure summary. It never contains tokens, the app secret, the
 * authorization code, request URLs, or Meta's free-text error message.
 */
interface CoexistenceGraphErrorDiagnostics {
  kind: CoexistenceGraphFailureKind;
  httpStatus?: number;
  code?: number;
  subcode?: number;
  type?: string;
  fbtraceId?: string;
  /**
   * The failure class is usually transient (network, 5xx, 429, throttling or
   * `is_transient`). An Embedded Signup code is single-use and short-lived, so
   * retrying an exchange may still need a new code.
   */
  retryable: boolean;
}
interface CoexistenceGraphResult<TData> {
  success: boolean;
  data?: TData;
  error?: string;
  errorCode?: number;
  errorSubcode?: number;
  httpStatus?: number;
  /** Raw response body. May contain untrusted text; do not log it verbatim. */
  details?: unknown;
  diagnostics?: CoexistenceGraphErrorDiagnostics;
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
  /**
   * Deployment-owned credential reference returned by your credential provider.
   * This is a vault/key identifier only; do not put a raw Meta access token here.
   */
  credentialRef?: string;
  credentialProvider?: string;
  credentialMetadata?: Record<string, unknown>;
  raw?: unknown;
}
type CoexistenceWebhookPayload = CoexistenceHistoryWebhook | CoexistenceSmbAppStateSyncWebhook | CoexistenceSmbMessageEchoesWebhook | CoexistenceAccountUpdateWebhook | CoexistenceAccountOffboardedWebhook | CoexistenceAccountReconnectedWebhook | CoexistenceMessageEditWebhook | CoexistenceMessageRevokeWebhook | CoexistenceUnsupportedWebhook | CoexistenceErrorWebhook;
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
/**
 * Message fields Meta adds for coexistence webhooks. `from` is omitted when the
 * user's phone number is unavailable; `from_user_id` / `to_user_id` carry the
 * business-scoped user ID (BSUID) instead.
 */
type CoexistenceWebhookMessage = IncomingMessage & {
  from_user_id?: string;
  from_parent_user_id?: string;
  to?: string;
  to_user_id?: string;
  to_parent_user_id?: string;
  history_context?: {
    status?: string;
    [key: string]: unknown;
  };
};
interface CoexistenceHistoryThread {
  /** The WhatsApp user's phone number. Omitted when unavailable. */
  id?: string;
  context?: {
    wa_id?: string;
    user_id?: string;
    parent_user_id?: string;
    username?: string;
    [key: string]: unknown;
  };
  messages?: CoexistenceWebhookMessage[];
  [key: string]: unknown;
}
interface CoexistenceHistoryChunkMetadata {
  /** 0: day 0-1, 1: day 1-90, 2: day 90-180. Does not mean the phase finished. */
  phase?: number;
  /** Chunks can arrive out of order; use this to sequence them. */
  chunk_order?: number;
  /** Overall sync progress, 0-100. 100 means the history sync is complete. */
  progress?: number;
  [key: string]: unknown;
}
interface CoexistenceHistoryChunk {
  metadata?: CoexistenceHistoryChunkMetadata;
  /** Documented shape: messages grouped per WhatsApp user thread. */
  threads?: CoexistenceHistoryThread[];
  /** Legacy flat shape. Still accepted; duplicates of thread messages are skipped. */
  messages?: CoexistenceWebhookMessage[];
  statuses?: MessageStatus[];
  errors?: WebhookError[];
  [key: string]: unknown;
}
interface CoexistenceHistoryValue extends CoexistenceWebhookValueBase {
  request_id?: string;
  history?: CoexistenceHistoryChunk[];
  /** Media asset deliveries for earlier `media_placeholder` history messages. */
  messages?: CoexistenceWebhookMessage[];
}
type CoexistenceHistoryWebhook = CoexistenceWebhookBase<"history", CoexistenceHistoryValue>;
interface CoexistenceStateSyncContact {
  full_name?: string;
  first_name?: string;
  /** Omitted when the user's phone number is unavailable. */
  phone_number?: string;
  user_id?: string;
  parent_user_id?: string;
  username?: string;
  [key: string]: unknown;
}
interface CoexistenceStateSyncItem {
  type?: "contact" | (string & {});
  contact?: CoexistenceStateSyncContact;
  /** `add` covers adds and edits; `remove` deletes the contact. */
  action?: "add" | "remove" | (string & {});
  metadata?: {
    timestamp?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
interface CoexistenceSmbAppStateSyncValue extends CoexistenceWebhookValueBase {
  request_id?: string;
  sync_type?: "smb_app_state_sync";
  /** Documented contact sync shape. */
  state_sync?: CoexistenceStateSyncItem[];
  /** Legacy contact shape. Still accepted; contacts already in `state_sync` are skipped. */
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
  /**
   * Echoed messages. Meta's documented payload uses `message_echoes`; the Hono
   * webhook handler merges both arrays into `messages` before calling hooks.
   */
  messages: IncomingMessage[];
  message_echoes?: CoexistenceWebhookMessage[];
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
interface CoexistenceAccountOffboardedValue extends CoexistenceWebhookValueBase {
  event?: "ACCOUNT_OFFBOARDED" | (string & {});
  reason?: string;
  phone_number_id?: string;
  waba_info?: {
    waba_id?: string;
    owner_business_id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
type CoexistenceAccountOffboardedWebhook = CoexistenceWebhookBase<"account_offboarded", CoexistenceAccountOffboardedValue>;
interface CoexistenceAccountReconnectedValue extends CoexistenceWebhookValueBase {
  event?: "ACCOUNT_RECONNECTED" | (string & {});
  phone_number_id?: string;
  reconnect_reason?: "APP_REINSTALL" | "DEVICE_SWITCH" | "REREGISTRATION" | (string & {});
  cloud_api_products?: Array<{
    product_id?: string;
    product_name?: string;
    reconnected?: boolean;
    [key: string]: unknown;
  }>;
  waba_info?: {
    waba_id?: string;
    owner_business_id?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}
type CoexistenceAccountReconnectedWebhook = CoexistenceWebhookBase<"account_reconnected", CoexistenceAccountReconnectedValue>;
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
  status?: "connected" | "offboarded" | "reconnected" | "unusable" | (string & {});
  usable?: boolean;
  offboardedAt?: Date | string;
  reconnectedAt?: Date | string;
  isOnBizApp?: boolean;
  platformType?: CoexistencePhoneStatusResponse["platform_type"];
  /**
   * Reference to deployment-owned token custody for this WABA/phone number.
   * The generic account record must never store raw Meta access tokens.
   */
  credentialRef?: string;
  credentialProvider?: string;
  /**
   * Provider metadata that helps resolve credential custody later.
   * Store only non-secret values such as vault key versions, tenant IDs, token
   * expiry timestamps, or provider account labels. Do not store raw tokens.
   */
  credentialMetadata?: Record<string, unknown>;
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
  error?: string | null;
  requestedAt?: Date | string;
  deadlineAt?: Date | string;
  completedAt?: Date | string | null;
  failedAt?: Date | string;
  failureReason?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  metadata?: Record<string, unknown>;
}
interface CoexistenceContactRecord {
  /** The contact's phone number, or its business-scoped user ID when Meta omits the phone. */
  waId: string;
  phoneNumberId?: string;
  displayName?: string;
  firstName?: string;
  userId?: string;
  parentUserId?: string;
  username?: string;
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
  result?: unknown;
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
  getRawEventStatus?(id: string): Awaitable<CoexistenceRawEventStatusRecord | null>;
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
//#region src/coexistence/config.d.ts
declare function createCoexistenceEmbeddedSignupConfig(input: CoexistenceEmbeddedSignupConfigInput): CoexistenceEmbeddedSignupConfig;
//#endregion
//#region src/coexistence/events.d.ts
type NormalizedCoexistenceSessionEvent = CoexistenceGenericSessionEvent;
declare function normalizeCoexistenceSessionEvent(event: CoexistenceSessionEventPayload["event"]): NormalizedCoexistenceSessionEvent;
declare function toLegacyCoexistenceSessionEvent(event: CoexistenceGenericSessionEvent): CoexistenceLegacySessionEvent | CoexistenceGenericSessionEvent;
declare function normalizeCoexistenceSessionPayload<TPayload extends CoexistenceSessionEventPayload>(payload: TPayload): TPayload & {
  normalizedEvent: NormalizedCoexistenceSessionEvent;
};
//#endregion
//#region src/coexistence/embedded-signup.d.ts
type CoexistenceEmbeddedSignupMessageEvent = {
  origin: string;
  data: unknown;
};
type CoexistenceEmbeddedSignupWindow = {
  addEventListener(type: "message", listener: (event: CoexistenceEmbeddedSignupMessageEvent) => void): void;
  removeEventListener(type: "message", listener: (event: CoexistenceEmbeddedSignupMessageEvent) => void): void;
};
type CoexistenceFacebookLoginResponse = {
  authResponse?: {
    code?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
};
type CoexistenceFacebookSdk = {
  init?(options: CoexistenceFacebookInitOptions): void;
  login(callback: (response: CoexistenceFacebookLoginResponse) => void, config: ReturnType<typeof createCoexistenceEmbeddedSignupConfig>): void;
};
type CoexistenceFacebookInitOptions = {
  appId?: string;
  version?: string;
  xfbml?: boolean;
  cookie?: boolean;
  status?: boolean;
  [key: string]: unknown;
};
/**
 * How an Embedded Signup launch ended.
 *
 * - `completed`: a FINISH session event and an authorization code both arrived.
 * - `finished_without_code`: FINISH arrived but no code did. Meta treats closing
 *   the popup on the final screen as success, but only sends the code when the
 *   customer clicks Finish.
 * - `missing_session`: a code arrived but no terminal session event did within
 *   `joinTimeoutMs`. Do not treat this as a confirmed onboarding.
 * - `cancelled` / `error`: the latest terminal session event was CANCEL / ERROR.
 * - `no_authorization`: the login callback had no code and no session arrived.
 * - `torn_down`: `teardown()` ran before the flow settled.
 */
type CoexistenceEmbeddedSignupStatus = "completed" | "finished_without_code" | "missing_session" | "cancelled" | "error" | "no_authorization" | "torn_down";
type CoexistenceEmbeddedSignupResult = {
  status: CoexistenceEmbeddedSignupStatus;
  code: string | null;
  session: CoexistenceSessionEventPayload | null; /** The FB.login response, or `{}` when the callback never ran. */
  loginResponse: CoexistenceFacebookLoginResponse;
  loginCallbackReceived: boolean;
};
type CoexistenceEmbeddedSignupCallbacks = {
  onFinish?: (event: {
    code: string | null;
    session: CoexistenceSessionEventPayload;
  }) => void;
  onCancel?: (event: {
    session: CoexistenceSessionEventPayload;
  }) => void;
  onError?: (event: {
    session: CoexistenceSessionEventPayload;
  }) => void;
  onProgress?: (event: {
    session: CoexistenceSessionEventPayload;
  }) => void;
};
type LaunchCoexistenceEmbeddedSignupInput = CoexistenceEmbeddedSignupConfigInput & CoexistenceEmbeddedSignupCallbacks & {
  fb: CoexistenceFacebookSdk;
  target: CoexistenceEmbeddedSignupWindow;
  allowedOrigins?: string[];
  origin?: string;
  fbInit?: CoexistenceFacebookInitOptions;
  /**
   * How long to wait for the other half (session event or login callback)
   * once a code or a FINISH/CANCEL event arrives. Meta codes expire after
   * about 30 seconds, so keep this short.
   * @default 5000
   */
  joinTimeoutMs?: number;
};
type CoexistenceEmbeddedSignupController = {
  /**
   * Settles exactly once. It rejects only when `FB.login` throws; every flow
   * outcome resolves with a `status`.
   */
  result: Promise<CoexistenceEmbeddedSignupResult>; /** Removes the listener, clears timers, and settles as `torn_down` if pending. */
  teardown(): void;
};
declare function launchCoexistenceEmbeddedSignup(input: LaunchCoexistenceEmbeddedSignupInput): CoexistenceEmbeddedSignupController;
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
//#region src/link-preview.d.ts
/**
 * Pure helpers for WhatsApp-style link previews (Open Graph cards).
 *
 * Fetching a page is left to the app: it needs SSRF guards, timeouts, size
 * limits and caching that depend on where the app runs. These helpers only
 * find the link to preview and turn the fetched HTML into a `LinkPreview`.
 */
/** Data for one link preview card. */
interface LinkPreview {
  /** The page the card links to. */
  url: string;
  title: string;
  description?: string;
  /** Absolute http(s) image URL. */
  image?: string;
  siteName?: string;
}
/**
 * Returns the first http(s) link in a message, or null.
 *
 * Trailing punctuation that usually ends the sentence rather than the URL
 * (`).,!?;:'"]`) is trimmed. A closing `)` or `]` is kept when it balances an
 * opening one inside the URL, e.g. `https://en.wikipedia.org/wiki/Foo_(bar)`.
 */
declare function firstLinkIn(text: string | null | undefined): string | null;
/**
 * Builds a `LinkPreview` from a page's HTML, or returns null when the page has
 * no usable title.
 *
 * Reads `og:*` tags first, then `twitter:*`, then `<title>` and the
 * `description` meta tag. Entities are decoded, relative image URLs are
 * resolved against `pageUrl`, and only http(s) images are kept. Only the
 * `<head>` is read, so passing just the first chunk of a page works.
 */
declare function parseOpenGraph(html: string, pageUrl: string): LinkPreview | null;
//#endregion
//#region src/utils/phone.d.ts
/**
 * Formats a phone number to the international format required by Meta Cloud API.
 * Currently defaults to Brazilian country code (55) if not provided.
 * Normalizes Brazilian numbers to always include the 9th digit.
 */
declare function formatPhone(phone: string): string;
//#endregion
//#region src/utils/media-placeholder.d.ts
/**
 * Coexistence history sync sends older media as `type: "media_placeholder"`
 * with no media object. For media sent within 14 days of onboarding, Meta later
 * sends another history webhook with the same message id and the real media.
 */
declare const MEDIA_PLACEHOLDER_TYPE = "media_placeholder";
/** True when a webhook message is a history media placeholder. */
declare function isMediaPlaceholder(message: {
  type?: unknown;
} | null | undefined): boolean;
/**
 * True when a stored log record still holds a media placeholder, so UIs can
 * show "media unavailable" instead of the text label.
 *
 * Checks the `mediaPending` flag set by the SDK, and falls back to the raw
 * message type for records stored before the flag existed.
 */
declare function hasPendingMedia(record: {
  metadata?: unknown;
} | null | undefined): boolean;
//#endregion
//#region src/utils/delay.d.ts
/**
 * Utility function to pause execution for a given number of milliseconds.
 * Useful for exponential backoff or rate limiting.
 */
declare function delay(ms: number): Promise<void>;
//#endregion
//#region src/webhook/message-content.d.ts
/**
 * Extract human-readable content from incoming messages for audit logs.
 */
declare function getMessageContent(message: IncomingMessage): string;
//#endregion
//#region src/webhook/webhook-processor.d.ts
interface CoexistenceHistoryContext {
  value: CoexistenceHistoryValue;
  change: WebhookChange;
  importedMessages: number;
  /** Already stored, or repeated within this webhook. */
  duplicateMessages: number;
  /** Stored media placeholders replaced by the real media in this webhook. */
  upgradedMessages: number;
  /** Messages or statuses that could not be stored. Any failure fails the sync job. */
  failedMessages: number;
  /** From `request_id`, or the in-flight history job for this phone number. */
  requestId?: string;
  /** Highest `history[].metadata.progress` in this webhook (100 = complete). */
  progress?: number;
  phase?: number;
  chunkOrder?: number;
}
interface SmbAppStateSyncContext {
  value: CoexistenceSmbAppStateSyncValue;
  change: WebhookChange;
  upsertedContacts: number;
  removedContacts: number;
  /** Non-contact items, unknown actions, or contacts without any identity. */
  skippedContacts: number;
  /** Contacts the store failed to write. Any failure fails the sync job. */
  failedContacts: number;
}
interface SmbMessageEchoContext {
  /** `messages` holds the merged `message_echoes` and legacy `messages`. */
  value: CoexistenceSmbMessageEchoesValue;
  change: WebhookChange;
  importedMessages: number;
  duplicateMessages: number;
  /** Stored media placeholders replaced by real media. */
  upgradedMessages: number;
  failedMessages: number;
}
interface CoexistenceAccountUpdateContext {
  value: CoexistenceAccountUpdateValue;
  change: WebhookChange;
}
interface CoexistenceAccountOffboardedContext {
  value: CoexistenceAccountOffboardedValue;
  change: WebhookChange;
}
interface CoexistenceAccountReconnectedContext {
  value: CoexistenceAccountReconnectedValue;
  change: WebhookChange;
}
interface CoexistenceMessageEditContext {
  value: CoexistenceMessageEditValue;
  change: WebhookChange;
  editedMessages: number;
}
interface CoexistenceMessageRevokeContext {
  value: CoexistenceMessageRevokeValue;
  change: WebhookChange;
  revokedMessages: number;
}
interface CoexistenceUnsupportedMessageContext {
  value: CoexistenceHistoryValue | CoexistenceSmbAppStateSyncValue | CoexistenceUnsupportedValue;
  change: WebhookChange;
  errors: WebhookError[];
}
interface WebhookProcessorHooks {
  /** Called once per incoming message, after SDK pre-processing. */
  onMessage: (ctx: MessageContext) => Promise<void>;
  /** Called once per delivery status update (sent → delivered → read → failed). */
  onStatusUpdate: (ctx: StatusContext) => Promise<void>;
  /** Called once per history webhook after SDK pre-processing. */
  onCoexistenceHistory?: (ctx: CoexistenceHistoryContext) => Promise<void>;
  /** Called once per SMB app state sync webhook after SDK pre-processing. */
  onSmbAppStateSync?: (ctx: SmbAppStateSyncContext) => Promise<void>;
  /** Called once per app message echo webhook after SDK pre-processing. */
  onSmbMessageEcho?: (ctx: SmbMessageEchoContext) => Promise<void>;
  /** Called once per coexistence account lifecycle webhook. */
  onCoexistenceAccountUpdate?: (ctx: CoexistenceAccountUpdateContext) => Promise<void>;
  /** Called once per coexistence offboarding lifecycle webhook. */
  onCoexistenceAccountOffboarded?: (ctx: CoexistenceAccountOffboardedContext) => Promise<void>;
  /** Called once per coexistence background reconnection lifecycle webhook. */
  onCoexistenceAccountReconnected?: (ctx: CoexistenceAccountReconnectedContext) => Promise<void>;
  /** Called for coexistence message edit webhooks. */
  onCoexistenceMessageEdit?: (ctx: CoexistenceMessageEditContext) => Promise<void>;
  /** Called for coexistence message revoke webhooks. */
  onCoexistenceMessageRevoke?: (ctx: CoexistenceMessageRevokeContext) => Promise<void>;
  /** Called when a coexistence webhook contains unsupported/error content. */
  onCoexistenceUnsupportedMessage?: (ctx: CoexistenceUnsupportedMessageContext) => Promise<void>;
  /**
   * Called for Meta platform-level errors.
   * @default Uses the configured {@link WebhookProcessorConfig.log} logger's {@code error} method.
   */
  onError?: (error: WebhookError) => void;
}
interface WebhookProcessorConfig {
  /** logger for automatic message storage. */
  logger: MessageLoggerService;
  /** Structured logger for operational logging. */
  log: Logger;
  /** Optional database contracts used for automatic coexistence persistence. */
  database?: BetterZapDatabase;
  /** The dispatch hooks called for each webhook event. */
  hooks: WebhookProcessorHooks;
  /** Seam for human-readable message content. Defaults to the built-in pt-BR resolver. */
  resolveMessageContent?: (message: IncomingMessage) => string;
}
interface WebhookProcessor {
  /** Dispatches one Meta webhook payload. Never throws: all errors are logged. */
  process(payload: WebhookPayload): Promise<void>;
}
declare function createWebhookProcessor(config: WebhookProcessorConfig): WebhookProcessor;
//#endregion
export { type Awaitable, type BetterZapApi, BetterZapClientError, type BetterZapContext, type BetterZapCoreConfig, type BetterZapCoreContext, type BetterZapCoreServices, type BetterZapDatabase, type BetterZapPlugin, type BetterZapPluginInitContext, type BetterZapPluginInitResult, type BetterZapServices, type CoexistenceAccountOffboardedContext, type CoexistenceAccountOffboardedValue, type CoexistenceAccountOffboardedWebhook, type CoexistenceAccountReconnectedContext, type CoexistenceAccountReconnectedValue, type CoexistenceAccountReconnectedWebhook, type CoexistenceAccountUpdateContext, type CoexistenceAccountUpdateValue, type CoexistenceAccountUpdateWebhook, type CoexistenceBillingStatus, type CoexistenceConnectedAccountIdentifiers, type CoexistenceConnectedAccountRecord, type CoexistenceContactRecord, type CoexistenceCredentialProvider, type CoexistenceEligibilityStatus, type CoexistenceEmbeddedSignupCallbacks, type CoexistenceEmbeddedSignupConfig, type CoexistenceEmbeddedSignupConfigInput, type CoexistenceEmbeddedSignupController, type CoexistenceEmbeddedSignupMessageEvent, type CoexistenceEmbeddedSignupResult, type CoexistenceEmbeddedSignupSetup, type CoexistenceEmbeddedSignupStatus, type CoexistenceEmbeddedSignupWindow, type CoexistenceErrorValue, type CoexistenceErrorWebhook, type CoexistenceFacebookInitOptions, type CoexistenceFacebookLoginResponse, type CoexistenceFacebookSdk, type CoexistenceFeatureType, type CoexistenceGenericSessionEvent, type CoexistenceGraphErrorDiagnostics, type CoexistenceGraphFailureKind, type CoexistenceGraphResult, type CoexistenceHistoryChunk, type CoexistenceHistoryChunkMetadata, type CoexistenceHistoryContext, type CoexistenceHistoryThread, type CoexistenceHistoryValue, type CoexistenceHistoryWebhook, type CoexistenceLegacySessionEvent, type CoexistenceLifecycleEventRecord, type CoexistenceMessageEditContext, type CoexistenceMessageEditValue, type CoexistenceMessageEditWebhook, type CoexistenceMessageRevokeContext, type CoexistenceMessageRevokeValue, type CoexistenceMessageRevokeWebhook, type CoexistenceOnboardingSessionRecord, type CoexistencePhoneStatusResponse, type CoexistencePreflightFailureCode, type CoexistencePreflightStateRecord, type CoexistenceRawEventStatusRecord, CoexistenceService, type CoexistenceServiceConfig, type CoexistenceSessionEventPayload, type CoexistenceSessionInfoVersion, type CoexistenceSmbAppStateSyncValue, type CoexistenceSmbAppStateSyncWebhook, type CoexistenceSmbMessageEchoesValue, type CoexistenceSmbMessageEchoesWebhook, type CoexistenceStateSyncContact, type CoexistenceStateSyncItem, type CoexistenceStore, type CoexistenceSyncJobRecord, type CoexistenceSyncJobStatus, type CoexistenceSyncRequest, type CoexistenceSyncResponse, type CoexistenceSyncType, type CoexistenceTokenExchangeResult, type CoexistenceUnsupportedMessageContext, type CoexistenceUnsupportedValue, type CoexistenceUnsupportedWebhook, type CoexistenceWebhookBase, type CoexistenceWebhookMessage, type CoexistenceWebhookPayload, type CoexistenceWebhookValueBase, type Conversation, type ConversationRecord, type ConversationSummary, type ConversationUpdateEvent, EMPTY_TEMPLATE_REGISTRY, FREEFORM_MESSAGE_WINDOW_MS, type FreeformMessageWindow, type ImportMessageParams, type ImportMessageResult, InMemoryCoexistenceStore, type IncomingMessage, type InferBetterZapPluginContext, type InferBetterZapPluginServices, type InteractiveMediaCarouselCardInput, type LaunchCoexistenceEmbeddedSignupInput, type LinkPreview, type LogLevel, type Logger, type LoggerConfig, MEDIA_PLACEHOLDER_TYPE, type MediaMessage, type MessageContext, type MessageError, type MessageLoggerNotifier, MessageLoggerService, type MessageStatus, type MessageUpdateEvent, type MetaAccessTokenProvider, type MetaGraphApiErrorBody, type NewMessageEvent, type NormalizedCoexistenceSessionEvent, type OutgoingLoggingMetadata, type SendInteractiveMediaCarouselData, type SendMessageError, type SendMessageResponse, type SendResult, type SmbAppStateSyncContext, type SmbMessageEchoContext, type StatusContext, type StatusUpdateEvent, type SupportedTemplateParameterType, type SyncEvent, type TemplateComponent, type TemplateComponentDefinition, type TemplateDefinition, type TemplateName, type TemplateParameter, type TemplateParameterDefinition, type TemplateParameterInputMap, type TemplateParams, type TemplateRegistry, type UIMessage, type UIMessageStatus, WHATSAPP_MESSAGE_TYPES, type WebhookChange, type WebhookContact, type WebhookEntry, type WebhookError, type WebhookPayload, type WebhookProcessor, type WebhookProcessorConfig, type WebhookProcessorHooks, type WebhookValue, type WhatsAppCarouselCard, type WhatsAppConfig, type WhatsAppDirection, type WhatsAppInteractiveButtonsMessage, type WhatsAppInteractiveListMessage, type WhatsAppInteractiveMediaCarouselMessage, type WhatsAppLocationMessage, type WhatsAppLogRecord, type WhatsAppLogStore, type WhatsAppMessageType, WhatsAppService, type WhatsAppStatus, type WhatsAppTemplateMessage, type WhatsAppTextMessage, type WhatsAppWebhookField, type ZapClient, type ZapTransport, apiKeyTransport, createCoexistenceEmbeddedSignupConfig, createFreeformMessageWindow, createLogger, createWebhookProcessor, createZapClient, defineTemplates, delay, firstLinkIn, formatPhone, getLatestIncomingMessageAt, getMessageContent, getTemplateNames, hasConfiguredTemplates, hasPendingMedia, isMediaPlaceholder, launchCoexistenceEmbeddedSignup, noopLogger, normalizeCoexistenceSessionEvent, normalizeCoexistenceSessionPayload, normalizeConversationRecord, normalizeConversationRecords, parseOpenGraph, resolveConversationFreeformMessageWindow, serializeError, serializeTemplateFromRegistry, sessionTransport, toLegacyCoexistenceSessionEvent };