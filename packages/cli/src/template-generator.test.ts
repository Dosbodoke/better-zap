import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildTemplateRegistry,
  generateTemplateRegistryFileContent,
  normalizeMetaTemplates,
  resolveGenerateOptions,
  runGenerateCommand,
  writeGeneratedTemplateFile,
} from "./template-generator";

const bodyTemplate = (
  name: string,
  language: string,
  extra: { status?: string; text?: string } = {},
) => ({
  name,
  language,
  ...(extra.status ? { status: extra.status } : {}),
  components: [{ type: "BODY", text: extra.text ?? "Hello {{1}}" }],
});

describe("template generator CLI helpers", () => {
  it("normalizes Meta templates into the Better Zap registry format", () => {
    const registry = normalizeMetaTemplates([
      {
        name: "convite_evento_v1",
        language: "pt_BR",
        components: [
          {
            type: "HEADER",
            format: "LOCATION",
          },
          {
            type: "BODY",
            text: "Ola {{1}}, evento em {{2}}",
          },
          {
            type: "BUTTONS",
            buttons: [
              {
                type: "QUICK_REPLY",
                text: "Sair",
              },
              {
                type: "URL",
                url: "https://example.com/{{token}}",
              },
            ],
          },
        ],
      },
    ]);

    expect(registry).toEqual({
      convite_evento_v1: {
        language: "pt_BR",
        components: [
          {
            type: "header",
            parameters: [{ name: "header_location", type: "location" }],
          },
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
            index: "0",
            parameters: [{ name: "button_0_payload", type: "payload" }],
          },
          {
            type: "button",
            subType: "url",
            index: "1",
            parameters: [
              {
                name: "button_1_text_token",
                parameterName: "token",
                type: "text",
              },
            ],
          },
        ],
      },
    });
  });

  it("preserves named Meta variables for generated text params", () => {
    const registry = normalizeMetaTemplates([
      {
        name: "convite_evento_v3",
        language: "pt_BR",
        components: [
          {
            type: "BODY",
            text: "{{data}}\n{{endereco}}",
          },
          {
            type: "BUTTONS",
            buttons: [
              {
                type: "URL",
                url: "https://example.com/{{token_nomeado}}",
              },
            ],
          },
        ],
      },
    ]);

    expect(registry).toEqual({
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
          {
            type: "button",
            subType: "url",
            index: "0",
            parameters: [
              {
                name: "button_0_text_token_nomeado",
                parameterName: "token_nomeado",
                type: "text",
              },
            ],
          },
        ],
      },
    });
  });

  it("emits a deterministic TypeScript registry file", () => {
    const content = generateTemplateRegistryFileContent({
      avaliacao_evento_v1: {
        language: "pt_BR",
        components: [
          {
            type: "body",
            parameters: [{ name: "body_1", type: "text" }],
          },
        ],
      },
    });

    expect(content).toContain(
      "export const whatsappTemplates = defineTemplates(",
    );
    expect(content).toContain('"avaliacao_evento_v1"');
    expect(content).toContain(
      "export type AppWhatsAppTemplates = typeof whatsappTemplates;",
    );
  });

  it("generates a template that has a phone button", () => {
    const registry = normalizeMetaTemplates([
      {
        name: "template_with_phone_button",
        language: "pt_BR",
        components: [
          {
            type: "BUTTONS",
            buttons: [
              { type: "PHONE_NUMBER", phone_number: "+5561999999999" },
            ],
          },
        ],
      },
    ]);

    expect(registry).toEqual({
      template_with_phone_button: { language: "pt_BR", components: [] },
    });
  });

  it("skips a template it cannot express and still generates the others", () => {
    const { registry, skipped } = buildTemplateRegistry([
      {
        name: "book_appointment",
        language: "en_US",
        components: [
          { type: "BODY", text: "Book a slot" },
          { type: "BUTTONS", buttons: [{ type: "FLOW", text: "Book" }] },
        ],
      },
      bodyTemplate("order_ready", "en_US"),
    ]);

    expect(skipped).toEqual([
      {
        name: "book_appointment",
        language: "en_US",
        reason: 'Unsupported button type "FLOW" at index 0',
      },
    ]);
    expect(Object.keys(registry)).toEqual(["order_ready"]);
  });

  it("keeps approved, paused and status-less templates by default", () => {
    const templates = [
      bodyTemplate("approved", "en_US", { status: "APPROVED" }),
      bodyTemplate("paused", "en_US", { status: "paused" }),
      bodyTemplate("pending", "en_US", { status: "PENDING" }),
      bodyTemplate("rejected", "en_US", { status: "REJECTED" }),
      bodyTemplate("no_status", "en_US"),
    ];

    const byDefault = buildTemplateRegistry(templates);
    expect(Object.keys(byDefault.registry)).toEqual([
      "approved",
      "no_status",
      "paused",
    ]);
    expect(byDefault.skipped).toEqual([
      { name: "pending", language: "en_US", reason: "status PENDING" },
      { name: "rejected", language: "en_US", reason: "status REJECTED" },
    ]);

    const everyStatus = buildTemplateRegistry(templates, {
      includeStatuses: "all",
    });
    expect(Object.keys(everyStatus.registry)).toHaveLength(5);
    expect(everyStatus.skipped).toEqual([]);

    const onlyPending = buildTemplateRegistry(templates, {
      includeStatuses: ["pending"],
    });
    expect(Object.keys(onlyPending.registry)).toEqual(["no_status", "pending"]);
  });

  it("picks one language per template, whatever order Meta returns them in", () => {
    const templates = [
      bodyTemplate("order_ready", "pt_BR", { text: "Ola {{1}}" }),
      bodyTemplate("order_ready", "en_US"),
    ];

    for (const order of [templates, [...templates].reverse()]) {
      const { registry, warnings } = buildTemplateRegistry(order);
      expect(registry.order_ready?.language).toBe("en_US");
      expect(warnings).toEqual([]);
    }

    const preferred = buildTemplateRegistry(templates, {
      defaultLanguage: "pt_BR",
    });
    expect(preferred.registry.order_ready?.language).toBe("pt_BR");

    // A default language the template does not have falls back to sorting.
    const missing = buildTemplateRegistry(templates, {
      defaultLanguage: "es_ES",
    });
    expect(missing.registry.order_ready?.language).toBe("en_US");
  });

  it("warns when the languages of a template have different parameters", () => {
    const { registry, warnings } = buildTemplateRegistry([
      bodyTemplate("order_ready", "pt_BR", { text: "Ola {{1}}, pedido {{2}}" }),
      bodyTemplate("order_ready", "en_US"),
    ]);

    expect(registry.order_ready?.language).toBe("en_US");
    expect(warnings).toEqual([
      'Template "order_ready": languages en_US and pt_BR have different parameters; the registry uses en_US.',
    ]);
  });

  it("falls back to a supported language when another is skipped", () => {
    const { registry, skipped } = buildTemplateRegistry([
      bodyTemplate("order_ready", "en_US", { status: "REJECTED" }),
      bodyTemplate("order_ready", "pt_BR", { status: "APPROVED" }),
    ]);

    expect(registry.order_ready?.language).toBe("pt_BR");
    expect(skipped).toEqual([
      { name: "order_ready", language: "en_US", reason: "status REJECTED" },
    ]);
  });

  it("still throws on a template without name or language", () => {
    expect(() =>
      buildTemplateRegistry([{ name: "order_ready", components: [] }]),
    ).toThrow("Template entry is missing name or language.");
  });

  it("reads --default-language and --all-statuses", async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), "better-zap-"));

    const fromFlags = await resolveGenerateOptions({
      cwd,
      env: {},
      flags: { "default-language": "pt_BR", "all-statuses": true },
    });
    expect(fromFlags.defaultLanguage).toBe("pt_BR");
    expect(fromFlags.allStatuses).toBe(true);

    const withoutFlags = await resolveGenerateOptions({ cwd, env: {}, flags: {} });
    expect(withoutFlags.defaultLanguage).toBeUndefined();
    expect(withoutFlags.allStatuses).toBe(false);

    await writeFile(
      path.join(cwd, "better-zap.config.json"),
      JSON.stringify({ templates: { defaultLanguage: "es_ES", allStatuses: true } }),
      "utf8",
    );
    const fromConfig = await resolveGenerateOptions({ cwd, env: {}, flags: {} });
    expect(fromConfig.defaultLanguage).toBe("es_ES");
    expect(fromConfig.allStatuses).toBe(true);

    const flagOverridesConfig = await resolveGenerateOptions({
      cwd,
      env: {},
      flags: { "default-language": "pt_BR" },
    });
    expect(flagOverridesConfig.defaultLanguage).toBe("pt_BR");
  });

  it("returns what generate skipped and warned about", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "better-zap-"));
    const output = path.join(tempDir, "generated-templates.ts");
    const fetchImpl = (async () =>
      new Response(
        JSON.stringify({
          data: [
            bodyTemplate("order_ready", "en_US", { status: "APPROVED" }),
            bodyTemplate("draft", "en_US", { status: "PENDING" }),
          ],
        }),
      )) as typeof fetch;

    const result = await runGenerateCommand({
      accessToken: "token",
      wabaId: "waba",
      output,
      fetchImpl,
    });

    expect(result).toEqual({
      output,
      templateCount: 1,
      skipped: [{ name: "draft", language: "en_US", reason: "status PENDING" }],
      warnings: [],
    });
    expect(await readFile(output, "utf8")).toContain('"order_ready"');

    // With every status the pending template is generated too, so the file changes.
    await expect(
      runGenerateCommand({
        accessToken: "token",
        wabaId: "waba",
        output,
        fetchImpl,
        allStatuses: true,
        check: true,
      }),
    ).rejects.toThrow("is out of date");
  });

  it("supports drift checking without rewriting the file", async () => {
    const tempDir = await mkdtemp(path.join(os.tmpdir(), "better-zap-"));
    const output = path.join(tempDir, "generated-templates.ts");

    await writeFile(output, "outdated", "utf8");

    await expect(
      writeGeneratedTemplateFile({
        check: true,
        content: "new-content",
        output,
      }),
    ).rejects.toThrow("is out of date");

    await writeGeneratedTemplateFile({
      content: "new-content",
      output,
    });

    expect(await readFile(output, "utf8")).toBe("new-content");
  });
});
