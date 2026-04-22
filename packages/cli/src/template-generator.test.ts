import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  generateTemplateRegistryFileContent,
  normalizeMetaTemplates,
  writeGeneratedTemplateFile,
} from "./template-generator";

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

  it("fails loudly on unsupported Meta button types", () => {
    expect(() =>
      normalizeMetaTemplates([
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
      ]),
    ).toThrow('Unsupported button type "PHONE_NUMBER"');
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
