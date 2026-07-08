import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import {
  accountOffboardedFixture,
  accountReconnectedFixture,
  malformedPayloadUnknownFieldFixture,
  messageEditFixture,
  messageRevokeFixture,
  smbAppStateSyncErrorFixture,
  unsupportedMessageTypeFixture,
} from "../../../fixtures/src";
import { createWebhookHandler } from "./create-webhook-handler";

const TEST_META_APP_SECRET = "test-meta-app-secret";
const textEncoder = new TextEncoder();

const mockOnMessage = vi.fn();
const mockOnStatusUpdate = vi.fn();
const mockOnCoexistenceHistory = vi.fn();
const mockOnSmbAppStateSync = vi.fn();
const mockOnSmbMessageEcho = vi.fn();
const mockOnCoexistenceAccountUpdate = vi.fn();
const mockOnCoexistenceAccountOffboarded = vi.fn();
const mockOnCoexistenceAccountReconnected = vi.fn();
const mockOnCoexistenceMessageEdit = vi.fn();
const mockOnCoexistenceMessageRevoke = vi.fn();
const mockOnCoexistenceUnsupportedMessage = vi.fn();
const mockLogger = {
  logIncoming: vi.fn().mockResolvedValue(true),
  logImportedMessage: vi.fn().mockResolvedValue(true),
  updateStatus: vi.fn().mockResolvedValue(true),
};
const mockCoexistenceStore = {
  upsertConnectedAccount: vi.fn().mockResolvedValue(undefined),
  getConnectedAccountByWabaId: vi.fn().mockResolvedValue(null),
  getConnectedAccountByPhoneNumberId: vi.fn().mockResolvedValue(null),
  recordOnboardingSession: vi.fn().mockResolvedValue(undefined),
  createSyncJob: vi.fn().mockResolvedValue(undefined),
  updateSyncJobByRequestId: vi.fn().mockResolvedValue(undefined),
  upsertContact: vi.fn().mockResolvedValue(undefined),
  removeContact: vi.fn().mockResolvedValue(undefined),
  recordLifecycleEvent: vi.fn().mockResolvedValue(undefined),
  updateRawEventStatus: vi.fn().mockResolvedValue(undefined),
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
      onCoexistenceHistory: mockOnCoexistenceHistory,
      onSmbAppStateSync: mockOnSmbAppStateSync,
      onSmbMessageEcho: mockOnSmbMessageEcho,
      onCoexistenceAccountUpdate: mockOnCoexistenceAccountUpdate,
      onCoexistenceAccountOffboarded: mockOnCoexistenceAccountOffboarded,
      onCoexistenceAccountReconnected: mockOnCoexistenceAccountReconnected,
      onCoexistenceMessageEdit: mockOnCoexistenceMessageEdit,
      onCoexistenceMessageRevoke: mockOnCoexistenceMessageRevoke,
      onCoexistenceUnsupportedMessage: mockOnCoexistenceUnsupportedMessage,
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

function makeStatusUpdate(status: string, messageId = "wamid.status1") {
  return makeWebhookPayload({
    statuses: [
      {
        id: messageId,
        status,
        timestamp: "1700000000",
        recipient_id: "5511999887766",
      },
    ],
  });
}

async function postWebhook(
  app: ReturnType<typeof createTestApp>,
  payload: any,
  options: {
    signatureHeader?: string;
    includeSignature?: boolean;
  } = {},
) {
  const waitUntilPromises: Promise<any>[] = [];
  const executionCtx = {
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

describe("createWebhookHandler", () => {
  let app: ReturnType<typeof createTestApp>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger.logIncoming.mockResolvedValue(true);
    mockLogger.logImportedMessage.mockResolvedValue(true);
    mockCoexistenceStore.updateSyncJobByRequestId.mockResolvedValue(undefined);
    mockCoexistenceStore.upsertContact.mockResolvedValue(undefined);
    mockCoexistenceStore.removeContact.mockResolvedValue(undefined);
    mockCoexistenceStore.recordLifecycleEvent.mockResolvedValue(undefined);
    mockCoexistenceStore.upsertConnectedAccount.mockResolvedValue(undefined);
    mockCoexistenceStore.getConnectedAccountByWabaId.mockResolvedValue(null);
    mockCoexistenceStore.getConnectedAccountByPhoneNumberId.mockResolvedValue(null);
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

    it("logs incoming messages using Meta's message timestamp", async () => {
      const res = await postWebhook(app, makeTextMessage());

      expect(res.status).toBe(200);
      expect(mockLogger.logIncoming).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "5511999887766",
          waMessageId: "wamid.incoming1",
          content: "Oi",
          sentAt: "2023-11-14T22:13:20.000Z",
        }),
      );
    });

    it("skips onMessage when incoming logging reports a duplicate", async () => {
      mockLogger.logIncoming.mockResolvedValue(false);
      const res = await postWebhook(app, makeTextMessage());

      expect(res.status).toBe(200);
      expect(mockLogger.logIncoming).toHaveBeenCalledOnce();
      expect(mockOnMessage).not.toHaveBeenCalled();
      expect(mockLog.info).toHaveBeenCalledWith("webhook.duplicate_ignored", {
        waMessageId: "wamid.incoming1",
        phone: "5511999887766",
      });
    });

    it("processes status updates", async () => {
      const res = await postWebhook(app, makeStatusUpdate("delivered", "w-1"));
      expect(res.status).toBe(200);
      expect(mockOnStatusUpdate).toHaveBeenCalledOnce();
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

    it("catches hook errors without crashing webhook — returns 200", async () => {
      mockOnMessage.mockRejectedValue(new Error("Simulated hook failure"));
      const res = await postWebhook(app, makeTextMessage());
      expect(res.status).toBe(200);
    });

    it("imports history messages when coexistence storage is configured", async () => {
      app = createTestApp({
        database: {
          whatsappLog: {},
          coexistence: mockCoexistenceStore,
        },
      });
      mockLogger.logImportedMessage
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const res = await postWebhook(
        app,
        makeWebhookPayload(
          {
            request_id: "req_history",
            history: [
              {
                messages: [
                  {
                    from: "5511999887766",
                    id: "wamid.history.1",
                    timestamp: "1700000000",
                    type: "text",
                    text: { body: "imported" },
                  },
                  {
                    from: "5511999887766",
                    id: "wamid.history.1",
                    timestamp: "1700000000",
                    type: "text",
                    text: { body: "duplicate" },
                  },
                ],
              },
            ],
          },
          "history",
        ),
      );

      expect(res.status).toBe(200);
      expect(mockLogger.logImportedMessage).toHaveBeenCalledTimes(2);
      expect(mockLogger.logImportedMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "5511999887766",
          waMessageId: "wamid.history.1",
          direction: "incoming",
          content: "imported",
          sentAt: "2023-11-14T22:13:20.000Z",
        }),
      );
      expect(mockCoexistenceStore.updateSyncJobByRequestId).toHaveBeenCalledWith(
        "req_history",
        expect.objectContaining({ status: "completed" }),
      );
      expect(mockOnCoexistenceHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          importedMessages: 1,
          duplicateMessages: 1,
        }),
      );
      expect(mockOnMessage).not.toHaveBeenCalled();
    });

    it("calls history hooks but skips persistence when coexistence storage is absent", async () => {
      const res = await postWebhook(
        app,
        makeWebhookPayload(
          {
            request_id: "req_no_store",
            history: [
              {
                messages: [
                  {
                    from: "5511999887766",
                    id: "wamid.history.no-store",
                    timestamp: "1700000000",
                    type: "text",
                    text: { body: "imported" },
                  },
                ],
              },
            ],
          },
          "history",
        ),
      );

      expect(res.status).toBe(200);
      expect(mockLogger.logImportedMessage).not.toHaveBeenCalled();
      expect(mockOnCoexistenceHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          importedMessages: 0,
          duplicateMessages: 0,
        }),
      );
    });

    it("stores history opt-out errors as sync job failure state", async () => {
      app = createTestApp({
        database: {
          whatsappLog: {},
          coexistence: mockCoexistenceStore,
        },
      });

      const res = await postWebhook(
        app,
        makeWebhookPayload(
          {
            request_id: "req_opt_out",
            errors: [
              {
                code: 2593109,
                title: "History unavailable",
                message: "User opted out of history sync",
              },
            ],
          },
          "history",
        ),
      );

      expect(res.status).toBe(200);
      expect(mockCoexistenceStore.updateSyncJobByRequestId).toHaveBeenCalledWith(
        "req_opt_out",
        expect.objectContaining({
          status: "failed",
          metadata: expect.objectContaining({ isHistoryOptOut: true }),
        }),
      );
      expect(mockOnCoexistenceUnsupportedMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [expect.objectContaining({ code: 2593109 })],
        }),
      );
    });

    it("imports SMB message echoes as outgoing messages", async () => {
      app = createTestApp({
        database: {
          whatsappLog: {},
          coexistence: mockCoexistenceStore,
        },
      });

      const res = await postWebhook(
        app,
        makeWebhookPayload(
          {
            contacts: [{ profile: { name: "Joao" }, wa_id: "5511999887766" }],
            messages: [
              {
                from: "15551234567",
                to: "5511999887766",
                id: "wamid.echo.1",
                timestamp: "1700000000",
                type: "text",
                text: { body: "echo" },
              },
            ],
          },
          "smb_message_echoes",
        ),
      );

      expect(res.status).toBe(200);
      expect(mockLogger.logImportedMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "5511999887766",
          waMessageId: "wamid.echo.1",
          direction: "outgoing",
          content: "echo",
        }),
      );
      expect(mockOnSmbMessageEcho).toHaveBeenCalledWith(
        expect.objectContaining({ importedMessages: 1 }),
      );
    });

    it("upserts and removes contacts from SMB app state sync", async () => {
      app = createTestApp({
        database: {
          whatsappLog: {},
          coexistence: mockCoexistenceStore,
        },
      });

      const res = await postWebhook(
        app,
        makeWebhookPayload(
          {
            request_id: "req_contacts",
            contacts: [
              {
                wa_id: "5511999887766",
                profile: { name: "Joao" },
                phone_number: "+55 11 99988-7766",
              },
              { wa_id: "5511888776655", removed: true },
            ],
          },
          "smb_app_state_sync",
        ),
      );

      expect(res.status).toBe(200);
      expect(mockCoexistenceStore.upsertContact).toHaveBeenCalledWith(
        expect.objectContaining({
          waId: "5511999887766",
          phoneNumberId: "123456",
          displayName: "Joao",
        }),
      );
      expect(mockCoexistenceStore.removeContact).toHaveBeenCalledWith({
        waId: "5511888776655",
        phoneNumberId: "123456",
      });
      expect(mockOnSmbAppStateSync).toHaveBeenCalledWith(
        expect.objectContaining({
          upsertedContacts: 1,
          removedContacts: 1,
        }),
      );
    });

    it("stores SMB app state sync errors as sync job failure state", async () => {
      app = createTestApp({
        database: {
          whatsappLog: {},
          coexistence: mockCoexistenceStore,
        },
      });

      const res = await postWebhook(app, smbAppStateSyncErrorFixture);

      expect(res.status).toBe(200);
      expect(mockCoexistenceStore.updateSyncJobByRequestId).toHaveBeenCalledWith(
        "req_contacts_error",
        expect.objectContaining({
          status: "failed",
          metadata: expect.objectContaining({
            field: "smb_app_state_sync",
            errors: [expect.objectContaining({ code: 131051 })],
          }),
        }),
      );
      expect(mockOnCoexistenceUnsupportedMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [expect.objectContaining({ code: 131051 })],
        }),
      );
    });

    it("records account update lifecycle events", async () => {
      app = createTestApp({
        database: {
          whatsappLog: {},
          coexistence: mockCoexistenceStore,
        },
      });

      const res = await postWebhook(
        app,
        makeWebhookPayload(
          {
            event: "PARTNER_REMOVED",
            phone_number_id: "123456",
            waba_info: {
              waba_id: "waba_123",
              owner_business_id: "business_123",
            },
          },
          "account_update",
        ),
      );

      expect(res.status).toBe(200);
      expect(mockCoexistenceStore.recordLifecycleEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          wabaId: "waba_123",
          phoneNumberId: "123456",
          accountId: "business_123",
          event: "PARTNER_REMOVED",
        }),
      );
      expect(mockOnCoexistenceAccountUpdate).toHaveBeenCalledOnce();
    });

    it("records account offboarding and marks the connected account unusable", async () => {
      app = createTestApp({
        database: {
          whatsappLog: {},
          coexistence: mockCoexistenceStore,
        },
      });

      const res = await postWebhook(app, accountOffboardedFixture);

      expect(res.status).toBe(200);
      expect(mockCoexistenceStore.recordLifecycleEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          wabaId: "waba_fixture_1",
          phoneNumberId: "phone_known",
          event: "ACCOUNT_OFFBOARDED",
        }),
      );
      expect(mockCoexistenceStore.upsertConnectedAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          wabaId: "waba_fixture_1",
          phoneNumberId: "phone_known",
          status: "offboarded",
          usable: false,
          metadata: expect.objectContaining({
            lifecycleEvent: "account_offboarded",
          }),
        }),
      );
      expect(mockOnCoexistenceAccountOffboarded).toHaveBeenCalledOnce();
    });

    it("records account reconnection and exposes Cloud API product metadata", async () => {
      app = createTestApp({
        database: {
          whatsappLog: {},
          coexistence: mockCoexistenceStore,
        },
      });

      const res = await postWebhook(app, accountReconnectedFixture);

      expect(res.status).toBe(200);
      expect(mockCoexistenceStore.recordLifecycleEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          wabaId: "waba_fixture_1",
          phoneNumberId: "phone_known",
          event: "ACCOUNT_RECONNECTED",
        }),
      );
      expect(mockCoexistenceStore.upsertConnectedAccount).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "reconnected",
          usable: true,
          metadata: expect.objectContaining({
            lifecycleEvent: "account_reconnected",
            cloudApiProducts: [
              expect.objectContaining({
                product_name: "WhatsApp Cloud API",
                reconnected: true,
              }),
            ],
          }),
        }),
      );
      expect(mockOnCoexistenceAccountReconnected).toHaveBeenCalledOnce();
    });

    it("dispatches message edits and revokes as first-class coexistence cases", async () => {
      expect((await postWebhook(app, messageEditFixture)).status).toBe(200);
      expect((await postWebhook(app, messageRevokeFixture)).status).toBe(200);

      expect(mockOnCoexistenceMessageEdit).toHaveBeenCalledWith(
        expect.objectContaining({ editedMessages: 1 }),
      );
      expect(mockOnCoexistenceMessageRevoke).toHaveBeenCalledWith(
        expect.objectContaining({ revokedMessages: 1 }),
      );
      expect(mockOnMessage).not.toHaveBeenCalled();
      expect(mockLogger.logIncoming).not.toHaveBeenCalled();
    });

    it("routes unsupported message types to the coexistence unsupported hook", async () => {
      const res = await postWebhook(app, unsupportedMessageTypeFixture);

      expect(res.status).toBe(200);
      expect(mockOnCoexistenceUnsupportedMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [expect.objectContaining({ code: 131051 })],
        }),
      );
      expect(mockOnMessage).not.toHaveBeenCalled();
      expect(mockLogger.logIncoming).not.toHaveBeenCalled();
    });

    it("acknowledges unknown fields without failing", async () => {
      const res = await postWebhook(app, malformedPayloadUnknownFieldFixture);

      expect(res.status).toBe(200);
      expect(mockLog.debug).toHaveBeenCalledWith("webhook.unknown_field_ignored", {
        field: "future_unknown_field",
      });
      expect(mockOnMessage).not.toHaveBeenCalled();
      expect(mockLogger.logIncoming).not.toHaveBeenCalled();
    });
  });
});
