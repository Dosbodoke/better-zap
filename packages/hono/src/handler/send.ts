import type { Context } from "hono";
import {
  hasConfiguredTemplates,
  serializeTemplateFromRegistry,
  type OutgoingLoggingMetadata,
  type SendInteractiveMediaCarouselData,
  type TemplateRegistry,
} from "better-zap";
import type { BetterZapEnv } from "./types";

export async function handleSendText(c: Context<BetterZapEnv>) {
  const { to, body, messageType, userId, metadata } =
    await c.req.json<{
      to: string;
      body: string;
      messageType?: string;
      userId?: string;
      metadata?: Record<string, any>;
    }>();

  if (!to || !body) {
    return c.json({ error: "to and body are required" }, 400);
  }

  const whatsapp = c.get("whatsapp");
  const logging: Omit<OutgoingLoggingMetadata, "content"> | undefined =
    messageType
      ? { messageType: messageType as any, userId, metadata }
      : undefined;

  const result = await whatsapp.sendText(to, body, logging);
  return c.json(result, result.success ? 200 : 500);
}

export function createSendTemplateHandler<TTemplates extends TemplateRegistry>(
  templates: TTemplates,
) {
  return async function handleSendTemplate(c: Context<BetterZapEnv>) {
    const body = await c.req.json<{
      to: string;
      template: string;
      language?: string;
      params?: Record<string, unknown>;
      components?: any[];
      logging?: OutgoingLoggingMetadata;
      messageType?: string;
      userId?: string;
      content?: string;
      metadata?: Record<string, any>;
    }>();

    if (!body.to || !body.template) {
      return c.json({ error: "to and template are required" }, 400);
    }

    const whatsapp = c.get("whatsapp");
    const logging =
      body.logging ??
      (body.messageType
        ? {
            messageType: body.messageType as any,
            content: body.content || `[template: ${body.template}]`,
            userId: body.userId,
            metadata: body.metadata,
          }
        : undefined);

    let language = body.language;
    let components = body.components;

    if ("params" in body && body.params !== undefined) {
      if (!hasConfiguredTemplates(templates)) {
        return c.json(
          { error: "Typed template params require a configured template registry" },
          400,
        );
      }

      try {
        const serializedTemplate = serializeTemplateFromRegistry(
          templates,
          body.template as Extract<keyof TTemplates, string>,
          {
            language: body.language,
            params: body.params as never,
          },
        );
        language = serializedTemplate.language;
        components = serializedTemplate.components;
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Failed to serialize template from registry";
        return c.json({ error: message }, 400);
      }
    }

    const result = await whatsapp.sendTemplate(
      body.to,
      body.template,
      language,
      components,
      logging,
    );
    return c.json(result, result.success ? 200 : 500);
  };
}

export async function handleSendInteractive(c: Context<BetterZapEnv>) {
  const { to, type, body, buttons, buttonLabel, sections, cards, messageType, userId, metadata } =
    await c.req.json<{
      to: string;
      type: "button" | "list" | "carousel";
      body: string;
      buttons?: Array<{ id: string; title: string }>;
      buttonLabel?: string;
      sections?: Array<{
        title: string;
        rows: Array<{ id: string; title: string; description?: string }>;
      }>;
      cards?: SendInteractiveMediaCarouselData["cards"];
      messageType?: string;
      userId?: string;
      metadata?: Record<string, any>;
    }>();

  if (!to || !body) {
    return c.json({ error: "to and body are required" }, 400);
  }

  const whatsapp = c.get("whatsapp");
  const logging: Omit<OutgoingLoggingMetadata, "content"> | undefined =
    messageType ? { messageType: messageType as any, userId, metadata } : undefined;

  if (type === "list") {
    if (!buttonLabel || !sections) {
      return c.json({ error: "buttonLabel and sections are required for list type" }, 400);
    }
    const result = await whatsapp.sendInteractiveList(to, body, buttonLabel, sections, logging);
    return c.json(result, result.success ? 200 : 500);
  }

  if (type === "carousel") {
    if (!cards) {
      return c.json({ error: "cards are required for carousel type" }, 400);
    }
    if (cards.length < 2 || cards.length > 10) {
      return c.json({ error: "carousel requires between 2 and 10 cards" }, 400);
    }
    const result = await whatsapp.sendInteractiveMediaCarousel(
      { to, body, cards },
      logging,
    );
    return c.json(result, result.success ? 200 : 500);
  }

  if (!buttons) {
    return c.json({ error: "buttons are required for button type" }, 400);
  }
  const result = await whatsapp.sendInteractiveButtons(to, body, buttons, logging);
  return c.json(result, result.success ? 200 : 500);
}

export async function handleSendLocation(c: Context<BetterZapEnv>) {
  const { to, latitude, longitude, name, address, messageType, userId, metadata } =
    await c.req.json<{
      to: string;
      latitude: number;
      longitude: number;
      name: string;
      address: string;
      messageType?: string;
      userId?: string;
      metadata?: Record<string, any>;
    }>();

  if (!to || latitude == null || longitude == null || !name || !address) {
    return c.json({ error: "to, latitude, longitude, name, and address are required" }, 400);
  }

  const whatsapp = c.get("whatsapp");
  const logging: Omit<OutgoingLoggingMetadata, "content"> | undefined =
    messageType ? { messageType: messageType as any, userId, metadata } : undefined;

  const result = await whatsapp.sendLocation(to, latitude, longitude, name, address, logging);
  return c.json(result, result.success ? 200 : 500);
}
