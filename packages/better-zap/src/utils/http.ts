import { delay } from "./delay";
import { type Result, tryCatch } from "./result";

export type RetryOptions = {
  /** Extra attempts after the first one. */
  retries: number;
};

/**
 * Sends a request, retrying network errors, 429 and 5xx with exponential
 * backoff (200ms, 400ms, ...). `send` is called on every attempt, so signed
 * requests can be re-signed.
 *
 * Any HTTP status is returned as a response; only a network failure after the
 * last attempt is an error.
 */
export async function fetchWithRetry(
  send: () => Promise<Response>,
  { retries }: RetryOptions,
): Promise<Result<Response>> {
  let lastError = new Error("Network error");

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await delay(200 * 2 ** (attempt - 1));

    const [response, error] = await tryCatch(send);
    if (error) {
      lastError = error;
      continue;
    }

    const retryable = response.status === 429 || response.status >= 500;
    if (!retryable || attempt === retries) return [response, null];
    await discardBody(response);
  }

  return [null, lastError];
}

/** Releases a response body we won't read. A failed cancel is harmless, so it is ignored. */
export async function discardBody(response: Response): Promise<void> {
  await tryCatch(() => response.body?.cancel());
}

/** Parses a numeric header or JSON field. Returns `undefined` when absent or invalid. */
export function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
