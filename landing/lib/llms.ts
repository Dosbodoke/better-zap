import { i18n } from "#lib/i18n";
import { source } from "#lib/source";

type DocPage = NonNullable<ReturnType<typeof source.getPage>>;
type Language = (typeof i18n.languages)[number];

const FRONTMATTER_PATTERN = /^---\r?\n[\s\S]*?\r?\n---\r?\n*/;
const CODE_FENCE_PATTERN = /(```[\s\S]*?```)/g;
const TABS_PATTERN = /<Tabs\b[^>]*>([\s\S]*?)<\/Tabs>/g;
const TAB_PATTERN = /<Tab\b([^>]*)>([\s\S]*?)<\/Tab>/g;
const CARDS_PATTERN = /<\/?Cards\b[^>]*>\s*/g;
const SELF_CLOSING_CARD_PATTERN = /<Card\b([^>]*)\/>/g;
const BLOCK_CARD_PATTERN = /<Card\b([^>]*)>([\s\S]*?)<\/Card>/g;
const ATTRIBUTE_PATTERN = /([A-Za-z_:][-A-Za-z0-9_:]*)=(["'])(.*?)\2/g;
const MARKDOWN_LINK_PATTERN = /(?<!!)\[([^\]]+)\]\(([^)]+)\)/g;

const languageLabels: Record<Language, string> = {
  en: "English",
  "pt-BR": "Português",
};
const LLMS_INDEX_PATH = "/docs/llms.txt";
const LLMS_PAGE_BASE_PATH = "/docs/llms";

export const LLM_TEXT_ERROR = `# Documentation Not Available

The requested Better Zap documentation page could not be loaded at this time.

Try another page from [${LLMS_INDEX_PATH}](${LLMS_INDEX_PATH}) or open the standard documentation route instead.`;

export const LLM_TEXT_NOT_FOUND = `# Documentation Not Found

The requested Better Zap documentation page does not exist.

Check [${LLMS_INDEX_PATH}](${LLMS_INDEX_PATH}) for the current list of available markdown pages.`;

export function getLlmsPageUrl(page: Pick<DocPage, "url">): string {
  const segments = toLlmsPathSegments(page.url);
  const lastIndex = segments.length - 1;

  return `${LLMS_PAGE_BASE_PATH}/${segments
    .map((segment, index) => (index === lastIndex ? `${segment}.md` : segment))
    .join("/")}`;
}

export function parseLlmsSlug(slug: string[] | undefined): {
  language: Language;
  slugs: string[];
} | null {
  if (!slug || slug.length === 0) return null;

  let language: Language = i18n.defaultLanguage;
  let segments = [...slug];

  if (isLanguage(segments[0])) {
    language = segments[0];
    segments = segments.slice(1);
  }

  if (segments[0] === "docs") {
    segments = segments.slice(1);
  }

  if (segments.length === 0) return null;

  const normalized = [...segments];
  const lastIndex = normalized.length - 1;
  const lastSegment = normalized[lastIndex];

  if (lastSegment.endsWith(".md")) {
    normalized[lastIndex] = lastSegment.slice(0, -3);
  }

  return normalized.every(Boolean) ? { language, slugs: normalized } : null;
}

export function getLlmsStaticParams(): Array<{ slug: string[] }> {
  const pages = new Map<string, DocPage>();

  for (const language of i18n.languages) {
    for (const page of source.getPages(language)) {
      pages.set(page.url, page);
    }
  }

  return Array.from(pages.values()).map((page) => ({
    slug: toLlmsPathSegments(page.url).map((segment, index, segments) =>
      index === segments.length - 1 ? `${segment}.md` : segment,
    ),
  }));
}

export function renderLlmsIndex(): string {
  const languageSections = i18n.languages
    .map((language) => ({
      language,
      pages: source.getPages(language),
    }))
    .filter((section) => section.pages.length > 0);

  const multipleLanguages = languageSections.length > 1;
  let content = `# Better Zap Documentation

> AI-friendly markdown exports for Better Zap docs. Each link points to the same page as plain Markdown.

`;

  for (const section of languageSections) {
    if (multipleLanguages) {
      content += `## ${languageLabels[section.language]} (${section.language})\n\n`;
    }

    for (const group of groupPages(section.pages)) {
      content += `### ${group.title}\n\n`;

      for (const page of group.pages) {
        const description = getPageDescription(page);
        content += `- [${getPageTitle(page)}](${getLlmsPageUrl(page)})`;
        if (description) {
          content += `: ${description}`;
        }
        content += "\n";
      }

      content += "\n";
    }
  }

  return `${content.trimEnd()}\n`;
}

export function renderPageAsMarkdown(page: DocPage, language: Language): string {
  const rawContent = getPageContent(page);
  const markdownBody = transformMarkdown(
    stripFrontmatter(rawContent),
    language,
    page.path,
  );
  const description = getPageDescription(page);

  let content = `# ${getPageTitle(page)}\n\n`;

  if (description) {
    content += `${description}\n\n`;
  }

  content += markdownBody.trim();

  return `${content.trimEnd()}\n`;
}

function isLanguage(value: string): value is Language {
  return i18n.languages.includes(value as Language);
}

function groupPages(pages: DocPage[]): Array<{ title: string; pages: DocPage[] }> {
  const groups = new Map<string, { title: string; pages: DocPage[] }>();

  for (const page of pages) {
    const key = page.slugs[0] ?? "";
    const title = key ? formatSectionTitle(key) : "Overview";
    const existing = groups.get(key);

    if (existing) {
      existing.pages.push(page);
      continue;
    }

    groups.set(key, { title, pages: [page] });
  }

  return Array.from(groups.values());
}

function toLlmsPathSegments(pageUrl: string): string[] {
  return pageUrl.split("/").filter(Boolean).filter((segment) => segment !== "docs");
}

function formatSectionTitle(value: string): string {
  return value
    .split("-")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

function getPageTitle(page: DocPage): string {
  const data = page.data as { title?: string };

  return typeof data.title === "string" && data.title.length > 0
    ? data.title
    : page.slugs.at(-1) ?? "Untitled";
}

function getPageDescription(page: DocPage): string {
  const data = page.data as { description?: string };

  return typeof data.description === "string" ? data.description : "";
}

function getPageContent(page: DocPage): string {
  const data = page.data as { content?: string };

  return typeof data.content === "string" ? data.content : "";
}

function stripFrontmatter(content: string): string {
  return content.replace(FRONTMATTER_PATTERN, "").trim();
}

function transformMarkdown(
  content: string,
  language: Language,
  currentPath: string,
): string {
  return content
    .split(CODE_FENCE_PATTERN)
    .map((segment) =>
      segment.startsWith("```")
        ? segment
        : transformNonCodeMarkdown(segment, language, currentPath),
    )
    .join("");
}

function transformNonCodeMarkdown(
  content: string,
  language: Language,
  currentPath: string,
): string {
  let result = content.replace(TABS_PATTERN, (_match, tabContent: string) =>
    renderTabs(tabContent, language, currentPath),
  );

  result = result.replace(
    BLOCK_CARD_PATTERN,
    (_match, rawAttributes: string, body: string) =>
      renderCard(rawAttributes, body, language, currentPath),
  );
  result = result.replace(
    SELF_CLOSING_CARD_PATTERN,
    (_match, rawAttributes: string) =>
      renderCard(rawAttributes, "", language, currentPath),
  );
  result = result.replace(CARDS_PATTERN, "");
  result = result.replace(MARKDOWN_LINK_PATTERN, (_match, label, href: string) => {
    const rewrittenHref = rewriteHref(href, language, currentPath);
    return `[${label}](${rewrittenHref})`;
  });

  return result;
}

function renderTabs(
  tabContent: string,
  language: Language,
  currentPath: string,
): string {
  const sections = Array.from(tabContent.matchAll(TAB_PATTERN)).map(
    ([, rawAttributes, body]) => {
      const attributes = parseAttributes(rawAttributes);
      const label = attributes.value ?? attributes.title ?? "Tab";
      const content = transformMarkdown(body.trim(), language, currentPath);

      return `### ${label}\n\n${content}`;
    },
  );

  if (sections.length === 0) return tabContent;

  return sections.join("\n\n");
}

function renderCard(
  rawAttributes: string,
  body: string,
  language: Language,
  currentPath: string,
): string {
  const attributes = parseAttributes(rawAttributes);
  const title = attributes.title ?? "Untitled";
  const href = attributes.href
    ? rewriteHref(attributes.href, language, currentPath)
    : undefined;
  const description = body.trim()
    ? collapseWhitespace(transformMarkdown(body.trim(), language, currentPath))
    : "";

  const label = href ? `[${title}](${href})` : title;
  return description ? `- ${label}: ${description}` : `- ${label}`;
}

function parseAttributes(input: string): Record<string, string> {
  const attributes: Record<string, string> = {};

  for (const match of input.matchAll(ATTRIBUTE_PATTERN)) {
    attributes[match[1]] = match[3];
  }

  return attributes;
}

function rewriteHref(
  href: string,
  language: Language,
  currentPath: string,
): string {
  if (
    href.startsWith("#") ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:") ||
    /^[a-z][a-z0-9+.-]*:/i.test(href)
  ) {
    return href;
  }

  const resolved = source.getPageByHref(href, {
    language,
    dir: currentPath,
  });

  if (!resolved) return href;

  const hash = resolved.hash ? `#${resolved.hash}` : "";
  return `${getLlmsPageUrl(resolved.page)}${hash}`;
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}
