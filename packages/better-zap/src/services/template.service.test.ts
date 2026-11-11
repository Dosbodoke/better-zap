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
});
