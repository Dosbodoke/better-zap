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
import {
  BUSINESS_PHONE_NUMBER_ID,
  documentedEditFixture,
  documentedRevokeFixture,
  historyDeclinedFixture,
  historyFinalChunkFixture,
  historyMediaAssetFixture,
  historyThreadsChunkFixture,
  messageEchoesFixture,
  stateSyncFixture,
} from "./__fixtures__/coexistence-documented";

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

  describe("documented coexistence webhook shapes", () => {
    const isoFromUnix = (seconds: number) => new Date(seconds * 1000).toISOString();

    const createStoreProcessor = (store: Record<string, unknown> = {}) =>
      createTestProcessor({
        database: {
          whatsappLog: {},
          coexistence: { ...mockCoexistenceStore, ...store },
        } as any,
      });

    const inFlightJob = (requestId: string, syncType: string) =>
      vi.fn().mockResolvedValue({
        requestId,
        syncType,
        phoneNumberId: BUSINESS_PHONE_NUMBER_ID,
        status: "requested",
      });

    const syncJobStatuses = (requestId: string) =>
      mockCoexistenceStore.updateSyncJobByRequestId.mock.calls
        .filter(([id]) => id === requestId)
        .map(([, patch]) => patch.status);

    it("imports history threads with direction, identity, and timestamps", async () => {
      const getInFlightSyncJob = inFlightJob("req_fake_history", "history");
      processor = createStoreProcessor({ getInFlightSyncJob });

      await processor.process(historyThreadsChunkFixture as any);
      expect(getInFlightSyncJob).toHaveBeenCalledWith({
        phoneNumberId: BUSINESS_PHONE_NUMBER_ID,
        syncType: "history",
      });
      expect(mockLogger.logImportedMessage).toHaveBeenCalledTimes(4);
      expect(mockLogger.logImportedMessage).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          phone: "15550002222",
          waMessageId: "wamid.fake.thread.out.1",
          direction: "outgoing",
          content: "Here is the info you requested",
          sentAt: isoFromUnix(1739230955),
          senderName: "ada_fake",
          metadata: expect.objectContaining({
            source: "history",
            requestId: "req_fake_history",
            phoneNumberId: BUSINESS_PHONE_NUMBER_ID,
            historyStatus: "read",
            userId: "BSUID.fake.ada",
          }),
        }),
      );
      expect(mockLogger.logImportedMessage).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          waMessageId: "wamid.fake.thread.media.1",
          direction: "outgoing",
          content: "[media_placeholder]",
        }),
      );
      expect(mockLogger.logImportedMessage).toHaveBeenNthCalledWith(
        3,
        expect.objectContaining({
          phone: "15550002222",
          waMessageId: "wamid.fake.thread.in.1",
          direction: "incoming",
          sentAt: isoFromUnix(1739230980),
        }),
      );
      expect(mockLogger.logImportedMessage).toHaveBeenNthCalledWith(
        4,
        expect.objectContaining({
          phone: "BSUID.fake.hidden",
          waMessageId: "wamid.fake.thread.in.hidden",
          direction: "incoming",
          metadata: expect.objectContaining({ userId: "BSUID.fake.hidden" }),
        }),
      );
      expect(syncJobStatuses("req_fake_history")).toEqual([
        "processing",
        "processing",
      ]);
      expect(mockCoexistenceStore.updateSyncJobByRequestId).toHaveBeenLastCalledWith(
        "req_fake_history",
        expect.objectContaining({
          status: "processing",
          metadata: expect.objectContaining({
            progress: 55,
            phase: 0,
            chunkOrder: 1,
            importedMessages: 4,
            failedMessages: 0,
          }),
        }),
      );
      expect(mockOnCoexistenceHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          importedMessages: 4,
          duplicateMessages: 0,
          failedMessages: 0,
          progress: 55,
          requestId: "req_fake_history",
        }),
      );
      expect(mockOnMessage).not.toHaveBeenCalled();
    });

    it("marks the history sync completed only when progress reaches 100", async () => {
      processor = createStoreProcessor({
        getInFlightSyncJob: inFlightJob("req_fake_history", "history"),
      });

      await processor.process(historyFinalChunkFixture as any);

      expect(syncJobStatuses("req_fake_history")).toEqual([
        "processing",
        "completed",
      ]);
      expect(mockCoexistenceStore.updateSyncJobByRequestId).toHaveBeenLastCalledWith(
        "req_fake_history",
        expect.objectContaining({
          completedAt: expect.any(Date),
          metadata: expect.objectContaining({ progress: 100, phase: 2 }),
        }),
      );
    });

    it("imports a message once when thread and legacy shapes both carry it", async () => {
      processor = createStoreProcessor();
      const chunk = (historyFinalChunkFixture.entry[0]!.changes[0]!.value as any)
        .history[0];
      const payload = makeWebhookPayload(
        {
          request_id: "req_both_shapes",
          history: [
            {
              ...chunk,
              messages: chunk.threads[0]!.messages,
            },
          ],
        },
        "history",
      );

      await processor.process(payload as any);

      expect(mockLogger.logImportedMessage).toHaveBeenCalledOnce();
      expect(mockOnCoexistenceHistory).toHaveBeenCalledWith(
        expect.objectContaining({ importedMessages: 1, duplicateMessages: 1 }),
      );
    });

    it("processes media asset deliveries without completing the sync", async () => {
      processor = createStoreProcessor({
        getInFlightSyncJob: inFlightJob("req_fake_history", "history"),
      });
      mockLogger.logImportedMessage.mockResolvedValueOnce(false);

      await processor.process(historyMediaAssetFixture as any);

      expect(mockLogger.logImportedMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          waMessageId: "wamid.fake.thread.media.1",
          direction: "incoming",
          content: "[imagem: fake caption]",
        }),
      );
      expect(syncJobStatuses("req_fake_history")).not.toContain("completed");
      expect(mockOnCoexistenceHistory).toHaveBeenCalledWith(
        expect.objectContaining({ duplicateMessages: 1 }),
      );
    });

    it("records a declined history share as a failed sync without request_id", async () => {
      processor = createStoreProcessor({
        getInFlightSyncJob: inFlightJob("req_fake_history", "history"),
      });

      await processor.process(historyDeclinedFixture as any);

      expect(mockCoexistenceStore.updateSyncJobByRequestId).toHaveBeenCalledWith(
        "req_fake_history",
        expect.objectContaining({
          status: "failed",
          metadata: expect.objectContaining({ isHistoryOptOut: true }),
        }),
      );
      expect(syncJobStatuses("req_fake_history")).not.toContain("completed");
      expect(mockOnCoexistenceUnsupportedMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          errors: [expect.objectContaining({ code: 2593109 })],
        }),
      );
    });

    it("never reports success when a history import fails", async () => {
      processor = createStoreProcessor({
        getInFlightSyncJob: inFlightJob("req_fake_history", "history"),
      });
      mockLogger.logImportedMessage
        .mockResolvedValueOnce(true)
        .mockRejectedValueOnce(new Error("storage unavailable"));

      await processor.process(historyThreadsChunkFixture as any);
      expect(mockLog.error).toHaveBeenCalledWith(
        "webhook.coexistence_import_failed",
        expect.objectContaining({
          field: "history",
          waMessageId: "wamid.fake.thread.media.1",
        }),
      );
      expect(syncJobStatuses("req_fake_history")).not.toContain("completed");
      expect(mockCoexistenceStore.updateSyncJobByRequestId).toHaveBeenLastCalledWith(
        "req_fake_history",
        expect.objectContaining({
          status: "failed",
          failedAt: expect.any(Date),
          failureReason: "import_failed",
          metadata: expect.objectContaining({
            importedMessages: 3,
            failedMessages: 1,
          }),
        }),
      );
      expect(mockOnCoexistenceHistory).toHaveBeenLastCalledWith(
        expect.objectContaining({ importedMessages: 3, failedMessages: 1 }),
      );
    });

    it("keeps history messages with invalid timestamps but flags them", async () => {
      processor = createStoreProcessor();

      await processor.process(
        makeWebhookPayload(
          {
            history: [
              {
                metadata: { phase: 0, chunk_order: 1, progress: 10 },
                threads: [
                  {
                    id: "15550002222",
                    messages: [
                      {
                        from: "15550002222",
                        id: "wamid.fake.bad-ts",
                        timestamp: "not-a-time",
                        type: "text",
                        text: { body: "x" },
                      },
                    ],
                  },
                ],
              },
            ],
          },
          "history",
        ) as any,
      );

      expect(mockLogger.logImportedMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          waMessageId: "wamid.fake.bad-ts",
          metadata: expect.objectContaining({ invalidTimestamp: true }),
        }),
      );
      expect(mockLog.warn).toHaveBeenCalledWith(
        "webhook.coexistence_invalid_timestamp",
        expect.objectContaining({ waMessageId: "wamid.fake.bad-ts" }),
      );
    });

    it("applies state_sync contact adds and removes", async () => {
      const getInFlightSyncJob = inFlightJob("req_fake_contacts", "smb_app_state_sync");
      processor = createStoreProcessor({ getInFlightSyncJob });

      await processor.process(stateSyncFixture as any);

      expect(getInFlightSyncJob).toHaveBeenCalledWith({
        phoneNumberId: BUSINESS_PHONE_NUMBER_ID,
        syncType: "smb_app_state_sync",
      });
      expect(mockCoexistenceStore.upsertContact).toHaveBeenCalledTimes(2);
      expect(mockCoexistenceStore.upsertContact).toHaveBeenCalledWith(
        expect.objectContaining({
          waId: "15550002222",
          phoneNumberId: BUSINESS_PHONE_NUMBER_ID,
          displayName: "Ada Fake",
          firstName: "Ada",
          userId: "BSUID.fake.ada",
          username: "ada_fake",
          removed: false,
          updatedAt: isoFromUnix(1738346006),
        }),
      );
      expect(mockCoexistenceStore.upsertContact).toHaveBeenCalledWith(
        expect.objectContaining({
          waId: "BSUID.fake.hidden",
          userId: "BSUID.fake.hidden",
          displayName: "Hidden Fake",
        }),
      );
      expect(mockCoexistenceStore.removeContact).toHaveBeenCalledOnce();
      expect(mockCoexistenceStore.removeContact).toHaveBeenCalledWith({
        waId: "15550004444",
        phoneNumberId: BUSINESS_PHONE_NUMBER_ID,
      });
      expect(mockOnSmbAppStateSync).toHaveBeenCalledWith(
        expect.objectContaining({
          upsertedContacts: 2,
          removedContacts: 1,
          skippedContacts: 2,
          failedContacts: 0,
        }),
      );
      expect(syncJobStatuses("req_fake_contacts")).toEqual([
        "processing",
        "completed",
      ]);
    });

    it("applies a contact once when state_sync and legacy contacts both carry it", async () => {
      processor = createStoreProcessor();
      const [first] = (stateSyncFixture.entry[0]!.changes[0]!.value as any).state_sync;

      await processor.process(
        makeWebhookPayload(
          {
            state_sync: [first],
            contacts: [{ wa_id: "15550002222", profile: { name: "Ada Legacy" } }],
          },
          "smb_app_state_sync",
        ) as any,
      );

      expect(mockCoexistenceStore.upsertContact).toHaveBeenCalledOnce();
      expect(mockCoexistenceStore.upsertContact).toHaveBeenCalledWith(
        expect.objectContaining({ displayName: "Ada Fake" }),
      );
    });

    it("never reports success when contact storage fails", async () => {
      processor = createStoreProcessor({
        getInFlightSyncJob: inFlightJob("req_fake_contacts", "smb_app_state_sync"),
      });
      mockCoexistenceStore.upsertContact.mockRejectedValueOnce(new Error("db down"));

      await processor.process(stateSyncFixture as any);

      expect(mockLog.error).toHaveBeenCalledWith(
        "webhook.coexistence_contact_failed",
        expect.objectContaining({ action: "add" }),
      );
      expect(syncJobStatuses("req_fake_contacts")).toEqual(["processing", "failed"]);
      expect(mockOnSmbAppStateSync).toHaveBeenCalledWith(
        expect.objectContaining({ upsertedContacts: 1, failedContacts: 1 }),
      );
    });

    it("imports documented message_echoes as outgoing messages", async () => {
      processor = createStoreProcessor();
      const echoes = (messageEchoesFixture.entry[0]!.changes[0]!.value as any)
        .message_echoes;
      const payload = structuredClone(messageEchoesFixture) as any;
      payload.entry[0].changes[0].value.messages = [echoes[0]];

      await processor.process(payload as any);

      expect(mockLogger.logImportedMessage).toHaveBeenCalledTimes(2);
      expect(mockLogger.logImportedMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "15550002222",
          waMessageId: "wamid.fake.echo.1",
          direction: "outgoing",
          content: "Sent from the app",
          sentAt: isoFromUnix(1739321024),
        }),
      );
      expect(mockLogger.logImportedMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          phone: "BSUID.fake.hidden",
          waMessageId: "wamid.fake.echo.hidden",
          direction: "outgoing",
        }),
      );
      expect(mockOnSmbMessageEcho).toHaveBeenCalledWith(
        expect.objectContaining({
          importedMessages: 2,
          failedMessages: 0,
          value: expect.objectContaining({
            messages: [
              expect.objectContaining({ id: "wamid.fake.echo.1" }),
              expect.objectContaining({ id: "wamid.fake.echo.hidden" }),
            ],
          }),
        }),
      );
    });

    it("counts and logs failed echo imports", async () => {
      processor = createStoreProcessor();
      mockLogger.logImportedMessage.mockRejectedValueOnce(new Error("db down"));

      await processor.process(messageEchoesFixture as any);

      expect(mockLog.error).toHaveBeenCalledWith(
        "webhook.coexistence_import_failed",
        expect.objectContaining({
          field: "smb_message_echoes",
          waMessageId: "wamid.fake.echo.1",
        }),
      );
      expect(mockOnSmbMessageEcho).toHaveBeenCalledWith(
        expect.objectContaining({ importedMessages: 1, failedMessages: 1 }),
      );
    });

    it("routes documented edit and revoke message types to their hooks", async () => {
      await processor.process(documentedEditFixture as any);
      await processor.process(documentedRevokeFixture as any);

      expect(mockOnCoexistenceMessageEdit).toHaveBeenCalledWith(
        expect.objectContaining({ editedMessages: 1 }),
      );
      expect(mockOnCoexistenceMessageRevoke).toHaveBeenCalledWith(
        expect.objectContaining({ revokedMessages: 1 }),
      );
      expect(mockOnMessage).not.toHaveBeenCalled();
      expect(mockLogger.logIncoming).not.toHaveBeenCalled();
    });
  });
});
