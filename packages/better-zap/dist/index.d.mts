import { $ as SendResult, A as LogLevel, B as SyncEvent, C as MessageLoggerService, D as WhatsAppLogStore, E as WhatsAppLogRecord, F as serializeError, G as IncomingMessage, H as Conversation, I as ConversationSummary, J as MessageError, K as InteractiveMediaCarouselCardInput, L as ConversationUpdateEvent, M as LoggerConfig, N as createLogger, O as WhatsAppMessageType, P as noopLogger, Q as SendMessageResponse, R as NewMessageEvent, S as MessageLoggerNotifier, T as WhatsAppDirection, U as ConversationRecord, V as WhatsAppConfig, W as FreeformMessageWindow, X as SendInteractiveMediaCarouselData, Y as MessageStatus, Z as SendMessageError, _ as getTemplateNames, _t as WhatsAppWebhookField, a as createZapClient, at as WebhookContact, b as OutgoingLoggingMetadata, c as SupportedTemplateParameterType, ct as WebhookPayload, d as TemplateName, dt as WhatsAppInteractiveButtonsMessage, et as TemplateComponent, f as TemplateParameterDefinition, ft as WhatsAppInteractiveListMessage, g as defineTemplates, gt as WhatsAppTextMessage, h as TemplateRegistry, ht as WhatsAppTemplateMessage, i as apiKeyTransport, it as WebhookChange, j as Logger, k as WhatsAppStatus, l as TemplateComponentDefinition, lt as WebhookValue, m as TemplateParams, mt as WhatsAppLocationMessage, n as ZapClient, nt as UIMessage, o as sessionTransport, ot as WebhookEntry, p as TemplateParameterInputMap, pt as WhatsAppInteractiveMediaCarouselMessage, q as MediaMessage, r as ZapTransport, rt as UIMessageStatus, s as EMPTY_TEMPLATE_REGISTRY, st as WebhookError, t as BetterZapClientError, tt as TemplateParameter, u as TemplateDefinition, ut as WhatsAppCarouselCard, v as hasConfiguredTemplates, w as WHATSAPP_MESSAGE_TYPES, x as WhatsAppService, y as serializeTemplateFromRegistry, z as StatusUpdateEvent } from "./client-DiHHMG8t.mjs";

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
type CoexistenceEmbeddedSignupResult = {
  code: string | null;
  session: CoexistenceSessionEventPayload | null;
  loginResponse: CoexistenceFacebookLoginResponse;
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
};
type CoexistenceEmbeddedSignupController = {
  result: Promise<CoexistenceEmbeddedSignupResult>;
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
  duplicateMessages: number;
}
interface SmbAppStateSyncContext {
  value: CoexistenceSmbAppStateSyncValue;
  change: WebhookChange;
  upsertedContacts: number;
  removedContacts: number;
}
interface SmbMessageEchoContext {
  value: CoexistenceSmbMessageEchoesValue;
  change: WebhookChange;
  importedMessages: number;
  duplicateMessages: number;
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
export { type Awaitable, type BetterZapApi, BetterZapClientError, type BetterZapContext, type BetterZapCoreConfig, type BetterZapCoreContext, type BetterZapCoreServices, type BetterZapDatabase, type BetterZapPlugin, type BetterZapPluginInitContext, type BetterZapPluginInitResult, type BetterZapServices, type CoexistenceAccountOffboardedContext, type CoexistenceAccountOffboardedValue, type CoexistenceAccountOffboardedWebhook, type CoexistenceAccountReconnectedContext, type CoexistenceAccountReconnectedValue, type CoexistenceAccountReconnectedWebhook, type CoexistenceAccountUpdateContext, type CoexistenceAccountUpdateValue, type CoexistenceAccountUpdateWebhook, type CoexistenceBillingStatus, type CoexistenceConnectedAccountIdentifiers, type CoexistenceConnectedAccountRecord, type CoexistenceContactRecord, type CoexistenceCredentialProvider, type CoexistenceEligibilityStatus, type CoexistenceEmbeddedSignupCallbacks, type CoexistenceEmbeddedSignupConfig, type CoexistenceEmbeddedSignupConfigInput, type CoexistenceEmbeddedSignupController, type CoexistenceEmbeddedSignupMessageEvent, type CoexistenceEmbeddedSignupResult, type CoexistenceEmbeddedSignupSetup, type CoexistenceEmbeddedSignupWindow, type CoexistenceErrorValue, type CoexistenceErrorWebhook, type CoexistenceFacebookInitOptions, type CoexistenceFacebookLoginResponse, type CoexistenceFacebookSdk, type CoexistenceFeatureType, type CoexistenceGenericSessionEvent, type CoexistenceGraphResult, type CoexistenceHistoryContext, type CoexistenceHistoryValue, type CoexistenceHistoryWebhook, type CoexistenceLegacySessionEvent, type CoexistenceLifecycleEventRecord, type CoexistenceMessageEditContext, type CoexistenceMessageEditValue, type CoexistenceMessageEditWebhook, type CoexistenceMessageRevokeContext, type CoexistenceMessageRevokeValue, type CoexistenceMessageRevokeWebhook, type CoexistenceOnboardingSessionRecord, type CoexistencePhoneStatusResponse, type CoexistencePreflightFailureCode, type CoexistencePreflightStateRecord, type CoexistenceRawEventStatusRecord, CoexistenceService, type CoexistenceServiceConfig, type CoexistenceSessionEventPayload, type CoexistenceSessionInfoVersion, type CoexistenceSmbAppStateSyncValue, type CoexistenceSmbAppStateSyncWebhook, type CoexistenceSmbMessageEchoesValue, type CoexistenceSmbMessageEchoesWebhook, type CoexistenceStore, type CoexistenceSyncJobRecord, type CoexistenceSyncJobStatus, type CoexistenceSyncRequest, type CoexistenceSyncResponse, type CoexistenceSyncType, type CoexistenceTokenExchangeResult, type CoexistenceUnsupportedMessageContext, type CoexistenceUnsupportedValue, type CoexistenceUnsupportedWebhook, type CoexistenceWebhookBase, type CoexistenceWebhookPayload, type CoexistenceWebhookValueBase, type Conversation, type ConversationRecord, type ConversationSummary, type ConversationUpdateEvent, EMPTY_TEMPLATE_REGISTRY, FREEFORM_MESSAGE_WINDOW_MS, type FreeformMessageWindow, InMemoryCoexistenceStore, type IncomingMessage, type InferBetterZapPluginContext, type InferBetterZapPluginServices, type InteractiveMediaCarouselCardInput, type LaunchCoexistenceEmbeddedSignupInput, type LogLevel, type Logger, type LoggerConfig, type MediaMessage, type MessageContext, type MessageError, type MessageLoggerNotifier, MessageLoggerService, type MessageStatus, type MetaAccessTokenProvider, type MetaGraphApiErrorBody, type NewMessageEvent, type NormalizedCoexistenceSessionEvent, type OutgoingLoggingMetadata, type SendInteractiveMediaCarouselData, type SendMessageError, type SendMessageResponse, type SendResult, type SmbAppStateSyncContext, type SmbMessageEchoContext, type StatusContext, type StatusUpdateEvent, type SupportedTemplateParameterType, type SyncEvent, type TemplateComponent, type TemplateComponentDefinition, type TemplateDefinition, type TemplateName, type TemplateParameter, type TemplateParameterDefinition, type TemplateParameterInputMap, type TemplateParams, type TemplateRegistry, type UIMessage, type UIMessageStatus, WHATSAPP_MESSAGE_TYPES, type WebhookChange, type WebhookContact, type WebhookEntry, type WebhookError, type WebhookPayload, type WebhookProcessor, type WebhookProcessorConfig, type WebhookProcessorHooks, type WebhookValue, type WhatsAppCarouselCard, type WhatsAppConfig, type WhatsAppDirection, type WhatsAppInteractiveButtonsMessage, type WhatsAppInteractiveListMessage, type WhatsAppInteractiveMediaCarouselMessage, type WhatsAppLocationMessage, type WhatsAppLogRecord, type WhatsAppLogStore, type WhatsAppMessageType, WhatsAppService, type WhatsAppStatus, type WhatsAppTemplateMessage, type WhatsAppTextMessage, type WhatsAppWebhookField, type ZapClient, type ZapTransport, apiKeyTransport, createCoexistenceEmbeddedSignupConfig, createFreeformMessageWindow, createLogger, createWebhookProcessor, createZapClient, defineTemplates, delay, formatPhone, getLatestIncomingMessageAt, getMessageContent, getTemplateNames, hasConfiguredTemplates, launchCoexistenceEmbeddedSignup, noopLogger, normalizeCoexistenceSessionEvent, normalizeCoexistenceSessionPayload, normalizeConversationRecord, normalizeConversationRecords, resolveConversationFreeformMessageWindow, serializeError, serializeTemplateFromRegistry, sessionTransport, toLegacyCoexistenceSessionEvent };