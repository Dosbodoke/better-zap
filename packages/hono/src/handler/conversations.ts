import type { Context } from "hono";
import {
  formatPhone,
  normalizeConversationRecord,
  normalizeConversationRecords,
  serializeError,
} from "better-zap";
import type { BetterZapEnv } from "./types";

export async function handleListConversations(c: Context<BetterZapEnv>) {
  try {
    const store = c.get("store");
    const conversations = await store.getConversations();
    return c.json(normalizeConversationRecords(conversations));
  } catch (error) {
    c.get("logger").error("conversations.list_error", serializeError(error));
    return c.json({ error: "Internal error fetching conversations" }, 500);
  }
}

export async function handleGetConversation(c: Context<BetterZapEnv>) {
  try {
    const phone = c.req.param("phone");
    if (!phone) {
      return c.json({ error: "phone is required" }, 400);
    }

    const store = c.get("store");
    const normalized = formatPhone(decodeURIComponent(phone));
    const conversation = await store.getConversationByPhone(normalized);
    if (!conversation) {
      return c.json({ error: "Conversation not found" }, 404);
    }

    return c.json(normalizeConversationRecord(conversation));
  } catch (error) {
    c.get("logger").error("conversations.get_error", serializeError(error));
    return c.json({ error: "Internal error fetching conversation" }, 500);
  }
}

export async function handleGetMessages(c: Context<BetterZapEnv>) {
  try {
    const phone = c.req.param("phone");
    if (!phone) {
      return c.json({ error: "phone is required" }, 400);
    }

    const store = c.get("store");
    const normalized = formatPhone(decodeURIComponent(phone));
    const conversation = await store.getConversationByPhone(normalized);
    if (!conversation) {
      return c.json({ error: "Conversation not found" }, 404);
    }

    const cursor = c.req.query("cursor") || undefined;
    const limitParam = c.req.query("limit");
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const messages = await store.getMessagesByConversationPaginated(
      conversation.id,
      cursor,
      limit,
    );

    return c.json(messages);
  } catch (error) {
    c.get("logger").error("conversations.messages_error", serializeError(error));
    return c.json({ error: "Internal error fetching messages" }, 500);
  }
}
