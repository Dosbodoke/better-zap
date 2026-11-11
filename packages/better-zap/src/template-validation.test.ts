import { describe, expect, it } from "vitest";
import {
  extractTemplateVariables,
  validateMessageTemplate,
  validateMessageTemplateComponents,
  type MessageTemplateIssueCode,
} from "./template-validation";
import type {
  MessageTemplateComponent,
  MessageTemplateDefinition,
} from "./types/template.types";

const valid = (): MessageTemplateDefinition => ({
  name: "order_confirmation",
  language: "en_US",
  category: "UTILITY",
  components: [
    { type: "HEADER", format: "TEXT", text: "Order {{1}}", example: { header_text: ["#1234"] } },
    {
      type: "BODY",
      text: "Hi {{1}}, your order {{2}} is confirmed.",
      example: { body_text: [["Pablo", "#1234"]] },
    },
    { type: "FOOTER", text: "Thanks for shopping with us" },
    {
      type: "BUTTONS",
      buttons: [
        { type: "QUICK_REPLY", text: "Stop" },
        {
          type: "URL",
          text: "Track",
          url: "https://example.com/t/{{1}}",
          example: ["https://example.com/t/1234"],
        },
        { type: "PHONE_NUMBER", text: "Call", phone_number: "+15550051310" },
      ],
    },
  ],
});

/** A definition whose fields can be broken freely, as untyped JavaScript could. */
type Loose = Record<string, any>;

const header = (definition: Loose) => definition.components[0];
const body = (definition: Loose) => definition.components[1];
const footer = (definition: Loose) => definition.components[2];
const buttons = (definition: Loose) => definition.components[3].buttons;

const issueCases: Array<[MessageTemplateIssueCode, (definition: Loose) => void, string]> = [
  ["name_invalid", (d) => { d.name = "Order-Confirmation"; }, "name"],
  ["language_missing", (d) => { d.language = ""; }, "language"],
  ["category_invalid", (d) => { d.category = "PROMOTIONAL"; }, "category"],
  ["components_missing_body", (d) => { d.components.splice(1, 1); }, "components"],
  [
    "component_duplicate",
    (d) => { d.components.push({ type: "FOOTER", text: "Again" }); },
    "components[4]",
  ],
  ["body_text_empty", (d) => { body(d).text = "  "; }, "components[1].text"],
  ["body_text_too_long", (d) => { body(d).text = "x".repeat(1025); }, "components[1].text"],
  ["body_example_missing", (d) => { delete body(d).example; }, "components[1].example"],
  ["header_text_empty", (d) => { header(d).text = ""; }, "components[0].text"],
  [
    "header_text_too_long",
    (d) => { header(d).text = `Order {{1}} ${"x".repeat(60)}`; },
    "components[0].text",
  ],
  [
    "header_too_many_variables",
    (d) => { header(d).text = "Order {{1}} for {{2}}"; },
    "components[0].text",
  ],
  ["header_example_missing", (d) => { header(d).example = {}; }, "components[0].example"],
  [
    "header_handle_missing",
    (d) => { d.components[0] = { type: "HEADER", format: "IMAGE" }; },
    "components[0].example.header_handle",
  ],
  ["footer_text_empty", (d) => { footer(d).text = ""; }, "components[2].text"],
  ["footer_text_too_long", (d) => { footer(d).text = "x".repeat(61); }, "components[2].text"],
  ["buttons_empty", (d) => { d.components[3].buttons = []; }, "components[3].buttons"],
  [
    "buttons_too_many",
    (d) => {
      d.components[3].buttons = Array.from({ length: 11 }, (_, i) => ({
        type: "QUICK_REPLY",
        text: `Option ${i}`,
      }));
    },
    "components[3].buttons",
  ],
  [
    "buttons_too_many_url",
    (d) => {
      buttons(d).push(
        { type: "URL", text: "Shop", url: "https://example.com/shop" },
        { type: "URL", text: "Help", url: "https://example.com/help" },
      );
    },
    "components[3].buttons",
  ],
  [
    "buttons_too_many_phone",
    (d) => { buttons(d).push({ type: "PHONE_NUMBER", text: "Fax", phone_number: "+15550051311" }); },
    "components[3].buttons",
  ],
  [
    "buttons_too_many_copy_code",
    (d) => { buttons(d).push({ type: "COPY_CODE", example: "A" }, { type: "COPY_CODE", example: "B" }); },
    "components[3].buttons",
  ],
  [
    "buttons_quick_reply_not_grouped",
    (d) => { buttons(d).push({ type: "QUICK_REPLY", text: "More" }); },
    "components[3].buttons",
  ],
  ["button_text_empty", (d) => { buttons(d)[0].text = " "; }, "components[3].buttons[0].text"],
  [
    "button_text_too_long",
    (d) => { buttons(d)[0].text = "x".repeat(26); },
    "components[3].buttons[0].text",
  ],
  ["button_url_empty", (d) => { buttons(d)[1].url = ""; }, "components[3].buttons[1].url"],
  [
    "button_url_too_long",
    (d) => { buttons(d)[1].url = `https://example.com/${"x".repeat(2000)}`; },
    "components[3].buttons[1].url",
  ],
  [
    "button_url_too_many_variables",
    (d) => { buttons(d)[1].url = "https://example.com/{{1}}/{{2}}"; },
    "components[3].buttons[1].url",
  ],
  [
    "button_url_example_missing",
    (d) => { delete buttons(d)[1].example; },
    "components[3].buttons[1].example",
  ],
  [
    "button_phone_empty",
    (d) => { buttons(d)[2].phone_number = ""; },
    "components[3].buttons[2].phone_number",
  ],
  [
    "button_phone_too_long",
    (d) => { buttons(d)[2].phone_number = `+${"1".repeat(20)}`; },
    "components[3].buttons[2].phone_number",
  ],
  [
    "variable_format_mismatch",
    (d) => { body(d).text = "Hi {{first_name}}, your order is confirmed."; },
    "components[1].text",
  ],
  [
    "variable_name_invalid",
    (d) => {
      d.parameter_format = "NAMED";
      d.components.splice(0, 1);
      d.components[0] = {
        type: "BODY",
        text: "Hi {{FirstName}}",
        example: { body_text_named_params: [{ param_name: "FirstName", example: "Pablo" }] },
      };
    },
    "components[0].text",
  ],
  [
    "variables_not_sequential",
    (d) => { body(d).text = "Hi {{1}}, your order {{3}} is confirmed."; },
    "components[1].text",
  ],
];

describe("validateMessageTemplate", () => {
  it("returns no issues for a valid template", () => {
    expect(validateMessageTemplate(valid())).toEqual([]);
  });

  it("returns no issues for a valid named-format template", () => {
    const result = validateMessageTemplate({
      name: "greeting",
      language: "en_US",
      category: "MARKETING",
      parameter_format: "NAMED",
      components: [
        {
          type: "BODY",
          text: "Hi {{first_name}}",
          example: { body_text_named_params: [{ param_name: "first_name", example: "Pablo" }] },
        },
      ],
    });

    expect(result).toEqual([]);
  });

  it("accepts lower-case component, format and button types", () => {
    const definition = valid() as Loose;
    for (const component of definition.components) {
      component.type = component.type.toLowerCase();
      if (component.format) component.format = component.format.toLowerCase();
    }
    for (const button of buttons(definition)) button.type = button.type.toLowerCase();

    expect(validateMessageTemplate(definition as MessageTemplateDefinition)).toEqual([]);
  });

  it("accepts a body-only template without variables or example", () => {
    const result = validateMessageTemplate({
      name: "welcome",
      language: "pt_BR",
      category: "UTILITY",
      components: [{ type: "BODY", text: "Welcome aboard." }],
    });

    expect(result).toEqual([]);
  });

  it("covers every issue code once", () => {
    expect(new Set(issueCases.map(([code]) => code)).size).toBe(32);
    expect(issueCases).toHaveLength(32);
  });

  it.each(issueCases)("reports %s", (code, mutate, path) => {
    const definition = valid() as Loose;
    mutate(definition);

    const issues = validateMessageTemplate(definition as MessageTemplateDefinition);

    expect(issues).toContainEqual({ code, path, message: expect.any(String) });
  });

  it("states the limit and the actual value in the message", () => {
    const definition = valid() as Loose;
    body(definition).text = "x".repeat(1031);

    expect(validateMessageTemplate(definition as MessageTemplateDefinition)).toEqual([
      {
        code: "body_text_too_long",
        path: "components[1].text",
        message: "Body text is 1031 characters; the limit is 1024.",
      },
    ]);
  });

  it("checks only the name, language and category of an authentication template", () => {
    const result = validateMessageTemplate({
      name: "Bad Name",
      language: "",
      category: "AUTHENTICATION",
      components: [{ type: "FOOTER", text: "" }],
    });

    expect(result.map((issue) => issue.code)).toEqual(["name_invalid", "language_missing"]);
  });

  it("ignores component and button types it does not model", () => {
    const definition = valid() as Loose;
    definition.components.push({ type: "CAROUSEL", cards: [] });
    buttons(definition).push({ type: "FLOW", text: "x".repeat(100) });

    expect(validateMessageTemplate(definition as MessageTemplateDefinition)).toEqual([]);
  });

  it("does not report a variable format mismatch together with a missing example", () => {
    const definition = valid() as Loose;
    body(definition).text = "Hi {{first_name}}";
    delete body(definition).example;

    const codes = validateMessageTemplate(definition as MessageTemplateDefinition).map(
      (issue) => issue.code,
    );

    expect(codes).toEqual(["variable_format_mismatch"]);
  });

  it("numbers header and body variables independently", () => {
    const definition = valid() as Loose;
    header(definition).text = "Order {{1}}";
    body(definition).text = "Hi {{1}}, your order {{2}} is confirmed.";

    expect(validateMessageTemplate(definition as MessageTemplateDefinition)).toEqual([]);
  });

  it("reports one issue per code and path, naming every variable", () => {
    const definition = valid() as Loose;
    body(definition).example = { body_text: [["Pablo"]] };
    body(definition).text = "Hi {{1}}, order {{2}} ships on {{3}}.";

    expect(validateMessageTemplate(definition as MessageTemplateDefinition)).toEqual([
      {
        code: "body_example_missing",
        path: "components[1].example",
        message: "Variables {{2}}, {{3}} in the body have no example value.",
      },
    ]);
  });

  it("never throws on a malformed definition", () => {
    const malformed: unknown[] = [
      undefined,
      null,
      "template",
      {},
      { name: "a", language: "en", category: "UTILITY" },
      { name: "a", language: "en", category: "UTILITY", components: "BODY" },
      { name: 1, language: 2, category: 3, components: [null, 1, "BODY", []] },
      {
        name: "a",
        language: "en",
        category: "UTILITY",
        components: [
          { type: "HEADER", format: "TEXT", text: 42, example: "x" },
          { type: "BODY", text: { value: "Hi" }, example: { body_text: "Pablo" } },
          { type: "FOOTER" },
          { type: "BUTTONS", buttons: [null, 5, { type: "URL", url: 7, example: "x" }] },
          { type: null },
        ],
      },
    ];

    for (const definition of malformed) {
      expect(() =>
        validateMessageTemplate(definition as MessageTemplateDefinition),
      ).not.toThrow();
    }
    expect(validateMessageTemplate(undefined as never).map((issue) => issue.code)).toEqual([
      "name_invalid",
      "language_missing",
      "category_invalid",
      "components_missing_body",
    ]);
  });
});

describe("validateMessageTemplateComponents", () => {
  it("infers NAMED when a variable is not a number", () => {
    const components: MessageTemplateComponent[] = [
      {
        type: "BODY",
        text: "Hi {{first_name}}",
        example: { body_text_named_params: [{ param_name: "first_name", example: "Pablo" }] },
      },
    ];

    expect(validateMessageTemplateComponents(components)).toEqual([]);
  });

  it("checks nothing for an authentication template", () => {
    expect(validateMessageTemplateComponents([], { category: "AUTHENTICATION" })).toEqual([]);
  });

  it("never throws on components that are not an array", () => {
    expect(validateMessageTemplateComponents(null as never)).toEqual([
      expect.objectContaining({ code: "components_missing_body" }),
    ]);
  });
});

describe("extractTemplateVariables", () => {
  it("returns names in order of first appearance without duplicates", () => {
    expect(extractTemplateVariables("Hi {{1}}, {{ 2 }} and {{1}}")).toEqual(["1", "2"]);
  });

  it("returns an empty list without text", () => {
    expect(extractTemplateVariables(undefined)).toEqual([]);
  });
});
