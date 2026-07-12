# better-zap

## 0.2.0

### Minor Changes

- 9d1707f: Add support for WhatsApp Business Coexistence mode through Embedded Signup alongside
  the existing Cloud API integration, so apps that already send and receive WhatsApp
  messages through the Business App can adopt better-zap without migrating away first.

  The core `better-zap` package now exposes the coexistence SDK surface, including
  coexistence webhook and Embedded Signup types, a coexistence module entry point,
  `CoexistenceService` for credential/provider and storage contracts, and
  `MessageLoggerService` for logging WhatsApp message activity.

  The `@better-zap/hono` adapter adds coexistence webhook handling for coexistence
  events, extends the shared webhook handler wiring for coexistence callbacks, and
  exposes self-hosted coexistence routes through the Hono adapter.

- 9014013: Close the ES v4 coexistence audit gaps: subscribe the WABA after code exchange
  with credential-reference custody on the connected account (#17); sync deadline
  tracking, duplicate in-flight guards, and typed eligibility/billing preflight
  failures (#18); the official Meta-derived webhook fixture catalog as the new
  @better-zap/fixtures package with an exhaustive dispatcher (#19); and
  account_offboarded/account_reconnected handling that blocks unusable accounts
  (#20).
- b7f79ea: Add ES v4 WhatsApp coexistence Embedded Signup browser helpers and shared event
  normalization, and make Hono callbacks record non-finish signup events without a
  code while preserving finish code exchange behavior.
- 9584809: Add a pluggable client transport so browser clients can authenticate via a
  session/proxy instead of only API-key headers. `createZapClient({ transport })`
  now accepts a `ZapTransport`; two built-ins ship: `sessionTransport()` (sends
  same-origin credentials, no API key — for apps that proxy Better Zap behind
  their own authenticated routes) and `apiKeyTransport(key)` (sends
  `Authorization: Bearer <key>`). Default behavior is unchanged when no transport
  is passed.

### Patch Changes

- b31640d: Release the improve-codebase batch with app route protection, dependency updates,
  storage docs repair, landing verification, and atomic webhook dedupe.
