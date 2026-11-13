import { describe, expect, it } from "vitest";
import {
  templateDefinitionFromMeta,
  type TemplateDefinitionFromMetaResult,
} from "./template-definition";
import { serializeTemplateFromRegistry } from "./template-registry";
import type { MessageTemplate } from "./types/template.types";

type MetaTemplateInput = Pick<MessageTemplate, "language" | "components">;

/** Builds an input from loose JSON, the way Meta's response or a lower-case template looks. */
const fromJson = (value: unknown): MetaTemplateInput => value as MetaTemplateInput;

const definitionOf = (result: TemplateDefinitionFromMetaResult) => {
  if (!result.supported) throw new Error(`Expected a supported template: ${result.reason}`);
  return result.definition;
};

const positionalBody: MetaTemplateInput = {
  language: "en_US",
  components: [{ type: "BODY", text: "Hi {{1}}, your order {{2}} is ready." }],
};

describe("templateDefinitionFromMeta", () => {
  it("names positional body variables by position", () => {
    expect(templateDefinitionFromMeta(positionalBody)).toEqual({
      supported: true,
      definition: {
        language: "en_US",
        components: [
          {
            type: "body",
            parameters: [
              { name: "body_1", type: "text" },
              { name: "body_2", type: "text" },
            ],
          },
        ],
      },
    });
  });

  it("keeps the Meta name of a named variable", () => {
    const definition = definitionOf(
      templateDefinitionFromMeta({
        language: "en_US",
        components: [{ type: "BODY", text: "Hello {{first_name}}" }],
      }),
    );

    expect(definition.components).toEqual([
      {
        type: "body",
        parameters: [{ name: "body_first_name", parameterName: "first_name", type: "text" }],
      },
    ]);
  });

  it("gives a media header one media parameter", () => {
    const definition = definitionOf(
      templateDefinitionFromMeta({
        language: "en_US",
        components: [
          { type: "HEADER", format: "IMAGE" },
          { type: "BODY", text: "Your receipt" },
          { type: "FOOTER", text: "Thanks" },
        ],
      }),
    );

    expect(definition.components).toEqual([
      { type: "header", parameters: [{ name: "header_image", type: "image" }] },
      { type: "body", parameters: [] },
    ]);
  });

  it("drops a phone button but keeps counting it in the indexes of later buttons", () => {
    const definition = definitionOf(
      templateDefinitionFromMeta({
        language: "en_US",
        components: [
          {
            type: "BUTTONS",
            buttons: [
              { type: "QUICK_REPLY", text: "Stop" },
              { type: "PHONE_NUMBER", text: "Call us", phone_number: "+15550001111" },
              { type: "URL", text: "Track", url: "https://example.com/track/{{1}}" },
            ],
          },
        ],
      }),
    );

    expect(definition.components).toEqual([
      {
        type: "button",
        subType: "quick_reply",
        index: "0",
        parameters: [{ name: "button_0_payload", type: "payload" }],
      },
      {
        type: "button",
        subType: "url",
        index: "2",
        parameters: [{ name: "button_2_text_1", type: "text" }],
      },
    ]);
  });

  it("does not support a flow button and names its type and index", () => {
    const result = templateDefinitionFromMeta({
      language: "en_US",
      components: [
        {
          type: "BUTTONS",
          buttons: [
            { type: "QUICK_REPLY", text: "Stop" },
            { type: "FLOW", text: "Book", flow_id: "123" },
          ],
        },
      ],
    });

    expect(result).toEqual({
      supported: false,
      reason: 'Unsupported button type "FLOW" at index 1',
    });
  });

  it("does not support a carousel", () => {
    const result = templateDefinitionFromMeta({
      language: "en_US",
      components: [
        { type: "BODY", text: "Pick one" },
        { type: "CAROUSEL", cards: [] },
      ],
    });

    expect(result).toEqual({
      supported: false,
      reason: 'Unsupported component type "CAROUSEL"',
    });
  });

  it("does not support a GIF header", () => {
    const result = templateDefinitionFromMeta({
      language: "en_US",
      components: [{ type: "HEADER", format: "GIF" }],
    });

    expect(result).toEqual({
      supported: false,
      reason: 'Unsupported header format "GIF"',
    });
  });

  it("accepts component, format and button types in any case", () => {
    const definition = definitionOf(
      templateDefinitionFromMeta(
        fromJson({
          language: "pt_BR",
          components: [
            { type: "header", format: "location" },
            { type: "body", text: "Ola {{1}}" },
            { type: "buttons", buttons: [{ type: "quick_reply", text: "Sair" }] },
          ],
        }),
      ),
    );

    expect(definition.components).toEqual([
      { type: "header", parameters: [{ name: "header_location", type: "location" }] },
      { type: "body", parameters: [{ name: "body_1", type: "text" }] },
      {
        type: "button",
        subType: "quick_reply",
        index: "0",
        parameters: [{ name: "button_0_payload", type: "payload" }],
      },
    ]);
  });

  it("returns a definition that serializeTemplateFromRegistry can send", () => {
    const definition = definitionOf(templateDefinitionFromMeta(positionalBody));

    expect(
      serializeTemplateFromRegistry({ t: definition }, "t", {
        params: { body_1: "a", body_2: "b" },
      }),
    ).toEqual({
      language: "en_US",
      components: [
        {
          type: "body",
          parameters: [
            { type: "text", text: "a" },
            { type: "text", text: "b" },
          ],
        },
      ],
    });
  });

  it("does not support a template without a language", () => {
    for (const language of [undefined, "", 42]) {
      expect(
        templateDefinitionFromMeta(fromJson({ language, components: positionalBody.components })),
      ).toEqual({ supported: false, reason: "Template has no language" });
    }
  });

  it("returns a reason instead of throwing on malformed JSON values", () => {
    const cases: Array<[unknown, string]> = [
      [null, "Template has no language"],
      ["template", "Template has no language"],
      [{ language: "en_US", components: "BODY" }, "Template components are not a list"],
      [{ language: "en_US", components: [null] }, "Unsupported component type nothing"],
      [{ language: "en_US", components: [{ type: 7 }] }, "Unsupported component type a number"],
      [
        { language: "en_US", components: [{ type: "HEADER", format: { kind: "TEXT" } }] },
        "Unsupported header format an object",
      ],
      [
        { language: "en_US", components: [{ type: "BUTTONS", buttons: { type: "URL" } }] },
        "Buttons component has no list of buttons",
      ],
      [
        { language: "en_US", components: [{ type: "BUTTONS", buttons: ["URL"] }] },
        "Unsupported button type nothing at index 0",
      ],
      [
        { language: "en_US", components: [{ type: "BUTTONS", buttons: [{ type: true }] }] },
        "Unsupported button type a boolean at index 0",
      ],
    ];

    for (const [template, reason] of cases) {
      expect(templateDefinitionFromMeta(fromJson(template))).toEqual({
        supported: false,
        reason,
      });
    }
  });

  it("reads text that is not a string as having no variables", () => {
    const definition = definitionOf(
      templateDefinitionFromMeta(
        fromJson({
          language: "en_US",
          components: [
            { type: "BODY", text: 12 },
            { type: "BUTTONS", buttons: [{ type: "URL", url: null }] },
          ],
        }),
      ),
    );

    expect(definition.components).toEqual([
      { type: "body", parameters: [] },
      { type: "button", subType: "url", index: "0", parameters: [] },
    ]);
  });
});
