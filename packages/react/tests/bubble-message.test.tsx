import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  Bubble,
  BubbleContent,
  BubbleGroup,
  BubbleReactions,
  Message,
  MessageAvatar,
  MessageBubble,
  MessageContent,
  MessageFooter,
  MessageGroup,
  MessageHeader,
} from "@better-zap/react";

describe("Bubble", () => {
  it("defaults to variant default, align start, and start tail class", () => {
    const { container } = render(<Bubble data-testid="bubble">hi</Bubble>);
    const el = container.querySelector("[data-testid=bubble]") as HTMLElement;
    expect(el.getAttribute("data-variant")).toBe("default");
    expect(el.getAttribute("data-align")).toBe("start");
    expect(el.className).toContain("rounded-tl-none");
  });

  it.each([
    ["default", "start"],
    ["primary", "end"],
    ["destructive", "start"],
    ["outline", "end"],
    ["muted", "start"],
  ] as const)("renders variant %s and align %s with data attributes", (variant, align) => {
    const { container } = render(
      <Bubble variant={variant} align={align} data-testid="bubble">
        x
      </Bubble>,
    );
    const el = container.querySelector("[data-testid=bubble]") as HTMLElement;
    expect(el.getAttribute("data-variant")).toBe(variant);
    expect(el.getAttribute("data-align")).toBe(align);
  });

  it("merges consumer className with variant classes", () => {
    const { container } = render(
      <Bubble className="consumer-class" data-testid="bubble">
        x
      </Bubble>,
    );
    const el = container.querySelector("[data-testid=bubble]") as HTMLElement;
    expect(el.className).toContain("consumer-class");
    expect(el.className).toContain("bg-gray-100");
  });
});

describe("BubbleContent render prop", () => {
  it("renders an anchor with merged className and part children", () => {
    render(
      <BubbleContent render={<a href="https://example.com" />}>
        link body
      </BubbleContent>,
    );
    const link = screen.getByRole("link", { name: "link body" });
    expect(link.tagName).toBe("A");
    expect(link.getAttribute("href")).toBe("https://example.com");
    expect(link.className).toContain("whitespace-pre-wrap");
    expect(link.className).toContain("break-words");
    link.focus();
    expect(document.activeElement).toBe(link);
  });

  it("renders a button with merged className and is focusable", () => {
    render(
      <BubbleContent render={<button type="button" />}>
        press me
      </BubbleContent>,
    );
    const button = screen.getByRole("button", { name: "press me" });
    expect(button.tagName).toBe("BUTTON");
    expect(button.getAttribute("type")).toBe("button");
    expect(button.className).toContain("select-text");
    button.focus();
    expect(document.activeElement).toBe(button);
  });
});

describe("Message / Bubble anatomy", () => {
  it("mounts full compound tree and applies end alignment", () => {
    const { container } = render(
      <Message align="end" data-testid="message">
        <MessageAvatar data-testid="avatar">A</MessageAvatar>
        <MessageContent>
          <MessageHeader>Header</MessageHeader>
          <Bubble variant="primary" align="end" data-testid="bubble">
            <BubbleContent>Body</BubbleContent>
            <BubbleReactions data-testid="reactions">👍</BubbleReactions>
          </Bubble>
          <MessageFooter>Footer</MessageFooter>
        </MessageContent>
      </Message>,
    );

    const row = container.querySelector("[data-testid=message]") as HTMLElement;
    expect(row.getAttribute("data-align")).toBe("end");
    expect(row.className).toContain("justify-end");
    expect(screen.getByText("Header")).toBeTruthy();
    expect(screen.getByText("Body")).toBeTruthy();
    expect(screen.getByText("Footer")).toBeTruthy();
    expect(screen.getByText("👍")).toBeTruthy();
    expect(container.querySelector("[data-testid=avatar]")).toBeTruthy();
    expect(container.querySelector("[data-testid=reactions]")).toBeTruthy();
  });
});

describe("groups", () => {
  it("BubbleGroup renders children and data-align", () => {
    const { container } = render(
      <BubbleGroup align="end" data-testid="group">
        <Bubble>one</Bubble>
        <Bubble>two</Bubble>
      </BubbleGroup>,
    );
    const group = container.querySelector("[data-testid=group]") as HTMLElement;
    expect(group.getAttribute("data-align")).toBe("end");
    expect(screen.getByText("one")).toBeTruthy();
    expect(screen.getByText("two")).toBeTruthy();
  });

  it("MessageGroup stacks children", () => {
    render(
      <MessageGroup>
        <Message align="start">
          <MessageContent>
            <Bubble>
              <BubbleContent>a</BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
        <Message align="end">
          <MessageContent>
            <Bubble align="end" variant="primary">
              <BubbleContent>b</BubbleContent>
            </Bubble>
          </MessageContent>
        </Message>
      </MessageGroup>,
    );
    expect(screen.getByText("a")).toBeTruthy();
    expect(screen.getByText("b")).toBeTruthy();
  });
});

describe("MessageBubble adapter smoke", () => {
  it("still renders domain messages", () => {
    render(
      <MessageBubble content="adapter ok" sender="bot" status="sent" />,
    );
    expect(screen.getByText("adapter ok")).toBeTruthy();
    expect(screen.getByText("✓")).toBeTruthy();
  });
});
