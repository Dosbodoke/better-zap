import { describe, expect, it, vi } from "vitest";
import { fetchWithRetry, toNumber } from "./http";

describe("fetchWithRetry", () => {
  it("retries 5xx and 429, then returns the response", async () => {
    const send = vi
      .fn<() => Promise<Response>>()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockResolvedValueOnce(new Response(null, { status: 429 }))
      .mockResolvedValueOnce(new Response("ok"));

    const [response, error] = await fetchWithRetry(send, { retries: 2 });

    expect(error).toBeNull();
    expect(response?.status).toBe(200);
    expect(send).toHaveBeenCalledTimes(3);
  });

  it("returns non-retryable statuses without retrying", async () => {
    const send = vi.fn(async () => new Response(null, { status: 404 }));
    const [response] = await fetchWithRetry(send, { retries: 2 });
    expect(response?.status).toBe(404);
    expect(send).toHaveBeenCalledTimes(1);
  });

  it("returns the last network error after the final attempt", async () => {
    const send = vi.fn(async () => {
      throw new Error("offline");
    });
    const [response, error] = await fetchWithRetry(send, { retries: 1 });
    expect(response).toBeNull();
    expect(error?.message).toBe("offline");
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("stops retrying once the signal aborts", async () => {
    const controller = new AbortController();
    const send = vi.fn(async () => {
      controller.abort(new Error("timed out"));
      return new Response(null, { status: 503 });
    });
    const [response, error] = await fetchWithRetry(send, {
      retries: 2,
      signal: controller.signal,
    });
    expect(response).toBeNull();
    expect(error?.message).toBe("timed out");
    expect(send).toHaveBeenCalledOnce();
  });
});

describe("toNumber", () => {
  it("parses numbers and rejects missing or invalid values", () => {
    expect(toNumber("12")).toBe(12);
    expect(toNumber(7)).toBe(7);
    expect(toNumber(null)).toBeUndefined();
    expect(toNumber("")).toBeUndefined();
    expect(toNumber("abc")).toBeUndefined();
  });
});
