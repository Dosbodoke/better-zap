import type { Conversation, UIMessage } from "@better-zap/react";
import { vi } from "vitest";

const HOUR = 60 * 60 * 1000;

/** Conversation with an open freeform window relative to `now` (default: real now). */
export function createConversation(
  overrides: Partial<Conversation> = {},
  now: Date = new Date(),
): Conversation {
  const lastIncomingMessageAt =
    overrides.lastIncomingMessageAt ??
    new Date(now.getTime() - HOUR).toISOString();
  const freeformMessageWindow = overrides.freeformMessageWindow ?? {
    isOpen: true,
    lastIncomingMessageAt,
    expiresAt: new Date(now.getTime() + 23 * HOUR).toISOString(),
  };

  return {
    id: "conv-1",
    phone: "5511999999999",
    contactName: "Alice",
    unreadCount: 0,
    status: "open",
    lastMessageAt: overrides.lastMessageAt ?? lastIncomingMessageAt,
    lastMessagePreview: "Oi",
    lastDirection: "incoming",
    messageCount: 1,
    lastIncomingMessageAt,
    freeformMessageWindow,
    ...overrides,
    // Keep window fields consistent after spread when not explicitly overridden
    lastIncomingMessageAt:
      overrides.lastIncomingMessageAt ?? lastIncomingMessageAt,
    freeformMessageWindow:
      overrides.freeformMessageWindow ?? freeformMessageWindow,
  };
}

export function createClosedWindowConversation(
  overrides: Partial<Conversation> = {},
  now: Date = new Date(),
): Conversation {
  const lastIncomingMessageAt =
    overrides.lastIncomingMessageAt ??
    new Date(now.getTime() - 48 * HOUR).toISOString();
  return createConversation(
    {
      ...overrides,
      lastIncomingMessageAt,
      freeformMessageWindow: {
        isOpen: false,
        lastIncomingMessageAt,
        expiresAt: new Date(
          new Date(lastIncomingMessageAt).getTime() + 24 * HOUR,
        ).toISOString(),
      },
    },
    now,
  );
}

export function createMessage(
  overrides: Partial<UIMessage> = {},
): UIMessage {
  return {
    id: "msg-1",
    content: "Hello",
    direction: "incoming",
    status: "delivered",
    sentAt: "2026-04-04T14:00:00.000Z",
    ...overrides,
  };
}

/** Mobile viewport for WhatsappDashboard (max-width: 1023px). */
export function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

/**
 * LegendList measures container size via DOM geometry.
 * Stub common measurements so virtualized rows can mount in jsdom.
 */
export function stubLegendListLayout(height = 600, width = 360) {
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", {
    configurable: true,
    get() {
      return height;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", {
    configurable: true,
    get() {
      return width;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientHeight", {
    configurable: true,
    get() {
      return height;
    },
  });
  Object.defineProperty(HTMLElement.prototype, "clientWidth", {
    configurable: true,
    get() {
      return width;
    },
  });
  HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect() {
    return {
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      bottom: height,
      right: width,
      width,
      height,
      toJSON() {
        return {};
      },
    };
  };
}

