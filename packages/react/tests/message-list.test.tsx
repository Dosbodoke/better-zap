import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DateDivider,
  MessageList,
  MessageViewContent,
} from "@better-zap/react";
import type {
  DateDividerRenderContext,
  MessageGroupPosition,
  MessageListProps,
  MessageRenderContext,
} from "@better-zap/react";
import {
  createMessage,
  mockMatchMedia,
  stubLegendListLayout,
} from "./helpers";

// Ensure type exports emit in declarations (compile-time only).
type _TypeExports = [
  MessageListProps,
  MessageRenderContext,
  DateDividerRenderContext,
  MessageGroupPosition,
];
void 0 as unknown as _TypeExports;

function textDocumentOrder(container: HTMLElement, labels: string[]): string[] {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const found: string[] = [];
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const value = node.textContent?.trim();
    if (value && labels.includes(value)) {
      found.push(value);
    }
  }
  return found;
}

function renderList(props: MessageListProps) {
  return render(
    <div style={{ height: 800, width: 400 }}>
      <MessageList {...props} />
    </div>,
  );
}

describe("MessageList (published surface)", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2026-04-04T15:00:00.000Z"));
    mockMatchMedia(false);
    stubLegendListLayout(800, 400);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("renders HOJE/ONTEM dividers, message order, and labels", async () => {
    const messages = [
      createMessage({
        id: "m-yesterday",
        content: "ontem",
        direction: "incoming",
        sentAt: "2026-04-03T12:00:00.000Z",
      }),
      createMessage({
        id: "m-today-1",
        content: "hoje-a",
        direction: "outgoing",
        status: "sent",
        sentAt: "2026-04-04T10:00:00.000Z",
      }),
      createMessage({
        id: "m-today-2",
        content: "hoje-b",
        direction: "incoming",
        sentAt: "2026-04-04T11:00:00.000Z",
      }),
    ];

    const { container } = renderList({
      messages,
      renderMessageLabel: (m) =>
        m.direction === "outgoing" ? "Assistente" : undefined,
    });

    await waitFor(() => {
      expect(screen.getByText("HOJE")).toBeTruthy();
      expect(screen.getByText("ONTEM")).toBeTruthy();
      expect(screen.getByText("ontem")).toBeTruthy();
      expect(screen.getByText("hoje-a")).toBeTruthy();
      expect(screen.getByText("hoje-b")).toBeTruthy();
      expect(screen.getByText("Assistente")).toBeTruthy();
    });

    // LegendList absolute-position pooling can reorder date dividers in the DOM
    // tree; assert chronological order among message bodies instead.
    const messageOrder = textDocumentOrder(container, [
      "ontem",
      "hoje-a",
      "hoje-b",
    ]);
    expect(messageOrder).toEqual(["ontem", "hoje-a", "hoje-b"]);
  });

  it("custom renderMessage receives id, direction, align, groupPosition, and label", async () => {
    const messages = [
      createMessage({
        id: "in-1",
        content: "hello",
        direction: "incoming",
        sentAt: "2026-04-04T10:00:00.000Z",
      }),
      createMessage({
        id: "out-1",
        content: "world",
        direction: "outgoing",
        status: "sent",
        sentAt: "2026-04-04T11:00:00.000Z",
      }),
    ];

    const seen: MessageRenderContext[] = [];

    renderList({
      messages,
      renderMessageLabel: (m) =>
        m.direction === "outgoing" ? "Bot" : undefined,
      renderMessage: (ctx) => {
        seen.push(ctx);
        return (
          <div
            data-testid={`msg-${ctx.id}`}
            data-direction={ctx.direction}
            data-align={ctx.align}
            data-group={ctx.groupPosition}
            data-label={ctx.label ?? ""}
          >
            {ctx.message.content}
          </div>
        );
      },
    });

    await waitFor(() => {
      expect(screen.getByTestId("msg-in-1")).toBeTruthy();
      expect(screen.getByTestId("msg-out-1")).toBeTruthy();
    });

    const byId = Object.fromEntries(seen.map((c) => [c.id, c]));
    expect(byId["in-1"]).toMatchObject({
      id: "in-1",
      direction: "incoming",
      align: "start",
      groupPosition: "single",
      label: undefined,
    });
    expect(byId["out-1"]).toMatchObject({
      id: "out-1",
      direction: "outgoing",
      align: "end",
      groupPosition: "single",
      label: "Bot",
    });
    expect(screen.getByText("hello")).toBeTruthy();
    expect(screen.getByText("world")).toBeTruthy();
  });

  it("custom renderDateDivider and formatDate produce custom labels", async () => {
    const messages = [
      createMessage({
        id: "m1",
        content: "a",
        sentAt: "2026-04-03T12:00:00.000Z",
      }),
      createMessage({
        id: "m2",
        content: "b",
        sentAt: "2026-04-04T12:00:00.000Z",
      }),
    ];

    renderList({
      messages,
      formatDate: (iso) =>
        iso.startsWith("2026-04-04") ? "TODAY-CUSTOM" : "YDAY-CUSTOM",
      renderDateDivider: ({ label, date }) => (
        <div data-testid={`divider-${label}`} data-raw-date={date}>
          {label}
        </div>
      ),
    });

    await waitFor(() => {
      expect(screen.getByTestId("divider-TODAY-CUSTOM")).toBeTruthy();
      expect(screen.getByTestId("divider-YDAY-CUSTOM")).toBeTruthy();
      expect(screen.getByText("TODAY-CUSTOM")).toBeTruthy();
      expect(screen.getByText("YDAY-CUSTOM")).toBeTruthy();
    });

    expect(
      screen.getByTestId("divider-YDAY-CUSTOM").getAttribute("data-raw-date"),
    ).toBe("2026-04-03T12:00:00.000Z");
    expect(
      screen.getByTestId("divider-TODAY-CUSTOM").getAttribute("data-raw-date"),
    ).toBe("2026-04-04T12:00:00.000Z");
  });

  it("computes every grouping position: single, first, middle, last", async () => {
    // three consecutive incoming (same day) + one outgoing single
    const messages = [
      createMessage({
        id: "g1",
        content: "first",
        direction: "incoming",
        sentAt: "2026-04-04T10:00:00.000Z",
      }),
      createMessage({
        id: "g2",
        content: "middle",
        direction: "incoming",
        sentAt: "2026-04-04T10:01:00.000Z",
      }),
      createMessage({
        id: "g3",
        content: "last",
        direction: "incoming",
        sentAt: "2026-04-04T10:02:00.000Z",
      }),
      createMessage({
        id: "g4",
        content: "alone",
        direction: "outgoing",
        status: "sent",
        sentAt: "2026-04-04T10:03:00.000Z",
      }),
    ];

    renderList({
      messages,
      renderMessage: ({ id, groupPosition, message }) => (
        <div data-testid={`row-${id}`} data-group={groupPosition}>
          {message.content}
        </div>
      ),
    });

    await waitFor(() => {
      expect(screen.getByTestId("row-g1").getAttribute("data-group")).toBe(
        "first",
      );
      expect(screen.getByTestId("row-g2").getAttribute("data-group")).toBe(
        "middle",
      );
      expect(screen.getByTestId("row-g3").getAttribute("data-group")).toBe(
        "last",
      );
      expect(screen.getByTestId("row-g4").getAttribute("data-group")).toBe(
        "single",
      );
    });
  });

  it("resets grouping across date boundaries for same direction", async () => {
    const messages = [
      createMessage({
        id: "y1",
        content: "y-a",
        direction: "incoming",
        sentAt: "2026-04-03T12:00:00.000Z",
      }),
      createMessage({
        id: "y2",
        content: "y-b",
        direction: "incoming",
        sentAt: "2026-04-03T13:00:00.000Z",
      }),
      createMessage({
        id: "t1",
        content: "t-a",
        direction: "incoming",
        sentAt: "2026-04-04T10:00:00.000Z",
      }),
      createMessage({
        id: "t2",
        content: "t-b",
        direction: "incoming",
        sentAt: "2026-04-04T11:00:00.000Z",
      }),
    ];

    renderList({
      messages,
      renderMessage: ({ id, groupPosition }) => (
        <div data-testid={`row-${id}`} data-group={groupPosition} />
      ),
    });

    await waitFor(() => {
      // yesterday: first/last pair
      expect(screen.getByTestId("row-y1").getAttribute("data-group")).toBe(
        "first",
      );
      expect(screen.getByTestId("row-y2").getAttribute("data-group")).toBe(
        "last",
      );
      // today starts a new group despite same direction
      expect(screen.getByTestId("row-t1").getAttribute("data-group")).toBe(
        "first",
      );
      expect(screen.getByTestId("row-t2").getAttribute("data-group")).toBe(
        "last",
      );
    });
  });

  it("resets grouping when direction alternates on the same date", async () => {
    const messages = [
      createMessage({
        id: "a",
        content: "in",
        direction: "incoming",
        sentAt: "2026-04-04T10:00:00.000Z",
      }),
      createMessage({
        id: "b",
        content: "out",
        direction: "outgoing",
        status: "sent",
        sentAt: "2026-04-04T10:01:00.000Z",
      }),
      createMessage({
        id: "c",
        content: "in2",
        direction: "incoming",
        sentAt: "2026-04-04T10:02:00.000Z",
      }),
    ];

    renderList({
      messages,
      renderMessage: ({ id, groupPosition }) => (
        <div data-testid={`row-${id}`} data-group={groupPosition} />
      ),
    });

    await waitFor(() => {
      expect(screen.getByTestId("row-a").getAttribute("data-group")).toBe(
        "single",
      );
      expect(screen.getByTestId("row-b").getAttribute("data-group")).toBe(
        "single",
      );
      expect(screen.getByTestId("row-c").getAttribute("data-group")).toBe(
        "single",
      );
    });
  });

  it("recomputes grouping after history is prepended", async () => {
    const later = [
      createMessage({
        id: "m2",
        content: "second",
        direction: "incoming",
        sentAt: "2026-04-04T11:00:00.000Z",
      }),
      createMessage({
        id: "m3",
        content: "third",
        direction: "incoming",
        sentAt: "2026-04-04T12:00:00.000Z",
      }),
    ];

    const { rerender } = renderList({
      messages: later,
      renderMessage: ({ id, groupPosition }) => (
        <div data-testid={`row-${id}`} data-group={groupPosition} />
      ),
    });

    await waitFor(() => {
      expect(screen.getByTestId("row-m2").getAttribute("data-group")).toBe(
        "first",
      );
      expect(screen.getByTestId("row-m3").getAttribute("data-group")).toBe(
        "last",
      );
    });

    const withHistory = [
      createMessage({
        id: "m1",
        content: "first",
        direction: "incoming",
        sentAt: "2026-04-04T10:00:00.000Z",
      }),
      ...later,
    ];

    rerender(
      <div style={{ height: 800, width: 400 }}>
        <MessageList
          messages={withHistory}
          renderMessage={({ id, groupPosition }) => (
            <div data-testid={`row-${id}`} data-group={groupPosition} />
          )}
        />
      </div>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("row-m1").getAttribute("data-group")).toBe(
        "first",
      );
      expect(screen.getByTestId("row-m2").getAttribute("data-group")).toBe(
        "middle",
      );
      expect(screen.getByTestId("row-m3").getAttribute("data-group")).toBe(
        "last",
      );
    });
  });

  it("accepts direct autoScroll and onScrollTop props without MessageViewContent", async () => {
    const onScrollTop = vi.fn();
    const messages = [
      createMessage({
        id: "m1",
        content: "solo",
        sentAt: "2026-04-04T10:00:00.000Z",
      }),
    ];

    // Standalone — no provider; props must not throw
    expect(() =>
      renderList({
        messages,
        autoScroll: false,
        onScrollTop,
      }),
    ).not.toThrow();

    await waitFor(() => {
      expect(screen.getByText("solo")).toBeTruthy();
    });
  });

  it("direct autoScroll / onScrollTop props win over MessageViewContent context", async () => {
    const contextOnScrollTop = vi.fn();
    const propOnScrollTop = vi.fn();
    const messages = [
      createMessage({
        id: "m1",
        content: "ctx",
        sentAt: "2026-04-04T10:00:00.000Z",
      }),
    ];

    // Render under context with opposite handlers. LegendList may fire
    // onStartReached on mount in jsdom — the prop callback must receive it,
    // not the context one (direct props win).
    render(
      <div style={{ height: 800, width: 400 }}>
        <MessageViewContent autoScroll={true} onScrollTop={contextOnScrollTop}>
          <MessageList
            messages={messages}
            autoScroll={false}
            onScrollTop={propOnScrollTop}
          />
        </MessageViewContent>
      </div>,
    );

    await waitFor(() => {
      expect(screen.getByText("ctx")).toBeTruthy();
    });
    // Context handler must never run when a direct prop is provided.
    expect(contextOnScrollTop).not.toHaveBeenCalled();
    // LegendList typically fires onStartReached once at mount with short lists.
    await waitFor(() => {
      expect(propOnScrollTop).toHaveBeenCalled();
    });
  });

  it("assigns unique date-row identities for duplicate labels (malformed dates)", async () => {
    const messages = [
      createMessage({
        id: "bad-1",
        content: "bad-a",
        sentAt: "not-a-date",
      }),
      createMessage({
        id: "ok",
        content: "ok-msg",
        sentAt: "2026-04-04T10:00:00.000Z",
      }),
      createMessage({
        id: "bad-2",
        content: "bad-b",
        sentAt: "also-not-a-date",
      }),
    ];

    const dateRowIds: string[] = [];

    renderList({
      messages,
      // Force identical labels for the two invalid timestamps
      formatDate: (iso) =>
        iso === "2026-04-04T10:00:00.000Z" ? "VALID" : "Invalid Date",
      renderDateDivider: ({ label, date }) => {
        // Capture identity via label + raw date sequence; ids are internal
        // but we can observe duplicate labels render twice.
        dateRowIds.push(`${label}::${date}`);
        return (
          <div
            data-testid={`date-${dateRowIds.length - 1}`}
            data-label={label}
            data-date={date}
          >
            {label}
          </div>
        );
      },
    });

    await waitFor(() => {
      const invalidLabels = screen.getAllByText("Invalid Date");
      expect(invalidLabels.length).toBeGreaterThanOrEqual(2);
      expect(screen.getByText("VALID")).toBeTruthy();
      expect(screen.getByText("bad-a")).toBeTruthy();
      expect(screen.getByText("ok-msg")).toBeTruthy();
      expect(screen.getByText("bad-b")).toBeTruthy();
    });

    // Two separate date sections for the same label with different raw dates
    expect(dateRowIds.filter((r) => r.startsWith("Invalid Date::"))).toHaveLength(
      2,
    );
    expect(dateRowIds[0]).toBe("Invalid Date::not-a-date");
    expect(dateRowIds[2]).toBe("Invalid Date::also-not-a-date");
  });

  it("exports DateDivider with children API", async () => {
    render(<DateDivider data-testid="public-divider">CUSTOM</DateDivider>);
    expect(screen.getByTestId("public-divider")).toBeTruthy();
    expect(screen.getByText("CUSTOM")).toBeTruthy();
  });
});
