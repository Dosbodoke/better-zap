import { type Result, tryCatch } from "./result";

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
