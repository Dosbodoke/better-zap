import { describe, expect, it, vi } from "vitest";
import { noopLogger } from "../logger";
import { hasPendingMedia, isMediaPlaceholder } from "../utils/media-placeholder";
import {
  type CreateWhatsAppLogParams,
  type ImportMessageParams,
  MessageLoggerService,
  type WhatsAppLogRecord,
  type WhatsAppLogStore,
} from "./message-logger.service";

function createMemoryStore() {
  const rows = new Map<string, WhatsAppLogRecord>();

  const store: WhatsAppLogStore = {
    async createWhatsAppLog(params: CreateWhatsAppLogParams) {
      const existing = params.waMessageId ? rows.get(params.waMessageId) : undefined;
      if (existing) {
        return { record: existing, created: false };
      }
      const record: WhatsAppLogRecord = {
        id: `log-${rows.size + 1}`,
        conversationId: "conversation-1",
        phone: params.phone,
        waMessageId: params.waMessageId ?? null,
        direction: params.direction,
        messageType: params.messageType,
        content: params.content,
        status: params.status,
        metadata: params.metadata,
        sentAt: params.sentAt,
      };
      rows.set(params.waMessageId ?? record.id, record);
      return { record, created: true };
    },
    async getMessageByWaId(waMessageId) {
      return rows.get(waMessageId) ?? null;
    },
    updateWhatsAppLogByWaMessageId: vi.fn(async (waMessageId, updates) => {
      const existing = rows.get(waMessageId);
      if (existing) {
        rows.set(waMessageId, { ...existing, ...updates });
      }
    }),
    updateStatusIfProgressed: vi.fn().mockResolvedValue(true),
    getConversationById: vi.fn().mockResolvedValue(null),
    getConversationByPhone: vi.fn().mockResolvedValue(null),
    getConversations: vi.fn().mockResolvedValue([]),
    getMessagesByConversationPaginated: vi.fn().mockResolvedValue([]),
    hasRecentOutgoingMessage: vi.fn().mockResolvedValue(false),
  };

  return { store, rows };
}

const placeholder: ImportMessageParams = {
  phone: "15550000002",
  waMessageId: "wamid.media",
  direction: "incoming",
  content: "[mídia]",
  sentAt: "2026-07-01T00:00:00.000Z",
  metadata: {
    source: "history",
    requestId: "req_1",
    mediaPending: true,
    raw: { id: "wamid.media", type: "media_placeholder" },
  },
};

const realMedia: ImportMessageParams = {
  ...placeholder,
  content: "[imagem: foto]",
  metadata: {
    source: "history",
    raw: { id: "wamid.media", type: "image", image: { id: "asset_1" } },
  },
};

describe("MessageLoggerService.importMessage", () => {
  it("replaces a stored media placeholder when the real media arrives", async () => {
    const { store, rows } = createMemoryStore();
    const notifier = { notify: vi.fn().mockResolvedValue(undefined) };
    const logger = new MessageLoggerService(store, noopLogger, notifier);

    await expect(logger.importMessage(placeholder)).resolves.toBe("created");
    await expect(logger.importMessage(realMedia)).resolves.toBe("upgraded");

    const stored = rows.get("wamid.media");
    expect(stored?.content).toBe("[imagem: foto]");
    expect(stored?.metadata).toEqual({
      source: "history",
      requestId: "req_1",
      raw: { id: "wamid.media", type: "image", image: { id: "asset_1" } },
    });
    expect(hasPendingMedia(stored)).toBe(false);
    expect(notifier.notify).toHaveBeenCalledWith({
      type: "MESSAGE_UPDATE",
      message: expect.objectContaining({
        waMessageId: "wamid.media",
        content: "[imagem: foto]",
      }),
    });
  });

  it("does not let a late placeholder overwrite real media", async () => {
    const { store, rows } = createMemoryStore();
    const logger = new MessageLoggerService(store, noopLogger);

    await expect(logger.importMessage(realMedia)).resolves.toBe("created");
    await expect(logger.importMessage(placeholder)).resolves.toBe("duplicate");

    expect(rows.get("wamid.media")?.content).toBe("[imagem: foto]");
    expect(store.updateWhatsAppLogByWaMessageId).not.toHaveBeenCalled();
  });

  it("treats a repeated placeholder as a duplicate", async () => {
    const { store } = createMemoryStore();
    const logger = new MessageLoggerService(store, noopLogger);

    await logger.importMessage(placeholder);
    await expect(logger.importMessage(placeholder)).resolves.toBe("duplicate");
    expect(store.updateWhatsAppLogByWaMessageId).not.toHaveBeenCalled();
  });

  it("upgrades placeholders stored before the mediaPending flag existed", async () => {
    const { store, rows } = createMemoryStore();
    const logger = new MessageLoggerService(store, noopLogger);

    await logger.importMessage({
      ...placeholder,
      content: "[media_placeholder]",
      metadata: { source: "history", raw: { type: "media_placeholder" } },
    });

    await expect(logger.importMessage(realMedia)).resolves.toBe("upgraded");
    expect(rows.get("wamid.media")?.content).toBe("[imagem: foto]");
  });

  it("keeps logImportedMessage true only for new rows", async () => {
    const { store } = createMemoryStore();
    const logger = new MessageLoggerService(store, noopLogger);

    await expect(logger.logImportedMessage(placeholder)).resolves.toBe(true);
    await expect(logger.logImportedMessage(realMedia)).resolves.toBe(false);
  });
});

describe("media placeholder helpers", () => {
  it("detects placeholder messages", () => {
    expect(isMediaPlaceholder({ type: "media_placeholder" })).toBe(true);
    expect(isMediaPlaceholder({ type: "image" })).toBe(false);
    expect(isMediaPlaceholder(undefined)).toBe(false);
  });

  it("detects stored records with pending media", () => {
    expect(hasPendingMedia({ metadata: { mediaPending: true } })).toBe(true);
    expect(hasPendingMedia({ metadata: { raw: { type: "media_placeholder" } } })).toBe(true);
    expect(hasPendingMedia({ metadata: { raw: { type: "image" } } })).toBe(false);
    expect(hasPendingMedia({ metadata: null })).toBe(false);
    expect(hasPendingMedia(null)).toBe(false);
  });
});
