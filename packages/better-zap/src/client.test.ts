import { describe, expect, it, vi } from "vitest";
import { apiKeyTransport, BetterZapClientError, createZapClient, sessionTransport } from "./client";

describe("createZapClient", () => {
  it("throws a structured BetterZapClientError for failed send requests", async () => {
    const client = createZapClient({
      baseURL: "http://localhost",
      fetch: vi.fn().mockResolvedValue({
        ok: false,
        status: 409,
        json: () =>
          Promise.resolve({
            success: false,
            error: "Free-form message window is closed.",
            code: "CONTEXT_WINDOW_CLOSED",
            details: {
              freeformMessageWindow: {
                isOpen: false,
                lastIncomingMessageAt: "2026-04-01T00:00:00.000Z",
                expiresAt: "2026-04-02T00:00:00.000Z",
              },
            },
          }),
      }) as any,
    });

    await expect(
      client.send.text({
        to: "5511999887766",
        body: "Hello!",
      }),
    ).rejects.toMatchObject({
      name: "BetterZapClientError",
      message: "Free-form message window is closed.",
      status: 409,
      code: "CONTEXT_WINDOW_CLOSED",
      details: {
        freeformMessageWindow: {
          isOpen: false,
          lastIncomingMessageAt: "2026-04-01T00:00:00.000Z",
          expiresAt: "2026-04-02T00:00:00.000Z",
        },
      },
    } satisfies Partial<BetterZapClientError>);
  });

  it("returns null for 404 conversation lookups", async () => {
    const client = createZapClient({
      baseURL: "http://localhost",
      fetch: vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ error: "Conversation not found" }),
      }) as any,
    });

    await expect(client.conversations.get("5511999887766")).resolves.toBeNull();
  });

  it("sends same-origin credentials and no API key with sessionTransport", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
    const client = createZapClient({
      baseURL: "http://localhost",
      transport: sessionTransport(),
      fetch: fetchFn as any,
    });

    await client.conversations.list();

    const [, init] = fetchFn.mock.calls[0];
    expect(init.credentials).toBe("include");
    expect(init.headers?.Authorization).toBeUndefined();
  });

  it("sends a bearer Authorization header with apiKeyTransport", async () => {
    const fetchFn = vi
      .fn()
      .mockResolvedValue({ ok: true, json: () => Promise.resolve({ success: true }) });
    const client = createZapClient({
      baseURL: "http://localhost",
      transport: apiKeyTransport("sk_test_123"),
      fetch: fetchFn as any,
    });

    await client.send.text({ to: "5511999887766", body: "hi" });

    const [, init] = fetchFn.mock.calls[0];
    expect(init.headers.Authorization).toBe("Bearer sk_test_123");
    // Transport headers merge with the request's own headers, not replace them.
    expect(init.headers["Content-Type"]).toBe("application/json");
    expect(init.credentials).toBeUndefined();
  });

  it("leaves credentials and auth headers unset when no transport is given", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve([]) });
    const client = createZapClient({
      baseURL: "http://localhost",
      fetch: fetchFn as any,
    });

    await client.conversations.list();

    const [, init] = fetchFn.mock.calls[0];
    expect(init?.credentials).toBeUndefined();
  });
});
