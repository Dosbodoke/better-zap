import type {
  CoexistenceCredentialProvider,
  CoexistenceGraphResult,
  CoexistencePhoneStatusResponse,
  CoexistenceSyncResponse,
  CoexistenceTokenExchangeResult,
  MetaAccessTokenProvider,
  MetaGraphApiErrorBody,
} from "../types/coexistence.types";
import { graphRequest, redactSecrets } from "../utils/graph-request";
import { defaultFetch } from "../utils/http";

export const META_API_VERSION = "v25.0";
export const META_BASE_URL = "https://graph.facebook.com";

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
    this.fetchImpl = config.fetch ?? defaultFetch;
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
          error: redactSecrets(
            error instanceof Error ? error.message : "Token exchange failed",
            [input.code],
          ),
          diagnostics: { kind: "credential_provider_error", retryable: false },
        };
      }
    }

    if (!this.appId || !this.appSecret) {
      return {
        success: false,
        error:
          "appId and appSecret are required when no credentialProvider is configured",
        diagnostics: { kind: "configuration_error", retryable: false },
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
      secrets: [this.appSecret, input.code],
      includeHttpStatus: true,
    });

    if (!result.success) {
      return result as CoexistenceGraphResult<never>;
    }

    if (
      typeof result.data?.access_token !== "string" ||
      result.data.access_token.length === 0
    ) {
      return {
        success: false,
        error: "Token exchange response did not include an access token",
        httpStatus: result.httpStatus,
        diagnostics: {
          kind: "malformed_response",
          httpStatus: result.httpStatus,
          retryable: false,
        },
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
      body: { messaging_product: "whatsapp", sync_type: input.syncType },
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
    /** Values that must never appear in a returned error string. */
    secrets?: Array<string | undefined>;
    includeHttpStatus?: boolean;
  }): Promise<CoexistenceGraphResult<TData>> {
    return graphRequest<TData>({
      fetch: this.fetchImpl,
      baseUrl: this.graphBaseUrl,
      apiVersion: this.graphApiVersion,
      ...input,
    });
  }
}
