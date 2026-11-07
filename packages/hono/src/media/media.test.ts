import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  historyMediaPlaceholderFixture,
  historyMediaPlaceholderFollowUpFixture,
  historyMediaWithAssetIdFixture,
} from "../../../fixtures/src";
import type {
  BetterZapDatabase,
  CoexistenceStore,
  MediaStore,
  MediaStorePutInfo,
  SyncEvent,
  WhatsAppLogRecord,
  WhatsAppLogStore,
} from "better-zap";
import { betterZap } from "../better-zap";
import type { BetterZapConfig } from "../better-zap.types";

const APP_SECRET = "test-meta-app-secret";
const textEncoder = new TextEncoder();
const FILE = textEncoder.encode("jpeg bytes");
const FILE_SHA256 = await sha256Hex(FILE);

async function sha256Hex(data: Uint8Array): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", data as BufferSource));
  return Array.from(digest, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ============================================
// In-memory stores
// ============================================

function createLogStore() {
  const rows = new Map<string, WhatsAppLogRecord>();
  const store = {
    createWhatsAppLog: vi.fn(async (params) => {
      const existing = params.waMessageId ? rows.get(params.waMessageId) : undefined;
      if (existing) return { record: existing, created: false };
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
    }),
    getMessageByWaId: vi.fn(async (waMessageId: string) => rows.get(waMessageId) ?? null),
    updateWhatsAppLogByWaMessageId: vi.fn(async (waMessageId: string, updates) => {
      const existing = rows.get(waMessageId);
      if (existing) rows.set(waMessageId, { ...existing, ...updates });
    }),
    updateStatusIfProgressed: vi.fn().mockResolvedValue(true),
    getConversationById: vi.fn().mockResolvedValue(null),
    getConversationByPhone: vi.fn().mockResolvedValue(null),
    getConversations: vi.fn().mockResolvedValue([]),
    getMessagesByConversationPaginated: vi.fn().mockResolvedValue([]),
    hasRecentOutgoingMessage: vi.fn().mockResolvedValue(false),
  } satisfies WhatsAppLogStore;
  return { store, rows };
}

/** `beforePut` runs at the start of every upload, e.g. to slow it down. */
function createMediaStore(
  overrides: Partial<MediaStore> = {},
  beforePut?: () => Promise<void>,
) {
  const files = new Map<string, { bytes: Uint8Array<ArrayBuffer>; info: MediaStorePutInfo }>();
  const store = {
    put: vi.fn(async (key: string, body: ReadableStream<Uint8Array> | ArrayBuffer, info: MediaStorePutInfo) => {
      await beforePut?.();
      const bytes = new Uint8Array(
        body instanceof ArrayBuffer ? body : await new Response(body).arrayBuffer(),
      );
      files.set(key, { bytes, info });
    }),
    get: vi.fn(async (key: string) => {
      const file = files.get(key);
      if (!file) return null;
      return {
        body: new Response(file.bytes).body!,
        contentType: file.info.contentType,
        size: file.bytes.byteLength,
      };
    }),
    ...overrides,
  } satisfies MediaStore;
  return { store, files };
}

function createCoexistenceStore(): CoexistenceStore {
  return {
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
  } as unknown as CoexistenceStore;
}

/** Fake Durable Object namespace that records sync events. */
function createSyncNamespace() {
  const events: SyncEvent[] = [];
  const namespace = {
    idFromName: () => "id",
    get: () => ({
      fetch: async (request: Request) => {
        events.push((await request.json()) as SyncEvent);
        return new Response("ok");
      },
    }),
  };
  return { namespace: namespace as unknown as DurableObjectNamespace, events };
}

// ============================================
// Fake Meta Graph API
// ============================================

type MetaBehavior = {
  lookupStatus?: number;
  fileSize?: number;
  mimeType?: string;
  body?: Uint8Array<ArrayBuffer>;
};

function stubMeta(behaviors: Record<string, MetaBehavior> = {}) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (request.headers.get("authorization") !== "Bearer meta-token") {
      return Response.json({ error: { message: "Invalid OAuth access token" } }, { status: 401 });
    }
    if (url.hostname === "graph.facebook.com") {
      const mediaId = decodeURIComponent(url.pathname.split("/").pop() ?? "");
      const behavior = behaviors[mediaId] ?? {};
      if (behavior.lookupStatus) {
        return Response.json(
          { error: { message: "Media not found", code: 100 } },
          { status: behavior.lookupStatus },
        );
      }
      const body = behavior.body ?? FILE;
      return Response.json({
        url: `https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=${mediaId}`,
        mime_type: behavior.mimeType ?? "image/jpeg",
        sha256: await sha256Hex(body),
        file_size: behavior.fileSize ?? body.byteLength,
        id: mediaId,
      });
    }
    if (url.hostname === "lookaside.fbsbx.com") {
      const mediaId = url.searchParams.get("mid") ?? "";
      return new Response(behaviors[mediaId]?.body ?? FILE, {
        headers: { "Content-Type": "image/jpeg" },
      });
    }
    return new Response("unexpected", { status: 500 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// ============================================
// App helpers
// ============================================

function createZap(input: {
  database: BetterZapDatabase;
  conversationSync?: DurableObjectNamespace;
  extra?: Pick<BetterZapConfig, "authorizeAppRequest" | "coexistence" | "media">;
  runInBackground?: BetterZapConfig["webhook"]["runInBackground"];
}) {
  const onMessage = vi.fn(async (_ctx: unknown) => {});
  const log = vi.fn();
  const options: BetterZapConfig = {
    database: input.database,
    config: {
      token: "meta-token",
      phoneId: "123456",
      webhookToken: "verify-token",
      appSecret: APP_SECRET,
    },
    conversationSync: input.conversationSync,
    logger: { level: "debug", log },
    webhook: {
      onMessage,
      onStatusUpdate: async () => {},
      runInBackground: input.runInBackground,
    },
    ...input.extra,
  };
  const zap = betterZap(options);
  return { zap, onMessage, log };
}

async function postWebhook(zap: ReturnType<typeof betterZap>, payload: unknown) {
  const { response, settled } = await sendWebhook(zap, payload);
  await settled;
  return response;
}

/** Posts a webhook and returns as soon as Meta would get its response. */
async function sendWebhook(zap: ReturnType<typeof betterZap>, payload: unknown) {
  const pending: Promise<unknown>[] = [];
  const response = await zap.handler(
    await signedWebhookRequest(payload),
    {},
    { waitUntil: (promise: Promise<unknown>) => pending.push(promise), passThroughOnException() {} },
  );
  return { response, settled: Promise.all(pending) };
}

async function signedWebhookRequest(payload: unknown): Promise<Request> {
  const rawBody = JSON.stringify(payload);
  const key = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(APP_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, textEncoder.encode(rawBody)),
  );
  return new Request("http://localhost/api/whatsapp/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": `sha256=${Array.from(signature, (b) => b.toString(16).padStart(2, "0")).join("")}`,
    },
    body: rawBody,
  });
}

function messagesPayload(
  messages: Record<string, unknown> | Record<string, unknown>[],
  field = "messages",
) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "waba-1",
        changes: [
          {
            field,
            value: {
              messaging_product: "whatsapp",
              metadata: { display_phone_number: "15551234567", phone_number_id: "123456" },
              contacts: [{ profile: { name: "João" }, wa_id: "5511999887766" }],
              messages: [messages].flat(),
            },
          },
        ],
      },
    ],
  };
}

const imageMessage = {
  from: "5511999887766",
  id: "wamid.image.1",
  timestamp: "1700000000",
  type: "image",
  image: { id: "media_image_1", mime_type: "image/jpeg", sha256: "webhook-hash", caption: "foto" },
};

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ============================================
// Webhook pipeline
// ============================================

describe("media download in the webhook pipeline", () => {
  it("stores incoming media and references it in metadata.media", async () => {
    const fetchMock = stubMeta();
    const logs = createLogStore();
    const media = createMediaStore();
    const sync = createSyncNamespace();
    const { zap, onMessage } = createZap({
      database: { whatsappLog: logs.store, media: media.store },
      conversationSync: sync.namespace,
    });

    const response = await postWebhook(zap, messagesPayload(imageMessage));

    expect(response.status).toBe(200);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "https://graph.facebook.com/v25.0/media_image_1",
      "https://lookaside.fbsbx.com/whatsapp_business/attachments/?mid=media_image_1",
    ]);

    const key = "whatsapp/123456/wamid.image.1";
    expect(media.files.get(key)?.bytes).toEqual(FILE);
    expect(media.files.get(key)?.info).toEqual({
      contentType: "image/jpeg",
      size: FILE.byteLength,
      sha256: FILE_SHA256,
      signal: expect.any(AbortSignal),
    });

    const row = logs.rows.get("wamid.image.1");
    expect(row?.content).toBe("[imagem: foto]");
    expect(row?.metadata).toEqual({
      // The raw media object stays next to the reference.
      image: imageMessage.image,
      media: {
        status: "stored",
        key,
        contentType: "image/jpeg",
        size: FILE.byteLength,
        sha256: FILE_SHA256,
        mediaId: "media_image_1",
        storedAt: expect.any(String),
      },
    });
    expect(sync.events.map((event) => event.type)).toEqual(["MESSAGE_UPDATE"]);
    expect(sync.events[0]).toMatchObject({
      message: { waMessageId: "wamid.image.1", metadata: { media: { status: "stored", key } } },
    });
    expect(onMessage).toHaveBeenCalledOnce();
  });

  it("runs onMessage before downloading the media", async () => {
    const fetchMock = stubMeta();
    const logs = createLogStore();
    const media = createMediaStore();
    const { zap, onMessage } = createZap({
      database: { whatsappLog: logs.store, media: media.store },
    });

    await postWebhook(zap, messagesPayload(imageMessage));

    expect(onMessage).toHaveBeenCalledOnce();
    expect(fetchMock).toHaveBeenCalled();
    expect(onMessage.mock.invocationCallOrder[0]).toBeLessThan(
      fetchMock.mock.invocationCallOrder[0]!,
    );
  });

  it("keeps processing later messages while a file uploads", async () => {
    stubMeta();
    const logs = createLogStore();
    let finishUpload = () => {};
    const media = createMediaStore(
      {},
      () =>
        new Promise<void>((resolve) => {
          finishUpload = resolve;
        }),
    );
    const { zap, onMessage } = createZap({
      database: { whatsappLog: logs.store, media: media.store },
    });
    const textMessage = {
      from: "5511999887766",
      id: "wamid.text.1",
      timestamp: "1700000001",
      type: "text",
      text: { body: "oi" },
    };

    const { response, settled } = await sendWebhook(
      zap,
      messagesPayload([imageMessage, textMessage]),
    );
    expect(response.status).toBe(200);

    // Both hooks ran while the image upload is still in progress.
    await vi.waitFor(() => {
      expect(onMessage).toHaveBeenCalledTimes(2);
      expect(media.store.put).toHaveBeenCalledOnce();
    });
    expect(logs.rows.get("wamid.image.1")?.metadata.media).toBeUndefined();

    finishUpload();
    await settled;
    expect(logs.rows.get("wamid.image.1")?.metadata.media).toMatchObject({ status: "stored" });
  });

  it("answers Meta before processing when webhook.runInBackground is set", async () => {
    stubMeta();
    const logs = createLogStore();
    const media = createMediaStore();
    const background: Promise<void>[] = [];
    const { zap, onMessage } = createZap({
      database: { whatsappLog: logs.store, media: media.store },
      runInBackground: (work) => {
        background.push(work);
      },
    });
    // No execution context, like a Node server.
    const response = await zap.handler(await signedWebhookRequest(messagesPayload(imageMessage)));

    expect(response.status).toBe(200);
    expect(background).toHaveLength(1);
    await Promise.all(background);
    expect(onMessage).toHaveBeenCalledOnce();
    expect(logs.rows.get("wamid.image.1")?.metadata.media).toMatchObject({ status: "stored" });
  });

  it("downloads files in parallel up to media.concurrency", async () => {
    stubMeta();
    const logs = createLogStore();
    let active = 0;
    let peak = 0;
    const media = createMediaStore({}, async () => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active--;
    });
    const { zap } = createZap({
      database: { whatsappLog: logs.store, media: media.store },
      extra: { media: { concurrency: 2 } },
    });
    const images = [1, 2, 3, 4].map((n) => ({
      ...imageMessage,
      id: `wamid.image.${n}`,
      image: { ...imageMessage.image, id: `media_image_${n}` },
    }));

    await postWebhook(zap, messagesPayload(images));

    expect(media.store.put).toHaveBeenCalledTimes(4);
    expect(peak).toBe(2);
  });

  it("records a timeout when an upload takes longer than media.timeoutMs", async () => {
    stubMeta();
    const logs = createLogStore();
    const media = createMediaStore({
      // Ignores the abort signal and never settles.
      put: vi.fn(() => new Promise<void>(() => {})),
    });
    const { zap, onMessage } = createZap({
      database: { whatsappLog: logs.store, media: media.store },
      extra: { media: { timeoutMs: 20 } },
    });

    const response = await postWebhook(zap, messagesPayload(imageMessage));

    expect(response.status).toBe(200);
    expect(onMessage).toHaveBeenCalledOnce();
    expect(logs.rows.get("wamid.image.1")?.metadata.media).toMatchObject({
      status: "failed",
      error: "Media transfer timed out after 20ms",
    });
    expect(vi.mocked(media.store.put).mock.calls[0]?.[2].signal?.aborted).toBe(true);
  });

  it("keeps the document filename", async () => {
    stubMeta();
    const logs = createLogStore();
    const media = createMediaStore();
    const { zap } = createZap({ database: { whatsappLog: logs.store, media: media.store } });

    await postWebhook(
      zap,
      messagesPayload({
        from: "5511999887766",
        id: "wamid.doc.1",
        timestamp: "1700000000",
        type: "document",
        document: { id: "media_doc_1", mime_type: "application/pdf", filename: "orçamento.pdf" },
      }),
    );

    expect(logs.rows.get("wamid.doc.1")?.metadata.media).toMatchObject({
      status: "stored",
      filename: "orçamento.pdf",
    });
  });

  it("downloads each message once", async () => {
    const fetchMock = stubMeta();
    const logs = createLogStore();
    const media = createMediaStore();
    const { zap } = createZap({ database: { whatsappLog: logs.store, media: media.store } });

    await postWebhook(zap, messagesPayload(imageMessage));
    await postWebhook(zap, messagesPayload(imageMessage));

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(media.store.put).toHaveBeenCalledOnce();
  });

  it("does nothing for messages without media", async () => {
    const fetchMock = stubMeta();
    const logs = createLogStore();
    const media = createMediaStore();
    const { zap } = createZap({ database: { whatsappLog: logs.store, media: media.store } });

    await postWebhook(
      zap,
      messagesPayload({
        from: "5511999887766",
        id: "wamid.text.1",
        timestamp: "1700000000",
        type: "text",
        text: { body: "Oi" },
      }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
    expect(logs.store.updateWhatsAppLogByWaMessageId).not.toHaveBeenCalled();
  });

  it("stores media from app message echoes", async () => {
    stubMeta();
    const logs = createLogStore();
    const media = createMediaStore();
    const { zap } = createZap({
      database: { whatsappLog: logs.store, coexistence: createCoexistenceStore(), media: media.store },
    });

    await postWebhook(
      zap,
      messagesPayload(
        {
          from: "15551234567",
          to: "5511999887766",
          id: "wamid.echo.audio",
          timestamp: "1700000000",
          type: "audio",
          audio: { id: "media_echo_audio", mime_type: "audio/ogg; codecs=opus", voice: true },
        },
        "smb_message_echoes",
      ),
    );

    const row = logs.rows.get("wamid.echo.audio");
    expect(row?.direction).toBe("outgoing");
    expect(row?.metadata).toMatchObject({
      source: "smb_message_echoes",
      media: { status: "stored", key: "whatsapp/123456/wamid.echo.audio" },
    });
    expect(media.files.has("whatsapp/123456/wamid.echo.audio")).toBe(true);
  });

  it("stores history media that arrives with an asset id", async () => {
    stubMeta();
    const logs = createLogStore();
    const media = createMediaStore();
    const { zap } = createZap({
      database: { whatsappLog: logs.store, coexistence: createCoexistenceStore(), media: media.store },
    });

    await postWebhook(zap, historyMediaWithAssetIdFixture);

    expect(logs.rows.get("wamid.hist.media.14d")?.metadata).toMatchObject({
      source: "history",
      requestId: "req_hist_media_14d",
      media: {
        status: "stored",
        key: "whatsapp/phone_known/wamid.hist.media.14d",
        mediaId: "media_asset_hist_14d_1",
      },
    });
  });

  it("skips placeholders and stores the follow-up media that replaces them", async () => {
    const fetchMock = stubMeta();
    const logs = createLogStore();
    const media = createMediaStore();
    const sync = createSyncNamespace();
    const { zap } = createZap({
      database: { whatsappLog: logs.store, coexistence: createCoexistenceStore(), media: media.store },
      conversationSync: sync.namespace,
    });
    const row = () => logs.rows.get("wamid.hist.media.placeholder");

    await postWebhook(zap, historyMediaPlaceholderFixture);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(row()?.metadata).not.toHaveProperty("media");

    await postWebhook(zap, historyMediaPlaceholderFollowUpFixture);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(row()?.content).toBe("[imagem: Receipt photo]");
    expect(row()?.metadata).not.toHaveProperty("mediaPending");
    expect(row()?.metadata).toMatchObject({
      requestId: "req_hist_media_placeholder",
      media: {
        status: "stored",
        key: "whatsapp/phone_known/wamid.hist.media.placeholder",
        mediaId: "media_asset_placeholder_1",
      },
    });
    // One update for the upgrade, one for the stored media.
    expect(sync.events.map((event) => event.type)).toEqual([
      "MESSAGE_UPDATE",
      "MESSAGE_UPDATE",
    ]);

    // A replayed placeholder neither downloads nor drops the stored media.
    await postWebhook(zap, historyMediaPlaceholderFixture);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(row()?.metadata.media.status).toBe("stored");
  });

  it("records a failed download and still runs the webhook", async () => {
    stubMeta({ media_image_1: { lookupStatus: 404 } });
    const logs = createLogStore();
    const media = createMediaStore();
    const { zap, onMessage, log } = createZap({
      database: { whatsappLog: logs.store, media: media.store },
    });

    const response = await postWebhook(zap, messagesPayload(imageMessage));

    expect(response.status).toBe(200);
    expect(onMessage).toHaveBeenCalledOnce();
    expect(media.store.put).not.toHaveBeenCalled();
    expect(logs.rows.get("wamid.image.1")?.metadata).toEqual({
      image: imageMessage.image,
      media: {
        status: "failed",
        error: "Media lookup failed: HTTP 404: Media not found",
        mediaId: "media_image_1",
        failedAt: expect.any(String),
      },
    });
    expect(log).toHaveBeenCalledWith(
      "error",
      "webhook.media_download_failed",
      expect.objectContaining({ waMessageId: "wamid.image.1", mediaId: "media_image_1" }),
    );
  });

  it("records a failed upload when the media store throws", async () => {
    stubMeta();
    const logs = createLogStore();
    const media = createMediaStore({
      put: vi.fn().mockRejectedValue(new Error("bucket unavailable")),
    });
    const { zap, onMessage } = createZap({
      database: { whatsappLog: logs.store, media: media.store },
    });

    const response = await postWebhook(zap, messagesPayload(imageMessage));

    expect(response.status).toBe(200);
    expect(onMessage).toHaveBeenCalledOnce();
    expect(logs.rows.get("wamid.image.1")?.metadata.media).toMatchObject({
      status: "failed",
      error: "bucket unavailable",
    });
  });

  it("skips files over maxBytes without failing", async () => {
    const fetchMock = stubMeta({ media_image_1: { fileSize: 2048 } });
    const logs = createLogStore();
    const media = createMediaStore();
    const { zap, onMessage } = createZap({
      database: { whatsappLog: logs.store, media: media.store },
      extra: { media: { maxBytes: 1024 } },
    });

    const response = await postWebhook(zap, messagesPayload(imageMessage));

    expect(response.status).toBe(200);
    expect(onMessage).toHaveBeenCalledOnce();
    // Only the lookup ran; the file itself was never fetched.
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(media.store.put).not.toHaveBeenCalled();
    expect(logs.rows.get("wamid.image.1")?.metadata.media).toEqual({
      status: "skipped",
      reason: "too_large",
      size: 2048,
      maxBytes: 1024,
      mediaId: "media_image_1",
      skippedAt: expect.any(String),
    });
  });

  it("uses the coexistence credential provider for other phone numbers", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      if (request.headers.get("authorization") !== "Bearer business-token") {
        return Response.json({ error: { message: "wrong token" } }, { status: 401 });
      }
      return request.url.startsWith("https://graph.facebook.com")
        ? Response.json({ url: "https://lookaside.fbsbx.com/x", mime_type: "image/jpeg" })
        : new Response(FILE);
    });
    vi.stubGlobal("fetch", fetchMock);
    const getAccessToken = vi.fn().mockResolvedValue("business-token");
    const logs = createLogStore();
    const media = createMediaStore();
    const { zap } = createZap({
      database: { whatsappLog: logs.store, coexistence: createCoexistenceStore(), media: media.store },
      extra: {
        coexistence: {
          credentials: { getAccessToken, exchangeEmbeddedSignupCode: vi.fn() },
        },
      },
    });

    await postWebhook(zap, historyMediaWithAssetIdFixture);

    expect(getAccessToken).toHaveBeenCalledWith({ phoneNumberId: "phone_known" });
    expect(logs.rows.get("wamid.hist.media.14d")?.metadata.media.status).toBe("stored");
  });

  it("keeps today's behavior when no MediaStore is configured", async () => {
    const fetchMock = stubMeta();
    const logs = createLogStore();
    const { zap, onMessage } = createZap({
      database: { whatsappLog: logs.store, coexistence: createCoexistenceStore() },
    });

    await postWebhook(zap, messagesPayload(imageMessage));
    await postWebhook(zap, historyMediaPlaceholderFixture);
    await postWebhook(zap, historyMediaPlaceholderFollowUpFixture);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(onMessage).toHaveBeenCalledOnce();
    expect(logs.rows.get("wamid.image.1")?.metadata).toEqual({ image: imageMessage.image });
    expect(logs.rows.get("wamid.hist.media.placeholder")?.content).toBe(
      "[imagem: Receipt photo]",
    );
    for (const row of logs.rows.values()) {
      expect(row.metadata).not.toHaveProperty("media");
    }
  });
});

// ============================================
// Serving route
// ============================================

describe("GET /api/whatsapp/media/:waMessageId", () => {
  async function setup(
    options: {
      authorize?: boolean;
      media?: Partial<MediaStore>;
      signedUrlExpiresIn?: number;
      message?: Record<string, unknown>;
      meta?: Record<string, MetaBehavior>;
    } = {},
  ) {
    stubMeta(options.meta);
    const logs = createLogStore();
    const media = createMediaStore(options.media);
    const authorizeAppRequest = vi.fn().mockResolvedValue(options.authorize ?? true);
    const { zap } = createZap({
      database: { whatsappLog: logs.store, media: media.store },
      extra: {
        authorizeAppRequest,
        media: { signedUrlExpiresIn: options.signedUrlExpiresIn },
      },
    });
    await postWebhook(zap, messagesPayload(options.message ?? imageMessage));
    const get = (id: string, headers: Record<string, string> = {}) =>
      zap.handler(
        new Request(`http://localhost/api/whatsapp/media/${encodeURIComponent(id)}`, { headers }),
      );
    return { zap, logs, media, get, authorizeAppRequest };
  }

  it("streams the stored file with long cache headers", async () => {
    const { get } = await setup();

    const response = await get("wamid.image.1");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/jpeg");
    expect(response.headers.get("content-length")).toBe(String(FILE.byteLength));
    expect(response.headers.get("cache-control")).toBe("private, max-age=31536000, immutable");
    expect(response.headers.get("etag")).toBe(`"${FILE_SHA256}"`);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("content-disposition")).toBe("inline");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(FILE);
  });

  it("answers 304 to a matching If-None-Match", async () => {
    const { get, media } = await setup();

    const response = await get("wamid.image.1", { "If-None-Match": `"${FILE_SHA256}"` });

    expect(response.status).toBe(304);
    expect(media.store.get).not.toHaveBeenCalled();
  });

  it("serves non-media types as sandboxed downloads", async () => {
    const { get } = await setup({
      message: {
        from: "5511999887766",
        id: "wamid.doc.html",
        timestamp: "1700000000",
        type: "document",
        document: { id: "media_doc_html", mime_type: "text/html", filename: "página \"1\".html" },
      },
      meta: { media_doc_html: { mimeType: "text/html" } },
    });

    const response = await get("wamid.doc.html");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/html");
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="p_gina _1_.html"; filename*=UTF-8''p%C3%A1gina%20%221%22.html`,
    );
    expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
  });

  it("finds messages whose id contains reserved characters", async () => {
    const { get } = await setup({
      message: { ...imageMessage, id: "wamid.HBg/ab+c==" },
    });

    const response = await get("wamid.HBg/ab+c==");
    expect(response.status).toBe(200);
  });

  it("redirects to a signed URL when the store supports it", async () => {
    const getSignedUrl = vi.fn(async (key: string, expires: number) =>
      `https://bucket.example/${key}?X-Amz-Expires=${expires}`,
    );
    const { get, media } = await setup({ media: { getSignedUrl }, signedUrlExpiresIn: 600 });

    const response = await get("wamid.image.1");

    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(
      "https://bucket.example/whatsapp/123456/wamid.image.1?X-Amz-Expires=600",
    );
    expect(response.headers.get("cache-control")).toBe("private, max-age=540");
    expect(getSignedUrl).toHaveBeenCalledWith("whatsapp/123456/wamid.image.1", 600);
    expect(media.store.get).not.toHaveBeenCalled();
  });

  it("streams active types even when the store can sign URLs", async () => {
    const getSignedUrl = vi.fn(async (key: string) => `https://bucket.example/${key}`);
    const { get } = await setup({
      media: { getSignedUrl },
      message: {
        from: "5511999887766",
        id: "wamid.doc.svg",
        timestamp: "1700000000",
        type: "document",
        document: { id: "media_doc_svg", mime_type: "image/svg+xml", filename: "x.svg" },
      },
      meta: { media_doc_svg: { mimeType: "image/svg+xml" } },
    });

    const response = await get("wamid.doc.svg");

    expect(response.status).toBe(200);
    expect(getSignedUrl).not.toHaveBeenCalled();
    expect(response.headers.get("content-disposition")).toMatch(/^attachment/);
    expect(response.headers.get("content-security-policy")).toBe("default-src 'none'; sandbox");
  });

  it("caps the signed URL lifetime and the redirect cache at 7 days", async () => {
    const getSignedUrl = vi.fn(async (key: string, expires: number) =>
      `https://bucket.example/${key}?X-Amz-Expires=${expires}`,
    );
    const { get } = await setup({ media: { getSignedUrl }, signedUrlExpiresIn: 1_209_600 });

    const response = await get("wamid.image.1");

    expect(response.status).toBe(302);
    expect(getSignedUrl).toHaveBeenCalledWith("whatsapp/123456/wamid.image.1", 604_800);
    expect(response.headers.get("cache-control")).toBe("private, max-age=604740");
  });

  it("returns 401 when authorizeAppRequest denies the request", async () => {
    const { get, media } = await setup({ authorize: false });

    const response = await get("wamid.image.1");

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(media.store.get).not.toHaveBeenCalled();
  });

  it("returns 404 for unknown messages", async () => {
    const { get } = await setup();

    const response = await get("wamid.unknown");

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Media not found" });
  });

  it("returns 404 for messages without stored media", async () => {
    const { get } = await setup({
      message: {
        from: "5511999887766",
        id: "wamid.text.1",
        timestamp: "1700000000",
        type: "text",
        text: { body: "Oi" },
      },
    });

    expect((await get("wamid.text.1")).status).toBe(404);
  });

  it("returns 404 when the file is missing from the store", async () => {
    const { get, media } = await setup();
    media.files.clear();

    expect((await get("wamid.image.1")).status).toBe(404);
  });

  it("returns 404 when no MediaStore is configured", async () => {
    stubMeta();
    const logs = createLogStore();
    const { zap } = createZap({ database: { whatsappLog: logs.store } });
    await postWebhook(zap, messagesPayload(imageMessage));

    const response = await zap.handler(
      new Request("http://localhost/api/whatsapp/media/wamid.image.1"),
    );
    expect(response.status).toBe(404);
  });

  it("returns 500 when the store fails", async () => {
    const { get } = await setup({
      media: { get: vi.fn().mockRejectedValue(new Error("bucket down")) },
    });

    expect((await get("wamid.image.1")).status).toBe(500);
  });
});
