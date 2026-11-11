import type { CoexistenceGraphErrorDiagnostics } from "../types/coexistence.types";
import type { MetaGraphResult } from "../types/graph.types";

const REDACTED = "[REDACTED]";

// Graph error codes Meta documents as temporary or rate limiting.
const TRANSIENT_GRAPH_ERROR_CODES = new Set([
  1, 2, 4, 17, 32, 341, 613, 80007, 130429, 131056,
]);

export interface GraphRequestInput {
  fetch: typeof fetch;
  baseUrl: string;
  apiVersion: string;
  path: string;
  method: "GET" | "POST" | "DELETE";
  query?: URLSearchParams;
  body?: unknown;
  /** `undefined` fails with a configuration error. `null` sends no Authorization header. */
  token?: string | null;
  /** Values that must never appear in a returned error string. */
  secrets?: Array<string | undefined>;
  includeHttpStatus?: boolean;
}

/** Sends one Graph API request. Never throws; every outcome is a result. */
export async function graphRequest<TData>(
  input: GraphRequestInput,
): Promise<MetaGraphResult<TData>> {
  if (input.token === undefined) {
    return {
      success: false,
      error: "Missing Meta access token",
      diagnostics: { kind: "configuration_error", retryable: false },
    };
  }

  const url = new URL(`${input.baseUrl}/${input.apiVersion}${input.path}`);

  if (input.query) {
    input.query.forEach((value, key) => url.searchParams.set(key, value));
  }

  try {
    // Called detached: Cloudflare Workers throws when the built-in `fetch`
    // runs as a method of another object.
    const send = input.fetch;
    const response = await send(url.toString(), {
      method: input.method,
      headers: {
        "Content-Type": "application/json",
        ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
      },
      ...(input.body ? { body: JSON.stringify(input.body) } : {}),
    });

    let data: unknown = null;
    try {
      data = await response.json();
    } catch {
      data = null;
    }

    if (!response.ok) {
      const graphError = readGraphError(data);
      const diagnostics = buildFailureDiagnostics(response.status, graphError);
      return {
        success: false,
        error: graphError?.message ?? `HTTP ${response.status}`,
        errorCode: graphError?.code,
        ...(graphError?.subcode !== undefined
          ? { errorSubcode: graphError.subcode }
          : {}),
        ...(graphError?.userTitle !== undefined
          ? { errorUserTitle: graphError.userTitle }
          : {}),
        ...(graphError?.userMessage !== undefined
          ? { errorUserMessage: graphError.userMessage }
          : {}),
        httpStatus: response.status,
        details: data,
        diagnostics,
      };
    }

    return {
      success: true,
      data: data as TData,
      ...(input.includeHttpStatus ? { httpStatus: response.status } : {}),
    };
  } catch (error) {
    return {
      success: false,
      error: redactSecrets(
        error instanceof Error ? error.message : "Network error",
        [input.token ?? undefined, ...(input.secrets ?? [])],
      ),
      diagnostics: { kind: "network_error", retryable: true },
    };
  }
}

export function redactSecrets(
  message: string,
  secrets: Array<string | undefined>,
): string {
  return secrets.reduce<string>(
    (redacted, secret) =>
      secret ? redacted.split(secret).join(REDACTED) : redacted,
    message,
  );
}

type GraphErrorFields = {
  message?: string;
  code?: number;
  subcode?: number;
  type?: string;
  fbtraceId?: string;
  isTransient?: boolean;
  userTitle?: string;
  userMessage?: string;
};

function readGraphError(data: unknown): GraphErrorFields | null {
  if (typeof data !== "object" || data === null) {
    return null;
  }

  const error = (data as { error?: unknown }).error;
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const fields = error as Record<string, unknown>;
  return {
    message: typeof fields.message === "string" ? fields.message : undefined,
    code: typeof fields.code === "number" ? fields.code : undefined,
    subcode:
      typeof fields.error_subcode === "number" ? fields.error_subcode : undefined,
    type: typeof fields.type === "string" ? fields.type : undefined,
    fbtraceId:
      typeof fields.fbtrace_id === "string" ? fields.fbtrace_id : undefined,
    isTransient:
      typeof fields.is_transient === "boolean" ? fields.is_transient : undefined,
    userTitle:
      typeof fields.error_user_title === "string"
        ? fields.error_user_title
        : undefined,
    userMessage:
      typeof fields.error_user_msg === "string" ? fields.error_user_msg : undefined,
  };
}

function buildFailureDiagnostics(
  httpStatus: number,
  graphError: GraphErrorFields | null,
): CoexistenceGraphErrorDiagnostics {
  const retryable =
    httpStatus === 429 ||
    httpStatus >= 500 ||
    graphError?.isTransient === true ||
    (graphError?.code !== undefined &&
      TRANSIENT_GRAPH_ERROR_CODES.has(graphError.code));

  if (!graphError) {
    return { kind: "http_error", httpStatus, retryable };
  }

  return {
    kind: "graph_error",
    httpStatus,
    ...(graphError.code !== undefined ? { code: graphError.code } : {}),
    ...(graphError.subcode !== undefined ? { subcode: graphError.subcode } : {}),
    ...(graphError.type !== undefined ? { type: graphError.type } : {}),
    ...(graphError.fbtraceId !== undefined
      ? { fbtraceId: graphError.fbtraceId }
      : {}),
    retryable,
  };
}
