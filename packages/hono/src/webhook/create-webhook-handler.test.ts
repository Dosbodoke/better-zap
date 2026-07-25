import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { createWebhookHandler } from "./create-webhook-handler";

const TEST_META_APP_SECRET = "test-meta-app-secret";
const textEncoder = new TextEncoder();

const mockOnMessage = vi.fn();
const mockOnStatusUpdate = vi.fn();
const mockLogger = {
  logIncoming: vi.fn().mockResolvedValue(true),
  logImportedMessage: vi.fn().mockResolvedValue(true),
  updateStatus: vi.fn().mockResolvedValue(true),
};
const mockLog = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

function createTestApp(overrides: Record<string, any> = {}) {
  const app = new Hono<{ Bindings: Record<string, string> }>();
  app.route(
    "/webhook",
    createWebhookHandler({
      verifyToken: "my-verify-token",
      appSecret: TEST_META_APP_SECRET,
      logger: mockLogger as any,
      log: mockLog as any,
      onMessage: mockOnMessage,
      onStatusUpdate: mockOnStatusUpdate,
      ...overrides,
    }),
  );
  return app;
}

function makeWebhookPayload(overrides: any = {}, field = "messages") {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "entry-1",
        changes: [
          {
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15551234567",
                phone_number_id: "123456",
              },
              ...overrides,
            },
            field,
          },
        ],
      },
    ],
  };
}

function makeTextMessage(from = "5511999887766", body = "Oi") {
  return makeWebhookPayload({
    contacts: [{ profile: { name: "João" }, wa_id: from }],
    messages: [
      {
        from,
        id: "wamid.incoming1",
        timestamp: "1700000000",
        type: "text",
        text: { body },
      },
    ],
  });
}

async function createMetaSignatureHeader(rawBody: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(TEST_META_APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    textEncoder.encode(rawBody),
  );
  return `sha256=${bytesToHex(new Uint8Array(signature))}`;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

async function postWebhook(
  app: ReturnType<typeof createTestApp>,
  payload: any,
  options: {
    signatureHeader?: string;
    includeSignature?: boolean;
    executionCtx?: any;
  } = {},
) {
  const waitUntilPromises: Promise<any>[] = [];
  const executionCtx =
    options.executionCtx ??
    {
      waitUntil: (p: Promise<any>) => waitUntilPromises.push(p),
      passThroughOnException: () => {},
    };
  const rawBody = JSON.stringify(payload);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (options.includeSignature !== false) {
    const signatureHeader =
      options.signatureHeader ?? (await createMetaSignatureHeader(rawBody));
    headers["X-Hub-Signature-256"] = signatureHeader;
  }

  const req = new Request("http://localhost/webhook", {
    method: "POST",
    headers,
    body: rawBody,
  });

  const res = await app.fetch(req, {}, executionCtx as any);

  await Promise.all(waitUntilPromises);

  return res;
}

describe("createWebhookHandler", () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger.logIncoming.mockResolvedValue(true);
    mockLogger.logImportedMessage.mockResolvedValue(true);
    app = createTestApp();
  });

  describe("GET /webhook (verification)", () => {
    it("returns challenge on valid token + subscribe mode", async () => {
      const res = await app.fetch(
        new Request(
          "http://localhost/webhook?hub.mode=subscribe&hub.verify_token=my-verify-token&hub.challenge=challenge123",
        ),
      );
      expect(res.status).toBe(200);
      expect(await res.text()).toBe("challenge123");
    });

    it("returns 403 on invalid token", async () => {
      const res = await app.fetch(
        new Request(
          "http://localhost/webhook?hub.mode=subscribe&hub.verify_token=wrong-token&hub.challenge=test",
        ),
      );
      expect(res.status).toBe(403);
    });
  });

  describe("POST /webhook (processing)", () => {
    it("acknowledges and processes payload after signature validation", async () => {
      const res = await postWebhook(app, makeTextMessage());
      expect(res.status).toBe(200);
      expect(mockOnMessage).toHaveBeenCalledOnce();
    });

    it("returns 500 when appSecret is missing", async () => {
      app = createTestApp({ appSecret: "" });
      const res = await postWebhook(app, makeTextMessage());
      expect(res.status).toBe(500);
      expect(mockOnMessage).not.toHaveBeenCalled();
    });

    it("returns 400 when webhook body is invalid JSON", async () => {
      const invalidBody = '{"object":"whatsapp_business_account",';
      const req = new Request("http://localhost/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Hub-Signature-256": await createMetaSignatureHeader(invalidBody),
        },
        body: invalidBody,
      });
      const res = await app.fetch(req, {}, {
        waitUntil: () => undefined,
        passThroughOnException: () => undefined,
      } as any);
      expect(res.status).toBe(400);
    });

    it("returns 401 when signature header is missing", async () => {
      const res = await postWebhook(app, makeTextMessage(), {
        includeSignature: false,
      });
      expect(res.status).toBe(401);
    });

    it("returns 401 when signature is invalid", async () => {
      const res = await postWebhook(app, makeTextMessage(), {
        signatureHeader: "sha256=deadbeef",
      });
      expect(res.status).toBe(401);
    });

    it("honors runInBackground when supplied, taking precedence over executionCtx.waitUntil", async () => {
      const runInBackground = vi.fn((work: Promise<void>) => work);
      const waitUntil = vi.fn();
      app = createTestApp({ runInBackground });

      const res = await postWebhook(app, makeTextMessage(), {
        executionCtx: { waitUntil, passThroughOnException: () => {} },
      });

      expect(res.status).toBe(200);
      expect(runInBackground).toHaveBeenCalledOnce();
      expect(waitUntil).not.toHaveBeenCalled();
      expect(mockOnMessage).toHaveBeenCalledOnce();
    });

    it("falls back to executionCtx.waitUntil when runInBackground is not supplied", async () => {
      const waitUntilPromises: Promise<any>[] = [];
      const waitUntil = vi.fn((p: Promise<any>) => {
        waitUntilPromises.push(p);
      });

      const res = await postWebhook(app, makeTextMessage(), {
        executionCtx: { waitUntil, passThroughOnException: () => {} },
      });
      await Promise.all(waitUntilPromises);

      expect(res.status).toBe(200);
      expect(waitUntil).toHaveBeenCalledOnce();
      expect(mockOnMessage).toHaveBeenCalledOnce();
    });

    it("falls back to await when neither runInBackground nor executionCtx is present", async () => {
      const rawBody = JSON.stringify(makeTextMessage());
      const req = new Request("http://localhost/webhook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Hub-Signature-256": await createMetaSignatureHeader(rawBody),
        },
        body: rawBody,
      });

      // No third `executionCtx` argument. Hono's `c.executionCtx` getter throws
      // when no ExecutionContext was supplied to `fetch()` (pre-existing Hono
      // behavior, unchanged by this refactor), so this exercises the outer
      // catch → 500 path rather than the `await work` fallback line — the
      // same as before this move (see git show a599f9b, same `if (c.executionCtx)`
      // shape).
      const res = await app.fetch(req, {});

      expect(res.status).toBe(500);
      expect(mockLog.error).toHaveBeenCalledWith(
        "webhook.request_error",
        expect.anything(),
      );
    });
  });
});
