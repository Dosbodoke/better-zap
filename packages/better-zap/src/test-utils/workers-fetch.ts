import { vi } from "vitest";

/**
 * Replaces the global `fetch` with one that acts like Cloudflare Workers: it
 * throws "Illegal invocation" unless it is called with no `this` (or with
 * `globalThis`). Calls that pass go to `impl`. Undo with `vi.unstubAllGlobals()`.
 */
export function stubWorkersFetch(impl: typeof fetch): void {
  vi.stubGlobal("fetch", function workersFetch(this: unknown, ...args: Parameters<typeof fetch>) {
    if (this !== undefined && this !== globalThis) {
      throw new TypeError("Illegal invocation: function called with incorrect `this` reference.");
    }
    return impl(...args);
  });
}
