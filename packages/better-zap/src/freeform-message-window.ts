import type {
  Conversation,
  ConversationRecord,
  FreeformMessageWindow,
  UIMessage,
} from "./types/whatsapp.types";

export const FREEFORM_MESSAGE_WINDOW_MS = 24 * 60 * 60 * 1000;

function toTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function createFreeformMessageWindow(
  lastIncomingMessageAt: string | null,
  now: Date = new Date(),
): FreeformMessageWindow {
  const lastIncomingTimestamp = toTimestamp(lastIncomingMessageAt);

  if (lastIncomingTimestamp == null) {
    return {
      isOpen: false,
      lastIncomingMessageAt: null,
      expiresAt: null,
    };
  }

  const expiresAtTimestamp = lastIncomingTimestamp + FREEFORM_MESSAGE_WINDOW_MS;

  return {
    isOpen: now.getTime() < expiresAtTimestamp,
    lastIncomingMessageAt,
    expiresAt: new Date(expiresAtTimestamp).toISOString(),
  };
}

export function normalizeConversationRecord(
  record: ConversationRecord,
  now: Date = new Date(),
): Conversation {
  const freeformMessageWindow = createFreeformMessageWindow(
    record.lastIncomingMessageAt,
    now,
  );

  return {
    ...record,
    lastIncomingMessageAt: freeformMessageWindow.lastIncomingMessageAt,
    freeformMessageWindow,
  };
}

export function normalizeConversationRecords(
  records: ConversationRecord[],
  now: Date = new Date(),
): Conversation[] {
  return records.map((record) => normalizeConversationRecord(record, now));
}

export function getLatestIncomingMessageAt(
  messages: UIMessage[] | undefined,
): string | null {
  if (!messages?.length) {
    return null;
  }

  let latestIncomingMessageAt: string | null = null;
  let latestTimestamp = -Infinity;

  for (const message of messages) {
    if (message.direction !== "incoming") {
      continue;
    }

    const timestamp = toTimestamp(message.sentAt);
    if (timestamp == null || timestamp <= latestTimestamp) {
      continue;
    }

    latestIncomingMessageAt = message.sentAt;
    latestTimestamp = timestamp;
  }

  return latestIncomingMessageAt;
}

export function resolveConversationFreeformMessageWindow(
  conversation:
    | Pick<Conversation, "freeformMessageWindow" | "lastIncomingMessageAt">
    | null
    | undefined,
  messages?: UIMessage[],
  now: Date = new Date(),
): FreeformMessageWindow {
  const baseLastIncomingMessageAt =
    conversation?.freeformMessageWindow?.lastIncomingMessageAt ??
    conversation?.lastIncomingMessageAt ??
    null;
  const latestIncomingMessageAt = getLatestIncomingMessageAt(messages);

  if (!latestIncomingMessageAt) {
    return createFreeformMessageWindow(baseLastIncomingMessageAt, now);
  }

  const baseTimestamp = toTimestamp(baseLastIncomingMessageAt);
  const latestTimestamp = toTimestamp(latestIncomingMessageAt);

  if (latestTimestamp == null) {
    return createFreeformMessageWindow(baseLastIncomingMessageAt, now);
  }

  if (baseTimestamp != null && latestTimestamp <= baseTimestamp) {
    return createFreeformMessageWindow(baseLastIncomingMessageAt, now);
  }

  return createFreeformMessageWindow(latestIncomingMessageAt, now);
}
