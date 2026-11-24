import type {
  CoexistenceEmbeddedSignupConfigInput,
  CoexistenceSessionEventPayload,
} from "../types/coexistence.types";
import { createCoexistenceEmbeddedSignupConfig } from "./config";
import { normalizeCoexistenceSessionEvent } from "./events";
import { isRecord } from "../utils/record";

export type CoexistenceEmbeddedSignupMessageEvent = {
  origin: string;
  data: unknown;
};

export type CoexistenceEmbeddedSignupWindow = {
  addEventListener(
    type: "message",
    listener: (event: CoexistenceEmbeddedSignupMessageEvent) => void,
  ): void;
  removeEventListener(
    type: "message",
    listener: (event: CoexistenceEmbeddedSignupMessageEvent) => void,
  ): void;
};

export type CoexistenceFacebookLoginResponse = {
  authResponse?: {
    code?: string;
    [key: string]: unknown;
  } | null;
  [key: string]: unknown;
};

export type CoexistenceFacebookSdk = {
  init?(options: CoexistenceFacebookInitOptions): void;
  login(
    callback: (response: CoexistenceFacebookLoginResponse) => void,
    config: ReturnType<typeof createCoexistenceEmbeddedSignupConfig>,
  ): void;
};

export type CoexistenceFacebookInitOptions = {
  appId?: string;
  version?: string;
  xfbml?: boolean;
  cookie?: boolean;
  status?: boolean;
  [key: string]: unknown;
};

export type CoexistenceEmbeddedSignupStatus =
  | "completed"
  | "finished_without_code"
  | "missing_session"
  | "cancelled"
  | "error"
  | "no_authorization"
  | "torn_down";

export type CoexistenceEmbeddedSignupResult = {
  status: CoexistenceEmbeddedSignupStatus;
  code: string | null;
  session: CoexistenceSessionEventPayload | null;
  loginResponse: CoexistenceFacebookLoginResponse;
  loginCallbackReceived: boolean;
};

export type CoexistenceEmbeddedSignupCallbacks = {
  onFinish?: (event: {
    code: string | null;
    session: CoexistenceSessionEventPayload;
  }) => void;
  onCancel?: (event: { session: CoexistenceSessionEventPayload }) => void;
  onError?: (event: { session: CoexistenceSessionEventPayload }) => void;
  onProgress?: (event: { session: CoexistenceSessionEventPayload }) => void;
};

export type LaunchCoexistenceEmbeddedSignupInput =
  CoexistenceEmbeddedSignupConfigInput &
    CoexistenceEmbeddedSignupCallbacks & {
      fb: CoexistenceFacebookSdk;
      target: CoexistenceEmbeddedSignupWindow;
      allowedOrigins?: string[];
      origin?: string;
      fbInit?: CoexistenceFacebookInitOptions;
      joinTimeoutMs?: number;
    };

export type CoexistenceEmbeddedSignupController = {
  result: Promise<CoexistenceEmbeddedSignupResult>;
  teardown(): void;
};

const DEFAULT_ALLOWED_ORIGINS = [
  "https://www.facebook.com",
  "https://web.facebook.com",
];

const DEFAULT_JOIN_TIMEOUT_MS = 5_000;

const SUPPORTED_SESSION_VERSIONS = new Set<unknown>([undefined, 3, "3"]);

const SESSION_IDENTIFIER_FIELDS = [
  "waba_id",
  "business_id",
  "phone_number_id",
] as const;

function parseEmbeddedSignupMessage(
  data: unknown,
): CoexistenceSessionEventPayload | null {
  const payload = typeof data === "string" ? parseJson(data) : data;
  if (!isRecord(payload)) {
    return null;
  }

  if (
    payload.type !== "WA_EMBEDDED_SIGNUP" ||
    !SUPPORTED_SESSION_VERSIONS.has(payload.version) ||
    typeof payload.event !== "string" ||
    payload.event.length === 0
  ) {
    return null;
  }

  if (payload.data !== undefined && !isRecord(payload.data)) {
    return null;
  }

  const sessionData = payload.data as CoexistenceSessionEventPayload["data"];
  const hasMalformedIdentifier = SESSION_IDENTIFIER_FIELDS.some(
    (field) =>
      sessionData?.[field] !== undefined && typeof sessionData[field] !== "string",
  );
  if (hasMalformedIdentifier) {
    return null;
  }

  if (
    normalizeCoexistenceSessionEvent(payload.event) === "FINISH" &&
    typeof sessionData?.waba_id !== "string"
  ) {
    return null;
  }

  return { event: payload.event, data: sessionData };
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function resolveJoinTimeoutMs(value: number | undefined) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : DEFAULT_JOIN_TIMEOUT_MS;
}

function resolveStatus(input: {
  terminalSession: CoexistenceSessionEventPayload | null;
  code: string | null;
  tornDown: boolean;
}): CoexistenceEmbeddedSignupStatus {
  if (input.tornDown) {
    return "torn_down";
  }

  if (input.terminalSession) {
    const event = normalizeCoexistenceSessionEvent(input.terminalSession.event);
    if (event === "CANCEL") {
      return "cancelled";
    }
    if (event === "ERROR") {
      return "error";
    }
    return input.code ? "completed" : "finished_without_code";
  }

  return input.code ? "missing_session" : "no_authorization";
}

export function launchCoexistenceEmbeddedSignup(
  input: LaunchCoexistenceEmbeddedSignupInput,
): CoexistenceEmbeddedSignupController {
  const allowedOrigins = new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...(input.origin ? [input.origin] : []),
    ...(input.allowedOrigins ?? []),
  ]);
  const joinTimeoutMs = resolveJoinTimeoutMs(input.joinTimeoutMs);
  let latestSession: CoexistenceSessionEventPayload | null = null;
  let terminalSession: CoexistenceSessionEventPayload | null = null;
  let loginResponse: CoexistenceFacebookLoginResponse | null = null;
  let code: string | null = null;
  let settled = false;
  let joinTimer: ReturnType<typeof setTimeout> | undefined;
  let resolveResult!: (result: CoexistenceEmbeddedSignupResult) => void;
  let rejectResult!: (error: unknown) => void;

  const result = new Promise<CoexistenceEmbeddedSignupResult>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });

  const detach = () => {
    input.target.removeEventListener("message", listener);
    if (joinTimer !== undefined) {
      clearTimeout(joinTimer);
      joinTimer = undefined;
    }
  };

  const settle = (options: { tornDown?: boolean } = {}) => {
    if (settled) {
      return;
    }
    settled = true;
    detach();

    const status = resolveStatus({
      terminalSession,
      code,
      tornDown: options.tornDown ?? false,
    });
    resolveResult({
      status,
      code,
      session: terminalSession ?? latestSession,
      loginResponse: loginResponse ?? {},
      loginCallbackReceived: loginResponse !== null,
    });

    if (
      terminalSession &&
      (status === "completed" || status === "finished_without_code")
    ) {
      input.onFinish?.({ code, session: terminalSession });
    }
  };

  const startJoinTimer = () => {
    if (joinTimer === undefined) {
      joinTimer = setTimeout(() => {
        joinTimer = undefined;
        settle();
      }, joinTimeoutMs);
    }
  };

  const advance = () => {
    if (loginResponse && terminalSession) {
      settle();
      return;
    }

    const terminalEvent = terminalSession
      ? normalizeCoexistenceSessionEvent(terminalSession.event)
      : null;
    if (loginResponse || terminalEvent === "FINISH" || terminalEvent === "CANCEL") {
      startJoinTimer();
    }
  };

  const listener = (event: CoexistenceEmbeddedSignupMessageEvent) => {
    if (settled || !allowedOrigins.has(event.origin)) {
      return;
    }

    const session = parseEmbeddedSignupMessage(event.data);
    if (!session) {
      return;
    }

    latestSession = session;
    const normalizedEvent = normalizeCoexistenceSessionEvent(session.event);
    if (normalizedEvent === "PROGRESS") {
      input.onProgress?.({ session });
      return;
    }

    const isRepeat =
      terminalSession !== null &&
      normalizeCoexistenceSessionEvent(terminalSession.event) === normalizedEvent;
    terminalSession = session;
    advance();

    if (isRepeat) {
      return;
    }
    if (normalizedEvent === "CANCEL") {
      input.onCancel?.({ session });
    } else if (normalizedEvent === "ERROR") {
      input.onError?.({ session });
    }
  };

  input.fb.init?.(input.fbInit ?? {});
  input.target.addEventListener("message", listener);

  try {
    input.fb.login((response) => {
      if (settled || loginResponse) {
        return;
      }
      loginResponse = response ?? {};
      code =
        typeof response?.authResponse?.code === "string" &&
        response.authResponse.code.length > 0
          ? response.authResponse.code
          : null;
      advance();
    }, createCoexistenceEmbeddedSignupConfig(input));
  } catch (error) {
    settled = true;
    detach();
    rejectResult(error);
  }

  return {
    result,
    teardown() {
      if (settled) {
        detach();
        return;
      }
      settle({ tornDown: true });
    },
  };
}
