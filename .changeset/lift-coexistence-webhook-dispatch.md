---
"better-zap": minor
"@better-zap/hono": patch
---

Webhook dispatch for Coexistence and ordinary messages is now available directly from `better-zap` via `createWebhookProcessor`, so any runtime — not just Hono — can process a Meta webhook payload without vendoring the dispatch pipeline. `better-zap` gains `createWebhookProcessor`, `WebhookProcessor`, `WebhookProcessorConfig`, `WebhookProcessorHooks`, `getMessageContent`, and the 9 webhook hook-context types.

`@better-zap/hono`'s `createWebhookHandler` now delegates to that processor internally; its public behavior, exported types, and `WebhookConfig` shape are unchanged. It also gains an optional `runInBackground` config field for running dispatch under any execution model (defaults to `executionCtx.waitUntil` when available, falling back to `await`).
