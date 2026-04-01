import type { IncomingMessage } from "better-zap";

/**
 * Extract human-readable content from incoming messages for audit logs.
 */
export function getMessageContent(message: IncomingMessage): string {
  switch (message.type) {
    case "text":
      return message.text?.body || "[texto vazio]";
    case "image":
      return `[imagem${message.image?.caption ? `: ${message.image.caption}` : ""}]`;
    case "audio":
      return "[áudio]";
    case "video":
      return `[vídeo${message.video?.caption ? `: ${message.video.caption}` : ""}]`;
    case "document":
      return `[documento: ${message.document?.filename || "arquivo"}]`;
    case "location":
      return `[localização: ${message.location?.name || `${message.location?.latitude},${message.location?.longitude}`}]`;
    case "button":
      return `[botão: ${message.button?.text}]`;
    case "interactive":
      if (message.interactive?.button_reply) {
        return `[resposta botão: ${message.interactive.button_reply.title}]`;
      }
      if (message.interactive?.list_reply) {
        return `[resposta lista: ${message.interactive.list_reply.title}]`;
      }
      return "[interativo]";
    case "sticker":
      return "[figurinha]";
    case "reaction":
      return "[reação]";
    default:
      return `[${message.type}]`;
  }
}
