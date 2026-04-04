import { describe, expect, it, vi } from "vitest";
import { BetterZapClientError, createZapClient } from "./client";

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
});
