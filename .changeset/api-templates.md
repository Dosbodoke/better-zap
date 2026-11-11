---
"better-zap": patch
"@better-zap/hono": patch
---

`betterZap().api.templates` creates, lists, edits and deletes message templates, using `config.token` and the new optional `config.wabaId`. It is server-side only; no HTTP route is added. Pass `templateService` to manage several business accounts.

The `BetterZapApi` type gains a required `templates` member. If you build a `BetterZapApi` object by hand, such as a test double, add `templates` to it.
