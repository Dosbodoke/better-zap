---
"better-zap": minor
---

Add a pluggable client transport so browser clients can authenticate via a
session/proxy instead of only API-key headers. `createZapClient({ transport })`
now accepts a `ZapTransport`; two built-ins ship: `sessionTransport()` (sends
same-origin credentials, no API key — for apps that proxy Better Zap behind
their own authenticated routes) and `apiKeyTransport(key)` (sends
`Authorization: Bearer <key>`). Default behavior is unchanged when no transport
is passed.
