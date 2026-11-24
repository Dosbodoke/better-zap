---
"better-zap": patch
---

`uploadHeaderMedia` copies a `Uint8Array` backed by a `SharedArrayBuffer` into a regular buffer before sending it, so `fetch` no longer rejects it. Other inputs are sent as before.
