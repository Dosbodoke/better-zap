import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  accountOffboardedFixture,
  accountReconnectedFixture,
  malformedPayloadUnknownFieldFixture,
  messageEditFixture,
  messageRevokeFixture,
  smbAppStateSyncErrorFixture,
  unsupportedMessageTypeFixture,
} from "@better-zap/fixtures";
import {
  createWebhookProcessor,
  type WebhookProcessorConfig,
} from "./webhook-processor";

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

function createTestProcessor(overrides: Partial<WebhookProcessorConfig> = {}) {
  return createWebhookProcessor({
    logger: mockLogger as any,
    log: mockLog as any,
    hooks: {
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
    },
    ...overrides,
  });
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

describe("createWebhookProcessor", () => {
  let processor: ReturnType<typeof createTestProcessor>;

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
    mockCoexistenceStore.getConnectedAccountByPhoneNumberId.mockResolvedValue(
      null,
    );
    processor = createTestProcessor();
  });

  it("dispatches ordinary incoming messages to onMessage", async () => {
    await processor.process(makeTextMessage() as any);
    expect(mockOnMessage).toHaveBeenCalledOnce();
  });

  it("logs incoming messages using Meta's message timestamp", async () => {
    await processor.process(makeTextMessage() as any);

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
    await processor.process(makeTextMessage() as any);

    expect(mockLogger.logIncoming).toHaveBeenCalledOnce();
    expect(mockOnMessage).not.toHaveBeenCalled();
    expect(mockLog.info).toHaveBeenCalledWith("webhook.duplicate_ignored", {
      waMessageId: "wamid.incoming1",
      phone: "5511999887766",
    });
  });

  it("processes status updates", async () => {
    await processor.process(makeStatusUpdate("delivered", "w-1") as any);
    expect(mockOnStatusUpdate).toHaveBeenCalledOnce();
  });

  it("never throws when a hook rejects", async () => {
    mockOnMessage.mockRejectedValue(new Error("Simulated hook failure"));
    await expect(
      processor.process(makeTextMessage() as any),
    ).resolves.toBeUndefined();
  });

  it("imports history messages when coexistence storage is configured", async () => {
    processor = createTestProcessor({
      database: {
        whatsappLog: {} as any,
        coexistence: mockCoexistenceStore as any,
      },
    });
    mockLogger.logImportedMessage
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await processor.process(
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
      ) as any,
    );

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
    await processor.process(
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
      ) as any,
    );

    expect(mockLogger.logImportedMessage).not.toHaveBeenCalled();
    expect(mockOnCoexistenceHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        importedMessages: 0,
        duplicateMessages: 0,
      }),
    );
  });

  it("stores history opt-out errors as sync job failure state", async () => {
    processor = createTestProcessor({
      database: {
        whatsappLog: {} as any,
        coexistence: mockCoexistenceStore as any,
      },
    });

    await processor.process(
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
      ) as any,
    );

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
    processor = createTestProcessor({
      database: {
        whatsappLog: {} as any,
        coexistence: mockCoexistenceStore as any,
      },
    });

    await processor.process(
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
      ) as any,
    );

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
    processor = createTestProcessor({
      database: {
        whatsappLog: {} as any,
        coexistence: mockCoexistenceStore as any,
      },
    });

    await processor.process(
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
      ) as any,
    );

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
    processor = createTestProcessor({
      database: {
        whatsappLog: {} as any,
        coexistence: mockCoexistenceStore as any,
      },
    });

    await processor.process(smbAppStateSyncErrorFixture as any);

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
    processor = createTestProcessor({
      database: {
        whatsappLog: {} as any,
        coexistence: mockCoexistenceStore as any,
      },
    });

    await processor.process(
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
      ) as any,
    );

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
    processor = createTestProcessor({
      database: {
        whatsappLog: {} as any,
        coexistence: mockCoexistenceStore as any,
      },
    });

    await processor.process(accountOffboardedFixture as any);

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
    processor = createTestProcessor({
      database: {
        whatsappLog: {} as any,
        coexistence: mockCoexistenceStore as any,
      },
    });

    await processor.process(accountReconnectedFixture as any);

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
    await processor.process(messageEditFixture as any);
    await processor.process(messageRevokeFixture as any);

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
    await processor.process(unsupportedMessageTypeFixture as any);

    expect(mockOnCoexistenceUnsupportedMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        errors: [expect.objectContaining({ code: 131051 })],
      }),
    );
    expect(mockOnMessage).not.toHaveBeenCalled();
    expect(mockLogger.logIncoming).not.toHaveBeenCalled();
  });

  it("acknowledges unknown fields without failing", async () => {
    await processor.process(malformedPayloadUnknownFieldFixture as any);

    expect(mockLog.debug).toHaveBeenCalledWith("webhook.unknown_field_ignored", {
      field: "coexistence_fixture_unknown_field",
    });
    expect(mockOnMessage).not.toHaveBeenCalled();
    expect(mockLogger.logIncoming).not.toHaveBeenCalled();
  });
});
