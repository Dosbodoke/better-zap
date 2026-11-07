/** Go-style result: `[value, null]` on success, `[null, error]` on failure. */
export type Result<T> = [value: T, error: null] | [value: null, error: Error];

/**
 * Runs `fn` and returns its outcome as a {@link Result} instead of throwing.
 * This is the one place that catches, so callers handle errors directly:
 *
 * ```ts
 * const [record, error] = await tryCatch(() => store.get(key));
 * if (error) return fail(error);
 * ```
 *
 * With a `signal`, it resolves with the abort reason as soon as the signal
 * aborts, even when `fn` ignores it. `fn` may keep running; the caller just
 * stops waiting for it.
 */
export function tryCatch<T>(
  fn: () => T | Promise<T>,
  signal?: AbortSignal,
): Promise<Result<T>> {
  if (!signal) return settle(fn);
  if (signal.aborted) return Promise.resolve([null, abortReason(signal)]);

  return new Promise((resolve) => {
    const onAbort = () => resolve([null, abortReason(signal)]);
    signal.addEventListener("abort", onAbort, { once: true });
    void settle(fn).then((result) => {
      signal.removeEventListener("abort", onAbort);
      resolve(result);
    });
  });
}

async function settle<T>(fn: () => T | Promise<T>): Promise<Result<T>> {
  try {
    return [await fn(), null];
  } catch (error) {
    return [null, toError(error)];
  }
}

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/** The error a signal aborted with, e.g. a timeout. */
export function abortReason(signal: AbortSignal): Error {
  if (signal.reason === undefined) return new Error("Aborted");
  return toError(signal.reason);
}

/** A signal that aborts after `ms` with `message`. Call `clear` once the work is done. */
export function timeoutSignal(
  ms: number,
  message: string,
): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(message)), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}
