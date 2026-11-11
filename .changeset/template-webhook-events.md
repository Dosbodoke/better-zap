---
"better-zap": patch
"@better-zap/hono": patch
"@better-zap/fixtures": patch
---

Meta's template webhooks now reach four new optional hooks instead of being ignored: `onTemplateStatusUpdate` (approved, rejected, paused, disabled, ...), `onTemplateQualityUpdate`, `onTemplateCategoryUpdate` and `onTemplateComponentsUpdate`. They work in `createWebhookProcessor`, in `betterZap({ webhook })` and in plugins. Each receives the business account id as `wabaId`. `@better-zap/fixtures` adds `templateWebhookFixtures`.
