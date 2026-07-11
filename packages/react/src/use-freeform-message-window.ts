"use client";

import { useCallback, useEffect, useState } from "react";
import type { Conversation, FreeformMessageWindow, UIMessage } from "better-zap";
import { resolveConversationFreeformMessageWindow } from "better-zap";

export interface UseFreeformMessageWindowResult extends FreeformMessageWindow {
  /** Recompute with a fresh clock, update state, and return the fresh result. */
  revalidate: () => FreeformMessageWindow;
}

const CLOSED_WINDOW: FreeformMessageWindow = {
  isOpen: false,
  lastIncomingMessageAt: null,
  expiresAt: null,
};

const MAX_TIMEOUT_MS = 2 ** 31 - 1;

export function useFreeformMessageWindow(
  conversation?: Pick<
    Conversation,
    "freeformMessageWindow" | "lastIncomingMessageAt"
  > | null,
  messages?: UIMessage[],
): UseFreeformMessageWindowResult {
  const [now, setNow] = useState(() => new Date());

  const freeformWindow = conversation
    ? resolveConversationFreeformMessageWindow(conversation, messages, now)
    : CLOSED_WINDOW;

  const revalidate = useCallback((): FreeformMessageWindow => {
    const freshNow = new Date();
    setNow(freshNow);
    if (!conversation) {
      return CLOSED_WINDOW;
    }
    return resolveConversationFreeformMessageWindow(
      conversation,
      messages,
      freshNow,
    );
  }, [conversation, messages]);

  useEffect(() => {
    if (!conversation || !freeformWindow.isOpen || !freeformWindow.expiresAt) {
      return;
    }

    const expiresAtMs = new Date(freeformWindow.expiresAt).getTime();
    if (!Number.isFinite(expiresAtMs)) {
      return;
    }

    const delay = Math.min(
      Math.max(0, expiresAtMs - Date.now()),
      MAX_TIMEOUT_MS,
    );

    const timeoutId = globalThis.setTimeout(() => {
      setNow(new Date());
    }, delay);

    return () => {
      globalThis.clearTimeout(timeoutId);
    };
  }, [
    conversation,
    freeformWindow.isOpen,
    freeformWindow.expiresAt,
    // Re-arm when `now` advances (e.g. after revalidate or expiry tick)
    now,
  ]);

  return {
    ...freeformWindow,
    revalidate,
  };
}
