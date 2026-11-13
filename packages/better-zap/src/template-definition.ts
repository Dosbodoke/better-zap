import type {
  TemplateComponentDefinition,
  TemplateDefinition,
  TemplateParameterDefinition,
} from "./template-registry";
import type { MessageTemplate } from "./types/template.types";

export type TemplateDefinitionFromMetaResult =
  | { supported: true; definition: TemplateDefinition }
  | { supported: false; reason: string };

/** Templates can come from untyped JSON, so every field is read as `unknown`. */
type LooseObject = { [key: string]: unknown };

/** Components of one Meta component, or why the template cannot be expressed. */
type ConversionStep =
  | { supported: true; components: TemplateComponentDefinition[] }
  | { supported: false; reason: string };

const VARIABLE_PATTERN = /\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g;
const DIGITS = /^\d+$/;
const MEDIA_HEADER_FORMATS = ["IMAGE", "VIDEO", "DOCUMENT"];

/**
 * Converts a template as Meta returns it into the definition used by
 * `defineTemplates` and `serializeTemplateFromRegistry`. Never throws.
 */
export function templateDefinitionFromMeta(
  template: Pick<MessageTemplate, "language" | "components">,
): TemplateDefinitionFromMetaResult {
  const source = asObject(template) ?? {};
  const language = source.language;
  if (typeof language !== "string" || language.length === 0) {
    return { supported: false, reason: "Template has no language" };
  }

  const metaComponents = source.components ?? [];
  if (!Array.isArray(metaComponents)) {
    return { supported: false, reason: "Template components are not a list" };
  }

  const components: TemplateComponentDefinition[] = [];
  for (const component of metaComponents) {
    const step = convertComponent(asObject(component) ?? {});
    if (!step.supported) return step;
    components.push(...step.components);
  }

  return { supported: true, definition: { language, components } };
}

function convertComponent(component: LooseObject): ConversionStep {
  const type = upper(component.type);

  if (type === "BODY") {
    return supported({
      type: "body",
      parameters: textParameters("body", component.text),
    });
  }

  if (type === "HEADER") {
    return convertHeader(component);
  }

  if (type === "BUTTONS") {
    return convertButtons(component);
  }

  if (type === "FOOTER") {
    return supported();
  }

  return unsupported(`Unsupported component type ${describe(component.type)}`);
}

function convertHeader(component: LooseObject): ConversionStep {
  const format = component.format ?? "TEXT";
  const upperFormat = upper(format);

  if (upperFormat === "TEXT") {
    return supported({
      type: "header",
      parameters: textParameters("header", component.text),
    });
  }

  if (upperFormat === "LOCATION") {
    return supported({
      type: "header",
      parameters: [{ name: "header_location", type: "location" }],
    });
  }

  if (MEDIA_HEADER_FORMATS.includes(upperFormat)) {
    const mediaType = upperFormat.toLowerCase() as "image" | "video" | "document";
    return supported({
      type: "header",
      parameters: [{ name: `header_${mediaType}`, type: mediaType }],
    });
  }

  return unsupported(`Unsupported header format ${describe(format)}`);
}

function convertButtons(component: LooseObject): ConversionStep {
  const buttons = component.buttons ?? [];
  if (!Array.isArray(buttons)) {
    return unsupported("Buttons component has no list of buttons");
  }

  const components: TemplateComponentDefinition[] = [];
  for (const [index, entry] of buttons.entries()) {
    const button = asObject(entry) ?? {};
    const type = upper(button.type);

    if (type === "QUICK_REPLY") {
      components.push({
        type: "button",
        subType: "quick_reply",
        index: String(index),
        parameters: [{ name: `button_${index}_payload`, type: "payload" }],
      });
      continue;
    }

    if (type === "URL") {
      components.push({
        type: "button",
        subType: "url",
        index: String(index),
        parameters: textParameters(`button_${index}_text`, button.url),
      });
      continue;
    }

    // A phone-number button takes no value when the message is sent. It still
    // counts towards the index of the buttons after it.
    if (type === "PHONE_NUMBER") {
      continue;
    }

    return unsupported(
      `Unsupported button type ${describe(button.type)} at index ${index}`,
    );
  }

  return { supported: true, components };
}

/**
 * One text parameter per variable, in order. A numeric variable is named by
 * its position (`body_1`); a named one keeps its name (`body_first_name`).
 */
function textParameters(
  prefix: string,
  text: unknown,
): TemplateParameterDefinition<"text">[] {
  if (typeof text !== "string") return [];

  return Array.from(text.matchAll(VARIABLE_PATTERN), (match, index) => {
    const token = match[1]!;
    if (DIGITS.test(token)) {
      return { name: `${prefix}_${index + 1}`, type: "text" };
    }
    return {
      name: `${prefix}_${sanitizeName(token)}`,
      parameterName: token,
      type: "text",
    };
  });
}

function supported(
  ...components: TemplateComponentDefinition[]
): ConversionStep {
  return { supported: true, components };
}

function unsupported(reason: string): ConversionStep {
  return { supported: false, reason };
}

function sanitizeName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9_]+/g, "_");
}

function describe(value: unknown): string {
  if (typeof value === "string") return `"${value}"`;
  if (value === undefined || value === null) return "nothing";
  const type = typeof value;
  return type === "object" ? "an object" : `a ${type}`;
}

/** Upper-cases a string. Anything else reads as `""`, so a value from JSON cannot make this throw. */
function upper(value: unknown): string {
  return typeof value === "string" ? value.toUpperCase() : "";
}

function asObject(value: unknown): LooseObject | undefined {
  return typeof value === "object" && value !== null ? (value as LooseObject) : undefined;
}
