import { describe, expect, it } from "vitest";
import { createLimiter } from "./limit";

const tick = () => new Promise((resolve) => setTimeout(resolve, 1));

describe("createLimiter", () => {
  it("runs at most `concurrency` tasks at once, in order", async () => {
    const run = createLimiter(2);
    const started: number[] = [];
    let active = 0;
    let peak = 0;

    const results = await Promise.all(
      [1, 2, 3, 4, 5].map((n) =>
        run(async () => {
          started.push(n);
          active++;
          peak = Math.max(peak, active);
          await tick();
          active--;
          return n * 10;
        }),
      ),
    );

    expect(peak).toBe(2);
    expect(started).toEqual([1, 2, 3, 4, 5]);
    expect(results).toEqual([10, 20, 30, 40, 50].map((n) => [n, null]));
  });

  it("returns task errors and frees the slot", async () => {
    const run = createLimiter(1);
    const [, error] = await run(() => {
      throw new Error("boom");
    });
    expect(error?.message).toBe("boom");
    await expect(run(() => "next")).resolves.toEqual(["next", null]);
  });

  it("treats invalid limits as 1", async () => {
    const run = createLimiter(Number.NaN);
    let active = 0;
    let peak = 0;
    await Promise.all(
      [1, 2].map(() =>
        run(async () => {
          active++;
          peak = Math.max(peak, active);
          await tick();
          active--;
        }),
      ),
    );
    expect(peak).toBe(1);
  });
});
