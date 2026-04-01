import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineTemplates } from "better-zap";
import type { BetterZapDatabase, WhatsAppLogStore } from "better-zap";
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
});
