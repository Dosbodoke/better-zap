import { describe, expect, it } from "vitest";
import { asRecord, isRecord, mergeDefined } from "./record";

describe("record helpers", () => {
  it("accepts only plain objects", () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
    expect(isRecord("x")).toBe(false);
  });

  it("falls back to an empty object", () => {
    expect(asRecord({ a: 1 })).toEqual({ a: 1 });
    expect(asRecord(undefined)).toEqual({});
    expect(asRecord([1])).toEqual({});
  });

  it("merges without letting undefined erase stored fields", () => {
    const base = { requestId: "req_1", source: "history" };
    expect(mergeDefined(base, { requestId: undefined, raw: 1 })).toEqual({
      requestId: "req_1",
      source: "history",
      raw: 1,
    });
    expect(base).toEqual({ requestId: "req_1", source: "history" });
  });
});
