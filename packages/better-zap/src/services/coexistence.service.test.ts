import { describe, expect, it, vi } from "vitest";
import { CoexistenceService } from "./coexistence.service";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("CoexistenceService", () => {
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
        body: JSON.stringify({ sync_type: "smb_app_state_sync" }),
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
        body: JSON.stringify({ sync_type: "history" }),
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
});
