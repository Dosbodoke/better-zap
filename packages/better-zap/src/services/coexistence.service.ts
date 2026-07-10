import type {
  CoexistenceCredentialProvider,
  CoexistenceGraphResult,
  CoexistencePhoneStatusResponse,
  CoexistenceSyncResponse,
  CoexistenceTokenExchangeResult,
  MetaAccessTokenProvider,
  MetaGraphApiErrorBody,
} from "../types/coexistence.types";

const META_API_VERSION = "v25.0";
const META_BASE_URL = "https://graph.facebook.com";

export interface CoexistenceServiceConfig {
  accessToken?: string;
  appId?: string;
  appSecret?: string;
  graphApiVersion?: string;
  graphBaseUrl?: string;
  fetch?: typeof fetch;
  tokenProvider?: MetaAccessTokenProvider;
  credentialProvider?: CoexistenceCredentialProvider;
}

export class CoexistenceService {
  private readonly accessToken?: string;
  private readonly appId?: string;
  private readonly appSecret?: string;
  private readonly graphApiVersion: string;
  private readonly graphBaseUrl: string;
  private readonly fetchImpl: typeof fetch;
  private readonly tokenProvider?: MetaAccessTokenProvider;
  private readonly credentialProvider?: CoexistenceCredentialProvider;

  constructor(config: CoexistenceServiceConfig) {
    this.accessToken = config.accessToken;
    this.appId = config.appId;
    this.appSecret = config.appSecret;
    this.graphApiVersion = config.graphApiVersion ?? META_API_VERSION;
    this.graphBaseUrl = config.graphBaseUrl ?? META_BASE_URL;
    this.fetchImpl = config.fetch ?? fetch;
    this.tokenProvider = config.tokenProvider ?? config.credentialProvider;
    this.credentialProvider = config.credentialProvider;
  }

  async exchangeEmbeddedSignupCode(input: {
    code: string;
    redirectUri?: string;
  }): Promise<CoexistenceGraphResult<CoexistenceTokenExchangeResult>> {
    if (this.credentialProvider) {
      try {
        const data = await this.credentialProvider.exchangeEmbeddedSignupCode(input);
        return { success: true, data };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Token exchange failed",
        };
      }
    }

    if (!this.appId || !this.appSecret) {
      return {
        success: false,
        error:
          "appId and appSecret are required when no credentialProvider is configured",
      };
    }

    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      code: input.code,
    });

    if (input.redirectUri) {
      params.set("redirect_uri", input.redirectUri);
    }

    const result = await this.request<{
      access_token: string;
      token_type?: string;
      expires_in?: number;
    }>({
      path: "/oauth/access_token",
      method: "GET",
      query: params,
      token: null,
    });

    if (!result.success || !result.data) {
      return {
        success: false,
        error: result.error,
        errorCode: result.errorCode,
        httpStatus: result.httpStatus,
        details: result.details,
      };
    }

    return {
      success: true,
      data: {
        accessToken: result.data.access_token,
        tokenType: result.data.token_type,
        expiresIn: result.data.expires_in,
        raw: result.data,
      },
    };
  }

  async subscribeWaba(input: {
    wabaId: string;
    accessToken?: string;
  }): Promise<CoexistenceGraphResult<{ success?: boolean }>> {
    return this.request({
      path: `/${input.wabaId}/subscribed_apps`,
      method: "POST",
      token: input.accessToken ?? (await this.resolveAccessToken({ wabaId: input.wabaId })),
    });
  }

  async getPhoneStatus(input: {
    phoneNumberId: string;
    accessToken?: string;
  }): Promise<CoexistenceGraphResult<CoexistencePhoneStatusResponse>> {
    return this.request({
      path: `/${input.phoneNumberId}`,
      method: "GET",
      query: new URLSearchParams({
        fields: "is_on_biz_app,platform_type",
      }),
      token:
        input.accessToken ??
        (await this.resolveAccessToken({ phoneNumberId: input.phoneNumberId })),
    });
  }

  async startContactsSync(input: {
    phoneNumberId: string;
    accessToken?: string;
  }): Promise<CoexistenceGraphResult<CoexistenceSyncResponse>> {
    return this.startSmbAppDataSync({
      phoneNumberId: input.phoneNumberId,
      accessToken: input.accessToken,
      syncType: "smb_app_state_sync",
    });
  }

  async startHistorySync(input: {
    phoneNumberId: string;
    accessToken?: string;
  }): Promise<CoexistenceGraphResult<CoexistenceSyncResponse>> {
    return this.startSmbAppDataSync({
      phoneNumberId: input.phoneNumberId,
      accessToken: input.accessToken,
      syncType: "history",
    });
  }

  private async startSmbAppDataSync(input: {
    phoneNumberId: string;
    syncType: "smb_app_state_sync" | "history";
    accessToken?: string;
  }): Promise<CoexistenceGraphResult<CoexistenceSyncResponse>> {
    return this.request({
      path: `/${input.phoneNumberId}/smb_app_data`,
      method: "POST",
      body: { sync_type: input.syncType },
      token:
        input.accessToken ??
        (await this.resolveAccessToken({ phoneNumberId: input.phoneNumberId })),
    });
  }

  private async resolveAccessToken(input: {
    wabaId?: string;
    phoneNumberId?: string;
    accountId?: string;
  }): Promise<string | undefined> {
    if (this.tokenProvider) {
      return this.tokenProvider.getAccessToken(input);
    }

    return this.accessToken;
  }

  private async request<TData>(input: {
    path: string;
    method: "GET" | "POST";
    query?: URLSearchParams;
    body?: unknown;
    token?: string | null;
  }): Promise<CoexistenceGraphResult<TData>> {
    if (input.token === undefined) {
      return { success: false, error: "Missing Meta access token" };
    }

    const url = new URL(
      `${this.graphBaseUrl}/${this.graphApiVersion}${input.path}`,
    );

    if (input.query) {
      input.query.forEach((value, key) => url.searchParams.set(key, value));
    }

    try {
      const response = await this.fetchImpl(url.toString(), {
        method: input.method,
        headers: {
          "Content-Type": "application/json",
          ...(input.token ? { Authorization: `Bearer ${input.token}` } : {}),
        },
        ...(input.body ? { body: JSON.stringify(input.body) } : {}),
      });

      let data: unknown = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        const errorData = data as Partial<MetaGraphApiErrorBody> | null;
        return {
          success: false,
          error: errorData?.error?.message ?? `HTTP ${response.status}`,
          errorCode: errorData?.error?.code,
          httpStatus: response.status,
          details: data,
        };
      }

      return { success: true, data: data as TData };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Network error",
      };
    }
  }
}
