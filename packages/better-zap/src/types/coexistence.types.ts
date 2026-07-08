import type { Awaitable } from "../better-zap.types";
import type { IncomingMessage, MessageStatus, WebhookError } from "./whatsapp.types";

export type CoexistenceFeatureType = "whatsapp_business_app_onboarding";
export type CoexistenceSessionInfoVersion = "3";

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
    | "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING"
    | "CANCEL_WHATSAPP_BUSINESS_APP_ONBOARDING"
    | "ERROR_WHATSAPP_BUSINESS_APP_ONBOARDING"
    | (string & {});
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
    error_data?: Record<string, unknown>;
  };
}

export interface CoexistenceGraphResult<TData> {
  success: boolean;
  data?: TData;
  error?: string;
  errorCode?: number;
  httpStatus?: number;
  details?: unknown;
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
  raw?: unknown;
}

export type CoexistenceWebhookPayload =
  | CoexistenceHistoryWebhook
  | CoexistenceSmbAppStateSyncWebhook
  | CoexistenceSmbMessageEchoesWebhook
  | CoexistenceAccountUpdateWebhook
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

export interface CoexistenceHistoryValue extends CoexistenceWebhookValueBase {
  request_id?: string;
  history?: Array<{
    messages?: IncomingMessage[];
    statuses?: MessageStatus[];
    errors?: WebhookError[];
    [key: string]: unknown;
  }>;
}

export type CoexistenceHistoryWebhook = CoexistenceWebhookBase<
  "history",
  CoexistenceHistoryValue
>;

export interface CoexistenceSmbAppStateSyncValue extends CoexistenceWebhookValueBase {
  request_id?: string;
  sync_type?: "smb_app_state_sync";
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
  messages: IncomingMessage[];
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
  isOnBizApp?: boolean;
  platformType?: CoexistencePhoneStatusResponse["platform_type"];
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
  requestedAt?: Date | string;
  deadlineAt?: Date | string;
  completedAt?: Date | string;
  failedAt?: Date | string;
  failureReason?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  metadata?: Record<string, unknown>;
}

export interface CoexistenceContactRecord {
  waId: string;
  phoneNumberId?: string;
  displayName?: string;
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
}
