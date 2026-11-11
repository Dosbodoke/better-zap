---
"better-zap": patch
"@better-zap/hono": patch
---

Plugins can now hook every webhook event, not only `onMessage` and `onStatusUpdate`: `onCoexistenceHistory`, `onSmbAppStateSync`, `onSmbMessageEcho`, the account lifecycle events, message edits and revokes, and unsupported messages. Plugin hooks run in array order before the app's own hook, and a failing one is logged without stopping the rest, as before.

`betterZap()` now throws at startup when two plugins share an `id`, when a plugin returns a context or service key that better-zap or another plugin already provides (`db`, `api`, `logger`, `whatsapp`), or when `init()` returns a Promise. Before, these were accepted and the later value silently won, or the result was silently dropped.

New exports from `better-zap`: `WEBHOOK_EVENT_NAMES` and the types `BetterZapWebhookEvents`, `BetterZapWebhookEventName`, `BetterZapWebhookEventContext` and `BetterZapWebhookHooks`.
