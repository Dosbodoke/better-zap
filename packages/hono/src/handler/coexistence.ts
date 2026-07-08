import type { Context } from "hono";
import { normalizeCoexistenceSessionEvent, serializeError } from "better-zap";
import type {
  CoexistenceGraphResult,
  CoexistencePreflightFailureCode,
  CoexistencePreflightStateRecord,
  CoexistenceSessionEventPayload,
  CoexistenceSyncResponse,
  CoexistenceSyncType,
} from "better-zap";
import type { BetterZapEnv } from "./types";

type EmbeddedSignupCallbackBody = {
  code?: unknown;
  redirectUri?: unknown;
  session?: unknown;
  sessionInfo?: unknown;
  data?: unknown;
  state?: unknown;
  expectedState?: unknown;
  nonce?: unknown;
  expectedNonce?: unknown;
  idempotencyKey?: unknown;
  preflight?: unknown;
  eligibility?: unknown;
  billing?: unknown;
  onboardingSessionId?: unknown;
};

const ROUTES_NOT_CONFIGURED = "Coexistence routes are not configured";
const STORAGE_NOT_CONFIGURED = "Coexistence storage is not configured";
const SYNC_DEADLINE_MS = 24 * 60 * 60 * 1000;

const PREFLIGHT_FAILURE_FIELDS = [
  ["unsupportedCountry", "unsupported_country"],
  ["unsupportedAppVersion", "unsupported_app_version"],
  ["lowActivityNumber", "low_activity_number"],
  ["priorProviderWabaRegistration", "prior_provider_waba_registration"],
  ["missingPaymentSetup", "missing_payment_setup"],
] as const;

function getCoexistence(c: Context<BetterZapEnv>) {
  return c.get("coexistence");
}

function getCoexistenceStore(c: Context<BetterZapEnv>) {
  return c.get("coexistenceStore");
}

function shouldSubscribeWabaAfterCodeExchange(c: Context<BetterZapEnv>) {
  return c.get("subscribeWabaAfterCodeExchange") !== false;
}

function graphResultResponse<TData>(
  c: Context<BetterZapEnv>,
  result: CoexistenceGraphResult<TData>,
) {
  if (result.success) {
    return c.json(result.data ?? { success: true });
  }

  return c.json(
    {
      success: false,
      error: result.error ?? "Meta Graph request failed",
      code: "meta_graph_request_failed",
      ...(result.errorCode ? { errorCode: result.errorCode } : {}),
      ...(result.details ? { details: result.details } : {}),
    },
    (result.httpStatus ?? 502) as 400 | 401 | 403 | 404 | 409 | 422 | 500 | 502,
  );
}

function isSessionPayload(
  value: unknown,
): value is CoexistenceSessionEventPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    "event" in value &&
    typeof (value as { event?: unknown }).event === "string"
  );
}

function resolveSessionPayload(
  body: EmbeddedSignupCallbackBody,
): CoexistenceSessionEventPayload | null {
  if (isSessionPayload(body.session)) {
    return body.session;
  }

  if (isSessionPayload(body.sessionInfo)) {
    return body.sessionInfo;
  }

  if (isSessionPayload(body)) {
    return body as CoexistenceSessionEventPayload;
  }

  if (typeof body.data === "object" && body.data !== null) {
    return {
      event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
      data: body.data as CoexistenceSessionEventPayload["data"],
    };
  }

  return null;
}

function resolveCode(
  body: EmbeddedSignupCallbackBody,
  session: CoexistenceSessionEventPayload | null,
) {
  if (typeof body.code === "string" && body.code.length > 0) {
    return body.code;
  }

  if (typeof session?.data?.code === "string" && session.data.code.length > 0) {
    return session.data.code;
  }

  return null;
}

function createRecordId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function optionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function resolveIdempotencyKey(
  c: Context<BetterZapEnv>,
  body: EmbeddedSignupCallbackBody,
) {
  return (
    optionalString(body.idempotencyKey) ??
    optionalString(c.req.header("Idempotency-Key")) ??
    optionalString(c.req.header("X-Idempotency-Key"))
  );
}

function validateStateAndNonce(
  body: EmbeddedSignupCallbackBody,
  session: CoexistenceSessionEventPayload,
) {
  const state = optionalString(body.state);
  const expectedState =
    optionalString(body.expectedState) ?? optionalString(session.data?.state);
  if (expectedState && state !== expectedState) {
    return "state mismatch";
  }

  const nonce = optionalString(body.nonce);
  const expectedNonce =
    optionalString(body.expectedNonce) ?? optionalString(session.data?.nonce);
  if (expectedNonce && nonce !== expectedNonce) {
    return "nonce mismatch";
  }

  return null;
}

async function recordOnboardingSession(
  c: Context<BetterZapEnv>,
  input: {
    session: CoexistenceSessionEventPayload;
    idempotencyKey?: string;
    state?: string;
    nonce?: string;
    preflight?: CoexistencePreflightStateRecord;
  },
) {
  const coexistenceStore = getCoexistenceStore(c);
  await coexistenceStore?.recordOnboardingSession({
    id: input.idempotencyKey ?? createRecordId("coexistence_session"),
    event: input.session.event,
    accountId: input.session.data?.business_id,
    wabaId: input.session.data?.waba_id,
    phoneNumberId: input.session.data?.phone_number_id,
    payload: {
      ...input.session,
      data: {
        ...input.session.data,
        ...(input.state ? { state: input.state } : {}),
        ...(input.nonce ? { nonce: input.nonce } : {}),
        ...(input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : {}),
      },
    },
    ...(input.preflight ? { preflight: input.preflight } : {}),
  });
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function boolField(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "boolean" ? (value[key] as boolean) : undefined;
}

function stringField(value: Record<string, unknown>, key: string) {
  return typeof value[key] === "string" ? (value[key] as string) : undefined;
}

function failureCodesField(
  value: Record<string, unknown> | undefined,
): CoexistencePreflightFailureCode[] | undefined {
  if (!Array.isArray(value?.failureCodes)) {
    return undefined;
  }

  return value.failureCodes.filter(
    (code): code is CoexistencePreflightFailureCode =>
      typeof code === "string",
  );
}

function resolvePreflightState(
  body: EmbeddedSignupCallbackBody,
  session: CoexistenceSessionEventPayload | null,
): CoexistencePreflightStateRecord | undefined {
  const source = isObject(body.preflight)
    ? body.preflight
    : isObject(body.eligibility)
      ? body.eligibility
      : undefined;
  const billing = isObject(body.billing) ? body.billing : undefined;

  if (!source && !billing) {
    return undefined;
  }

  const state: CoexistencePreflightStateRecord = {
    phoneNumberId:
      stringField(source ?? {}, "phoneNumberId") ??
      session?.data?.phone_number_id,
    wabaId: stringField(source ?? {}, "wabaId") ?? session?.data?.waba_id,
    displayPhoneNumber:
      stringField(source ?? {}, "displayPhoneNumber") ??
      session?.data?.display_phone_number,
    eligibilityStatus:
      stringField(source ?? {}, "eligibilityStatus") as
        | CoexistencePreflightStateRecord["eligibilityStatus"]
        | undefined,
    billingStatus:
      (stringField(source ?? {}, "billingStatus") ??
        stringField(billing ?? {}, "status")) as
        | CoexistencePreflightStateRecord["billingStatus"]
        | undefined,
    unsupportedCountry: boolField(source ?? {}, "unsupportedCountry"),
    unsupportedAppVersion: boolField(source ?? {}, "unsupportedAppVersion"),
    lowActivityNumber: boolField(source ?? {}, "lowActivityNumber"),
    priorProviderWabaRegistration: boolField(
      source ?? {},
      "priorProviderWabaRegistration",
    ),
    missingPaymentSetup:
      boolField(source ?? {}, "missingPaymentSetup") ??
      boolField(billing ?? {}, "missingPaymentSetup") ??
      (stringField(billing ?? {}, "status") === "missing_payment_setup"
        ? true
        : undefined),
    failureCodes: failureCodesField(source),
    metadata: {
      ...(isObject(source?.metadata) ? { eligibility: source.metadata } : {}),
      ...(isObject(billing) ? { billing } : {}),
    },
  };

  state.failureCodes = getPreflightFailureCodes(state);

  return state;
}

function getPreflightFailureCodes(
  state: CoexistencePreflightStateRecord,
): CoexistencePreflightFailureCode[] {
  const explicit = Array.isArray(state.failureCodes)
    ? state.failureCodes.filter((code): code is CoexistencePreflightFailureCode =>
        typeof code === "string",
      )
    : [];
  const derived = PREFLIGHT_FAILURE_FIELDS.flatMap(([field, code]) =>
    state[field] ? [code] : [],
  );

  return [...new Set([...explicit, ...derived])];
}

function preflightFailureResponse(
  c: Context<BetterZapEnv>,
  failureCodes: CoexistencePreflightFailureCode[],
) {
  return c.json(
    {
      success: false,
      error: "Coexistence preflight failed",
      code: "coexistence_preflight_failed",
      failureCodes,
    },
    422,
  );
}

export async function handleEmbeddedSignupCallback(c: Context<BetterZapEnv>) {
  const coexistence = getCoexistence(c);
  if (!coexistence) {
    return c.json({ error: ROUTES_NOT_CONFIGURED }, 501);
  }

  const coexistenceStore = getCoexistenceStore(c);
  if (!coexistenceStore) {
    return c.json({ error: STORAGE_NOT_CONFIGURED }, 501);
  }

  try {
    const body = (await c.req.json()) as EmbeddedSignupCallbackBody;
    const session = resolveSessionPayload(body);

    if (!session) {
      return c.json({ error: "session is required" }, 400);
    }

    const stateError = validateStateAndNonce(body, session);
    if (stateError) {
      return c.json({ error: stateError }, 400);
    }

    const normalizedEvent = normalizeCoexistenceSessionEvent(session.event);
    const code = resolveCode(body, session);
    const idempotencyKey = resolveIdempotencyKey(c, body);
    const state = optionalString(body.state);
    const nonce = optionalString(body.nonce);
    const preflight = resolvePreflightState(body, session);

    if (idempotencyKey && coexistenceStore.getRawEventStatus) {
      const existing = await coexistenceStore.getRawEventStatus(idempotencyKey);
      if (existing?.status === "processed") {
        return c.json({
          success: true,
          status: "duplicate",
          idempotencyKey,
          result: existing.result ?? null,
        });
      }
    }

    await recordOnboardingSession(c, {
      session,
      idempotencyKey,
      state,
      nonce,
      ...(preflight ? { preflight } : {}),
    });

    if (preflight) {
      await coexistenceStore.upsertPreflightState?.(preflight);
      const failureCodes = getPreflightFailureCodes(preflight);

      if (failureCodes.length > 0) {
        return preflightFailureResponse(c, failureCodes);
      }
    }

    if (normalizedEvent !== "FINISH") {
      return c.json({
        success: true,
        status: "recorded",
        event: normalizedEvent,
        session,
      });
    }

    if (!code) {
      return c.json({ error: "code is required" }, 400);
    }

    const tokenExchange = await coexistence.exchangeEmbeddedSignupCode({
      code,
      redirectUri:
        typeof body.redirectUri === "string" ? body.redirectUri : undefined,
    });

    if (!tokenExchange.success) {
      if (idempotencyKey) {
        await coexistenceStore.updateRawEventStatus?.({
          id: idempotencyKey,
          status: "failed",
          error: tokenExchange.error ?? "Meta Graph request failed",
        });
      }

      return graphResultResponse(c, tokenExchange);
    }

    if (!tokenExchange.data) {
      if (idempotencyKey) {
        await coexistenceStore.updateRawEventStatus?.({
          id: idempotencyKey,
          status: "failed",
          error: "Token exchange returned no credential data",
        });
      }

      return c.json(
        { success: false, error: "Token exchange returned no credential data" },
        502,
      );
    }

    let subscriptionStatus:
      | "subscribed"
      | "failed"
      | "skipped"
      | "not_requested" = "not_requested";
    let subscriptionResult:
      | CoexistenceGraphResult<{ success?: boolean }>
      | undefined;

    if (session.data?.waba_id) {
      if (shouldSubscribeWabaAfterCodeExchange(c)) {
        subscriptionResult = await coexistence.subscribeWaba({
          wabaId: session.data.waba_id,
          accessToken: tokenExchange.data.accessToken,
        });
        subscriptionStatus = subscriptionResult.success
          ? "subscribed"
          : "failed";
      } else {
        subscriptionStatus = "skipped";
      }
    }

    if (session.data?.waba_id && session.data.phone_number_id) {
      await coexistenceStore.upsertConnectedAccount({
        wabaId: session.data.waba_id,
        businessId: session.data.business_id,
        accountId: session.data.business_id,
        phoneNumberId: session.data.phone_number_id,
        displayPhoneNumber: session.data.display_phone_number,
        credentialRef: tokenExchange.data.credentialRef,
        credentialProvider: tokenExchange.data.credentialProvider,
        credentialMetadata: tokenExchange.data.credentialMetadata,
        ...(preflight ? { preflight } : {}),
        metadata: {
          onboardingEvent: session.event,
          tokenType: tokenExchange.data.tokenType,
          tokenExpiresIn: optionalNumber(tokenExchange.data.expiresIn),
          subscriptionStatus,
          ...(subscriptionResult
            ? {
                subscription: {
                  success: subscriptionResult.success,
                  error: subscriptionResult.error,
                  errorCode: subscriptionResult.errorCode,
                  httpStatus: subscriptionResult.httpStatus,
                  details: subscriptionResult.details,
                },
              }
            : {}),
        },
      });
    }

    if (subscriptionResult && !subscriptionResult.success) {
      await coexistenceStore.recordLifecycleEvent({
        accountId: session.data?.business_id,
        wabaId: session.data?.waba_id,
        phoneNumberId: session.data?.phone_number_id,
        event: "WABA_SUBSCRIPTION_FAILED",
        payload: {
          session,
          error: subscriptionResult.error,
          errorCode: subscriptionResult.errorCode,
          httpStatus: subscriptionResult.httpStatus,
          details: subscriptionResult.details,
        },
      });

      if (idempotencyKey) {
        await coexistenceStore.updateRawEventStatus?.({
          id: idempotencyKey,
          status: "failed",
          error: subscriptionResult.error ?? "Meta Graph request failed",
          result: {
            phase: "subscribe_waba",
            wabaId: session.data?.waba_id,
            error: subscriptionResult.error,
            errorCode: subscriptionResult.errorCode,
            details: subscriptionResult.details,
          },
        });
      }

      return c.json(
        {
          success: false,
          phase: "subscribe_waba",
          error: subscriptionResult.error ?? "Meta Graph request failed",
          ...(subscriptionResult.errorCode
            ? { errorCode: subscriptionResult.errorCode }
            : {}),
          ...(subscriptionResult.details
            ? { details: subscriptionResult.details }
            : {}),
        },
        (subscriptionResult.httpStatus ?? 502) as
          | 400
          | 401
          | 403
          | 404
          | 409
          | 422
          | 500
          | 502,
      );
    }

    const responseBody = {
      success: true,
      status: "exchanged",
      session,
      subscriptionStatus,
    };

    if (idempotencyKey) {
      await coexistenceStore.updateRawEventStatus?.({
        id: idempotencyKey,
        status: "processed",
        result: responseBody,
      });
    }

    return c.json(responseBody);
  } catch (error) {
    c.get("logger").error("coexistence.callback_error", serializeError(error));
    return c.json(
      {
        error: "Internal error handling coexistence callback",
        code: "coexistence_callback_failed",
      },
      500,
    );
  }
}

export async function handlePhoneStatus(c: Context<BetterZapEnv>) {
  const coexistence = getCoexistence(c);
  if (!coexistence) {
    return c.json({ error: ROUTES_NOT_CONFIGURED }, 501);
  }

  try {
    const phoneNumberId = c.req.param("phoneNumberId");
    if (!phoneNumberId) {
      return c.json({ error: "phoneNumberId is required" }, 400);
    }

    const result = await coexistence.getPhoneStatus({ phoneNumberId });
    return graphResultResponse(c, result);
  } catch (error) {
    c.get("logger").error("coexistence.status_error", serializeError(error));
    return c.json(
      {
        error: "Internal error fetching coexistence phone status",
        code: "coexistence_status_failed",
      },
      500,
    );
  }
}

async function handleSyncRequest(
  c: Context<BetterZapEnv>,
  syncType: CoexistenceSyncType,
) {
  const coexistence = getCoexistence(c);
  if (!coexistence) {
    return c.json({ error: ROUTES_NOT_CONFIGURED }, 501);
  }

  try {
    const phoneNumberId = c.req.param("phoneNumberId");
    if (!phoneNumberId) {
      return c.json({ error: "phoneNumberId is required" }, 400);
    }

    const blocked = await getBlockedConnectedAccount(c, phoneNumberId);
    if (blocked) {
      return c.json(
        {
          success: false,
          error: "Coexistence account is not usable",
          code: "coexistence_account_not_usable",
          status: blocked.status,
          phoneNumberId,
        },
        409,
      );
    }

    const body = await resolveOptionalJsonBody(c);
    const coexistenceStore = getCoexistenceStore(c);
    const inFlight = await coexistenceStore?.getInFlightSyncJob?.({
      phoneNumberId,
      syncType,
    });

    if (inFlight) {
      return c.json(
        {
          success: false,
          error: "Coexistence sync already in flight",
          code: "sync_already_in_flight",
          requestId: inFlight.requestId,
          deadlineAt: inFlight.deadlineAt,
        },
        409,
      );
    }

    const preflight =
      (await coexistenceStore?.getPreflightStateByPhoneNumberId?.(
        phoneNumberId,
      )) ?? resolveInlinePreflightState(body, phoneNumberId);
    const failureCodes = preflight ? getPreflightFailureCodes(preflight) : [];

    if (failureCodes.length > 0) {
      return preflightFailureResponse(c, failureCodes);
    }

    const result =
      syncType === "smb_app_state_sync"
        ? await coexistence.startContactsSync({ phoneNumberId })
        : await coexistence.startHistorySync({ phoneNumberId });

    if (!result.success) {
      return graphResultResponse(c, result);
    }

    await recordSyncJob(c, {
      phoneNumberId,
      syncType,
      result: result.data,
      onboardingSessionId:
        typeof body?.onboardingSessionId === "string"
          ? body.onboardingSessionId
          : undefined,
    });

    return graphResultResponse(c, result);
  } catch (error) {
    c.get("logger").error("coexistence.sync_error", serializeError(error));
    return c.json(
      {
        error: "Internal error requesting coexistence sync",
        code: "coexistence_sync_failed",
      },
      500,
    );
  }
}

async function getBlockedConnectedAccount(
  c: Context<BetterZapEnv>,
  phoneNumberId: string,
) {
  const coexistenceStore = getCoexistenceStore(c);
  if (!coexistenceStore) {
    return null;
  }

  const account =
    await coexistenceStore.getConnectedAccountByPhoneNumberId(phoneNumberId);
  if (!account) {
    return null;
  }

  return account.usable === false || account.status === "offboarded"
    ? account
    : null;
}

async function recordSyncJob(
  c: Context<BetterZapEnv>,
  input: {
    phoneNumberId: string;
    syncType: CoexistenceSyncType;
    result?: CoexistenceSyncResponse;
    onboardingSessionId?: string;
  },
) {
  const requestId = input.result?.request_id;
  const coexistenceStore = getCoexistenceStore(c);

  if (!requestId || !coexistenceStore) {
    return;
  }

  const requestedAt = new Date();
  const deadlineAt =
    input.syncType === "history"
      ? new Date(requestedAt.getTime() + SYNC_DEADLINE_MS)
      : undefined;

  await coexistenceStore.createSyncJob({
    requestId,
    syncType: input.syncType,
    onboardingSessionId: input.onboardingSessionId,
    phoneNumberId: input.phoneNumberId,
    status: "requested",
    requestedAt,
    deadlineAt,
    metadata: {
      response: input.result,
    },
  });
}

async function resolveOptionalJsonBody(c: Context<BetterZapEnv>) {
  const contentType = c.req.header("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    return undefined;
  }

  try {
    return (await c.req.json()) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function resolveInlinePreflightState(
  body: Record<string, unknown> | undefined,
  phoneNumberId: string,
) {
  if (!body) {
    return undefined;
  }

  const state = resolvePreflightState(body, null);
  if (!state) {
    return undefined;
  }

  return {
    ...state,
    phoneNumberId: state.phoneNumberId ?? phoneNumberId,
  };
}

export function handleContactsSync(c: Context<BetterZapEnv>) {
  return handleSyncRequest(c, "smb_app_state_sync");
}

export function handleHistorySync(c: Context<BetterZapEnv>) {
  return handleSyncRequest(c, "history");
}
