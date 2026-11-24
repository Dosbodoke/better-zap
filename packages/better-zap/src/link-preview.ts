export interface LinkPreview {
  url: string;
  title: string;
  description?: string;
  image?: string;
  siteName?: string;
}

const LINK_PATTERN = /https?:\/\/[^\s]+/;

const TRAILING_PUNCTUATION = /[).,!?;:'"\]]$/;

export function firstLinkIn(text: string | null | undefined): string | null {
  const match = text ? LINK_PATTERN.exec(text) : null;
  if (!match) {
    return null;
  }

  let link = match[0];
  while (TRAILING_PUNCTUATION.test(link)) {
    const last = link[link.length - 1];
    const open = last === ")" ? "(" : last === "]" ? "[" : null;
    if (open && count(link, open) >= count(link, last!)) {
      break;
    }
    link = link.slice(0, -1);
  }

  return isHttpUrl(link) ? link : null;
}

export function parseOpenGraph(
  html: string,
  pageUrl: string,
): LinkPreview | null {
  const head = html.split(/<\/head\s*>/i)[0] ?? html;

  const meta = new Map<string, string>();
  for (const [tag] of head.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = readAttributes(tag);
    const key = (attributes.get("property") ?? attributes.get("name"))
      ?.trim()
      .toLowerCase();
    const content = attributes.get("content");
    if (!key || content === undefined || meta.has(key)) {
      continue;
    }
    const value = clean(content);
    if (value) {
      meta.set(key, value);
    }
  }

  const titleTag = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(head)?.[1];
  const title =
    meta.get("og:title") ??
    meta.get("twitter:title") ??
    (titleTag ? clean(titleTag) : "");
  if (!title) {
    return null;
  }

  const preview: LinkPreview = { url: pageUrl, title };

  const description =
    meta.get("og:description") ??
    meta.get("twitter:description") ??
    meta.get("description");
  if (description) {
    preview.description = description;
  }

  const image = firstHttpUrl(
    [
      meta.get("og:image:secure_url"),
      meta.get("og:image"),
      meta.get("og:image:url"),
      meta.get("twitter:image"),
      meta.get("twitter:image:src"),
    ],
    pageUrl,
  );
  if (image) {
    preview.image = image;
  }

  const siteName = meta.get("og:site_name");
  if (siteName) {
    preview.siteName = siteName;
  }

  return preview;
}

function count(text: string, char: string): number {
  return text.split(char).length - 1;
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}

function clean(value: string): string {
  return decodeEntities(value).replace(/\s+/g, " ").trim();
}

const ATTRIBUTE_PATTERN =
  /([^\s"'<>/=]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g;

function readAttributes(tag: string): Map<string, string> {
  const attributes = new Map<string, string>();
  for (const match of tag.slice(5).matchAll(ATTRIBUTE_PATTERN)) {
    const name = match[1]!.toLowerCase();
    if (!attributes.has(name)) {
      attributes.set(name, match[2] ?? match[3] ?? match[4] ?? "");
    }
  }
  return attributes;
}

function firstHttpUrl(
  candidates: Array<string | undefined>,
  base: string,
): string | undefined {
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate, base);
      if (url.protocol === "http:" || url.protocol === "https:") {
        return url.toString();
      }
    } catch {
    }
  }
  return undefined;
}

const LATIN1_ENTITY_NAMES =
  "nbsp iexcl cent pound curren yen brvbar sect uml copy ordf laquo not shy reg macr deg plusmn sup2 sup3 acute micro para middot cedil sup1 ordm raquo frac14 frac12 frac34 iquest Agrave Aacute Acirc Atilde Auml Aring AElig Ccedil Egrave Eacute Ecirc Euml Igrave Iacute Icirc Iuml ETH Ntilde Ograve Oacute Ocirc Otilde Ouml times Oslash Ugrave Uacute Ucirc Uuml Yacute THORN szlig agrave aacute acirc atilde auml aring aelig ccedil egrave eacute ecirc euml igrave iacute icirc iuml eth ntilde ograve oacute ocirc otilde ouml divide oslash ugrave uacute ucirc uuml yacute thorn yuml".split(
    " ",
  );

const NAMED_ENTITIES: Record<string, string> = {
  ...Object.fromEntries(
    LATIN1_ENTITY_NAMES.map((name, index) => [
      name,
      String.fromCodePoint(0xa0 + index),
    ]),
  ),
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  lsquo: "‘",
  rsquo: "’",
  ldquo: "“",
  rdquo: "”",
  bull: "•",
  trade: "™",
  euro: "€",
};

function decodeEntities(value: string): string {
  return value.replace(
    /&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]*);/gi,
    (entity, code: string) => {
      if (code[0] === "#") {
        const point =
          code[1] === "x" || code[1] === "X"
            ? Number.parseInt(code.slice(2), 16)
            : Number.parseInt(code.slice(1), 10);
        return point > 0 && point <= 0x10ffff
          ? String.fromCodePoint(point)
          : entity;
      }
      return Object.hasOwn(NAMED_ENTITIES, code) ? NAMED_ENTITIES[code]! : entity;
    },
  );
}
