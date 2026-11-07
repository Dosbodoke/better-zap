import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LinkPreviewCard, MessageBubble } from "@better-zap/react";
import type { LinkPreview, LinkPreviewCardProps } from "@better-zap/react";
// Documented subpath import (see README "Subpath imports").
import { LinkPreviewCard as SubpathLinkPreviewCard } from "@better-zap/react/link-preview-card";

// Ensure type exports emit in declarations (compile-time only).
type _TypeExports = [LinkPreview, LinkPreviewCardProps];
void 0 as unknown as _TypeExports;

const preview: LinkPreview = {
  url: "https://www.amazon.com.br/dp/B07XQM4PH3?tag=promosmercado-20",
  title: "Oferta: Whiskey Jameson Caskmates IPA, 750 ml",
  description: "Compre Whiskey Jameson Caskmates IPA na Amazon.",
  image: "https://m.media-amazon.com/images/I/51x2X2mg+9L.jpg",
  siteName: "Amazon.com.br",
};

function card(): HTMLAnchorElement {
  return document.querySelector<HTMLAnchorElement>('[data-slot="link-preview"]')!;
}

describe("LinkPreviewCard (published surface)", () => {
  it("is the same component from the root and the subpath", () => {
    expect(SubpathLinkPreviewCard).toBe(LinkPreviewCard);
  });

  it("renders image, title, description and domain without www.", () => {
    render(<LinkPreviewCard preview={preview} />);

    const link = screen.getByRole("link");
    expect(link.getAttribute("href")).toBe(preview.url);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");

    const image = link.querySelector("img")!;
    expect(image.getAttribute("src")).toBe(preview.image);
    expect(image.getAttribute("alt")).toBe("");
    expect(image.getAttribute("referrerpolicy")).toBe("no-referrer");
    expect(image.className).toContain("max-h-[180px]");
    expect(image.className).toContain("object-cover");

    const title = screen.getByText(preview.title);
    expect(title.className).toContain("line-clamp-2");
    const description = screen.getByText(preview.description!);
    expect(description.className).toContain("line-clamp-2");
    expect(screen.getByText("amazon.com.br")).toBeTruthy();
  });

  it("omits the image and description when absent", () => {
    render(
      <LinkPreviewCard
        preview={{ url: "https://example.com/a", title: "Only a title" }}
      />,
    );
    expect(card().querySelector("img")).toBeNull();
    expect(screen.getByText("Only a title")).toBeTruthy();
    expect(screen.getByText("example.com")).toBeTruthy();
    expect(card().querySelectorAll("span > span")).toHaveLength(2);
  });

  it("hides the image when it fails to load", () => {
    render(<LinkPreviewCard preview={preview} />);
    fireEvent.error(card().querySelector("img")!);
    expect(card().querySelector("img")).toBeNull();
    expect(screen.getByText(preview.title)).toBeTruthy();
  });

  it("shows a new image after a failed one when the preview changes", () => {
    const { rerender } = render(<LinkPreviewCard preview={preview} />);
    fireEvent.error(card().querySelector("img")!);

    rerender(
      <LinkPreviewCard
        preview={{ ...preview, image: "https://cdn.example.com/other.jpg" }}
      />,
    );
    expect(card().querySelector("img")?.getAttribute("src")).toBe(
      "https://cdn.example.com/other.jpg",
    );
  });

  it("tints the card to match the bubble variant", () => {
    const { rerender } = render(<LinkPreviewCard preview={preview} />);
    expect(card().className).toContain("bg-[#f0f2f5]");

    rerender(<LinkPreviewCard preview={preview} variant="primary" />);
    expect(card().className).toContain("bg-[#d1f4cc]");

    rerender(<LinkPreviewCard preview={preview} variant="destructive" />);
    expect(card().className).toContain("bg-[#f8cdc9]");
  });

  it("does not link to non-http URLs and falls back to siteName", () => {
    render(
      <LinkPreviewCard
        preview={{ url: "javascript:alert(1)", title: "Bad", siteName: "Site" }}
      />,
    );
    expect(card().hasAttribute("href")).toBe(false);
    expect(screen.getByText("Site")).toBeTruthy();
  });

  it("forwards anchor props and merges className", () => {
    render(
      <LinkPreviewCard
        preview={preview}
        className="custom-card"
        aria-label="Abrir link"
        target="_self"
      />,
    );
    const link = screen.getByRole("link", { name: "Abrir link" });
    expect(link.className).toContain("custom-card");
    expect(link.getAttribute("target")).toBe("_self");
  });
});

describe("MessageBubble linkPreview", () => {
  const content =
    "Whiskey Jameson Caskmates IPA Irlandês - 750 ml\n\n*Por R$ 79,90*\n\nLoja Oficial na Amazon:\nhttps://www.amazon.com.br/dp/B07XQM4PH3?tag=promosmercado-20";

  it("renders the card inside the bubble, above the text", () => {
    const { container } = render(
      <MessageBubble
        content={content}
        sender="user"
        timestamp="10:42"
        linkPreview={preview}
      />,
    );

    const bubble = container.querySelector('[data-variant="default"]')!;
    expect(bubble.contains(card())).toBe(true);
    expect(bubble.className).toContain("w-[330px]");

    const price = screen.getByText("Por R$ 79,90");
    expect(
      card().compareDocumentPosition(price) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(card().className).toContain("bg-[#f0f2f5]");
    // The message's own link still renders as text.
    expect(
      screen.getByRole("link", { name: preview.url }).getAttribute("href"),
    ).toBe(preview.url);
  });

  it("uses the outgoing and failed tints", () => {
    const { rerender } = render(
      <MessageBubble
        content={content}
        sender="bot"
        status="read"
        linkPreview={preview}
      />,
    );
    expect(card().className).toContain("bg-[#d1f4cc]");

    rerender(
      <MessageBubble
        content={content}
        sender="bot"
        status="failed"
        linkPreview={preview}
      />,
    );
    expect(card().className).toContain("bg-[#f8cdc9]");
  });

  it("renders the card below the outgoing label", () => {
    render(
      <MessageBubble
        content={content}
        sender="bot"
        status="sent"
        label="Assistente"
        linkPreview={preview}
      />,
    );
    const label = screen.getByText("Assistente");
    expect(
      label.compareDocumentPosition(card()) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("renders exactly as before without a preview", () => {
    const props = {
      content,
      sender: "bot" as const,
      status: "delivered",
      timestamp: "10:42",
      label: "Assistente",
      groupPosition: "first" as const,
    };
    const baseline = render(<MessageBubble {...props} />).container.innerHTML;
    const withNull = render(<MessageBubble {...props} linkPreview={null} />)
      .container.innerHTML;
    const withUndefined = render(
      <MessageBubble {...props} linkPreview={undefined} />,
    ).container.innerHTML;

    expect(withNull).toBe(baseline);
    expect(withUndefined).toBe(baseline);
    expect(baseline).not.toContain("link-preview");
    expect(baseline).not.toContain("w-[330px]");
  });
});
