import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  templateDefinitionFromMeta,
  type MessageTemplate,
  type TemplateRegistry,
} from "better-zap";

const DEFAULT_API_VERSION = "v25.0";
const DEFAULT_INCLUDED_STATUSES = ["APPROVED", "PAUSED"];
const DEFAULT_CONFIG_FILES = [
  "better-zap.config.mjs",
  "better-zap.config.js",
  "better-zap.config.json",
];

type CliFlagValue = boolean | string;

type CliFlags = Record<string, CliFlagValue>;

type GenerateOptions = {
  accessToken?: string;
  apiVersion?: string;
  check?: boolean;
  /** Language to prefer when a template exists in several. */
  defaultLanguage?: string;
  /** Keep templates of every status, not only `APPROVED` and `PAUSED`. */
  allStatuses?: boolean;
  fetchImpl?: typeof fetch;
  output: string;
  wabaId?: string;
};

type ResolveGenerateOptionsInput = {
  cwd: string;
  env: NodeJS.ProcessEnv;
  flags: CliFlags;
};

type GenerateConfigFile = {
  templates?: Partial<GenerateOptions>;
  whatsappTemplates?: Partial<GenerateOptions>;
  output?: string;
  accessToken?: string;
  wabaId?: string;
  apiVersion?: string;
  defaultLanguage?: string;
  allStatuses?: boolean;
};

type MetaTemplateButton = {
  type?: string;
  phone_number?: string;
  text?: string;
  url?: string;
};

type MetaTemplateComponent = {
  type?: string;
  format?: string;
  text?: string;
  url?: string;
  buttons?: MetaTemplateButton[];
};

type MetaTemplate = {
  name?: string;
  language?: string;
  status?: string;
  components?: MetaTemplateComponent[];
};

export type SkippedTemplate = { name: string; language: string; reason: string };

type BuildTemplateRegistryOptions = {
  /** Language to prefer when a template exists in several. */
  defaultLanguage?: string;
  /** Statuses to keep. Defaults to `["APPROVED", "PAUSED"]`. `"all"` keeps every status. */
  includeStatuses?: readonly string[] | "all";
};

type MetaTemplatesResponse = {
  data?: MetaTemplate[];
  paging?: {
    next?: string | null;
  };
  error?: {
    message?: string;
  };
};

export function parseCliArgs(argv: string[]): {
  command: string | undefined;
  flags: CliFlags;
} {
  const args = [...argv];
  const command = args.shift();
  const flags: CliFlags = {};

  while (args.length > 0) {
    const current = args.shift();
    if (!current?.startsWith("--")) {
      continue;
    }

    const flagName = current.slice(2);
    const next = args[0];
    if (!next || next.startsWith("--")) {
      flags[flagName] = true;
      continue;
    }

    const value = args.shift();
    if (value) {
      flags[flagName] = value;
    }
  }

  return { command, flags };
}

export async function resolveGenerateOptions({
  cwd,
  env,
  flags,
}: ResolveGenerateOptionsInput): Promise<GenerateOptions> {
  const configPath =
    typeof flags.config === "string"
      ? path.resolve(cwd, flags.config)
      : await findDefaultConfigPath(cwd);
  const fileConfig = configPath ? await loadConfigFile(configPath) : {};
  const templatesConfig =
    fileConfig.templates ?? fileConfig.whatsappTemplates ?? fileConfig;

  const outputValue =
    firstDefined(
      asString(flags.output),
      templatesConfig.output,
      env.BETTER_ZAP_TEMPLATE_OUTPUT,
    ) ?? "";
  const output = outputValue ? path.resolve(cwd, outputValue) : "";

  return {
    accessToken: firstDefined(
      asString(flags["access-token"]),
      templatesConfig.accessToken,
      env.WHATSAPP_TOKEN,
      env.META_ACCESS_TOKEN,
    ),
    wabaId: firstDefined(
      asString(flags["waba-id"]),
      templatesConfig.wabaId,
      env.WHATSAPP_BUSINESS_ACCOUNT_ID,
    ),
    apiVersion: firstDefined(
      asString(flags["api-version"]),
      templatesConfig.apiVersion,
      DEFAULT_API_VERSION,
    ),
    output,
    check: Boolean(flags.check),
    defaultLanguage: firstDefined(
      asString(flags["default-language"]),
      templatesConfig.defaultLanguage,
    ),
    allStatuses: Boolean(flags["all-statuses"] ?? templatesConfig.allStatuses),
  };
}

export async function fetchAllMetaTemplates({
  accessToken,
  apiVersion,
  fetchImpl = fetch,
  wabaId,
}: Required<Pick<GenerateOptions, "accessToken" | "wabaId">> &
  Pick<GenerateOptions, "apiVersion" | "fetchImpl">): Promise<MetaTemplate[]> {
  let nextUrl: string | null =
    `https://graph.facebook.com/${apiVersion ?? DEFAULT_API_VERSION}/${wabaId}/message_templates?limit=100`;
  const templates: MetaTemplate[] = [];

  while (nextUrl) {
    const response = await fetchImpl(nextUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorPayload = (await response
        .json()
        .catch(() => ({
          error: { message: `HTTP ${response.status}` },
        }))) as MetaTemplatesResponse;
      throw new Error(
        `[better-zap generate] Meta request failed: ${errorPayload.error?.message ?? `HTTP ${response.status}`}`,
      );
    }

    const payload = (await response.json()) as MetaTemplatesResponse;
    templates.push(...(payload.data ?? []));
    nextUrl = payload.paging?.next ?? null;
  }

  return templates;
}

export function normalizeMetaTemplates(
  metaTemplates: MetaTemplate[],
): TemplateRegistry {
  return buildTemplateRegistry(metaTemplates).registry;
}

export function buildTemplateRegistry(
  metaTemplates: MetaTemplate[],
  options: BuildTemplateRegistryOptions = {},
): { registry: TemplateRegistry; skipped: SkippedTemplate[]; warnings: string[] } {
  const includeStatuses = options.includeStatuses ?? DEFAULT_INCLUDED_STATUSES;
  const skipped: SkippedTemplate[] = [];
  const definitionsByName = new Map<string, TemplateRegistry[string][]>();

  for (const template of metaTemplates) {
    if (!template.name || !template.language) {
      throw new Error(
        "[better-zap generate] Template entry is missing name or language.",
      );
    }
    const { name, language } = template;

    const status = toUpper(template.status);
    if (status && !isStatusIncluded(status, includeStatuses)) {
      skipped.push({ name, language, reason: `status ${status}` });
      continue;
    }

    const result = templateDefinitionFromMeta(
      template as Pick<MessageTemplate, "language" | "components">,
    );
    if (!result.supported) {
      skipped.push({ name, language, reason: result.reason });
      continue;
    }

    const definitions = definitionsByName.get(name) ?? [];
    definitions.push(result.definition);
    definitionsByName.set(name, definitions);
  }

  const warnings: string[] = [];
  const entries = [...definitionsByName]
    .map(([name, definitions]) => {
      const chosen = chooseLanguage(definitions, options.defaultLanguage);
      for (const other of definitions) {
        if (
          other !== chosen &&
          JSON.stringify(other.components) !== JSON.stringify(chosen.components)
        ) {
          warnings.push(
            `Template "${name}": languages ${chosen.language} and ${other.language} have different parameters; the registry uses ${chosen.language}.`,
          );
        }
      }
      return [name, chosen] as const;
    })
    .sort(([left], [right]) => left.localeCompare(right));

  return { registry: Object.fromEntries(entries), skipped, warnings };
}

export function generateTemplateRegistryFileContent(
  registry: TemplateRegistry,
): string {
  const serializedRegistry = JSON.stringify(registry, null, 2);

  return `/* eslint-disable */
// Generated by better-zap generate. Edit the source templates in Meta and re-run the generator.

import { defineTemplates } from "better-zap";

export const whatsappTemplates = defineTemplates(${serializedRegistry} as const);

export type AppWhatsAppTemplates = typeof whatsappTemplates;
`;
}

export async function writeGeneratedTemplateFile({
  check = false,
  content,
  output,
}: {
  check?: boolean;
  content: string;
  output: string;
}): Promise<void> {
  let currentContent = "";
  try {
    currentContent = await fs.readFile(output, "utf8");
  } catch (error) {
    if (
      !(error instanceof Error) ||
      !(error as NodeJS.ErrnoException).code ||
      (error as NodeJS.ErrnoException).code !== "ENOENT"
    ) {
      throw error;
    }
  }

  if (check) {
    if (currentContent !== content) {
      throw new Error(
        `[better-zap generate] ${output} is out of date. Re-run the generator.`,
      );
    }
    return;
  }

  await fs.mkdir(path.dirname(output), { recursive: true });
  await fs.writeFile(output, content, "utf8");
}

export async function runGenerateCommand({
  accessToken,
  apiVersion = DEFAULT_API_VERSION,
  allStatuses = false,
  check = false,
  defaultLanguage,
  fetchImpl = fetch,
  output,
  wabaId,
}: GenerateOptions): Promise<{
  output: string;
  templateCount: number;
  skipped: SkippedTemplate[];
  warnings: string[];
}> {
  if (!accessToken || !wabaId || !output) {
    throw new Error(
      "[better-zap generate] Missing required options. Expected access token, WABA ID, and output path.",
    );
  }

  const templates = await fetchAllMetaTemplates({
    accessToken,
    apiVersion,
    fetchImpl,
    wabaId,
  });
  const { registry, skipped, warnings } = buildTemplateRegistry(templates, {
    defaultLanguage,
    includeStatuses: allStatuses ? "all" : undefined,
  });
  const content = generateTemplateRegistryFileContent(registry);

  await writeGeneratedTemplateFile({
    check,
    content,
    output,
  });

  return {
    output,
    templateCount: Object.keys(registry).length,
    skipped,
    warnings,
  };
}

async function findDefaultConfigPath(cwd: string): Promise<string | null> {
  for (const configFile of DEFAULT_CONFIG_FILES) {
    const absolutePath = path.resolve(cwd, configFile);
    try {
      await fs.access(absolutePath);
      return absolutePath;
    } catch {
      // Try the next config filename.
    }
  }

  return null;
}

async function loadConfigFile(configPath: string): Promise<GenerateConfigFile> {
  if (configPath.endsWith(".json")) {
    const rawConfig = await fs.readFile(configPath, "utf8");
    return JSON.parse(rawConfig) as GenerateConfigFile;
  }

  const module = (await import(pathToFileURL(configPath).href)) as {
    default?: GenerateConfigFile;
  } & GenerateConfigFile;
  return module.default ?? module;
}

function isStatusIncluded(
  status: string,
  includeStatuses: readonly string[] | "all",
): boolean {
  return (
    includeStatuses === "all" ||
    includeStatuses.some((included) => toUpper(included) === status)
  );
}

/**
 * Uses `defaultLanguage` when the template has it, otherwise the language code
 * that sorts first, so the result does not depend on the order Meta returns.
 */
function chooseLanguage(
  definitions: TemplateRegistry[string][],
  defaultLanguage: string | undefined,
): TemplateRegistry[string] {
  const preferred = definitions.find(
    (definition) => definition.language === defaultLanguage,
  );
  if (preferred) {
    return preferred;
  }

  return [...definitions].sort((left, right) =>
    left.language < right.language ? -1 : left.language > right.language ? 1 : 0,
  )[0]!;
}

function toUpper(value: string | undefined): string {
  return typeof value === "string" ? value.toUpperCase() : "";
}

function firstDefined(
  ...values: Array<string | undefined>
): string | undefined {
  return values.find((value) => typeof value === "string" && value.length > 0);
}

function asString(value: CliFlagValue | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}
