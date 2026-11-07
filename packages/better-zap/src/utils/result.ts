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
 */
export async function tryCatch<T>(fn: () => T | Promise<T>): Promise<Result<T>> {
  try {
    return [await fn(), null];
  } catch (error) {
    return [null, toError(error)];
  }
}

export function toError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}
