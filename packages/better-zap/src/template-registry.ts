import type {
  TemplateComponent,
  TemplateParameter,
} from "./types/whatsapp.types";

type Simplify<TValue> = { [TKey in keyof TValue]: TValue[TKey] } & {};

export type TemplateParameterInputMap = {
  text: string;
  payload: string;
  location: {
    latitude: number;
    longitude: number;
    name: string;
    address: string;
  };
  image: {
    link: string;
  };
  video: {
    link: string;
  };
  document: {
    link: string;
  };
  currency: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time: {
    fallback_value: string;
  };
};

export type SupportedTemplateParameterType = keyof TemplateParameterInputMap;

export interface TemplateParameterDefinition<
  TType extends SupportedTemplateParameterType = SupportedTemplateParameterType,
> {
  name: string;
  type: TType;
}

export type TemplateComponentDefinition =
  | {
      type: "header";
      parameters: readonly TemplateParameterDefinition[];
    }
  | {
      type: "body";
      parameters: readonly TemplateParameterDefinition[];
    }
  | {
      type: "button";
      subType: "url" | "quick_reply";
      index: string;
      parameters: readonly TemplateParameterDefinition[];
    };

export interface TemplateDefinition {
  language: string;
  components?: readonly TemplateComponentDefinition[];
}

export type TemplateRegistry = Record<string, TemplateDefinition>;

type TemplateParameterDefinitionUnion<
  TTemplate extends TemplateDefinition,
> = TTemplate["components"] extends readonly TemplateComponentDefinition[]
  ? TTemplate["components"][number]["parameters"][number]
  : never;

type TemplateParameterInput<
  TParameter extends TemplateParameterDefinition,
> = TParameter["type"] extends keyof TemplateParameterInputMap
  ? TemplateParameterInputMap[TParameter["type"]]
  : never;

export type TemplateParams<TTemplate extends TemplateDefinition> = Simplify<{
  [TParameter in TemplateParameterDefinitionUnion<TTemplate> as TParameter["name"]]: TemplateParameterInput<TParameter>;
}>;

export type TemplateName<TTemplates extends TemplateRegistry> = Extract<
  keyof TTemplates,
  string
>;

export type TypedTemplateOptions<
  TTemplates extends TemplateRegistry,
  TName extends TemplateName<TTemplates>,
> = {
  language?: string;
  params: TemplateParams<TTemplates[TName]>;
};

export const EMPTY_TEMPLATE_REGISTRY = defineTemplates({});

export function defineTemplates<const TTemplates extends TemplateRegistry>(
  templates: TTemplates,
): TTemplates {
  return templates;
}

export function hasConfiguredTemplates<TTemplates extends TemplateRegistry>(
  templates: TTemplates,
): boolean {
  return Object.keys(templates).length > 0;
}

export function getTemplateNames<TTemplates extends TemplateRegistry>(
  templates: TTemplates,
): TemplateName<TTemplates>[] {
  return Object.keys(templates) as TemplateName<TTemplates>[];
}

export function serializeTemplateFromRegistry(
  templates: TemplateRegistry,
  templateName: string,
  options: {
    language?: string;
    params: Record<string, unknown>;
  },
): {
  language: string;
  components?: TemplateComponent[];
};
export function serializeTemplateFromRegistry<
  TTemplates extends TemplateRegistry,
  TName extends TemplateName<TTemplates>,
>(
  templates: TTemplates,
  templateName: TName,
  options: TypedTemplateOptions<TTemplates, TName>,
): {
  language: string;
  components?: TemplateComponent[];
};
export function serializeTemplateFromRegistry(
  templates: TemplateRegistry,
  templateName: string,
  options: {
    language?: string;
    params: Record<string, unknown>;
  },
): {
  language: string;
  components?: TemplateComponent[];
} {
  const templateDefinition = templates[templateName];
  if (!templateDefinition) {
    throw new Error(
      `[betterZap] Template "${String(templateName)}" is not configured.`,
    );
  }

  const params = (options.params ?? {}) as Record<string, unknown>;
  const components = templateDefinition.components ?? [];
  const expectedParameterNames = components.flatMap((component) =>
    component.parameters.map((parameter) => parameter.name),
  );
  const unexpectedParameterNames = Object.keys(params).filter(
    (parameterName) => !expectedParameterNames.includes(parameterName),
  );

  if (unexpectedParameterNames.length > 0) {
    throw new Error(
      `[betterZap] Unexpected template params for "${String(templateName)}": ${unexpectedParameterNames.join(", ")}`,
    );
  }

  const serializedComponents = components
    .filter((component) => component.parameters.length > 0)
    .map((component) => ({
      type: component.type,
      ...(component.type === "button"
        ? {
            sub_type: component.subType,
            index: component.index,
          }
        : {}),
      parameters: component.parameters.map((parameter) => {
        if (!(parameter.name in params)) {
          throw new Error(
            `[betterZap] Missing template param "${parameter.name}" for "${String(templateName)}".`,
          );
        }

        return serializeTemplateParameter(
          parameter,
          params[parameter.name] as TemplateParameterInput<typeof parameter>,
        );
      }),
    })) satisfies TemplateComponent[];

  return {
    language: options.language ?? templateDefinition.language,
    components: serializedComponents.length > 0 ? serializedComponents : undefined,
  };
}

function serializeTemplateParameter<
  TParameter extends TemplateParameterDefinition,
>(
  parameter: TParameter,
  value: TemplateParameterInput<TParameter>,
): TemplateParameter {
  switch (parameter.type) {
    case "text":
      return {
        type: "text",
        text: value as TemplateParameterInputMap["text"],
      };
    case "payload":
      return {
        type: "payload",
        payload: value as TemplateParameterInputMap["payload"],
      };
    case "location":
      return {
        type: "location",
        location: value as TemplateParameterInputMap["location"],
      };
    case "image":
      return {
        type: "image",
        image: value as TemplateParameterInputMap["image"],
      };
    case "video":
      return {
        type: "video",
        video: value as TemplateParameterInputMap["video"],
      };
    case "document":
      return {
        type: "document",
        document: value as TemplateParameterInputMap["document"],
      };
    case "currency":
      return {
        type: "currency",
        currency: value as TemplateParameterInputMap["currency"],
      };
    case "date_time":
      return {
        type: "date_time",
        date_time: value as TemplateParameterInputMap["date_time"],
      };
  }
}
