import { describe, expect, it } from "vitest";
import { firstLinkIn, parseOpenGraph } from "./index";

describe("firstLinkIn", () => {
  it("returns the first http(s) link", () => {
    expect(
      firstLinkIn("Loja:\nhttps://www.amazon.com.br/dp/B07XQM4PH3?tag=x-20 e http://b.com"),
    ).toBe("https://www.amazon.com.br/dp/B07XQM4PH3?tag=x-20");
  });

  it("returns null without a link", () => {
    expect(firstLinkIn("no links here, just www.example.com")).toBeNull();
    expect(firstLinkIn("")).toBeNull();
    expect(firstLinkIn(null)).toBeNull();
    expect(firstLinkIn(undefined)).toBeNull();
    expect(firstLinkIn("ftp://example.com/file")).toBeNull();
  });

  it.each([
    ["see https://example.com/a.", "https://example.com/a"],
    ["(https://example.com/a)", "https://example.com/a"],
    ["https://example.com/a?!", "https://example.com/a"],
    ['"https://example.com/a";', "https://example.com/a"],
    ["'https://example.com/a':", "https://example.com/a"],
    ["[https://example.com/a]", "https://example.com/a"],
  ])("trims trailing punctuation from %s", (text, expected) => {
    expect(firstLinkIn(text)).toBe(expected);
  });

  it("keeps closing brackets that balance one inside the URL", () => {
    expect(firstLinkIn("https://en.wikipedia.org/wiki/Foo_(bar)")).toBe(
      "https://en.wikipedia.org/wiki/Foo_(bar)",
    );
    expect(firstLinkIn("(see https://en.wikipedia.org/wiki/Foo_(bar)).")).toBe(
      "https://en.wikipedia.org/wiki/Foo_(bar)",
    );
  });

  it("returns null when only punctuation follows the scheme", () => {
    expect(firstLinkIn("https://.")).toBeNull();
  });
});

describe("parseOpenGraph", () => {
  const pageUrl = "https://www.example.com/products/1";

  it("reads og: tags", () => {
    const html = `<!doctype html><html><head>
      <meta property="og:title" content="Oferta: Whiskey Jameson Caskmates IPA, 750 ml">
      <meta property="og:description" content="Compre agora">
      <meta property="og:image" content="https://m.media-amazon.com/images/I/51x2X2mg+9L.jpg">
      <meta property="og:site_name" content="Amazon.com.br">
      <title>Ignored</title>
    </head><body></body></html>`;

    expect(parseOpenGraph(html, pageUrl)).toEqual({
      url: pageUrl,
      title: "Oferta: Whiskey Jameson Caskmates IPA, 750 ml",
      description: "Compre agora",
      image: "https://m.media-amazon.com/images/I/51x2X2mg+9L.jpg",
      siteName: "Amazon.com.br",
    });
  });

  it("falls back to twitter: tags", () => {
    const html = `<head>
      <meta name="twitter:title" content="Tweet title">
      <meta name="twitter:description" content="Tweet description">
      <meta name="twitter:image" content="/card.png">
    </head>`;

    expect(parseOpenGraph(html, pageUrl)).toEqual({
      url: pageUrl,
      title: "Tweet title",
      description: "Tweet description",
      image: "https://www.example.com/card.png",
    });
  });

  it("falls back to <title> and the description meta tag", () => {
    const html = `<head>
      <title>
        Plain   page
      </title>
      <meta name="description" content="A plain description">
    </head>`;

    expect(parseOpenGraph(html, pageUrl)).toEqual({
      url: pageUrl,
      title: "Plain page",
      description: "A plain description",
    });
  });

  it("prefers og: over twitter: over <title>", () => {
    const html = `<head>
      <title>Title tag</title>
      <meta name="twitter:title" content="Twitter title">
      <meta property="og:title" content="OG title">
    </head>`;

    expect(parseOpenGraph(html, pageUrl)?.title).toBe("OG title");
  });

  it("skips empty tags and keeps the first value of a repeated tag", () => {
    const html = `<head>
      <meta property="og:title" content="  ">
      <meta property="og:image" content="https://cdn.example.com/1.jpg">
      <meta property="og:image" content="https://cdn.example.com/2.jpg">
      <title>Fallback</title>
    </head>`;

    expect(parseOpenGraph(html, pageUrl)).toEqual({
      url: pageUrl,
      title: "Fallback",
      image: "https://cdn.example.com/1.jpg",
    });
  });

  it("decodes named and numeric entities", () => {
    const html = `<head>
      <meta property="og:title" content="Tom &amp; Jerry &#8211; &quot;Ep. 1&quot; &#x1F600; &hellip;">
      <meta property="og:description" content="Irland&ecirc;s, a&ccedil;&atilde;o, &Aacute;gua &yuml; &frac12; &unknown; &constructor; &#0; &AMP;">
    </head>`;

    const preview = parseOpenGraph(html, pageUrl);
    expect(preview?.title).toBe('Tom & Jerry – "Ep. 1" 😀 …');
    // Unknown, invalid and wrongly cased entities are left as written.
    expect(preview?.description).toBe(
      "Irlandês, ação, Água ÿ ½ &unknown; &constructor; &#0; &AMP;",
    );
  });

  it("resolves relative and protocol-relative images against the page", () => {
    const relative = `<head><meta property="og:title" content="T"><meta property="og:image" content="../img/a.jpg"></head>`;
    const protocolRelative = `<head><meta property="og:title" content="T"><meta property="og:image" content="//cdn.example.com/b.jpg"></head>`;

    expect(parseOpenGraph(relative, pageUrl)?.image).toBe(
      "https://www.example.com/img/a.jpg",
    );
    expect(parseOpenGraph(protocolRelative, pageUrl)?.image).toBe(
      "https://cdn.example.com/b.jpg",
    );
  });

  it("keeps only http(s) images", () => {
    for (const image of [
      "javascript:alert(1)",
      "data:image/png;base64,AAAA",
      "file:///etc/passwd",
    ]) {
      const html = `<head><meta property="og:title" content="T"><meta property="og:image" content="${image}"></head>`;
      expect(parseOpenGraph(html, pageUrl)).toEqual({ url: pageUrl, title: "T" });
    }
  });

  it("falls through to the next image candidate when one is unusable", () => {
    const html = `<head>
      <meta property="og:title" content="T">
      <meta property="og:image" content="javascript:alert(1)">
      <meta name="twitter:image" content="https://cdn.example.com/t.jpg">
    </head>`;

    expect(parseOpenGraph(html, pageUrl)?.image).toBe("https://cdn.example.com/t.jpg");
  });

  it("handles single quotes, unquoted values, attribute order and casing", () => {
    const html = `<HEAD>
      <META content='Reordered title' PROPERTY='OG:TITLE' />
      <meta name=description content=unquoted>
    </HEAD>`;

    expect(parseOpenGraph(html, pageUrl)).toEqual({
      url: pageUrl,
      title: "Reordered title",
      description: "unquoted",
    });
  });

  it("does not read attribute-like text inside another attribute's value", () => {
    const html = `<head>
      <meta content="x name=og:title" property="og:description">
      <meta property="og:title" content="Real title">
    </head>`;

    expect(parseOpenGraph(html, pageUrl)).toEqual({
      url: pageUrl,
      title: "Real title",
      description: "x name=og:title",
    });
  });

  it("ignores tags after </head>", () => {
    const html = `<head><title>Head title</title></head>
      <body><meta property="og:title" content="Body title"></body>`;

    expect(parseOpenGraph(html, pageUrl)?.title).toBe("Head title");
  });

  it("works on a truncated page", () => {
    const html = `<html><head><meta property="og:title" content="Partial"><meta prop`;

    expect(parseOpenGraph(html, pageUrl)?.title).toBe("Partial");
  });

  it("returns null without a title", () => {
    expect(parseOpenGraph("<head><meta property=\"og:image\" content=\"/a.jpg\"></head>", pageUrl)).toBeNull();
    expect(parseOpenGraph("", pageUrl)).toBeNull();
  });

  it("omits the image when the page URL is not absolute", () => {
    const html = `<head><meta property="og:title" content="T"><meta property="og:image" content="/a.jpg"></head>`;

    expect(parseOpenGraph(html, "not a url")).toEqual({ url: "not a url", title: "T" });
  });
});
