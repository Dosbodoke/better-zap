import type { Awaitable } from "../better-zap.types";
import type { IncomingMessage, MessageStatus, WebhookError } from "./whatsapp.types";

export type CoexistenceFeatureType = "whatsapp_business_app_onboarding";
export type CoexistenceSessionInfoVersion = "3";
export type CoexistenceGenericSessionEvent =
  | "FINISH"
  | "CANCEL"
  | "ERROR"
  | "PROGRESS";
export type CoexistenceLegacySessionEvent =
  | "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
  | "CANCEL_WHATSAPP_BUSINESS_APP_ONBOARDING"
  | "ERROR_WHATSAPP_BUSINESS_APP_ONBOARDING";

export interface CoexistenceEmbeddedSignupConfigInput {
  configId: string;
  setup?: CoexistenceEmbeddedSignupSetup;
}

export interface CoexistenceEmbeddedSignupSetup {
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

export interface CoexistenceEmbeddedSignupConfig {
  config_id: string;
  response_type: "code";
  override_default_response_type: true;
  extras: {
    setup?: CoexistenceEmbeddedSignupSetup;
    featureType: CoexistenceFeatureType;
    sessionInfoVersion: CoexistenceSessionInfoVersion;
  };
}

export interface CoexistenceSessionEventPayload {
  event:
    | CoexistenceGenericSessionEvent
    | CoexistenceLegacySessionEvent
    | (string & {});
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

export type CoexistencePreflightFailureCode =
  | "unsupported_country"
  | "unsupported_app_version"
  | "low_activity_number"
  | "prior_provider_waba_registration"
  | "missing_payment_setup";

export type CoexistenceEligibilityStatus =
  | "eligible"
  | "ineligible"
  | "unknown";

export type CoexistenceBillingStatus =
  | "ready"
  | "missing_payment_setup"
  | "unknown";

export interface CoexistencePreflightStateRecord {
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

export interface CoexistenceConnectedAccountIdentifiers {
  wabaId: string;
  businessId?: string;
  phoneNumberId: string;
  displayPhoneNumber?: string;
}

export interface CoexistencePhoneStatusResponse {
  id: string;
  is_on_biz_app?: boolean;
  platform_type?: "CLOUD_API" | "ON_PREMISE" | "NOT_APPLICABLE" | (string & {});
}

export type CoexistenceSyncType = "smb_app_state_sync" | "history";

export interface CoexistenceSyncRequest {
  sync_type: CoexistenceSyncType;
}

export interface CoexistenceSyncResponse {
  success?: boolean;
  request_id?: string;
  id?: string;
  error?: MetaGraphApiErrorBody["error"];
}

export interface MetaGraphApiErrorBody {
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

export type CoexistenceGraphFailureKind =
  | "graph_error"
  | "http_error"
  | "network_error"
  | "malformed_response"
  | "configuration_error"
  | "credential_provider_error";

/**
 * Log-safe failure summary. It never contains tokens, the app secret, the
 * authorization code, request URLs, or Meta's free-text error message.
 */
export interface CoexistenceGraphErrorDiagnostics {
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

export interface CoexistenceGraphResult<TData> {
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

export interface MetaAccessTokenProvider {
  getAccessToken(input: {
    wabaId?: string;
    phoneNumberId?: string;
    accountId?: string;
  }): Awaitable<string>;
}

export interface CoexistenceCredentialProvider extends MetaAccessTokenProvider {
  exchangeEmbeddedSignupCode(input: {
    code: string;
    redirectUri?: string;
  }): Awaitable<CoexistenceTokenExchangeResult>;
}

export interface CoexistenceTokenExchangeResult {
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

export type CoexistenceWebhookPayload =
  | CoexistenceHistoryWebhook
  | CoexistenceSmbAppStateSyncWebhook
  | CoexistenceSmbMessageEchoesWebhook
  | CoexistenceAccountUpdateWebhook
  | CoexistenceAccountOffboardedWebhook
  | CoexistenceAccountReconnectedWebhook
  | CoexistenceMessageEditWebhook
  | CoexistenceMessageRevokeWebhook
  | CoexistenceUnsupportedWebhook
  | CoexistenceErrorWebhook;

export interface CoexistenceWebhookBase<TField extends string, TValue> {
  object: "whatsapp_business_account";
  entry: Array<{
    id: string;
    changes: Array<{
      field: TField;
      value: TValue;
    }>;
  }>;
}

export interface CoexistenceWebhookValueBase {
  messaging_product?: "whatsapp";
  metadata?: {
    display_phone_number?: string;
    phone_number_id?: string;
  };
  contacts?: Array<{
    profile?: { name?: string };
    wa_id: string;
  }>;
  errors?: WebhookError[];
}

/**
 * Message fields Meta adds for coexistence webhooks. `from` is omitted when the
 * user's phone number is unavailable; `from_user_id` / `to_user_id` carry the
 * business-scoped user ID (BSUID) instead.
 */
export type CoexistenceWebhookMessage = IncomingMessage & {
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

export interface CoexistenceHistoryThread {
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

export interface CoexistenceHistoryChunkMetadata {
  /** 0: day 0-1, 1: day 1-90, 2: day 90-180. Does not mean the phase finished. */
  phase?: number;
  /** Chunks can arrive out of order; use this to sequence them. */
  chunk_order?: number;
  /** Overall sync progress, 0-100. 100 means the history sync is complete. */
  progress?: number;
  [key: string]: unknown;
}

export interface CoexistenceHistoryChunk {
  metadata?: CoexistenceHistoryChunkMetadata;
  /** Documented shape: messages grouped per WhatsApp user thread. */
  threads?: CoexistenceHistoryThread[];
  /** Legacy flat shape. Still accepted; duplicates of thread messages are skipped. */
  messages?: CoexistenceWebhookMessage[];
  statuses?: MessageStatus[];
  errors?: WebhookError[];
  [key: string]: unknown;
}

export interface CoexistenceHistoryValue extends CoexistenceWebhookValueBase {
  request_id?: string;
  history?: CoexistenceHistoryChunk[];
  /** Media asset deliveries for earlier `media_placeholder` history messages. */
  messages?: CoexistenceWebhookMessage[];
}

export type CoexistenceHistoryWebhook = CoexistenceWebhookBase<
  "history",
  CoexistenceHistoryValue
>;

export interface CoexistenceStateSyncContact {
  full_name?: string;
  first_name?: string;
  /** Omitted when the user's phone number is unavailable. */
  phone_number?: string;
  user_id?: string;
  parent_user_id?: string;
  username?: string;
  [key: string]: unknown;
}

export interface CoexistenceStateSyncItem {
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

export interface CoexistenceSmbAppStateSyncValue extends CoexistenceWebhookValueBase {
  request_id?: string;
  sync_type?: "smb_app_state_sync";
  /** Documented contact sync shape. */
  state_sync?: CoexistenceStateSyncItem[];
  /** Legacy contact shape. Still accepted; contacts already in `state_sync` are skipped. */
  contacts?: Array<{
    wa_id: string;
    profile?: { name?: string };
    phone_number?: string;
    removed?: boolean;
    [key: string]: unknown;
  }>;
}

export type CoexistenceSmbAppStateSyncWebhook = CoexistenceWebhookBase<
  "smb_app_state_sync",
  CoexistenceSmbAppStateSyncValue
>;

export interface CoexistenceSmbMessageEchoesValue extends CoexistenceWebhookValueBase {
  /**
   * Echoed messages. Meta's documented payload uses `message_echoes`; the Hono
   * webhook handler merges both arrays into `messages` before calling hooks.
   */
  messages: IncomingMessage[];
  message_echoes?: CoexistenceWebhookMessage[];
}

export type CoexistenceSmbMessageEchoesWebhook = CoexistenceWebhookBase<
  "smb_message_echoes",
  CoexistenceSmbMessageEchoesValue
>;

export interface CoexistenceAccountUpdateValue extends CoexistenceWebhookValueBase {
  event?: "PARTNER_ADDED" | "PARTNER_REMOVED" | "ACCOUNT_DISABLED" | (string & {});
  waba_info?: {
    waba_id?: string;
    owner_business_id?: string;
    [key: string]: unknown;
  };
  phone_number_id?: string;
}

export type CoexistenceAccountUpdateWebhook = CoexistenceWebhookBase<
  "account_update",
  CoexistenceAccountUpdateValue
>;

export interface CoexistenceAccountOffboardedValue
  extends CoexistenceWebhookValueBase {
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

export type CoexistenceAccountOffboardedWebhook = CoexistenceWebhookBase<
  "account_offboarded",
  CoexistenceAccountOffboardedValue
>;

export interface CoexistenceAccountReconnectedValue
  extends CoexistenceWebhookValueBase {
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

export type CoexistenceAccountReconnectedWebhook = CoexistenceWebhookBase<
  "account_reconnected",
  CoexistenceAccountReconnectedValue
>;

export interface CoexistenceMessageEditValue extends CoexistenceWebhookValueBase {
  messages: Array<IncomingMessage & { edited?: boolean }>;
}

export type CoexistenceMessageEditWebhook = CoexistenceWebhookBase<
  "messages",
  CoexistenceMessageEditValue
>;

export interface CoexistenceMessageRevokeValue extends CoexistenceWebhookValueBase {
  messages: Array<IncomingMessage & { revoked?: boolean }>;
}

export type CoexistenceMessageRevokeWebhook = CoexistenceWebhookBase<
  "messages",
  CoexistenceMessageRevokeValue
>;

export interface CoexistenceUnsupportedValue extends CoexistenceWebhookValueBase {
  unsupported?: true;
  reason?: string;
  [key: string]: unknown;
}

export type CoexistenceUnsupportedWebhook = CoexistenceWebhookBase<
  string,
  CoexistenceUnsupportedValue
>;

export interface CoexistenceErrorValue extends CoexistenceWebhookValueBase {
  errors: WebhookError[];
}

export type CoexistenceErrorWebhook = CoexistenceWebhookBase<
  string,
  CoexistenceErrorValue
>;

export interface CoexistenceConnectedAccountRecord
  extends CoexistenceConnectedAccountIdentifiers {
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

export interface CoexistenceOnboardingSessionRecord {
  id: string;
  event: CoexistenceSessionEventPayload["event"];
  accountId?: string;
  wabaId?: string;
  phoneNumberId?: string;
  payload: CoexistenceSessionEventPayload;
  preflight?: CoexistencePreflightStateRecord;
  createdAt?: Date | string;
}

export type CoexistenceSyncJobStatus =
  | "requested"
  | "processing"
  | "completed"
  | "failed"
  | "deadline_exceeded"
  | (string & {});

export interface CoexistenceSyncJobRecord {
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

export interface CoexistenceContactRecord {
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

export interface CoexistenceLifecycleEventRecord {
  id?: string;
  accountId?: string;
  wabaId?: string;
  phoneNumberId?: string;
  event: string;
  payload: unknown;
  createdAt?: Date | string;
}

export interface CoexistenceRawEventStatusRecord {
  id: string;
  status: "pending" | "processed" | "failed" | (string & {});
  error?: string;
  updatedAt?: Date | string;
  result?: unknown;
}

export interface CoexistenceStore {
  upsertConnectedAccount(
    account: CoexistenceConnectedAccountRecord,
  ): Awaitable<void>;
  getConnectedAccountByWabaId(
    wabaId: string,
  ): Awaitable<CoexistenceConnectedAccountRecord | null>;
  getConnectedAccountByPhoneNumberId(
    phoneNumberId: string,
  ): Awaitable<CoexistenceConnectedAccountRecord | null>;
  recordOnboardingSession(
    session: CoexistenceOnboardingSessionRecord,
  ): Awaitable<void>;
  upsertPreflightState?(
    state: CoexistencePreflightStateRecord,
  ): Awaitable<void>;
  getPreflightStateByPhoneNumberId?(
    phoneNumberId: string,
  ): Awaitable<CoexistencePreflightStateRecord | null>;
  createSyncJob(job: CoexistenceSyncJobRecord): Awaitable<void>;
  getInFlightSyncJob?(input: {
    phoneNumberId: string;
    syncType: CoexistenceSyncType;
    now?: Date | string;
  }): Awaitable<CoexistenceSyncJobRecord | null>;
  updateSyncJobByRequestId(
    requestId: string,
    patch: Partial<CoexistenceSyncJobRecord>,
  ): Awaitable<void>;
  upsertContact(contact: CoexistenceContactRecord): Awaitable<void>;
  removeContact(input: {
    waId: string;
    phoneNumberId?: string;
  }): Awaitable<void>;
  recordLifecycleEvent(event: CoexistenceLifecycleEventRecord): Awaitable<void>;
  updateRawEventStatus?(
    status: CoexistenceRawEventStatusRecord,
  ): Awaitable<void>;
  getRawEventStatus?(
    id: string,
  ): Awaitable<CoexistenceRawEventStatusRecord | null>;
}
