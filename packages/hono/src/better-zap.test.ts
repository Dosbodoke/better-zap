import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineTemplates } from "better-zap";
import type {
  BetterZapDatabase,
  ConversationRecord,
  WhatsAppLogStore,
} from "better-zap";
import { betterZap } from "./better-zap";

const TEST_META_APP_SECRET = "test-meta-app-secret";
const textEncoder = new TextEncoder();

function makeStore(): WhatsAppLogStore {
  return {
    createWhatsAppLog: vi.fn(async (params) => ({
      id: params.waMessageId ?? "log-1",
      conversationId: "conversation-1",
      phone: params.phone,
      userId: params.userId ?? null,
      waMessageId: params.waMessageId ?? null,
      direction: params.direction,
      messageType: params.messageType,
      content: params.content,
      templateName: params.templateName ?? null,
      status: params.status,
      errorMessage: params.errorMessage ?? null,
      metadata: params.metadata,
      sentAt: params.sentAt,
      deliveredAt: null,
      readAt: null,
    })),
    getMessageByWaId: vi.fn().mockResolvedValue(null),
    updateWhatsAppLogByWaMessageId: vi.fn().mockResolvedValue(undefined),
    updateStatusIfProgressed: vi.fn().mockResolvedValue(true),
    getConversationById: vi.fn().mockResolvedValue(null),
    getConversationByPhone: vi.fn().mockResolvedValue(null),
    getConversations: vi.fn().mockResolvedValue([]),
    getMessagesByConversationPaginated: vi.fn().mockResolvedValue([]),
    hasRecentOutgoingMessage: vi.fn().mockResolvedValue(false),
  };
}

function makeConversationRecord(
  overrides: Partial<ConversationRecord> = {},
): ConversationRecord {
  const recentIncomingMessageAt = new Date(Date.now() - 60_000).toISOString();

  return {
    id: "conversation-1",
    phone: "5511999887766",
    contactName: "Joao",
    unreadCount: 0,
    status: "open",
    lastMessageAt: recentIncomingMessageAt,
    lastMessagePreview: "Oi",
    lastDirection: "incoming",
    messageCount: 1,
    lastIncomingMessageAt: recentIncomingMessageAt,
    ...overrides,
  };
}

function makeDatabase(overrides: Record<string, unknown> = {}) {
  return {
    whatsappLog: makeStore(),
    ...overrides,
  } satisfies BetterZapDatabase;
}

function makeWebhookPayload(overrides: Record<string, unknown> = {}) {
  return {
    object: "whatsapp_business_account",
    entry: [
      {
        id: "entry-1",
        changes: [
          {
            field: "messages",
            value: {
              messaging_product: "whatsapp",
              metadata: {
                display_phone_number: "15551234567",
                phone_number_id: "123456",
              },
              ...overrides,
            },
          },
        ],
      },
    ],
  };
}

function makeTextMessage(body = "Oi") {
  return makeWebhookPayload({
    contacts: [{ profile: { name: "Joao" }, wa_id: "5511999887766" }],
    messages: [
      {
        from: "5511999887766",
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

  return `sha256=${Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

async function postWebhook(
  zap: ReturnType<typeof betterZap>,
  payload: Record<string, unknown>,
) {
  const rawBody = JSON.stringify(payload);
  const waitUntilPromises: Promise<unknown>[] = [];
  const request = new Request("http://localhost/api/whatsapp/webhook", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Hub-Signature-256": await createMetaSignatureHeader(rawBody),
    },
    body: rawBody,
  });

  const response = await zap.handler(
    request,
    {},
    {
      waitUntil: (promise: Promise<unknown>) => {
        waitUntilPromises.push(promise);
      },
      passThroughOnException: () => undefined,
    },
  );

  await Promise.all(waitUntilPromises);

  return response;
}

async function sendRequest(
  zap: ReturnType<typeof betterZap>,
  request: Request,
) {
  return zap.handler(request, {}, {
    waitUntil: () => undefined,
    passThroughOnException: () => undefined,
  });
}

describe("betterZap plugins", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ messages: [{ id: "wamid.outgoing1" }] }),
      }),
    );
  });

  it("initializes plugins in order and merges plugin services", () => {
    const initCalls: string[] = [];
    const zap = betterZap({
      database: makeDatabase(),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      plugins: [
        {
          id: "plugin-one",
          init() {
            initCalls.push("plugin-one");
            return {
              context: { firstPluginValue: "alpha" },
              services: { firstPluginService: "service-alpha" },
            };
          },
        },
        {
          id: "plugin-two",
          init(ctx: any) {
            initCalls.push(
              `plugin-two:${String(ctx.context.firstPluginValue)}:${String(ctx.services.firstPluginService)}`,
            );
            return {
              services: { secondPluginService: "service-beta" },
            };
          },
        },
      ] as const,
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    expect(initCalls).toEqual(["plugin-one", "plugin-two:alpha:service-alpha"]);
    expect(zap.services).toMatchObject({
      firstPluginService: "service-alpha",
      secondPluginService: "service-beta",
    });
  });

  it("runs plugin message hooks sequentially before the user webhook", async () => {
    const callOrder: string[] = [];

    const zap = betterZap({
      database: makeDatabase(),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      plugins: [
        {
          id: "plugin-one",
          init() {
            return { context: { pluginValue: "alpha" } };
          },
          hooks: {
            onMessage: async (ctx: any) => {
              callOrder.push(`plugin-one:${ctx.pluginValue}`);
            },
          },
        },
        {
          id: "plugin-two",
          hooks: {
            onMessage: async (ctx: any) => {
              callOrder.push(`plugin-two:${ctx.pluginValue}`);
            },
          },
        },
      ] as const,
      webhook: {
        onMessage: async (ctx) => {
          callOrder.push(`user:${ctx.pluginValue}`);
        },
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await postWebhook(zap, makeTextMessage());

    expect(response.status).toBe(200);
    expect(callOrder).toEqual([
      "plugin-one:alpha",
      "plugin-two:alpha",
      "user:alpha",
    ]);
  });

  it("isolates plugin hook failures and still invokes later hooks and the user webhook", async () => {
    const callOrder: string[] = [];

    const zap = betterZap({
      database: makeDatabase(),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      plugins: [
        {
          id: "failing-plugin",
          hooks: {
            onMessage: async () => {
              callOrder.push("failing-plugin");
              throw new Error("boom");
            },
          },
        },
        {
          id: "healthy-plugin",
          hooks: {
            onMessage: async () => {
              callOrder.push("healthy-plugin");
            },
          },
        },
      ] as const,
      webhook: {
        onMessage: async () => {
          callOrder.push("user");
        },
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
      logger: {
        log: vi.fn(),
      },
    });

    const response = await postWebhook(zap, makeTextMessage());

    expect(response.status).toBe(200);
    expect(callOrder).toEqual(["failing-plugin", "healthy-plugin", "user"]);
  });

  it("serializes typed templates before sending to Meta", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [{ id: "wamid.template.1" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const zap = betterZap({
      database: makeDatabase(),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      templates: defineTemplates({
        convite_evento_v1: {
          language: "pt_BR",
          components: [
            {
              type: "body",
              parameters: [
                { name: "body_1", type: "text" },
                { name: "body_2", type: "text" },
              ],
            },
            {
              type: "button",
              subType: "quick_reply",
              index: "1",
              parameters: [{ name: "button_1_payload", type: "payload" }],
            },
          ],
        },
      } as const),
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    await zap.api.send.template("5511999887766", "convite_evento_v1", {
      params: {
        body_1: "Francisca",
        body_2: "21/03",
        button_1_payload: "OPT_OUT",
      },
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.template.name).toBe("convite_evento_v1");
    expect(body.template.language.code).toBe("pt_BR");
    expect(body.template.components).toEqual([
      {
        type: "body",
        parameters: [
          { type: "text", text: "Francisca" },
          { type: "text", text: "21/03" },
        ],
      },
      {
        type: "button",
        sub_type: "quick_reply",
        index: "1",
        parameters: [{ type: "payload", payload: "OPT_OUT" }],
      },
    ]);
  });

  it("sends Meta parameter_name for named typed template variables", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [{ id: "wamid.template.named" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const zap = betterZap({
      database: makeDatabase(),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      templates: defineTemplates({
        convite_evento_v3: {
          language: "pt_BR",
          components: [
            {
              type: "body",
              parameters: [
                { name: "body_data", parameterName: "data", type: "text" },
                {
                  name: "body_endereco",
                  parameterName: "endereco",
                  type: "text",
                },
              ],
            },
          ],
        },
      } as const),
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    await zap.api.send.template("5511999887766", "convite_evento_v3", {
      params: {
        body_data: "26/04/2026",
        body_endereco: "Taguaparque",
      },
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.template.components).toEqual([
      {
        type: "body",
        parameters: [
          {
            type: "text",
            parameter_name: "data",
            text: "26/04/2026",
          },
          {
            type: "text",
            parameter_name: "endereco",
            text: "Taguaparque",
          },
        ],
      },
    ]);
  });

  it("keeps templateRaw available for direct component sends", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [{ id: "wamid.template.raw" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const zap = betterZap({
      database: makeDatabase(),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      templates: defineTemplates({
        convite_evento_v1: {
          language: "pt_BR",
        },
      } as const),
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    await zap.api.send.templateRaw("5511999887766", "template_nao_registrado", {
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: "texto livre" }],
        },
      ],
    });

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.template.name).toBe("template_nao_registrado");
    expect(body.template.components).toEqual([
      {
        type: "body",
        parameters: [{ type: "text", text: "texto livre" }],
      },
    ]);
  });

  it("exposes freeformMessageWindow in conversation list and get payloads", async () => {
    const store = makeStore();
    const conversation = makeConversationRecord();
    store.getConversations = vi
      .fn()
      .mockResolvedValue([conversation]);
    store.getConversationByPhone = vi
      .fn()
      .mockResolvedValue(conversation);

    const zap = betterZap({
      database: makeDatabase({ whatsappLog: store }),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const listResponse = await sendRequest(
      zap,
      new Request("http://localhost/api/whatsapp/conversations"),
    );
    const getResponse = await sendRequest(
      zap,
      new Request("http://localhost/api/whatsapp/conversations/5511999887766"),
    );
    const [listPayload, getPayload] = (await Promise.all([
      listResponse.json(),
      getResponse.json(),
    ])) as [Array<Record<string, any>>, Record<string, any>];
    const expectedExpiresAt = new Date(
      new Date(conversation.lastIncomingMessageAt as string).getTime() +
        24 * 60 * 60 * 1000,
    ).toISOString();

    expect(listPayload[0].freeformMessageWindow).toEqual({
      isOpen: true,
      lastIncomingMessageAt: conversation.lastIncomingMessageAt,
      expiresAt: expectedExpiresAt,
    });
    expect(getPayload.freeformMessageWindow).toEqual({
      isOpen: true,
      lastIncomingMessageAt: conversation.lastIncomingMessageAt,
      expiresAt: expectedExpiresAt,
    });
  });

  it("returns a structured CONTEXT_WINDOW_CLOSED error for text sends outside the window", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const store = makeStore();
    const lastIncomingMessageAt = new Date(
      Date.now() - 49 * 60 * 60 * 1000,
    ).toISOString();
    store.getConversationByPhone = vi.fn().mockResolvedValue(
      makeConversationRecord({
        lastIncomingMessageAt,
      }),
    );

    const zap = betterZap({
      database: makeDatabase({ whatsappLog: store }),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await sendRequest(
      zap,
      new Request("http://localhost/api/whatsapp/send/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          to: "5511999887766",
          body: "Hello!",
        }),
      }),
    );
    const payload = await response.json();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(409);
    expect(payload).toMatchObject({
      success: false,
      error: "Free-form message window is closed.",
      code: "CONTEXT_WINDOW_CLOSED",
      httpStatus: 409,
      details: {
          freeformMessageWindow: {
          isOpen: false,
          lastIncomingMessageAt,
          expiresAt: new Date(
            new Date(lastIncomingMessageAt).getTime() + 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      },
    });
  });

  it("emits normalized freeformMessageWindow state in sync events", async () => {
    const store = makeStore();
    const conversation = makeConversationRecord();
    store.getConversationById = vi
      .fn()
      .mockResolvedValue(conversation);

    let syncPayload: Record<string, any> | null = null;
    const syncFetch = vi.fn(async (request: Request) => {
      syncPayload = JSON.parse(await request.text());
      return new Response(null, { status: 200 });
    });
    const conversationSync = {
      idFromName: vi.fn().mockReturnValue("workspace-do"),
      get: vi.fn().mockReturnValue({
        fetch: syncFetch,
      }),
    } as any;

    const zap = betterZap({
      database: makeDatabase({ whatsappLog: store }),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      conversationSync,
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await postWebhook(zap, makeTextMessage());
    expect(syncPayload).not.toBeNull();
    const event = syncPayload as unknown as Record<string, any>;

    expect(response.status).toBe(200);
    expect(event.type).toBe("NEW_MESSAGE");
    expect(event.conversation.freeformMessageWindow).toEqual({
      isOpen: true,
      lastIncomingMessageAt: conversation.lastIncomingMessageAt,
      expiresAt: new Date(
        new Date(conversation.lastIncomingMessageAt as string).getTime() +
          24 * 60 * 60 * 1000,
      ).toISOString(),
    });
  });
});
