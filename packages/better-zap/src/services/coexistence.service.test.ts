import { afterEach, describe, expect, it, vi } from "vitest";
import { stubWorkersFetch } from "../test-utils/workers-fetch";
import { CoexistenceService } from "./coexistence.service";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("CoexistenceService", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the global fetch without a `this`, as Cloudflare Workers requires", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ id: "phone_123", is_on_biz_app: true }));
    stubWorkersFetch(fetchMock);
    const service = new CoexistenceService({ accessToken: "token_123" });

    const result = await service.getPhoneStatus({ phoneNumberId: "phone_123" });

    expect(result).toEqual({ success: true, data: { id: "phone_123", is_on_biz_app: true } });
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("checks phone status with fields and authorization", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        id: "phone_123",
        is_on_biz_app: true,
        platform_type: "CLOUD_API",
      }),
    );
    const service = new CoexistenceService({
      accessToken: "token_123",
      fetch: fetchMock,
    });

    const result = await service.getPhoneStatus({ phoneNumberId: "phone_123" });

    expect(result).toEqual({
      success: true,
      data: {
        id: "phone_123",
        is_on_biz_app: true,
        platform_type: "CLOUD_API",
      },
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v25.0/phone_123?fields=is_on_biz_app%2Cplatform_type",
      {
        method: "GET",
        headers: {
          Authorization: "Bearer token_123",
          "Content-Type": "application/json",
        },
      },
    );
  });

  it("starts contacts sync with smb_app_state_sync", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ success: true, request_id: "req_123" }),
    );
    const service = new CoexistenceService({
      accessToken: "token_123",
      fetch: fetchMock,
    });

    const result = await service.startContactsSync({
      phoneNumberId: "phone_123",
    });

    expect(result.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v25.0/phone_123/smb_app_data",
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token_123",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          sync_type: "smb_app_state_sync",
        }),
      },
    );
  });

  it("starts history sync with history sync_type", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({ success: true, request_id: "req_456" }),
    );
    const service = new CoexistenceService({
      accessToken: "token_123",
      fetch: fetchMock,
    });

    await service.startHistorySync({ phoneNumberId: "phone_123" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v25.0/phone_123/smb_app_data",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          messaging_product: "whatsapp",
          sync_type: "history",
        }),
      }),
    );
  });

  it("subscribes a WABA to the app", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ success: true }));
    const service = new CoexistenceService({
      accessToken: "token_123",
      fetch: fetchMock,
    });

    await service.subscribeWaba({ wabaId: "waba_123" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v25.0/waba_123/subscribed_apps",
      expect.objectContaining({
        method: "POST",
        headers: {
          Authorization: "Bearer token_123",
          "Content-Type": "application/json",
        },
      }),
    );
  });

  it("exchanges an Embedded Signup code with a direct Graph request", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse({
        access_token: "token_456",
        token_type: "bearer",
        expires_in: 3600,
      }),
    );
    const service = new CoexistenceService({
      appId: "app_123",
      appSecret: "secret_123",
      fetch: fetchMock,
    });

    await expect(
      service.exchangeEmbeddedSignupCode({
        code: "code_123",
        redirectUri: "https://example.com/callback",
      }),
    ).resolves.toEqual({
      success: true,
      data: {
        accessToken: "token_456",
        tokenType: "bearer",
        expiresIn: 3600,
        raw: {
          access_token: "token_456",
          token_type: "bearer",
          expires_in: 3600,
        },
      },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v25.0/oauth/access_token?client_id=app_123&client_secret=secret_123&code=code_123&redirect_uri=https%3A%2F%2Fexample.com%2Fcallback",
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  });

  it("returns structured errors for Meta error responses", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        {
          error: {
            message: "Invalid OAuth access token",
            type: "OAuthException",
            code: 190,
          },
        },
        400,
      ),
    );
    const service = new CoexistenceService({
      accessToken: "bad_token",
      fetch: fetchMock,
    });

    await expect(
      service.getPhoneStatus({ phoneNumberId: "phone_123" }),
    ).resolves.toMatchObject({
      success: false,
      error: "Invalid OAuth access token",
      errorCode: 190,
      httpStatus: 400,
    });
  });

  it("uses credential providers for code exchange and token lookup", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ success: true }));
    const service = new CoexistenceService({
      fetch: fetchMock,
      credentialProvider: {
        getAccessToken: async ({ phoneNumberId }) => `token_for_${phoneNumberId}`,
        exchangeEmbeddedSignupCode: async ({ code }) => ({
          accessToken: `exchanged_${code}`,
        }),
      },
    });

    await expect(
      service.exchangeEmbeddedSignupCode({ code: "code_123" }),
    ).resolves.toEqual({
      success: true,
      data: { accessToken: "exchanged_code_123" },
    });

    await service.startHistorySync({ phoneNumberId: "phone_123" });

    expect(fetchMock).toHaveBeenCalledWith(
      "https://graph.facebook.com/v25.0/phone_123/smb_app_data",
      expect.objectContaining({
        headers: {
          Authorization: "Bearer token_for_phone_123",
          "Content-Type": "application/json",
        },
      }),
    );
  });

  describe("token exchange diagnostics", () => {
    const PLANTED_APP_SECRET = "planted_app_secret_value";
    const PLANTED_CODE = "planted_authorization_code";
    const PLANTED_TOKEN = "planted_access_token_value";

    const createExchangeService = (fetchMock: typeof fetch) =>
      new CoexistenceService({
        appId: "app_fake",
        appSecret: PLANTED_APP_SECRET,
        fetch: fetchMock,
      });

    const expectNoSecrets = (value: unknown) => {
      const serialized = JSON.stringify(value);
      expect(serialized).not.toContain(PLANTED_APP_SECRET);
      expect(serialized).not.toContain(PLANTED_CODE);
      expect(serialized).not.toContain(PLANTED_TOKEN);
    };

    it("omits redirect_uri unless the caller passes one", async () => {
      const fetchMock = vi.fn(async (_url: string | URL | Request) =>
        jsonResponse({ access_token: PLANTED_TOKEN }),
      );
      const service = createExchangeService(fetchMock);

      await service.exchangeEmbeddedSignupCode({ code: PLANTED_CODE });

      const calledUrl = new URL(String(fetchMock.mock.calls[0]?.[0]));
      expect(calledUrl.pathname).toBe("/v25.0/oauth/access_token");
      expect([...calledUrl.searchParams.keys()]).toEqual([
        "client_id",
        "client_secret",
        "code",
      ]);
    });

    it("returns safe structured diagnostics for Graph OAuth errors", async () => {
      const graphBody = {
        error: {
          message: "Error validating verification code.",
          type: "OAuthException",
          code: 100,
          error_subcode: 36008,
          fbtrace_id: "fake_trace",
        },
      };
      const service = createExchangeService(vi.fn(async () => jsonResponse(graphBody, 400)));

      const result = await service.exchangeEmbeddedSignupCode({ code: PLANTED_CODE });

      expect(result).toMatchObject({
        success: false,
        httpStatus: 400,
        errorCode: 100,
        errorSubcode: 36008,
        details: graphBody,
        diagnostics: {
          kind: "graph_error",
          httpStatus: 400,
          code: 100,
          subcode: 36008,
          type: "OAuthException",
          fbtraceId: "fake_trace",
          retryable: false,
        },
      });
      expect(JSON.stringify(result.diagnostics)).not.toContain("verification code");
      expectNoSecrets(result);
    });

    it("marks throttling, transient, and server failures as retryable", async () => {
      const cases = [
        jsonResponse({ error: { message: "x", code: 4, type: "OAuthException" } }, 400),
        jsonResponse({ error: { message: "x", code: 190, is_transient: true } }, 400),
        jsonResponse({ error: { message: "x" } }, 500),
        new Response("rate limited", { status: 429 }),
      ];

      for (const response of cases) {
        const service = createExchangeService(vi.fn(async () => response));
        const result = await service.exchangeEmbeddedSignupCode({ code: PLANTED_CODE });
        expect(result.success).toBe(false);
        expect(result.diagnostics?.retryable).toBe(true);
      }
    });

    it("classifies non-JSON error bodies as http_error without echoing the body", async () => {
      const service = createExchangeService(
        vi.fn(async () => new Response(`<html>${PLANTED_CODE}</html>`, { status: 502 })),
      );

      const result = await service.exchangeEmbeddedSignupCode({ code: PLANTED_CODE });

      expect(result).toMatchObject({
        success: false,
        error: "HTTP 502",
        httpStatus: 502,
        diagnostics: { kind: "http_error", httpStatus: 502, retryable: true },
      });
      expectNoSecrets(result);
    });

    it("fails closed when a 200 response has no access token", async () => {
      for (const body of [{}, { access_token: "" }, { access_token: 42 }, null]) {
        const service = createExchangeService(
          vi.fn(async () =>
            body === null
              ? new Response("not json", { status: 200 })
              : jsonResponse(body),
          ),
        );

        const result = await service.exchangeEmbeddedSignupCode({ code: PLANTED_CODE });

        expect(result).toEqual({
          success: false,
          error: "Token exchange response did not include an access token",
          httpStatus: 200,
          diagnostics: {
            kind: "malformed_response",
            httpStatus: 200,
            retryable: false,
          },
        });
      }
    });

    it("redacts the secret and code from network error messages", async () => {
      const service = createExchangeService(
        vi.fn(async (url: string | URL | Request) => {
          throw new TypeError(`request to ${String(url)} failed`);
        }),
      );

      const result = await service.exchangeEmbeddedSignupCode({ code: PLANTED_CODE });

      expect(result).toMatchObject({
        success: false,
        diagnostics: { kind: "network_error", retryable: true },
      });
      expect(result.error).toContain("[REDACTED]");
      expectNoSecrets(result);
    });

    it("keeps caller-defined network error messages that carry no secrets", async () => {
      const service = createExchangeService(
        vi.fn(async () => {
          throw new Error("graph request timed out");
        }),
      );

      const result = await service.exchangeEmbeddedSignupCode({ code: PLANTED_CODE });

      expect(result.error).toBe("graph request timed out");
    });

    it("reports missing configuration and credential provider failures", async () => {
      const unconfigured = new CoexistenceService({ fetch: vi.fn() });
      await expect(
        unconfigured.exchangeEmbeddedSignupCode({ code: PLANTED_CODE }),
      ).resolves.toMatchObject({
        success: false,
        diagnostics: { kind: "configuration_error", retryable: false },
      });

      const provider = new CoexistenceService({
        credentialProvider: {
          getAccessToken: async () => PLANTED_TOKEN,
          exchangeEmbeddedSignupCode: async () => {
            throw new Error("vault unavailable");
          },
        },
      });
      await expect(
        provider.exchangeEmbeddedSignupCode({ code: PLANTED_CODE }),
      ).resolves.toEqual({
        success: false,
        error: "vault unavailable",
        diagnostics: { kind: "credential_provider_error", retryable: false },
      });
    });
  });
  describe("SMB App Data sync request contract", () => {
    type SyncType = "smb_app_state_sync" | "history";

    // Mirrors Meta's documented request: both fields are required, and Graph
    // rejects anything else with an OAuthException code 100.
    const createStrictGraph = () => {
      const requests: { url: string; authorization?: string; body: unknown }[] =
        [];
      const fetchMock = vi.fn(
        async (url: string | URL | Request, init?: RequestInit) => {
          const body = JSON.parse(String(init?.body ?? "{}"));
          const headers = (init?.headers ?? {}) as Record<string, string>;
          requests.push({ url: String(url), authorization: headers.Authorization, body });

          const keys = Object.keys(body).sort();
          const isDocumented =
            keys.join(",") === "messaging_product,sync_type" &&
            body.messaging_product === "whatsapp" &&
            (body.sync_type === "smb_app_state_sync" || body.sync_type === "history");

          if (!isDocumented) {
            return jsonResponse(
              {
                error: {
                  message: "(#100) The parameter messaging_product is required.",
                  type: "OAuthException",
                  code: 100,
                  fbtrace_id: "trace_fake_sync",
                },
              },
              400,
            );
          }

          return jsonResponse({
            messaging_product: "whatsapp",
            request_id: `req_${body.sync_type}`,
          });
        },
      );
      return { fetchMock, requests };
    };

    const documentedBody = (syncType: SyncType) => ({
      messaging_product: "whatsapp",
      sync_type: syncType,
    });

    it("sends the documented contacts and history requests", async () => {
      const { fetchMock, requests } = createStrictGraph();
      const service = new CoexistenceService({
        accessToken: "token_static",
        fetch: fetchMock,
      });

      const contacts = await service.startContactsSync({
        phoneNumberId: "phone_123",
      });
      const history = await service.startHistorySync({
        phoneNumberId: "phone_123",
      });

      expect(contacts).toEqual({
        success: true,
        data: { messaging_product: "whatsapp", request_id: "req_smb_app_state_sync" },
      });
      expect(history).toEqual({
        success: true,
        data: { messaging_product: "whatsapp", request_id: "req_history" },
      });
      expect(requests).toEqual([
        {
          url: "https://graph.facebook.com/v25.0/phone_123/smb_app_data",
          authorization: "Bearer token_static",
          body: documentedBody("smb_app_state_sync"),
        },
        {
          url: "https://graph.facebook.com/v25.0/phone_123/smb_app_data",
          authorization: "Bearer token_static",
          body: documentedBody("history"),
        },
      ]);
    });

    it("sends the documented requests with provider and per-call tokens", async () => {
      const { fetchMock, requests } = createStrictGraph();
      const credentialService = new CoexistenceService({
        fetch: fetchMock,
        credentialProvider: {
          getAccessToken: async ({ phoneNumberId }) => `token_for_${phoneNumberId}`,
          exchangeEmbeddedSignupCode: async () => ({ accessToken: "unused" }),
        },
      });
      const tokenService = new CoexistenceService({
        fetch: fetchMock,
        tokenProvider: {
          getAccessToken: async ({ phoneNumberId }) => `provided_${phoneNumberId}`,
        },
      });

      const results = [
        await credentialService.startContactsSync({ phoneNumberId: "phone_a" }),
        await tokenService.startHistorySync({ phoneNumberId: "phone_b" }),
        await tokenService.startContactsSync({
          phoneNumberId: "phone_c",
          accessToken: "token_explicit",
        }),
      ];

      expect(results.map((result) => result.success)).toEqual([true, true, true]);
      expect(requests.map(({ authorization, body }) => ({ authorization, body }))).toEqual([
        { authorization: "Bearer token_for_phone_a", body: documentedBody("smb_app_state_sync") },
        { authorization: "Bearer provided_phone_b", body: documentedBody("history") },
        { authorization: "Bearer token_explicit", body: documentedBody("smb_app_state_sync") },
      ]);
    });

    it("still reports Graph rejections with safe diagnostics", async () => {
      const fetchMock = vi.fn(async () =>
        jsonResponse(
          {
            error: {
              message: "(#100) Invalid parameter",
              type: "OAuthException",
              code: 100,
              fbtrace_id: "trace_fake_reject",
            },
          },
          400,
        ),
      );
      const service = new CoexistenceService({
        accessToken: "token_static",
        fetch: fetchMock,
      });

      const result = await service.startContactsSync({ phoneNumberId: "phone_123" });

      expect(result).toMatchObject({
        success: false,
        errorCode: 100,
        httpStatus: 400,
        diagnostics: {
          kind: "graph_error",
          httpStatus: 400,
          code: 100,
          type: "OAuthException",
          fbtraceId: "trace_fake_reject",
          retryable: false,
        },
      });
      expect(JSON.stringify(result.diagnostics)).not.toContain("token_static");
    });
  });
});
