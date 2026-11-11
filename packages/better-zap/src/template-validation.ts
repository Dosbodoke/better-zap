import type {
  MessageTemplateCategory,
  MessageTemplateComponent,
  MessageTemplateDefinition,
  MessageTemplateParameterFormat,
} from "./types/template.types";

export type MessageTemplateIssueCode =
  | "name_invalid"
  | "language_missing"
  | "category_invalid"
  | "components_missing_body"
  | "component_duplicate"
  | "body_text_empty"
  | "body_text_too_long"
  | "body_example_missing"
  | "header_text_empty"
  | "header_text_too_long"
  | "header_too_many_variables"
  | "header_example_missing"
  | "header_handle_missing"
  | "footer_text_empty"
  | "footer_text_too_long"
  | "buttons_empty"
  | "buttons_too_many"
  | "buttons_too_many_url"
  | "buttons_too_many_phone"
  | "buttons_too_many_copy_code"
  | "buttons_quick_reply_not_grouped"
  | "button_text_empty"
  | "button_text_too_long"
  | "button_url_empty"
  | "button_url_too_long"
  | "button_url_too_many_variables"
  | "button_url_example_missing"
  | "button_phone_empty"
  | "button_phone_too_long"
  | "variable_format_mismatch"
  | "variable_name_invalid"
  | "variables_not_sequential";

export interface MessageTemplateIssue {
  code: MessageTemplateIssueCode;
  /** Where the problem is, e.g. `name`, `components[1].text`, `components[2].buttons[0].url`. */
  path: string;
  /** One English sentence that states the limit and the actual value. */
  message: string;
}

/** Meta's documented limits. Lengths are counted in characters. */
export const MESSAGE_TEMPLATE_LIMITS = {
  nameLength: 512,
  bodyLength: 1024,
  headerTextLength: 60,
  footerLength: 60,
  buttonTextLength: 25,
  buttonUrlLength: 2000,
  buttonPhoneLength: 20,
  buttons: 10,
  urlButtons: 2,
  phoneButtons: 1,
  copyCodeButtons: 1,
} as const;

const VARIABLE_PATTERN = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
const NAME_PATTERN = /^[a-z0-9_]{1,512}$/;
const NAMED_VARIABLE_PATTERN = /^[a-z0-9_]+$/;
const DIGITS = /^\d+$/;
const CATEGORIES: readonly string[] = ["MARKETING", "UTILITY", "AUTHENTICATION"];
const SINGLE_COMPONENT_TYPES = ["HEADER", "BODY", "FOOTER", "BUTTONS"];
const MEDIA_HEADER_FORMATS = ["IMAGE", "VIDEO", "DOCUMENT", "GIF"];
const TEXT_BUTTON_TYPES = ["QUICK_REPLY", "URL", "PHONE_NUMBER"];

/** Definitions can come from untyped JavaScript, so every field is read as `unknown`. */
type LooseObject = { [key: string]: unknown };

type VariableSection = "header" | "body";

/** Variable names in order of first appearance, without duplicates. `"Hi {{1}}, {{ 2 }}"` → `["1", "2"]`. */
export function extractTemplateVariables(text: string | undefined): string[] {
  if (typeof text !== "string") return [];

  const names = new Set<string>();
  for (const match of text.matchAll(VARIABLE_PATTERN)) {
    names.add(match[1]!);
  }
  return [...names];
}

/** Checks a whole definition. Returns `[]` when nothing is wrong. */
export function validateMessageTemplate(
  definition: MessageTemplateDefinition,
): MessageTemplateIssue[] {
  const template = asObject(definition) ?? {};
  const issues: MessageTemplateIssue[] = [];

  const name = template.name;
  if (typeof name !== "string" || !NAME_PATTERN.test(name)) {
    addIssue(issues, "name_invalid", "name", nameMessage(name));
  }
  if (!isNonEmptyString(template.language)) {
    addIssue(
      issues,
      "language_missing",
      "language",
      "Template language is missing; it must be a language code such as en_US.",
    );
  }
  // Meta accepts the category and the parameter format in either case.
  const category = upper(template.category);
  if (!CATEGORIES.includes(category)) {
    addIssue(
      issues,
      "category_invalid",
      "category",
      `Template category must be MARKETING, UTILITY or AUTHENTICATION; got ${describe(template.category)}.`,
    );
  }

  // Authentication templates use a different component model that is not checked.
  if (category === "AUTHENTICATION") return issues;

  issues.push(
    ...validateMessageTemplateComponents(
      template.components as MessageTemplateComponent[],
      {
        category: category as MessageTemplateCategory,
        parameterFormat: (upper(template.parameter_format) ||
          "POSITIONAL") as MessageTemplateParameterFormat,
      },
    ),
  );
  return issues;
}

/** Checks components only, for an edit where the name and language are fixed. */
export function validateMessageTemplateComponents(
  components: readonly MessageTemplateComponent[],
  options: {
    category?: MessageTemplateCategory;
    /** When omitted, `NAMED` is assumed if any header or body variable is not a number, else `POSITIONAL`. */
    parameterFormat?: MessageTemplateParameterFormat;
  } = {},
): MessageTemplateIssue[] {
  const list: unknown[] = Array.isArray(components) ? components : [];
  const category = upper(options?.category);
  // An edit usually carries no category, so an authentication template is
  // also recognised by its one-time password button.
  if (category === "AUTHENTICATION" || (!category && hasOtpButton(list))) {
    return [];
  }

  const format = (upper(options?.parameterFormat) ||
    inferParameterFormat(list)) as MessageTemplateParameterFormat;
  const issues: MessageTemplateIssue[] = [];
  const seen = new Set<string>();

  list.forEach((value, index) => {
    const component = asObject(value);
    if (!component) return;

    const type = upper(component.type);
    if (SINGLE_COMPONENT_TYPES.includes(type)) {
      if (seen.has(type)) {
        addIssue(
          issues,
          "component_duplicate",
          `components[${index}]`,
          `components[${index}] is a second ${type}; a template can have only one.`,
        );
      }
      seen.add(type);
    }

    if (type === "HEADER") validateHeader(issues, component, index, format);
    else if (type === "BODY") validateBody(issues, component, index, format);
    else if (type === "FOOTER") validateFooter(issues, component, index);
    else if (type === "BUTTONS") validateButtons(issues, component, index);
  });

  if (!seen.has("BODY")) {
    addIssue(
      issues,
      "components_missing_body",
      "components",
      `The template has ${list.length} components and none is a BODY; exactly one BODY is required.`,
    );
  }

  return issues;
}

function validateHeader(
  issues: MessageTemplateIssue[],
  component: LooseObject,
  index: number,
  format: MessageTemplateParameterFormat,
) {
  const headerFormat = upper(component.format);
  const path = `components[${index}]`;

  if (MEDIA_HEADER_FORMATS.includes(headerFormat)) {
    const handles = asObject(component.example)?.header_handle;
    if (!Array.isArray(handles) || !isNonEmptyString(handles[0])) {
      addIssue(
        issues,
        "header_handle_missing",
        `${path}.example.header_handle`,
        `The ${headerFormat} header needs one uploaded media handle in example.header_handle; none was given.`,
      );
    }
    return;
  }
  if (headerFormat !== "TEXT") return;

  const text = component.text;
  if (!hasText(text)) {
    addIssue(
      issues,
      "header_text_empty",
      `${path}.text`,
      "Header text is empty; a TEXT header needs 1 to 60 characters.",
    );
  } else if (characterCount(text) > MESSAGE_TEMPLATE_LIMITS.headerTextLength) {
    addIssue(
      issues,
      "header_text_too_long",
      `${path}.text`,
      `Header text is ${characterCount(text)} characters; the limit is ${MESSAGE_TEMPLATE_LIMITS.headerTextLength}.`,
    );
  }

  const variables = extractTemplateVariables(asString(text));
  if (variables.length > 1) {
    addIssue(
      issues,
      "header_too_many_variables",
      `${path}.text`,
      `Header text has ${variables.length} variables; the limit is 1.`,
    );
  }

  validateVariables(issues, component, index, "header", format);
}

function validateBody(
  issues: MessageTemplateIssue[],
  component: LooseObject,
  index: number,
  format: MessageTemplateParameterFormat,
) {
  const text = component.text;
  const path = `components[${index}].text`;

  if (!hasText(text)) {
    addIssue(issues, "body_text_empty", path, "Body text is empty; it needs 1 to 1024 characters.");
  } else if (characterCount(text) > MESSAGE_TEMPLATE_LIMITS.bodyLength) {
    addIssue(
      issues,
      "body_text_too_long",
      path,
      `Body text is ${characterCount(text)} characters; the limit is ${MESSAGE_TEMPLATE_LIMITS.bodyLength}.`,
    );
  }

  validateVariables(issues, component, index, "body", format);
}

function validateFooter(issues: MessageTemplateIssue[], component: LooseObject, index: number) {
  const text = component.text;
  const path = `components[${index}].text`;

  if (!hasText(text)) {
    addIssue(issues, "footer_text_empty", path, "Footer text is empty; it needs 1 to 60 characters.");
  } else if (characterCount(text) > MESSAGE_TEMPLATE_LIMITS.footerLength) {
    addIssue(
      issues,
      "footer_text_too_long",
      path,
      `Footer text is ${characterCount(text)} characters; the limit is ${MESSAGE_TEMPLATE_LIMITS.footerLength}.`,
    );
  }
}

function validateButtons(issues: MessageTemplateIssue[], component: LooseObject, index: number) {
  const path = `components[${index}].buttons`;
  const buttons = component.buttons;

  if (!Array.isArray(buttons) || buttons.length === 0) {
    addIssue(
      issues,
      "buttons_empty",
      path,
      "The BUTTONS component has no buttons; it needs at least 1.",
    );
    return;
  }

  const types = buttons.map((button) => upper(asObject(button)?.type));
  const counts: Array<[MessageTemplateIssueCode, string, string, number]> = [
    ["buttons_too_many", "", "buttons", MESSAGE_TEMPLATE_LIMITS.buttons],
    ["buttons_too_many_url", "URL", "URL buttons", MESSAGE_TEMPLATE_LIMITS.urlButtons],
    ["buttons_too_many_phone", "PHONE_NUMBER", "PHONE_NUMBER buttons", MESSAGE_TEMPLATE_LIMITS.phoneButtons],
    ["buttons_too_many_copy_code", "COPY_CODE", "COPY_CODE buttons", MESSAGE_TEMPLATE_LIMITS.copyCodeButtons],
  ];
  for (const [code, type, label, limit] of counts) {
    const count = type ? types.filter((value) => value === type).length : types.length;
    if (count > limit) {
      addIssue(issues, code, path, `The template has ${count} ${label}; the limit is ${limit}.`);
    }
  }

  const firstQuickReply = types.indexOf("QUICK_REPLY");
  const lastQuickReply = types.lastIndexOf("QUICK_REPLY");
  if (types.slice(firstQuickReply, lastQuickReply + 1).some((type) => type !== "QUICK_REPLY")) {
    addIssue(
      issues,
      "buttons_quick_reply_not_grouped",
      path,
      `QUICK_REPLY buttons must be next to each other; the order is ${types.join(", ")}.`,
    );
  }

  buttons.forEach((value, buttonIndex) => {
    const button = asObject(value);
    if (button) validateButton(issues, button, types[buttonIndex]!, `${path}[${buttonIndex}]`);
  });
}

function validateButton(
  issues: MessageTemplateIssue[],
  button: LooseObject,
  type: string,
  path: string,
) {
  if (!TEXT_BUTTON_TYPES.includes(type)) return;

  const { buttonTextLength, buttonUrlLength, buttonPhoneLength } = MESSAGE_TEMPLATE_LIMITS;
  if (!hasText(button.text)) {
    addIssue(
      issues,
      "button_text_empty",
      `${path}.text`,
      `${type} button text is empty; it needs 1 to ${buttonTextLength} characters.`,
    );
  } else if (characterCount(button.text) > buttonTextLength) {
    addIssue(
      issues,
      "button_text_too_long",
      `${path}.text`,
      `${type} button text is ${characterCount(button.text)} characters; the limit is ${buttonTextLength}.`,
    );
  }

  if (type === "URL") {
    const url = button.url;
    if (!isNonEmptyString(url)) {
      addIssue(
        issues,
        "button_url_empty",
        `${path}.url`,
        `URL button has no url; it needs 1 to ${buttonUrlLength} characters.`,
      );
      return;
    }
    if (characterCount(url) > buttonUrlLength) {
      addIssue(
        issues,
        "button_url_too_long",
        `${path}.url`,
        `Button URL is ${characterCount(url)} characters; the limit is ${buttonUrlLength}.`,
      );
    }

    const variables = extractTemplateVariables(url);
    if (variables.length > 1) {
      addIssue(
        issues,
        "button_url_too_many_variables",
        `${path}.url`,
        `Button URL has ${variables.length} variables; the limit is 1.`,
      );
    }
    const example = button.example;
    if (variables.length > 0 && (!Array.isArray(example) || !isNonEmptyString(example[0]))) {
      addIssue(
        issues,
        "button_url_example_missing",
        `${path}.example`,
        `Variable {{${variables[0]}}} in the button URL has no example value.`,
      );
    }
  }

  if (type === "PHONE_NUMBER") {
    const phoneNumber = button.phone_number;
    if (!isNonEmptyString(phoneNumber)) {
      addIssue(
        issues,
        "button_phone_empty",
        `${path}.phone_number`,
        `PHONE_NUMBER button has no phone_number; it needs 1 to ${buttonPhoneLength} characters.`,
      );
    } else if (characterCount(phoneNumber) > buttonPhoneLength) {
      addIssue(
        issues,
        "button_phone_too_long",
        `${path}.phone_number`,
        `Phone number is ${characterCount(phoneNumber)} characters; the limit is ${buttonPhoneLength}.`,
      );
    }
  }
}

/** Checks the variables of one TEXT header or body. Numbering restarts in each component. */
function validateVariables(
  issues: MessageTemplateIssue[],
  component: LooseObject,
  index: number,
  section: VariableSection,
  format: MessageTemplateParameterFormat,
) {
  const variables = extractTemplateVariables(asString(component.text));
  if (variables.length === 0) return;

  const textPath = `components[${index}].text`;
  const numbered = variables.filter((name) => DIGITS.test(name));
  const named = variables.filter((name) => !DIGITS.test(name));

  let mismatch = false;
  if (format === "POSITIONAL" && named.length > 0) {
    mismatch = true;
    addIssue(
      issues,
      "variable_format_mismatch",
      textPath,
      `${listVariables(named)} in the ${section} ${named.length === 1 ? "is" : "are"} not numbered; set parameter_format: "NAMED" to use named variables.`,
    );
  }
  if (format === "NAMED" && numbered.length > 0) {
    mismatch = true;
    addIssue(
      issues,
      "variable_format_mismatch",
      textPath,
      `${listVariables(numbered)} in the ${section} ${numbered.length === 1 ? "is a number" : "are numbers"}; a NAMED template needs names such as {{first_name}}.`,
    );
  }
  if (format === "NAMED") {
    const invalid = named.filter((name) => !NAMED_VARIABLE_PATTERN.test(name));
    if (invalid.length > 0) {
      addIssue(
        issues,
        "variable_name_invalid",
        textPath,
        `${listVariables(invalid)} in the ${section} must use only lower-case letters, digits and underscores.`,
      );
    }
  }
  if (mismatch) return;

  if (format === "POSITIONAL") {
    const numbers = new Set(variables.map(Number));
    const expected = Array.from({ length: numbers.size }, (_, i) => i + 1);
    if (!expected.every((number) => numbers.has(number))) {
      addIssue(
        issues,
        "variables_not_sequential",
        textPath,
        `${listVariables(variables)} in the ${section} must be numbered 1 to ${numbers.size} without gaps.`,
      );
    }
  }

  const missing =
    section === "body"
      ? missingBodyExamples(component, variables, format)
      : missingHeaderExamples(component, variables, format);
  if (missing.length > 0) {
    addIssue(
      issues,
      `${section}_example_missing`,
      `components[${index}].example`,
      `${listVariables(missing)} in the ${section} ${missing.length === 1 ? "has" : "have"} no example value.`,
    );
  }
}

/** The body variables that have no example value. */
function missingBodyExamples(
  component: LooseObject,
  variables: string[],
  format: MessageTemplateParameterFormat,
): string[] {
  const example = asObject(component.example);

  if (format === "POSITIONAL") {
    const bodyText = example?.body_text;
    const values: unknown[] = Array.isArray(bodyText) && Array.isArray(bodyText[0]) ? bodyText[0] : [];
    return variables.filter((_, i) => !isNonEmptyString(values[i]));
  }
  if (format === "NAMED") {
    return variables.filter(
      (name) => !hasNamedExample(example?.body_text_named_params, name),
    );
  }
  return [];
}

/** The header variables that have no example value. */
function missingHeaderExamples(
  component: LooseObject,
  variables: string[],
  format: MessageTemplateParameterFormat,
): string[] {
  const example = asObject(component.example);

  if (format === "POSITIONAL") {
    const headerText = example?.header_text;
    return Array.isArray(headerText) && isNonEmptyString(headerText[0]) ? [] : variables;
  }
  if (format === "NAMED") {
    return variables.filter(
      (name) => !hasNamedExample(example?.header_text_named_params, name),
    );
  }
  return [];
}

function hasNamedExample(params: unknown, name: string): boolean {
  if (!Array.isArray(params)) return false;
  return params.some((param) => {
    const entry = asObject(param);
    return entry?.param_name === name && isNonEmptyString(entry.example);
  });
}

/** `NAMED` when any TEXT header or body variable is not a number, else `POSITIONAL`. */
function inferParameterFormat(components: unknown[]): MessageTemplateParameterFormat {
  for (const value of components) {
    const component = asObject(value);
    if (!component) continue;

    const type = upper(component.type);
    const isTextHeader = type === "HEADER" && upper(component.format) === "TEXT";
    if (!isTextHeader && type !== "BODY") continue;

    const variables = extractTemplateVariables(asString(component.text));
    if (variables.some((name) => !DIGITS.test(name))) return "NAMED";
  }
  return "POSITIONAL";
}

/** Every authentication template has a one-time password (`OTP`) button. */
function hasOtpButton(components: unknown[]): boolean {
  return components.some((value) => {
    const component = asObject(value);
    if (!component || upper(component.type) !== "BUTTONS") return false;

    const buttons = component.buttons;
    return (
      Array.isArray(buttons) &&
      buttons.some((button) => upper(asObject(button)?.type) === "OTP")
    );
  });
}

/** Adds the issue unless one with the same code and path is already there. */
function addIssue(
  issues: MessageTemplateIssue[],
  code: MessageTemplateIssueCode,
  path: string,
  message: string,
) {
  if (issues.some((issue) => issue.code === code && issue.path === path)) return;
  issues.push({ code, path, message });
}

function nameMessage(name: unknown): string {
  const { nameLength } = MESSAGE_TEMPLATE_LIMITS;
  if (typeof name !== "string" || name.length === 0) {
    return `Template name is missing; it needs 1 to ${nameLength} lower-case letters, digits and underscores.`;
  }
  if (name.length > nameLength) {
    return `Template name is ${name.length} characters; the limit is ${nameLength}.`;
  }
  return `Template name "${name}" may use only lower-case letters, digits and underscores.`;
}

function listVariables(names: string[]): string {
  const list = names.map((name) => `{{${name}}}`).join(", ");
  return names.length === 1 ? `Variable ${list}` : `Variables ${list}`;
}

function describe(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  return value === undefined || value === null ? "nothing" : `a ${typeof value}`;
}

/** Counts characters rather than UTF-16 code units, so an emoji counts once. */
function characterCount(text: string): number {
  return Array.from(text).length;
}

/** Upper-cases a string. Anything else reads as `""`, so a value from JSON cannot make this throw. */
function upper(value: unknown): string {
  return typeof value === "string" ? value.toUpperCase() : "";
}

function asObject(value: unknown): LooseObject | undefined {
  return typeof value === "object" && value !== null ? (value as LooseObject) : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

/** A string with something other than whitespace. */
function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
