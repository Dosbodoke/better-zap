import type { Context } from "hono";
import { normalizeCoexistenceSessionEvent, serializeError } from "better-zap";
import type {
  CoexistenceGraphResult,
  CoexistenceSessionEventPayload,
  CoexistenceSyncResponse,
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
};

const ROUTES_NOT_CONFIGURED = "Coexistence routes are not configured";
const STORAGE_NOT_CONFIGURED = "Coexistence storage is not configured";

function getCoexistence(c: Context<BetterZapEnv>) {
  return c.get("coexistence");
}

function getCoexistenceStore(c: Context<BetterZapEnv>) {
  return c.get("coexistenceStore");
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
) {
  if (typeof body.code === "string" && body.code.length > 0) {
    return body.code;
  }

  return null;
}

function createRecordId(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
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
  });
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
    const code = resolveCode(body);
    const idempotencyKey = resolveIdempotencyKey(c, body);
    const state = optionalString(body.state);
    const nonce = optionalString(body.nonce);

    if (normalizedEvent !== "FINISH") {
      await recordOnboardingSession(c, {
        session,
        idempotencyKey,
        state,
        nonce,
      });

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

    await recordOnboardingSession(c, {
      session,
      idempotencyKey,
      state,
      nonce,
    });

    if (session.data?.waba_id && session.data.phone_number_id) {
      await coexistenceStore.upsertConnectedAccount({
        wabaId: session.data.waba_id,
        businessId: session.data.business_id,
        accountId: session.data.business_id,
        phoneNumberId: session.data.phone_number_id,
        displayPhoneNumber: session.data.display_phone_number,
        metadata: {
          onboardingEvent: session.event,
        },
      });
    }

    const responseBody = {
      success: true,
      status: "exchanged",
      session,
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
      { error: "Internal error handling coexistence callback" },
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
      { error: "Internal error fetching coexistence phone status" },
      500,
    );
  }
}

async function handleSyncRequest(
  c: Context<BetterZapEnv>,
  syncType: "smb_app_state_sync" | "history",
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
    });

    return graphResultResponse(c, result);
  } catch (error) {
    c.get("logger").error("coexistence.sync_error", serializeError(error));
    return c.json({ error: "Internal error requesting coexistence sync" }, 500);
  }
}

async function recordSyncJob(
  c: Context<BetterZapEnv>,
  input: {
    phoneNumberId: string;
    syncType: "smb_app_state_sync" | "history";
    result?: CoexistenceSyncResponse;
  },
) {
  const requestId = input.result?.request_id;
  const coexistenceStore = getCoexistenceStore(c);

  if (!requestId || !coexistenceStore) {
    return;
  }

  await coexistenceStore.createSyncJob({
    requestId,
    syncType: input.syncType,
    phoneNumberId: input.phoneNumberId,
    status: "requested",
    metadata: {
      response: input.result,
    },
  });
}

export function handleContactsSync(c: Context<BetterZapEnv>) {
  return handleSyncRequest(c, "smb_app_state_sync");
}

export function handleHistorySync(c: Context<BetterZapEnv>) {
  return handleSyncRequest(c, "history");
}
