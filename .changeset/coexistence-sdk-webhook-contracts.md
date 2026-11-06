---
"better-zap": patch
"@better-zap/hono": patch
---

Coexistence fixes. Embedded Signup accepts Meta's versionless session events and
joins the login code and session event in either order. The result now has a
`status`. Token exchange failures include log-safe `diagnostics`, thrown error
text no longer contains secrets, and a 200 response without a token is reported
as malformed. The webhook processor parses the documented history `threads`,
`state_sync` and `message_echoes` shapes. It also counts failed imports and
completes history jobs only at `progress: 100`. The Hono handler now processes
webhooks inline when the runtime has no execution context, instead of failing
with a 500.
