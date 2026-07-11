import { render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MessageList } from "@better-zap/react";
import {
  createMessage,
  mockMatchMedia,
  stubLegendListLayout,
} from "./helpers";

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

    const { container } = render(
      <div style={{ height: 800, width: 400 }}>
        <MessageList
          messages={messages}
          renderMessageLabel={(m) =>
            m.direction === "outgoing" ? "Assistente" : undefined
          }
        />
      </div>,
    );

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
});
