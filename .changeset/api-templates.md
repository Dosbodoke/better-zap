---
"better-zap": patch
"@better-zap/hono": patch
---

`betterZap().api.templates` creates, lists, edits and deletes message templates, using `config.token` and the new optional `config.wabaId`. It is server-side only; no HTTP route is added. Pass `templateService` to manage several business accounts.
