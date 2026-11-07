import { describe, expect, it } from "vitest";
import { toError, tryCatch } from "./result";

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
