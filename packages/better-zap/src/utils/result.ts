export type Result<T> = [value: T, error: null] | [value: null, error: Error];

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

export function abortReason(signal: AbortSignal): Error {
  if (signal.reason === undefined) return new Error("Aborted");
  return toError(signal.reason);
}

export function timeoutSignal(
  ms: number,
  message: string,
): { signal: AbortSignal; clear: () => void } {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error(message)), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}
