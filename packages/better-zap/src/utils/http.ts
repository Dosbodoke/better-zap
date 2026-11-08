import { delay } from "./delay";
import { abortReason, type Result, tryCatch } from "./result";

/**
 * Calls the global `fetch` as a plain function. Cloudflare Workers throws
 * "Illegal invocation" when the built-in `fetch` runs with any other `this`,
 * e.g. when it is stored on an object and called as `object.fetch()`. Use it
 * as the default wherever a custom `fetch` is stored.
 */
export const globalFetch: typeof fetch = (input, init) => fetch(input, init);

export type RetryOptions = {
  /** Extra attempts after the first one. */
  retries: number;
  /** Stops retrying once aborted. Pass the same signal to `fetch` to cancel the request too. */
  signal?: AbortSignal;
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
  { retries, signal }: RetryOptions,
): Promise<Result<Response>> {
  let lastError = new Error("Network error");

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (attempt > 0) await delay(200 * 2 ** (attempt - 1));
    if (signal?.aborted) return [null, abortReason(signal)];

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
