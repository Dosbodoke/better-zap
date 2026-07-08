import { beforeEach, describe, expect, it, vi } from "vitest";
import { defineTemplates } from "better-zap";
import type {
  BetterZapDatabase,
  CoexistenceStore,
  ConversationRecord,
  WhatsAppLogRecord,
  WhatsAppLogStore,
} from "better-zap";
import { betterZap } from "./better-zap";

const TEST_META_APP_SECRET = "test-meta-app-secret";
const textEncoder = new TextEncoder();

type CreateWhatsAppLogParams = Parameters<
  WhatsAppLogStore["createWhatsAppLog"]
>[0];

function makeLogRecord(params: CreateWhatsAppLogParams): WhatsAppLogRecord {
  return {
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
  };
}

function makeStore(): WhatsAppLogStore {
  return {
    createWhatsAppLog: vi.fn(async (params) => ({
      record: makeLogRecord(params),
      created: true,
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

function makeCoexistenceStore(): CoexistenceStore {
  return {
    upsertConnectedAccount: vi.fn().mockResolvedValue(undefined),
    getConnectedAccountByWabaId: vi.fn().mockResolvedValue(null),
    getConnectedAccountByPhoneNumberId: vi.fn().mockResolvedValue(null),
    recordOnboardingSession: vi.fn().mockResolvedValue(undefined),
    upsertPreflightState: vi.fn().mockResolvedValue(undefined),
    getPreflightStateByPhoneNumberId: vi.fn().mockResolvedValue(null),
    createSyncJob: vi.fn().mockResolvedValue(undefined),
    getInFlightSyncJob: vi.fn().mockResolvedValue(null),
    updateSyncJobByRequestId: vi.fn().mockResolvedValue(undefined),
    upsertContact: vi.fn().mockResolvedValue(undefined),
    removeContact: vi.fn().mockResolvedValue(undefined),
    recordLifecycleEvent: vi.fn().mockResolvedValue(undefined),
  };
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

  it("returns 401 and does not send to Meta when app API auth denies text sends", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const zap = betterZap({
      database: makeDatabase(),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      authorizeAppRequest: vi.fn().mockResolvedValue(false),
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

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "Unauthorized" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("allows app API text sends when app API auth approves", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [{ id: "wamid.authorized" }] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const store = makeStore();
    store.getConversationByPhone = vi
      .fn()
      .mockResolvedValue(makeConversationRecord());

    const zap = betterZap({
      database: makeDatabase({ whatsappLog: store }),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      authorizeAppRequest: vi.fn().mockResolvedValue(true),
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

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not run app API auth for signed webhook delivery", async () => {
    const authorizeAppRequest = vi.fn().mockResolvedValue(false);
    const onMessage = vi.fn().mockResolvedValue(undefined);

    const zap = betterZap({
      database: makeDatabase(),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      authorizeAppRequest,
      webhook: {
        onMessage,
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await postWebhook(zap, makeTextMessage());

    expect(response.status).toBe(200);
    expect(authorizeAppRequest).not.toHaveBeenCalled();
    expect(onMessage).toHaveBeenCalledTimes(1);
  });

  it("skips message hooks when atomic incoming logging reports a duplicate", async () => {
    const store = makeStore();
    const onMessage = vi.fn().mockResolvedValue(undefined);
    store.createWhatsAppLog = vi.fn(async (params) => ({
      record: makeLogRecord(params),
      created: false,
    }));

    const zap = betterZap({
      database: makeDatabase({ whatsappLog: store }),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      webhook: {
        onMessage,
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await postWebhook(zap, makeTextMessage());

    expect(response.status).toBe(200);
    expect(store.createWhatsAppLog).toHaveBeenCalledTimes(1);
    expect(store.getConversationById).not.toHaveBeenCalled();
    expect(onMessage).not.toHaveBeenCalled();
  });

  it("returns 500 and logs when app API auth throws", async () => {
    const log = vi.fn();

    const zap = betterZap({
      database: makeDatabase(),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      authorizeAppRequest: vi.fn().mockRejectedValue(new Error("auth boom")),
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
      logger: {
        log,
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

    expect(response.status).toBe(500);
    expect(payload).toEqual({ error: "Authorization failed" });
    expect(log).toHaveBeenCalledWith(
      "error",
      "app_api.authorization_failed",
      expect.objectContaining({
        message: "auth boom",
        name: "Error",
      }),
    );
  });

  it("returns 501 for coexistence app routes when coexistence is not configured", async () => {
    const zap = betterZap({
      database: makeDatabase(),
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
      new Request(
        "http://localhost/api/whatsapp/coexistence/phone-numbers/phone_123/status",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(501);
    expect(payload).toEqual({ error: "Coexistence routes are not configured" });
  });

  it("records embedded signup callbacks and connected accounts", async () => {
    const coexistenceStore = makeCoexistenceStore();
    const service = {
      exchangeEmbeddedSignupCode: vi.fn().mockResolvedValue({
        success: true,
        data: {
          accessToken: "user-access-token",
          tokenType: "bearer",
          expiresIn: 3600,
          credentialRef: "vault://meta/waba_123/phone_123",
          credentialProvider: "test-vault",
          credentialMetadata: {
            keyVersion: "v1",
          },
          raw: { access_token: "user-access-token" },
        },
      }),
      subscribeWaba: vi.fn().mockResolvedValue({
        success: true,
        data: { success: true },
      }),
    };
    const session = {
      event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
      data: {
        waba_id: "waba_123",
        business_id: "business_123",
        phone_number_id: "phone_123",
        display_phone_number: "+15551234567",
        code: "embedded-signup-code",
      },
    };

    const zap = betterZap({
      database: makeDatabase({ coexistence: coexistenceStore }),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      coexistence: {
        service: service as any,
      },
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await sendRequest(
      zap,
      new Request(
        "http://localhost/api/whatsapp/coexistence/embedded-signup/callback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: "embedded-signup-code",
            redirectUri: "https://example.com/coexistence/callback",
            session,
            preflight: {
              eligibilityStatus: "eligible",
              unsupportedCountry: false,
              unsupportedAppVersion: false,
              lowActivityNumber: false,
              priorProviderWabaRegistration: false,
            },
            billing: {
              status: "ready",
              missingPaymentSetup: false,
            },
          }),
        },
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      session,
    });
    expect(payload).not.toHaveProperty("token");
    expect(JSON.stringify(payload)).not.toContain("user-access-token");
    expect(service.exchangeEmbeddedSignupCode).toHaveBeenCalledWith({
      code: "embedded-signup-code",
      redirectUri: "https://example.com/coexistence/callback",
    });
    expect(service.subscribeWaba).toHaveBeenCalledWith({
      wabaId: "waba_123",
      accessToken: "user-access-token",
    });
    expect(coexistenceStore.recordOnboardingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
        accountId: "business_123",
        wabaId: "waba_123",
        phoneNumberId: "phone_123",
        preflight: expect.objectContaining({
          phoneNumberId: "phone_123",
          wabaId: "waba_123",
          eligibilityStatus: "eligible",
          billingStatus: "ready",
          failureCodes: [],
        }),
        payload: session,
      }),
    );
    expect(coexistenceStore.upsertPreflightState).toHaveBeenCalledWith(
      expect.objectContaining({
        phoneNumberId: "phone_123",
        wabaId: "waba_123",
        eligibilityStatus: "eligible",
        billingStatus: "ready",
        failureCodes: [],
      }),
    );
    expect(coexistenceStore.upsertConnectedAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        wabaId: "waba_123",
        businessId: "business_123",
        accountId: "business_123",
        phoneNumberId: "phone_123",
        displayPhoneNumber: "+15551234567",
        credentialRef: "vault://meta/waba_123/phone_123",
        credentialProvider: "test-vault",
        credentialMetadata: {
          keyVersion: "v1",
        },
        preflight: expect.objectContaining({
          eligibilityStatus: "eligible",
          billingStatus: "ready",
        }),
        metadata: expect.objectContaining({
          onboardingEvent: "FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING",
          tokenType: "bearer",
          tokenExpiresIn: 3600,
          subscriptionStatus: "subscribed",
        }),
      }),
    );
    expect(
      JSON.stringify(
        (coexistenceStore.upsertConnectedAccount as any).mock.calls[0]?.[0],
      ),
    ).not.toContain("user-access-token");
  });

  it("surfaces and records WABA subscription failures after code exchange", async () => {
    const coexistenceStore = {
      ...makeCoexistenceStore(),
      updateRawEventStatus: vi.fn().mockResolvedValue(undefined),
    } satisfies CoexistenceStore;
    const service = {
      exchangeEmbeddedSignupCode: vi.fn().mockResolvedValue({
        success: true,
        data: {
          accessToken: "user-access-token",
          credentialRef: "vault://meta/waba_123/phone_123",
        },
      }),
      subscribeWaba: vi.fn().mockResolvedValue({
        success: false,
        error: "Permission denied",
        errorCode: 10,
        httpStatus: 403,
        details: { error: { message: "Permission denied" } },
      }),
    };
    const session = {
      event: "FINISH",
      data: {
        waba_id: "waba_123",
        business_id: "business_123",
        phone_number_id: "phone_123",
      },
    };

    const zap = betterZap({
      database: makeDatabase({ coexistence: coexistenceStore }),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      coexistence: {
        service: service as any,
      },
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await sendRequest(
      zap,
      new Request(
        "http://localhost/api/whatsapp/coexistence/embedded-signup/callback",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": "idem_subscribe_failure",
          },
          body: JSON.stringify({
            code: "embedded-signup-code",
            session,
          }),
        },
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(403);
    expect(payload).toEqual({
      success: false,
      phase: "subscribe_waba",
      error: "Permission denied",
      errorCode: 10,
      details: { error: { message: "Permission denied" } },
    });
    expect(coexistenceStore.upsertConnectedAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        wabaId: "waba_123",
        credentialRef: "vault://meta/waba_123/phone_123",
        metadata: expect.objectContaining({
          subscriptionStatus: "failed",
          subscription: expect.objectContaining({
            success: false,
            error: "Permission denied",
            errorCode: 10,
            httpStatus: 403,
          }),
        }),
      }),
    );
    expect(coexistenceStore.updateRawEventStatus).toHaveBeenCalledWith(
      expect.objectContaining({
        id: "idem_subscribe_failure",
        status: "failed",
        error: "Permission denied",
        result: expect.objectContaining({
          phase: "subscribe_waba",
          wabaId: "waba_123",
        }),
      }),
    );
    expect(coexistenceStore.recordLifecycleEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: "business_123",
        wabaId: "waba_123",
        phoneNumberId: "phone_123",
        event: "WABA_SUBSCRIPTION_FAILED",
        payload: expect.objectContaining({
          session,
          error: "Permission denied",
          errorCode: 10,
          httpStatus: 403,
        }),
      }),
    );
    expect(JSON.stringify(payload)).not.toContain("user-access-token");
    expect(
      JSON.stringify(
        (coexistenceStore.upsertConnectedAccount as any).mock.calls[0]?.[0],
      ),
    ).not.toContain("user-access-token");
  });

  it("can disable WABA subscription after code exchange", async () => {
    const coexistenceStore = makeCoexistenceStore();
    const service = {
      exchangeEmbeddedSignupCode: vi.fn().mockResolvedValue({
        success: true,
        data: {
          accessToken: "user-access-token",
          credentialRef: "vault://meta/waba_123/phone_123",
        },
      }),
      subscribeWaba: vi.fn(),
    };
    const session = {
      event: "FINISH",
      data: {
        waba_id: "waba_123",
        business_id: "business_123",
        phone_number_id: "phone_123",
      },
    };

    const zap = betterZap({
      database: makeDatabase({ coexistence: coexistenceStore }),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      coexistence: {
        service: service as any,
        subscribeWabaAfterCodeExchange: false,
      },
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await sendRequest(
      zap,
      new Request(
        "http://localhost/api/whatsapp/coexistence/embedded-signup/callback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: "embedded-signup-code",
            session,
          }),
        },
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      status: "exchanged",
      subscriptionStatus: "skipped",
    });
    expect(service.subscribeWaba).not.toHaveBeenCalled();
    expect(coexistenceStore.upsertConnectedAccount).toHaveBeenCalledWith(
      expect.objectContaining({
        credentialRef: "vault://meta/waba_123/phone_123",
        metadata: expect.objectContaining({
          subscriptionStatus: "skipped",
        }),
      }),
    );
  });

  it("records session-only cancel callbacks without exchanging a code", async () => {
    const coexistenceStore = makeCoexistenceStore();
    const service = {
      exchangeEmbeddedSignupCode: vi.fn(),
    };
    const session = {
      event: "CANCEL",
      data: {
        current_step: "QR_CODE",
      },
    };

    const zap = betterZap({
      database: makeDatabase({ coexistence: coexistenceStore }),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      coexistence: {
        service: service as any,
      },
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await sendRequest(
      zap,
      new Request(
        "http://localhost/api/whatsapp/coexistence/embedded-signup/callback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session }),
        },
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      status: "recorded",
      event: "CANCEL",
      session,
    });
    expect(service.exchangeEmbeddedSignupCode).not.toHaveBeenCalled();
    expect(coexistenceStore.recordOnboardingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "CANCEL",
        payload: session,
      }),
    );
    expect(coexistenceStore.upsertConnectedAccount).not.toHaveBeenCalled();
  });

  it("records embedded signup error events without exchanging a code", async () => {
    const coexistenceStore = makeCoexistenceStore();
    const service = {
      exchangeEmbeddedSignupCode: vi.fn(),
    };
    const session = {
      event: "ERROR_WHATSAPP_BUSINESS_APP_ONBOARDING",
      data: {
        error_message: "Meta-side error",
      },
    };

    const zap = betterZap({
      database: makeDatabase({ coexistence: coexistenceStore }),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      coexistence: {
        service: service as any,
      },
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await sendRequest(
      zap,
      new Request(
        "http://localhost/api/whatsapp/coexistence/embedded-signup/callback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session }),
        },
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      success: true,
      status: "recorded",
      event: "ERROR",
      session,
    });
    expect(service.exchangeEmbeddedSignupCode).not.toHaveBeenCalled();
    expect(coexistenceStore.recordOnboardingSession).toHaveBeenCalledWith(
      expect.objectContaining({
        event: "ERROR_WHATSAPP_BUSINESS_APP_ONBOARDING",
        payload: session,
      }),
    );
  });

  it("returns 400 for finish callbacks without a code", async () => {
    const coexistenceStore = makeCoexistenceStore();
    const service = {
      exchangeEmbeddedSignupCode: vi.fn(),
    };
    const zap = betterZap({
      database: makeDatabase({ coexistence: coexistenceStore }),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      coexistence: {
        service: service as any,
      },
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await sendRequest(
      zap,
      new Request(
        "http://localhost/api/whatsapp/coexistence/embedded-signup/callback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session: { event: "FINISH" } }),
        },
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "code is required" });
    expect(service.exchangeEmbeddedSignupCode).not.toHaveBeenCalled();
  });

  it("returns duplicate for already processed finish idempotency keys", async () => {
    const coexistenceStore = {
      ...makeCoexistenceStore(),
      getRawEventStatus: vi.fn().mockResolvedValue({
        id: "idem_123",
        status: "processed",
        result: {
          success: true,
          status: "exchanged",
          session: { event: "FINISH" },
        },
      }),
      updateRawEventStatus: vi.fn().mockResolvedValue(undefined),
    } satisfies CoexistenceStore;
    const service = {
      exchangeEmbeddedSignupCode: vi.fn(),
    };
    const zap = betterZap({
      database: makeDatabase({ coexistence: coexistenceStore }),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      coexistence: {
        service: service as any,
      },
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await sendRequest(
      zap,
      new Request(
        "http://localhost/api/whatsapp/coexistence/embedded-signup/callback",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": "idem_123",
          },
          body: JSON.stringify({
            code: "embedded-signup-code",
            session: { event: "FINISH" },
          }),
        },
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      status: "duplicate",
      idempotencyKey: "idem_123",
      result: {
        success: true,
        status: "exchanged",
        session: { event: "FINISH" },
      },
    });
    expect(service.exchangeEmbeddedSignupCode).not.toHaveBeenCalled();
    expect(coexistenceStore.recordOnboardingSession).not.toHaveBeenCalled();
  });

  it("rejects nonce and state mismatches before recording", async () => {
    const coexistenceStore = makeCoexistenceStore();
    const service = {
      exchangeEmbeddedSignupCode: vi.fn(),
    };
    const zap = betterZap({
      database: makeDatabase({ coexistence: coexistenceStore }),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      coexistence: {
        service: service as any,
      },
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await sendRequest(
      zap,
      new Request(
        "http://localhost/api/whatsapp/coexistence/embedded-signup/callback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            state: "actual-state",
            expectedState: "expected-state",
            session: { event: "CANCEL" },
          }),
        },
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload).toEqual({ error: "state mismatch" });
    expect(service.exchangeEmbeddedSignupCode).not.toHaveBeenCalled();
    expect(coexistenceStore.recordOnboardingSession).not.toHaveBeenCalled();
  });

  it("returns 501 for embedded signup callbacks when coexistence storage is missing", async () => {
    const service = {
      exchangeEmbeddedSignupCode: vi.fn(),
    };
    const zap = betterZap({
      database: makeDatabase(),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      coexistence: {
        service: service as any,
      },
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await sendRequest(
      zap,
      new Request(
        "http://localhost/api/whatsapp/coexistence/embedded-signup/callback",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code: "code", session: { event: "event" } }),
        },
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(501);
    expect(payload).toEqual({ error: "Coexistence storage is not configured" });
    expect(service.exchangeEmbeddedSignupCode).not.toHaveBeenCalled();
  });

  it("returns normalized coexistence phone status", async () => {
    const service = {
      getPhoneStatus: vi.fn().mockResolvedValue({
        success: true,
        data: {
          id: "phone_123",
          is_on_biz_app: true,
          platform_type: "CLOUD_API",
        },
      }),
    };
    const zap = betterZap({
      database: makeDatabase(),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      coexistence: {
        service: service as any,
      },
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await sendRequest(
      zap,
      new Request(
        "http://localhost/api/whatsapp/coexistence/phone-numbers/phone_123/status",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      id: "phone_123",
      is_on_biz_app: true,
      platform_type: "CLOUD_API",
    });
    expect(service.getPhoneStatus).toHaveBeenCalledWith({
      phoneNumberId: "phone_123",
    });
  });

  it("requests contacts sync and persists the returned request id", async () => {
    const coexistenceStore = makeCoexistenceStore();
    let graphRequestBody: Record<string, any> | null = null;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      graphRequestBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({ success: true, request_id: "contacts_request_123" }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const zap = betterZap({
      database: makeDatabase({ coexistence: coexistenceStore }),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      coexistence: {
        accessToken: "coexistence-access-token",
        graphBaseUrl: "https://graph.example.test",
      },
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await sendRequest(
      zap,
      new Request(
        "http://localhost/api/whatsapp/coexistence/phone-numbers/phone_123/sync/contacts",
        { method: "POST" },
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      request_id: "contacts_request_123",
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.example.test/v25.0/phone_123/smb_app_data",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer coexistence-access-token",
        }),
      }),
    );
    expect(graphRequestBody).toEqual({ sync_type: "smb_app_state_sync" });
    expect(coexistenceStore.createSyncJob).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: "contacts_request_123",
        syncType: "smb_app_state_sync",
        phoneNumberId: "phone_123",
        status: "requested",
        requestedAt: expect.any(Date),
      }),
    );
  });

  it("requests history sync and persists the 24 hour sync deadline", async () => {
    const coexistenceStore = makeCoexistenceStore();
    let graphRequestBody: Record<string, any> | null = null;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      graphRequestBody = JSON.parse(String(init?.body));
      return new Response(
        JSON.stringify({ success: true, request_id: "history_request_123" }),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);

    const zap = betterZap({
      database: makeDatabase({ coexistence: coexistenceStore }),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      coexistence: {
        accessToken: "coexistence-access-token",
        graphBaseUrl: "https://graph.example.test",
      },
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await sendRequest(
      zap,
      new Request(
        "http://localhost/api/whatsapp/coexistence/phone-numbers/phone_123/sync/history",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ onboardingSessionId: "session_123" }),
        },
      ),
    );
    const payload = await response.json();
    const job = (coexistenceStore.createSyncJob as any).mock.calls[0]?.[0];

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      success: true,
      request_id: "history_request_123",
    });
    expect(graphRequestBody).toEqual({ sync_type: "history" });
    expect(job).toMatchObject({
      requestId: "history_request_123",
      syncType: "history",
      phoneNumberId: "phone_123",
      onboardingSessionId: "session_123",
      status: "requested",
      requestedAt: expect.any(Date),
      deadlineAt: expect.any(Date),
    });
    expect(job.deadlineAt.getTime() - job.requestedAt.getTime()).toBe(
      24 * 60 * 60 * 1000,
    );
  });

  it("rejects duplicate in-flight sync requests before calling Meta", async () => {
    const coexistenceStore = makeCoexistenceStore();
    (coexistenceStore.getInFlightSyncJob as any).mockResolvedValue({
      requestId: "history_request_123",
      syncType: "history",
      phoneNumberId: "phone_123",
      status: "requested",
      deadlineAt: "2026-07-09T12:00:00.000Z",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const zap = betterZap({
      database: makeDatabase({ coexistence: coexistenceStore }),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      coexistence: {
        accessToken: "coexistence-access-token",
        graphBaseUrl: "https://graph.example.test",
      },
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await sendRequest(
      zap,
      new Request(
        "http://localhost/api/whatsapp/coexistence/phone-numbers/phone_123/sync/history",
        { method: "POST" },
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload).toEqual({
      success: false,
      error: "Coexistence sync already in flight",
      code: "sync_already_in_flight",
      requestId: "history_request_123",
      deadlineAt: "2026-07-09T12:00:00.000Z",
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(coexistenceStore.createSyncJob).not.toHaveBeenCalled();
  });

  it("returns typed preflight failures without calling Meta", async () => {
    const coexistenceStore = makeCoexistenceStore();
    (coexistenceStore.getPreflightStateByPhoneNumberId as any).mockResolvedValue({
      phoneNumberId: "phone_123",
      eligibilityStatus: "ineligible",
      unsupportedAppVersion: true,
      lowActivityNumber: true,
      missingPaymentSetup: true,
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const zap = betterZap({
      database: makeDatabase({ coexistence: coexistenceStore }),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      coexistence: {
        accessToken: "coexistence-access-token",
        graphBaseUrl: "https://graph.example.test",
      },
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await sendRequest(
      zap,
      new Request(
        "http://localhost/api/whatsapp/coexistence/phone-numbers/phone_123/sync/contacts",
        { method: "POST" },
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload).toEqual({
      success: false,
      error: "Coexistence preflight failed",
      code: "coexistence_preflight_failed",
      failureCodes: [
        "unsupported_app_version",
        "low_activity_number",
        "missing_payment_setup",
      ],
    });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(coexistenceStore.createSyncJob).not.toHaveBeenCalled();
  });

  it("requests history sync without creating a fake sync job when request id is absent", async () => {
    const coexistenceStore = makeCoexistenceStore();
    let graphRequestBody: Record<string, any> | null = null;
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      graphRequestBody = JSON.parse(String(init?.body));
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const zap = betterZap({
      database: makeDatabase({ coexistence: coexistenceStore }),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      coexistence: {
        accessToken: "coexistence-access-token",
        graphBaseUrl: "https://graph.example.test",
      },
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await sendRequest(
      zap,
      new Request(
        "http://localhost/api/whatsapp/coexistence/phone-numbers/phone_123/sync/history",
        { method: "POST" },
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ success: true });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.example.test/v25.0/phone_123/smb_app_data",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer coexistence-access-token",
        }),
      }),
    );
    expect(graphRequestBody).toEqual({ sync_type: "history" });
    expect(coexistenceStore.createSyncJob).not.toHaveBeenCalled();
  });

  it("rejects unauthorized coexistence app route requests", async () => {
    const service = {
      getPhoneStatus: vi.fn(),
    };
    const zap = betterZap({
      database: makeDatabase(),
      config: {
        token: "token",
        phoneId: "phone-id",
        webhookToken: "verify-token",
        appSecret: TEST_META_APP_SECRET,
      },
      coexistence: {
        service: service as any,
      },
      authorizeAppRequest: vi.fn().mockResolvedValue(false),
      webhook: {
        onMessage: vi.fn().mockResolvedValue(undefined),
        onStatusUpdate: vi.fn().mockResolvedValue(undefined),
      },
    });

    const response = await sendRequest(
      zap,
      new Request(
        "http://localhost/api/whatsapp/coexistence/phone-numbers/phone_123/status",
      ),
    );
    const payload = await response.json();

    expect(response.status).toBe(401);
    expect(payload).toEqual({ error: "Unauthorized" });
    expect(service.getPhoneStatus).not.toHaveBeenCalled();
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
