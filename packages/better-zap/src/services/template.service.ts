import {
  validateMessageTemplate,
  validateMessageTemplateComponents,
  type MessageTemplateIssue,
} from "../template-validation";
import type { MetaAccessTokenProvider } from "../types/coexistence.types";
import {
  DEFAULT_MESSAGE_TEMPLATE_FIELDS,
  type MessageTemplate,
  type MessageTemplateCategory,
  type MessageTemplateChanges,
  type MessageTemplateDefinition,
  type MessageTemplatePage,
  type MessageTemplateStatus,
  TEMPLATE_HEADER_MEDIA_TYPES,
  type TemplateFailure,
  type TemplateHeaderMediaType,
  type TemplateResult,
} from "../types/template.types";
import { graphRequest, type GraphRequestInput } from "../utils/graph-request";
import { defaultFetch } from "../utils/http";
import { META_API_VERSION, META_BASE_URL } from "./coexistence.service";

const NUMERIC_ID = /^\d+$/;

export interface TemplateServiceConfig {
  /** Token used when a call passes none and no `tokenProvider` is set. */
  accessToken?: string;
  /** Resolves a token per call. Receives the call's `wabaId`. Wins over `accessToken`. */
  tokenProvider?: MetaAccessTokenProvider;
  /** Business account used when a call passes none. */
  wabaId?: string;
  /** Meta app id. Needed only by `uploadHeaderMedia`. */
  appId?: string;
  graphApiVersion?: string;
  graphBaseUrl?: string;
  fetch?: typeof fetch;
}

/** Present on every call. Both override the service config for that call. */
export interface TemplateCallOptions {
  wabaId?: string;
  accessToken?: string;
}

export interface ListMessageTemplatesInput extends TemplateCallOptions {
  status?: MessageTemplateStatus;
  category?: MessageTemplateCategory;
  language?: string;
  name?: string;
  /** Page size. Meta's default applies when omitted. */
  limit?: number;
  after?: string;
  before?: string;
  /** Defaults to `DEFAULT_MESSAGE_TEMPLATE_FIELDS`. */
  fields?: readonly string[];
}

type TemplateRequest = Pick<
  GraphRequestInput,
  "path" | "method" | "query" | "body" | "headers" | "authScheme" | "rawBody"
>;

type MessageTemplateListResponse = {
  data?: unknown;
  paging?: { cursors?: { before?: string; after?: string }; next?: unknown };
};

/**
 * Manages WhatsApp message templates through Meta's Graph API. Never throws:
 * every method returns a `TemplateResult`. Calls are not retried.
 */
export class TemplateService {
  private readonly accessToken?: string;
  private readonly tokenProvider?: MetaAccessTokenProvider;
  private readonly wabaId?: string;
  private readonly appId?: string;
  private readonly graphApiVersion: string;
  private readonly graphBaseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: TemplateServiceConfig = {}) {
    this.accessToken = config.accessToken;
    this.tokenProvider = config.tokenProvider;
    this.wabaId = config.wabaId;
    this.appId = config.appId;
    this.graphApiVersion = config.graphApiVersion ?? META_API_VERSION;
    this.graphBaseUrl = config.graphBaseUrl ?? META_BASE_URL;
    this.fetchImpl = config.fetch ?? defaultFetch;
  }

  /** One page. */
  async list(
    input: ListMessageTemplatesInput = {},
  ): Promise<TemplateResult<MessageTemplatePage>> {
    const wabaId = this.resolveWabaId(input);
    if (typeof wabaId !== "string") return wabaId;

    const query = new URLSearchParams({
      fields: (input.fields ?? DEFAULT_MESSAGE_TEMPLATE_FIELDS).join(","),
    });
    if (input.limit !== undefined) query.set("limit", String(input.limit));
    for (const key of ["after", "before", "status", "category", "language", "name"] as const) {
      const value = input[key];
      if (value !== undefined) query.set(key, value);
    }

    const result = await this.send<MessageTemplateListResponse>(input, wabaId, {
      path: `/${wabaId}/message_templates`,
      method: "GET",
      query,
    });
    if (!result.success) return result;

    const body = result.data ?? {};
    if (!Array.isArray(body.data)) {
      return {
        success: false,
        error: "Template list response did not include a data array",
        diagnostics: { kind: "malformed_response", retryable: false },
      };
    }

    return {
      success: true,
      data: {
        templates: body.data as MessageTemplate[],
        paging: {
          before: body.paging?.cursors?.before,
          after: body.paging?.cursors?.after,
          hasNextPage: typeof body.paging?.next === "string",
        },
      },
    };
  }

  /** Every page, following `after` cursors. Stops after `maxPages` (default 100). */
  async listAll(
    input: Omit<ListMessageTemplatesInput, "after" | "before" | "limit"> & {
      /** Defaults to 100. */
      pageSize?: number;
      maxPages?: number;
    } = {},
  ): Promise<TemplateResult<{ templates: MessageTemplate[]; truncated: boolean }>> {
    const { pageSize = 100, maxPages = 100, ...filters } = input;
    const templates: MessageTemplate[] = [];
    let after: string | undefined;

    for (let page = 0; page < maxPages; page++) {
      const result = await this.list({ ...filters, limit: pageSize, after });
      if (!result.success) return result;

      templates.push(...result.data.templates);
      const { hasNextPage, after: cursor } = result.data.paging;
      if (!hasNextPage || !cursor) {
        return { success: true, data: { templates, truncated: false } };
      }
      after = cursor;
    }

    return { success: true, data: { templates, truncated: true } };
  }

  async get(
    input: TemplateCallOptions & { templateId: string; fields?: readonly string[] },
  ): Promise<TemplateResult<MessageTemplate>> {
    if (!isNumericId(input.templateId)) return invalidId("templateId");

    return this.send(input, input.wabaId ?? this.wabaId, {
      path: `/${input.templateId}`,
      method: "GET",
      query: new URLSearchParams({
        fields: (input.fields ?? DEFAULT_MESSAGE_TEMPLATE_FIELDS).join(","),
      }),
    });
  }

  /** Validates the template first unless `validate` is `false`. */
  async create(
    input: TemplateCallOptions & {
      template: MessageTemplateDefinition;
      /** Defaults to `true`. `false` sends the template without local validation. */
      validate?: boolean;
    },
  ): Promise<
    TemplateResult<{
      id: string;
      status: MessageTemplateStatus;
      category: MessageTemplateCategory | (string & {});
    }>
  > {
    const wabaId = this.resolveWabaId(input);
    if (typeof wabaId !== "string") return wabaId;

    const { template } = input;
    for (const field of ["name", "language", "category"] as const) {
      if (!isNonEmptyString(template?.[field])) {
        return invalidInput(`template.${field} is required`);
      }
    }
    if (!Array.isArray(template.components) || template.components.length === 0) {
      return invalidInput("template.components is required");
    }
    if (input.validate !== false) {
      const issues = validateMessageTemplate(template);
      if (issues.length > 0) return invalidTemplate(issues);
    }

    return this.send(input, wabaId, {
      path: `/${wabaId}/message_templates`,
      method: "POST",
      body: pickDefined(template, [
        "name",
        "language",
        "category",
        "components",
        "parameter_format",
        "allow_category_change",
        "message_send_ttl_seconds",
      ]),
    });
  }

  /** Validates `changes.components`, when given, unless `validate` is `false`. */
  async update(
    input: TemplateCallOptions & {
      templateId: string;
      changes: MessageTemplateChanges;
      /** Defaults to `true`. `false` sends the components without local validation. */
      validate?: boolean;
    },
  ): Promise<TemplateResult<{ success: boolean }>> {
    if (!isNumericId(input.templateId)) return invalidId("templateId");

    const body = pickDefined(input.changes ?? {}, [
      "components",
      "category",
      "message_send_ttl_seconds",
    ]);
    if (Object.keys(body).length === 0) {
      return invalidInput(
        "changes must include components, category or message_send_ttl_seconds",
      );
    }
    if (input.validate !== false && body.components !== undefined) {
      const issues = validateMessageTemplateComponents(body.components, {
        category: body.category,
      });
      if (issues.length > 0) return invalidTemplate(issues);
    }

    return this.send(input, input.wabaId ?? this.wabaId, {
      path: `/${input.templateId}`,
      method: "POST",
      body,
    });
  }

  /** Deletes one language of a template. Needs both the id and the name. */
  async delete(
    input: TemplateCallOptions & { templateId: string; name: string },
  ): Promise<TemplateResult<{ success: boolean }>> {
    const wabaId = this.resolveWabaId(input);
    if (typeof wabaId !== "string") return wabaId;
    if (!isNumericId(input.templateId)) return invalidId("templateId");
    if (!isNonEmptyString(input.name)) return invalidInput("name is required");

    return this.send(input, wabaId, {
      path: `/${wabaId}/message_templates`,
      method: "DELETE",
      query: new URLSearchParams({ hsm_id: input.templateId, name: input.name }),
    });
  }

  /** Deletes the template in every language. */
  async deleteAllLanguages(
    input: TemplateCallOptions & { name: string },
  ): Promise<TemplateResult<{ success: boolean }>> {
    const wabaId = this.resolveWabaId(input);
    if (typeof wabaId !== "string") return wabaId;
    if (!isNonEmptyString(input.name)) return invalidInput("name is required");

    return this.send(input, wabaId, {
      path: `/${wabaId}/message_templates`,
      method: "DELETE",
      query: new URLSearchParams({ name: input.name }),
    });
  }

  /**
   * Uploads a sample file for a media header and returns the handle to put in
   * `example.header_handle`. Makes two requests to Meta.
   */
  async uploadHeaderMedia(
    input: TemplateCallOptions & {
      file: Blob | ArrayBuffer | Uint8Array;
      fileName: string;
      fileType: TemplateHeaderMediaType;
      /** Overrides the service config for this call. */
      appId?: string;
    },
  ): Promise<TemplateResult<{ handle: string }>> {
    const options: Partial<typeof input> = input ?? {};
    const appId = options.appId ?? this.appId;
    if (appId === undefined || appId === null || appId === "") {
      return {
        success: false,
        error: "Missing Meta app id (appId)",
        diagnostics: { kind: "configuration_error", retryable: false },
      };
    }
    if (!isNumericId(appId)) return invalidId("appId");
    if (!(TEMPLATE_HEADER_MEDIA_TYPES as readonly unknown[]).includes(options.fileType)) {
      return invalidInput(
        `fileType must be one of ${TEMPLATE_HEADER_MEDIA_TYPES.join(", ")}`,
      );
    }
    if (!isNonEmptyString(options.fileName)) return invalidInput("fileName is required");

    const { file } = options;
    let fileLength: number;
    if (file instanceof Blob) {
      fileLength = file.size;
    } else if (file instanceof ArrayBuffer || file instanceof Uint8Array) {
      fileLength = file.byteLength;
    } else {
      return invalidInput("file must be a Blob, ArrayBuffer or Uint8Array");
    }
    if (fileLength === 0) return invalidInput("file is empty");

    const token = await this.resolveToken(options, options.wabaId ?? this.wabaId);
    if (!token.success) return token;

    const session = await this.request<{ id?: unknown } | null>(token.data, {
      path: `/${appId}/uploads`,
      method: "POST",
      query: new URLSearchParams({
        file_name: options.fileName,
        file_length: String(fileLength),
        file_type: options.fileType as TemplateHeaderMediaType,
      }),
    });
    if (!session.success) return session;

    // The id can carry a query string (`upload:<SESSION>?sig=...`), which
    // becomes the query of the upload request.
    const sessionId = session.data?.id;
    if (
      typeof sessionId !== "string" ||
      !sessionId.startsWith("upload:") ||
      /\s/.test(sessionId)
    ) {
      return malformedResponse("Upload session response did not include a session id");
    }

    const upload = await this.request<{ h?: unknown } | null>(token.data, {
      path: `/${sessionId}`,
      method: "POST",
      authScheme: "OAuth",
      headers: { file_offset: "0" },
      // DOM typings reject a `Uint8Array` over an `ArrayBufferLike`; fetch takes it.
      rawBody: file as BodyInit,
    });
    if (!upload.success) return upload;

    const handle = upload.data?.h;
    if (!isNonEmptyString(handle)) {
      return malformedResponse("Upload response did not include a file handle");
    }

    return { success: true, data: { handle } };
  }

  /** Returns the numeric business account id, or the failure to return instead. */
  private resolveWabaId(input: TemplateCallOptions): string | TemplateFailure {
    const wabaId = input.wabaId ?? this.wabaId;
    if (!wabaId) {
      return {
        success: false,
        error: "Missing WhatsApp Business Account ID (wabaId)",
        diagnostics: { kind: "configuration_error", retryable: false },
      };
    }

    return isNumericId(wabaId) ? wabaId : invalidId("wabaId");
  }

  /** Resolves the token for this call, then sends the request. */
  private async send<TData>(
    input: TemplateCallOptions,
    wabaId: string | undefined,
    request: TemplateRequest,
  ): Promise<TemplateResult<TData>> {
    const token = await this.resolveToken(input, wabaId);
    if (!token.success) return token;

    return this.request(token.data, request);
  }

  /** `accessToken` on the call, then `tokenProvider`, then the configured token. */
  private async resolveToken(
    input: TemplateCallOptions,
    wabaId: string | undefined,
  ): Promise<TemplateResult<string | undefined>> {
    if (input.accessToken !== undefined || !this.tokenProvider) {
      return { success: true, data: input.accessToken ?? this.accessToken };
    }

    try {
      return {
        success: true,
        data: await this.tokenProvider.getAccessToken({ wabaId }),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Access token lookup failed",
        diagnostics: { kind: "credential_provider_error", retryable: false },
      };
    }
  }

  private async request<TData>(
    token: string | undefined,
    request: TemplateRequest,
  ): Promise<TemplateResult<TData>> {
    const result = await graphRequest<TData>({
      fetch: this.fetchImpl,
      baseUrl: this.graphBaseUrl,
      apiVersion: this.graphApiVersion,
      ...request,
      token,
    });

    return result.success ? { success: true, data: result.data } : result;
  }
}

function isNumericId(value: unknown): value is string {
  return typeof value === "string" && NUMERIC_ID.test(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function invalidId(field: "wabaId" | "templateId" | "appId"): TemplateFailure {
  return invalidInput(`${field} must be a numeric id`);
}

function invalidInput(error: string): TemplateFailure {
  return {
    success: false,
    error,
    diagnostics: { kind: "invalid_input", retryable: false },
  };
}

function malformedResponse(error: string): TemplateFailure {
  return {
    success: false,
    error,
    diagnostics: { kind: "malformed_response", retryable: false },
  };
}

function invalidTemplate(issues: MessageTemplateIssue[]): TemplateFailure {
  return { ...invalidInput(`Invalid template: ${issues[0]!.message}`), issues };
}

/** Copies only the listed keys, leaving out the ones that are `undefined`. */
function pickDefined<T extends object, K extends keyof T>(
  source: T,
  keys: readonly K[],
): Partial<Pick<T, K>> {
  const picked: Partial<Pick<T, K>> = {};
  for (const key of keys) {
    if (source[key] !== undefined) picked[key] = source[key];
  }
  return picked;
}
