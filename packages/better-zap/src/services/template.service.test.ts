import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_MESSAGE_TEMPLATE_FIELDS,
  type MessageTemplate,
  type MessageTemplateDefinition,
} from "../types/template.types";
import { TemplateService } from "./template.service";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const template: MessageTemplate = {
  id: "222",
  name: "order_confirmation",
  language: "en_US",
  status: "APPROVED",
  category: "UTILITY",
  components: [
    {
      type: "BODY",
      text: "Order {{1}} confirmed.",
      example: { body_text: [["A-100"]] },
    },
  ],
};

const definition: MessageTemplateDefinition = {
  name: "order_confirmation",
  language: "en_US",
  category: "UTILITY",
  components: [
    {
      type: "BODY",
      text: "Order {{1}} confirmed.",
      example: { body_text: [["A-100"]] },
    },
  ],
};

function setup(responses: Response[] = [jsonResponse({ success: true })]) {
  const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => {
    return responses.length > 1 ? responses.shift()! : responses[0]!.clone();
  });
  const service = new TemplateService({
    accessToken: "token_1",
    wabaId: "111",
    fetch: fetchMock as unknown as typeof fetch,
  });
  return { fetchMock, service };
}

function callUrl(fetchMock: ReturnType<typeof setup>["fetchMock"], index = 0) {
  return new URL(fetchMock.mock.calls[index]![0]);
}

function callInit(fetchMock: ReturnType<typeof setup>["fetchMock"], index = 0) {
  return fetchMock.mock.calls[index]![1]!;
}

function callBody(fetchMock: ReturnType<typeof setup>["fetchMock"], index = 0) {
  return JSON.parse(callInit(fetchMock, index).body as string);
}

describe("TemplateService", () => {
  it("lists one page with the default fields and maps the paging", async () => {
    const { fetchMock, service } = setup([
      jsonResponse({
        data: [template],
        paging: { cursors: { after: "A" }, next: "https://x" },
      }),
    ]);

    const result = await service.list();

    const url = callUrl(fetchMock);
    expect(url.pathname).toBe("/v25.0/111/message_templates");
    expect(url.searchParams.get("fields")).toBe(DEFAULT_MESSAGE_TEMPLATE_FIELDS.join(","));
    expect(url.searchParams.has("limit")).toBe(false);
    expect(callInit(fetchMock)).toMatchObject({
      method: "GET",
      headers: { Authorization: "Bearer token_1" },
    });
    expect(result).toEqual({
      success: true,
      data: {
        templates: [template],
        paging: { after: "A", before: undefined, hasNextPage: true },
      },
    });
  });

  it("forwards list filters as query parameters", async () => {
    const { fetchMock, service } = setup([jsonResponse({ data: [] })]);

    await service.list({
      status: "APPROVED",
      category: "UTILITY",
      language: "pt_BR",
      name: "order_confirmation",
      limit: 25,
      after: "A",
    });

    const params = callUrl(fetchMock).searchParams;
    expect(params.get("status")).toBe("APPROVED");
    expect(params.get("category")).toBe("UTILITY");
    expect(params.get("language")).toBe("pt_BR");
    expect(params.get("name")).toBe("order_confirmation");
    expect(params.get("limit")).toBe("25");
    expect(params.get("after")).toBe("A");
    expect(params.has("before")).toBe(false);
  });

  it("returns malformed_response when the list body has no data array", async () => {
    const { service } = setup([jsonResponse({ paging: {} })]);

    const result = await service.list();

    expect(result).toEqual({
      success: false,
      error: "Template list response did not include a data array",
      diagnostics: { kind: "malformed_response", retryable: false },
    });
  });

  it("lists every page by following the after cursor", async () => {
    const second = { ...template, id: "333" };
    const { fetchMock, service } = setup([
      jsonResponse({ data: [template], paging: { cursors: { after: "A" }, next: "https://x" } }),
      jsonResponse({ data: [second], paging: { cursors: { after: "B" } } }),
    ]);

    const result = await service.listAll();

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(callUrl(fetchMock, 0).searchParams.get("limit")).toBe("100");
    expect(callUrl(fetchMock, 0).searchParams.has("after")).toBe(false);
    expect(callUrl(fetchMock, 1).searchParams.get("after")).toBe("A");
    expect(result).toEqual({
      success: true,
      data: { templates: [template, second], truncated: false },
    });
  });

  it("stops listing after maxPages and reports truncated", async () => {
    const { fetchMock, service } = setup([
      jsonResponse({ data: [template], paging: { cursors: { after: "A" }, next: "https://x" } }),
    ]);

    const result = await service.listAll({ maxPages: 1 });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result).toEqual({
      success: true,
      data: { templates: [template], truncated: true },
    });
  });

  it("returns the failure when a later page fails", async () => {
    const { service } = setup([
      jsonResponse({ data: [template], paging: { cursors: { after: "A" }, next: "https://x" } }),
      jsonResponse({ error: { message: "Service unavailable", code: 2 } }, 503),
    ]);

    const result = await service.listAll();

    expect(result).toMatchObject({
      success: false,
      error: "Service unavailable",
      diagnostics: { kind: "graph_error", retryable: true },
    });
  });

  it("gets a template by id with fields", async () => {
    const { fetchMock, service } = setup([jsonResponse(template)]);

    const result = await service.get({ templateId: "222" });

    const url = callUrl(fetchMock);
    expect(url.pathname).toBe("/v25.0/222");
    expect(url.searchParams.get("fields")).toBe(DEFAULT_MESSAGE_TEMPLATE_FIELDS.join(","));
    expect(result).toEqual({ success: true, data: template });
  });

  it("creates a template with only the whitelisted keys", async () => {
    const { fetchMock, service } = setup([
      jsonResponse({ id: "999", status: "PENDING", category: "UTILITY" }),
    ]);

    await service.create({
      template: {
        ...definition,
        id: "999",
        status: "APPROVED",
      } as MessageTemplateDefinition,
    });

    expect(callUrl(fetchMock).pathname).toBe("/v25.0/111/message_templates");
    expect(callInit(fetchMock).method).toBe("POST");
    expect(callBody(fetchMock)).toEqual(definition);
  });

  it("returns Meta's create response as data", async () => {
    const { service } = setup([
      jsonResponse({ id: "999", status: "PENDING", category: "UTILITY" }),
    ]);

    const result = await service.create({ template: definition });

    expect(result).toEqual({
      success: true,
      data: { id: "999", status: "PENDING", category: "UTILITY" },
    });
  });

  it("rejects a create without a name before calling Meta", async () => {
    const { fetchMock, service } = setup();

    const result = await service.create({ template: { ...definition, name: "" } });

    expect(result).toEqual({
      success: false,
      error: "template.name is required",
      diagnostics: { kind: "invalid_input", retryable: false },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("updates a template with only the whitelisted keys", async () => {
    const { fetchMock, service } = setup();

    const result = await service.update({
      templateId: "222",
      changes: { ...template, message_send_ttl_seconds: 600 } as never,
    });

    expect(callUrl(fetchMock).pathname).toBe("/v25.0/222");
    expect(callInit(fetchMock).method).toBe("POST");
    expect(callBody(fetchMock)).toEqual({
      components: template.components,
      category: "UTILITY",
      message_send_ttl_seconds: 600,
    });
    expect(result).toEqual({ success: true, data: { success: true } });
  });

  it("rejects an update without changes before calling Meta", async () => {
    const { fetchMock, service } = setup();

    const result = await service.update({ templateId: "222", changes: {} });

    expect(result).toEqual({
      success: false,
      error: "changes must include components, category or message_send_ttl_seconds",
      diagnostics: { kind: "invalid_input", retryable: false },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a create that fails validation before calling Meta", async () => {
    const { fetchMock, service } = setup();

    const result = await service.create({
      template: { ...definition, components: [{ type: "BODY", text: "x".repeat(1025) }] },
    });

    expect(result).toMatchObject({
      success: false,
      error: "Invalid template: Body text is 1025 characters; the limit is 1024.",
      diagnostics: { kind: "invalid_input", retryable: false },
      issues: [expect.objectContaining({ code: "body_text_too_long" })],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips create validation when validate is false", async () => {
    const { fetchMock, service } = setup([
      jsonResponse({ id: "999", status: "PENDING", category: "UTILITY" }),
    ]);

    const result = await service.create({
      template: { ...definition, components: [{ type: "BODY", text: "x".repeat(1025) }] },
      validate: false,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(result.success).toBe(true);
  });

  it("rejects updated components that fail validation before calling Meta", async () => {
    const { fetchMock, service } = setup();

    const result = await service.update({
      templateId: "222",
      changes: { components: [{ type: "FOOTER", text: "Thanks" }] },
    });

    expect(result).toMatchObject({
      success: false,
      diagnostics: { kind: "invalid_input", retryable: false },
      issues: [expect.objectContaining({ code: "components_missing_body" })],
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not validate an update without components", async () => {
    const { fetchMock, service } = setup();

    const result = await service.update({
      templateId: "222",
      changes: { category: "MARKETING" },
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    expect(callBody(fetchMock)).toEqual({ category: "MARKETING" });
    expect(result).toEqual({ success: true, data: { success: true } });
  });

  it("skips update validation when validate is false", async () => {
    const { fetchMock, service } = setup();

    await service.update({
      templateId: "222",
      changes: { components: [{ type: "FOOTER", text: "Thanks" }] },
      validate: false,
    });

    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("deletes one language by id and name", async () => {
    const { fetchMock, service } = setup();

    await service.delete({ templateId: "222", name: "order_confirmation" });

    const url = callUrl(fetchMock);
    expect(callInit(fetchMock).method).toBe("DELETE");
    expect(url.pathname).toBe("/v25.0/111/message_templates");
    expect(url.searchParams.get("hsm_id")).toBe("222");
    expect(url.searchParams.get("name")).toBe("order_confirmation");
  });

  it("deletes every language by name", async () => {
    const { fetchMock, service } = setup();

    await service.deleteAllLanguages({ name: "order_confirmation" });

    const url = callUrl(fetchMock);
    expect(callInit(fetchMock).method).toBe("DELETE");
    expect(url.pathname).toBe("/v25.0/111/message_templates");
    expect(url.searchParams.get("name")).toBe("order_confirmation");
    expect(url.searchParams.has("hsm_id")).toBe(false);
  });

  it("lets a call override the configured wabaId and accessToken", async () => {
    const { fetchMock, service } = setup([jsonResponse({ data: [] })]);

    await service.list({ wabaId: "444", accessToken: "token_2" });

    expect(callUrl(fetchMock).pathname).toBe("/v25.0/444/message_templates");
    expect(callInit(fetchMock).headers).toMatchObject({
      Authorization: "Bearer token_2",
    });
  });

  it("resolves the token through the tokenProvider", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ data: [] }));
    const getAccessToken = vi.fn(async () => "provider_token");
    const service = new TemplateService({
      wabaId: "111",
      tokenProvider: { getAccessToken },
      fetch: fetchMock,
    });

    await service.list();

    expect(getAccessToken).toHaveBeenCalledWith({ wabaId: "111" });
    expect(fetchMock.mock.calls[0]).toMatchObject([
      expect.any(String),
      { headers: { Authorization: "Bearer provider_token" } },
    ]);

    getAccessToken.mockRejectedValueOnce(new Error("Vault unavailable"));
    fetchMock.mockClear();

    const failure = await service.list();

    expect(failure).toEqual({
      success: false,
      error: "Vault unavailable",
      diagnostics: { kind: "credential_provider_error", retryable: false },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("fails with a configuration error when no wabaId is set", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ data: [] }));
    const service = new TemplateService({ accessToken: "token_1", fetch: fetchMock });

    const result = await service.list();

    expect(result).toEqual({
      success: false,
      error: "Missing WhatsApp Business Account ID (wabaId)",
      diagnostics: { kind: "configuration_error", retryable: false },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects ids that are not numeric before calling Meta", async () => {
    const { fetchMock, service } = setup();

    const byTemplate = await service.get({ templateId: "22/../33" });
    const byWaba = await service.list({ wabaId: "abc" });

    expect(byTemplate).toEqual({
      success: false,
      error: "templateId must be a numeric id",
      diagnostics: { kind: "invalid_input", retryable: false },
    });
    expect(byWaba).toEqual({
      success: false,
      error: "wabaId must be a numeric id",
      diagnostics: { kind: "invalid_input", retryable: false },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns Meta's error codes and user-facing text", async () => {
    const { service } = setup([
      jsonResponse(
        {
          error: {
            message: "Invalid parameter",
            code: 100,
            error_subcode: 2388024,
            error_user_title: "Content in This Language Already Exists",
            error_user_msg: "There is already English (US) content for this template.",
          },
        },
        400,
      ),
    ]);

    const result = await service.create({ template: definition });

    expect(result).toMatchObject({
      success: false,
      error: "Invalid parameter",
      errorCode: 100,
      errorSubcode: 2388024,
      errorUserTitle: "Content in This Language Already Exists",
      errorUserMessage: "There is already English (US) content for this template.",
      httpStatus: 400,
      diagnostics: { kind: "graph_error", code: 100, subcode: 2388024 },
    });
  });

  it("removes the access token from a Meta error that echoes it", async () => {
    const { service } = setup([
      jsonResponse(
        {
          error: {
            message: "Malformed access token token_1",
            code: 190,
            error_user_msg: "Check token_1",
          },
        },
        400,
      ),
    ]);

    const result = await service.list();

    expect(result).toMatchObject({
      success: false,
      error: "Malformed access token [REDACTED]",
      errorCode: 190,
      errorUserMessage: "Check [REDACTED]",
    });
    expect(JSON.stringify(result)).not.toContain("token_1");
  });

  it("keeps the error code and retry flag when a secret also matches other text", async () => {
    const fetchMock = vi.fn(async () =>
      jsonResponse(
        { error: { message: "Invalid 1", code: 190, is_transient: true } },
        400,
      ),
    );
    const service = new TemplateService({
      accessToken: "1",
      wabaId: "111",
      fetch: fetchMock as unknown as typeof fetch,
    });

    const result = await service.list();

    expect(result).toMatchObject({
      success: false,
      error: "Invalid [REDACTED]",
      errorCode: 190,
      details: { error: { message: "Invalid [REDACTED]", code: 190, is_transient: true } },
      diagnostics: { kind: "graph_error", code: 190, retryable: true },
    });
  });
});

describe("TemplateService.uploadHeaderMedia", () => {
  function setupUpload(responses: Response[]) {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => responses.shift()!);
    const service = new TemplateService({
      accessToken: "token_1",
      appId: "999",
      fetch: fetchMock as unknown as typeof fetch,
    });
    return { fetchMock, service };
  }

  const png = { fileName: "a.png", fileType: "image/png" } as const;

  it("starts a session, uploads the bytes and returns the handle", async () => {
    const { fetchMock, service } = setupUpload([
      jsonResponse({ id: "upload:abc?sig=xyz" }),
      jsonResponse({ h: "4::handle" }),
    ]);
    const file = new Uint8Array([1, 2, 3]);

    const result = await service.uploadHeaderMedia({ ...png, file });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const sessionUrl = new URL(fetchMock.mock.calls[0]![0]);
    expect(sessionUrl.pathname).toBe("/v25.0/999/uploads");
    expect(Object.fromEntries(sessionUrl.searchParams)).toEqual({
      file_name: "a.png",
      file_length: "3",
      file_type: "image/png",
    });
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({
      method: "POST",
      headers: { Authorization: "Bearer token_1" },
    });

    const uploadUrl = new URL(fetchMock.mock.calls[1]![0]);
    expect(uploadUrl.pathname).toBe("/v25.0/upload:abc");
    expect(uploadUrl.searchParams.get("sig")).toBe("xyz");
    const uploadInit = fetchMock.mock.calls[1]![1]!;
    expect(uploadInit.method).toBe("POST");
    expect(uploadInit.headers).toEqual({
      Authorization: "OAuth token_1",
      file_offset: "0",
    });
    expect(uploadInit.body).toBe(file);

    expect(result).toEqual({ success: true, data: { handle: "4::handle" } });
  });

  it("accepts a Blob and sends its size as file_length", async () => {
    const { fetchMock, service } = setupUpload([
      jsonResponse({ id: "upload:abc" }),
      jsonResponse({ h: "4::handle" }),
    ]);
    const file = new Blob([new Uint8Array(5)], { type: "image/png" });

    const result = await service.uploadHeaderMedia({ ...png, file });

    expect(result.success).toBe(true);
    expect(new URL(fetchMock.mock.calls[0]![0]).searchParams.get("file_length")).toBe("5");
    expect(fetchMock.mock.calls[1]![1]!.body).toBe(file);
  });

  it("fails with a configuration error when no appId is set", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}));
    const service = new TemplateService({ accessToken: "token_1", fetch: fetchMock });

    const result = await service.uploadHeaderMedia({ ...png, file: new Uint8Array([1]) });

    expect(result).toEqual({
      success: false,
      error: "Missing Meta app id (appId)",
      diagnostics: { kind: "configuration_error", retryable: false },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a file type Meta does not accept before calling Meta", async () => {
    const { fetchMock, service } = setupUpload([]);

    const result = await service.uploadHeaderMedia({
      file: new Uint8Array([1]),
      fileName: "a.gif",
      fileType: "image/gif" as "image/png",
    });

    expect(result).toEqual({
      success: false,
      error:
        "fileType must be one of image/jpeg, image/jpg, image/png, video/mp4, application/pdf",
      diagnostics: { kind: "invalid_input", retryable: false },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an empty file before calling Meta", async () => {
    const { fetchMock, service } = setupUpload([]);

    const result = await service.uploadHeaderMedia({ ...png, file: new Uint8Array() });

    expect(result).toEqual({
      success: false,
      error: "file is empty",
      diagnostics: { kind: "invalid_input", retryable: false },
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects untyped input before calling Meta without throwing", async () => {
    const { fetchMock, service } = setupUpload([]);
    const upload = (input: Record<string, unknown>) =>
      service.uploadHeaderMedia({
        ...png,
        file: new Uint8Array([1]),
        ...input,
      } as Parameters<TemplateService["uploadHeaderMedia"]>[0]);
    const hostile = { toString: null };

    for (const file of [undefined, null, "abc", { size: 3 }, hostile]) {
      expect(await upload({ file })).toMatchObject({
        error: "file must be a Blob, ArrayBuffer or Uint8Array",
        diagnostics: { kind: "invalid_input" },
      });
    }
    for (const fileName of [undefined, "", 42, hostile]) {
      expect(await upload({ fileName })).toMatchObject({
        error: "fileName is required",
        diagnostics: { kind: "invalid_input" },
      });
    }
    for (const appId of [999, "99/../uploads", hostile]) {
      expect(await upload({ appId })).toMatchObject({
        error: "appId must be a numeric id",
        diagnostics: { kind: "invalid_input" },
      });
    }
    expect(await upload({ fileType: hostile })).toMatchObject({
      diagnostics: { kind: "invalid_input" },
    });
    expect(
      await service.uploadHeaderMedia(
        undefined as unknown as Parameters<TemplateService["uploadHeaderMedia"]>[0],
      ),
    ).toMatchObject({ diagnostics: { kind: "invalid_input" } });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns malformed_response when the session has no usable id", async () => {
    for (const body of [{}, { id: "abc" }, { id: "upload:a b" }]) {
      const { fetchMock, service } = setupUpload([jsonResponse(body)]);

      const result = await service.uploadHeaderMedia({ ...png, file: new Uint8Array([1]) });

      expect(result).toEqual({
        success: false,
        error: "Upload session response did not include a session id",
        diagnostics: { kind: "malformed_response", retryable: false },
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    }
  });

  it("returns the failure when starting the session fails", async () => {
    const { fetchMock, service } = setupUpload([
      jsonResponse({ error: { message: "Invalid OAuth access token", code: 190 } }, 401),
    ]);

    const result = await service.uploadHeaderMedia({ ...png, file: new Uint8Array([1]) });

    expect(result).toMatchObject({
      success: false,
      error: "Invalid OAuth access token",
      errorCode: 190,
      httpStatus: 401,
      diagnostics: { kind: "graph_error", code: 190 },
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("returns malformed_response when the upload has no handle", async () => {
    const { fetchMock, service } = setupUpload([
      jsonResponse({ id: "upload:abc" }),
      jsonResponse({}),
    ]);

    const result = await service.uploadHeaderMedia({ ...png, file: new Uint8Array([1]) });

    expect(result).toEqual({
      success: false,
      error: "Upload response did not include a file handle",
      diagnostics: { kind: "malformed_response", retryable: false },
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("lets a call override the configured appId", async () => {
    const { fetchMock, service } = setupUpload([
      jsonResponse({ id: "upload:abc" }),
      jsonResponse({ h: "4::handle" }),
    ]);

    await service.uploadHeaderMedia({ ...png, file: new Uint8Array([1]), appId: "777" });

    expect(new URL(fetchMock.mock.calls[0]![0]).pathname).toBe("/v25.0/777/uploads");
  });
});
