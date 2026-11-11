---
"@better-zap/hono": patch
---

**Breaking:** app routes are now closed unless `authorizeAppRequest` is set. Before, leaving the option out left `/send/*`, `/conversations`, `/media` and the coexistence routes open to anyone. They now answer `401` with `code: "app_authorization_not_configured"`. Pass a function to authorize each request, or `authorizeAppRequest: "public"` if something in front of Better Zap already authenticates it. Webhook routes are not affected, so webhook-only bots need no change.
