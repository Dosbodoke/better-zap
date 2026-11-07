import { describe, expect, it } from "vitest";
import { abortReason, timeoutSignal, toError, tryCatch } from "./result";

describe("tryCatch", () => {
  it("returns the value and no error", async () => {
    await expect(tryCatch(async () => 42)).resolves.toEqual([42, null]);
    await expect(tryCatch(() => "sync")).resolves.toEqual(["sync", null]);
  });

  it("returns the error instead of throwing", async () => {
    const [value, error] = await tryCatch(async () => {
      throw new Error("boom");
    });
    expect(value).toBeNull();
    expect(error?.message).toBe("boom");
  });

  it("wraps non-Error throws", async () => {
    const [, error] = await tryCatch(() => {
      throw "plain";
    });
    expect(error).toBeInstanceOf(Error);
    expect(error?.message).toBe("plain");
    expect(toError(new TypeError("t"))).toBeInstanceOf(TypeError);
  });
});

describe("tryCatch with a signal", () => {
  it("returns the value when it finishes first", async () => {
    const controller = new AbortController();
    await expect(tryCatch(async () => 1, controller.signal)).resolves.toEqual([1, null]);
  });

  it("stops waiting once the signal aborts, even if fn ignores it", async () => {
    const controller = new AbortController();
    const pending = tryCatch(() => new Promise(() => {}), controller.signal);
    controller.abort(new Error("too slow"));
    const [value, error] = await pending;
    expect(value).toBeNull();
    expect(error?.message).toBe("too slow");
  });

  it("returns the reason right away for an aborted signal", async () => {
    const controller = new AbortController();
    controller.abort(new Error("already"));
    let called = false;
    const [, error] = await tryCatch(() => {
      called = true;
    }, controller.signal);
    expect(error?.message).toBe("already");
    expect(called).toBe(false);
  });
});

describe("timeoutSignal", () => {
  it("aborts with the message after the delay", async () => {
    const { signal } = timeoutSignal(5, "timed out");
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(signal.aborted).toBe(true);
    expect(abortReason(signal).message).toBe("timed out");
  });

  it("never aborts once cleared", async () => {
    const { signal, clear } = timeoutSignal(5, "timed out");
    clear();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(signal.aborted).toBe(false);
  });
});
