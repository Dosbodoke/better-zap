import { type Result, tryCatch } from "./result";

/**
 * Returns a runner that runs at most `concurrency` tasks at a time. Extra
 * tasks wait their turn in order. Task errors come back as a {@link Result}.
 */
export function createLimiter(
  concurrency: number,
): <T>(task: () => T | Promise<T>) => Promise<Result<T>> {
  const max = Number.isNaN(concurrency) ? 1 : Math.max(1, Math.floor(concurrency));
  const waiting: Array<() => void> = [];
  let active = 0;

  const acquire = (): Promise<void> => {
    if (active < max) {
      active++;
      return Promise.resolve();
    }
    return new Promise((resolve) => waiting.push(resolve));
  };

  // Hands the slot straight to the next task so a new caller can't take it in between.
  const release = () => {
    const next = waiting.shift();
    if (next) return next();
    active--;
  };

  return async (task) => {
    await acquire();
    const result = await tryCatch(task);
    release();
    return result;
  };
}
