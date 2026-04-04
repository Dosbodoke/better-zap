import { describe, expect, it } from "vitest";
import {
  createFreeformMessageWindow,
  normalizeConversationRecord,
  resolveConversationFreeformMessageWindow,
} from "./freeform-message-window";
import type { ConversationRecord, UIMessage } from "./types/whatsapp.types";

const NOW = new Date("2026-04-04T15:00:00.000Z");

function makeConversationRecord(
  overrides: Partial<ConversationRecord> = {},
): ConversationRecord {
  return {
    id: "conversation-1",
    phone: "5511999887766",
    contactName: "Joao",
    unreadCount: 0,
    status: "open",
    lastMessageAt: "2026-04-04T14:00:00.000Z",
    lastMessagePreview: "Oi",
    lastDirection: "incoming",
    messageCount: 1,
    lastIncomingMessageAt: "2026-04-04T14:00:00.000Z",
    ...overrides,
  };
}

function makeMessage(overrides: Partial<UIMessage> = {}): UIMessage {
  return {
    id: "message-1",
    content: "Oi",
    direction: "incoming",
    status: "read",
    sentAt: "2026-04-04T14:00:00.000Z",
    ...overrides,
  };
}

describe("freeform-message-window", () => {
  it("returns a closed window when there is no incoming timestamp", () => {
    expect(createFreeformMessageWindow(null, NOW)).toEqual({
      isOpen: false,
      lastIncomingMessageAt: null,
      expiresAt: null,
    });
  });

  it("returns an open window when the latest inbound message is within 24 hours", () => {
    expect(
      createFreeformMessageWindow("2026-04-04T02:00:00.000Z", NOW),
    ).toEqual({
      isOpen: true,
      lastIncomingMessageAt: "2026-04-04T02:00:00.000Z",
      expiresAt: "2026-04-05T02:00:00.000Z",
    });
  });

  it("returns a closed window once 24 hours have elapsed", () => {
    expect(
      createFreeformMessageWindow("2026-04-03T14:59:59.000Z", NOW),
    ).toEqual({
      isOpen: false,
      lastIncomingMessageAt: "2026-04-03T14:59:59.000Z",
      expiresAt: "2026-04-04T14:59:59.000Z",
    });
  });

  it("normalizes the public conversation with the derived free-form message window", () => {
    expect(
      normalizeConversationRecord(
        makeConversationRecord({
          lastIncomingMessageAt: "2026-04-04T02:00:00.000Z",
        }),
        NOW,
      ),
    ).toMatchObject({
      lastIncomingMessageAt: "2026-04-04T02:00:00.000Z",
      freeformMessageWindow: {
        isOpen: true,
        lastIncomingMessageAt: "2026-04-04T02:00:00.000Z",
        expiresAt: "2026-04-05T02:00:00.000Z",
      },
    });
  });

  it("prefers a newer inbound thread message over stale conversation summary state", () => {
    const conversation = normalizeConversationRecord(
      makeConversationRecord({
        lastIncomingMessageAt: "2026-04-03T10:00:00.000Z",
      }),
      NOW,
    );

    expect(
      resolveConversationFreeformMessageWindow(
        conversation,
        [
          makeMessage({
            id: "message-older",
            sentAt: "2026-04-03T10:00:00.000Z",
          }),
          makeMessage({
            id: "message-newer",
            sentAt: "2026-04-04T14:30:00.000Z",
          }),
          makeMessage({
            id: "message-outgoing",
            direction: "outgoing",
            sentAt: "2026-04-04T14:45:00.000Z",
          }),
        ],
        NOW,
      ),
    ).toEqual({
      isOpen: true,
      lastIncomingMessageAt: "2026-04-04T14:30:00.000Z",
      expiresAt: "2026-04-05T14:30:00.000Z",
    });
  });
});
