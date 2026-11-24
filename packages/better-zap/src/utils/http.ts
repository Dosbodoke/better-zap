import { delay } from "./delay";
import { abortReason, type Result, tryCatch } from "./result";

export const defaultFetch: typeof fetch = (input, init) => fetch(input, init);

export type RetryOptions = {
  retries: number;
  signal?: AbortSignal;
};

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

export async function discardBody(response: Response): Promise<void> {
  await tryCatch(() => response.body?.cancel());
}

export function toNumber(value: unknown): number | undefined {
  if (value === null || value === undefined || value === "") return undefined;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
