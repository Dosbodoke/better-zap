---
"better-zap": patch
---

Media downloads failed on Cloudflare Workers with "Illegal invocation", so every message got `metadata.media.status: "failed"` when `database.media` was set. `WhatsAppService.downloadMedia()` stored the global `fetch` on an object and called it as a method, and Workers only allows the built-in `fetch` to be called as a plain function. Coexistence Graph requests (`CoexistenceService`, used by `betterZap()` coexistence routes) had the same bug when no custom `fetch` was passed. Both now call the global `fetch` correctly. A custom `fetch` still works as before.
