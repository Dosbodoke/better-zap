import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FormattedMessage, MessageBubble } from "@better-zap/react";

describe("MessageBubble (published surface)", () => {
  it("renders incoming content", () => {
    render(
      <MessageBubble content="Olá do cliente" sender="user" status="delivered" />,
    );
    expect(screen.getByText("Olá do cliente")).toBeTruthy();
  });

  it("shows single check for outgoing sent", () => {
    render(
      <MessageBubble content="enviado" sender="bot" status="sent" />,
    );
    expect(screen.getByRole("img", { name: "sent" })).toBeTruthy();
  });

  it("shows double check for delivered and read", () => {
    const { rerender } = render(
      <MessageBubble content="ok" sender="bot" status="delivered" />,
    );
    expect(screen.getByRole("img", { name: "delivered" })).toBeTruthy();

    rerender(<MessageBubble content="ok" sender="bot" status="read" />);
    const read = screen.getByRole("img", { name: "read" });
    expect(read).toBeTruthy();
    expect(read.className).toContain("text-[#53bdeb]");
  });

  it("shows failed marker for failed status", () => {
    render(<MessageBubble content="falhou" sender="bot" status="failed" />);
    const failed = screen.getByRole("img", { name: "failed" });
    expect(failed).toBeTruthy();
    expect(failed.className).toContain("text-red-500");
  });

  it("renders label only for outgoing messages", () => {
    const { rerender } = render(
      <MessageBubble
        content="com label"
        sender="bot"
        status="sent"
        label="Bot"
      />,
    );
    expect(screen.getByText("Bot")).toBeTruthy();

    rerender(
      <MessageBubble
        content="com label"
        sender="user"
        status="delivered"
        label="Bot"
      />,
    );
    expect(screen.queryByText("Bot")).toBeNull();
  });

  it("falls back to template name when content is empty", () => {
    render(
      <MessageBubble
        content=""
        sender="bot"
        status="sent"
        templateName="hello_world"
      />,
    );
    expect(screen.getByText("[Template: hello_world]")).toBeTruthy();
    // header chip also mentions the template name
    expect(screen.getByText("hello_world")).toBeTruthy();
  });

  it("falls back to unavailable content message", () => {
    render(<MessageBubble content="" sender="user" />);
    expect(screen.getByText("[Conteúdo não disponível]")).toBeTruthy();
  });
});

describe("FormattedMessage (published surface)", () => {
  it("formats bold, italic, strike, and mono", () => {
    const { container } = render(
      <FormattedMessage text="*bold* _italic_ ~strike~ `mono`" />,
    );
    expect(container.querySelector("strong")?.textContent).toBe("bold");
    expect(container.querySelector("em")?.textContent).toBe("italic");
    expect(container.querySelector("del")?.textContent).toBe("strike");
    expect(container.querySelector("code")?.textContent).toBe("mono");
  });

  it("renders links with rel noopener noreferrer", () => {
    render(<FormattedMessage text="see https://example.com/docs" />);
    const link = screen.getByRole("link", { name: "https://example.com/docs" });
    expect(link.getAttribute("href")).toBe("https://example.com/docs");
    expect(link.getAttribute("rel")).toBe("noopener noreferrer");
    expect(link.getAttribute("target")).toBe("_blank");
  });
});
