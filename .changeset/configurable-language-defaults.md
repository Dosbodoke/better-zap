---
"better-zap": patch
"@better-zap/hono": patch
---

Two Portuguese defaults can now be changed. `webhook.resolveMessageContent` replaces the built-in labels (`[imagem]`, `[áudio]`, ...) used for a message's stored `content` and for `ctx.content`; the core processor already supported this, but `betterZap()` and `createWebhookHandler()` did not pass it through. `config.defaultTemplateLanguage` sets the language code `sendTemplate` uses when a call passes none. Both default to the previous behavior.
