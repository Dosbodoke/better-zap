import { vi } from "vitest";

export function stubWorkersFetch(impl: typeof fetch): void {
  vi.stubGlobal("fetch", function workersFetch(this: unknown, ...args: Parameters<typeof fetch>) {
    if (this !== undefined && this !== globalThis) {
      throw new TypeError("Illegal invocation: function called with incorrect `this` reference.");
    }
    return impl(...args);
  });
}
