---
"better-zap": minor
"@better-zap/hono": minor
---

Add support for WhatsApp Business Coexistence mode through Embedded Signup alongside
the existing Cloud API integration, so apps that already send and receive WhatsApp
messages through the Business App can adopt better-zap without migrating away first.

The core `better-zap` package now exposes the coexistence SDK surface, including
coexistence webhook and Embedded Signup types, a coexistence module entry point,
`CoexistenceService` for credential/provider and storage contracts, and
`MessageLoggerService` for logging WhatsApp message activity.

The `@better-zap/hono` adapter adds coexistence webhook handling for coexistence
events, extends the shared webhook handler wiring for coexistence callbacks, and
exposes self-hosted coexistence routes through the Hono adapter.
