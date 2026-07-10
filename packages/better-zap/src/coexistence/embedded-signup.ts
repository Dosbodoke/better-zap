import type {
  CoexistenceEmbeddedSignupConfigInput,
  CoexistenceSessionEventPayload,
} from "../types/coexistence.types";
import { createCoexistenceEmbeddedSignupConfig } from "./config";
import { normalizeCoexistenceSessionEvent } from "./events";

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

export type CoexistenceEmbeddedSignupResult = {
  code: string | null;
  session: CoexistenceSessionEventPayload | null;
  loginResponse: CoexistenceFacebookLoginResponse;
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
    };

export type CoexistenceEmbeddedSignupController = {
  result: Promise<CoexistenceEmbeddedSignupResult>;
  teardown(): void;
};

const DEFAULT_ALLOWED_ORIGINS = [
  "https://www.facebook.com",
  "https://web.facebook.com",
];

function parseEmbeddedSignupMessage(
  data: unknown,
): CoexistenceSessionEventPayload | null {
  const payload = typeof data === "string" ? parseJson(data) : data;
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const candidate = payload as {
    type?: unknown;
    version?: unknown;
    event?: unknown;
    data?: unknown;
  };

  if (
    candidate.type !== "WA_EMBEDDED_SIGNUP" ||
    candidate.version !== 3 ||
    typeof candidate.event !== "string"
  ) {
    return null;
  }

  return {
    event: candidate.event,
    data:
      typeof candidate.data === "object" && candidate.data !== null
        ? (candidate.data as CoexistenceSessionEventPayload["data"])
        : undefined,
  };
}

function parseJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function launchCoexistenceEmbeddedSignup(
  input: LaunchCoexistenceEmbeddedSignupInput,
): CoexistenceEmbeddedSignupController {
  const allowedOrigins = new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...(input.origin ? [input.origin] : []),
    ...(input.allowedOrigins ?? []),
  ]);
  let latestSession: CoexistenceSessionEventPayload | null = null;
  let latestCode: string | null = null;

  const listener = (event: CoexistenceEmbeddedSignupMessageEvent) => {
    if (!allowedOrigins.has(event.origin)) {
      return;
    }

    const session = parseEmbeddedSignupMessage(event.data);
    if (!session) {
      return;
    }

    latestSession = session;

    const normalizedEvent = normalizeCoexistenceSessionEvent(session.event);
    if (normalizedEvent === "FINISH") {
      input.onFinish?.({ code: latestCode, session });
      return;
    }

    if (normalizedEvent === "CANCEL") {
      input.onCancel?.({ session });
      return;
    }

    if (normalizedEvent === "ERROR") {
      input.onError?.({ session });
      return;
    }

    input.onProgress?.({ session });
  };

  input.target.addEventListener("message", listener);
  input.fb.init?.(input.fbInit ?? {});

  const result = new Promise<CoexistenceEmbeddedSignupResult>((resolve) => {
    input.fb.login((response) => {
      latestCode =
        typeof response.authResponse?.code === "string"
          ? response.authResponse.code
          : null;

      if (latestSession && normalizeCoexistenceSessionEvent(latestSession.event) === "FINISH") {
        input.onFinish?.({ code: latestCode, session: latestSession });
      }

      resolve({
        code: latestCode,
        session: latestSession,
        loginResponse: response,
      });
    }, createCoexistenceEmbeddedSignupConfig(input));
  });

  return {
    result,
    teardown() {
      input.target.removeEventListener("message", listener);
    },
  };
}
