# 0009. Closed app routes, untrusted bodies and secret redaction

## Status

Accepted.

## Decision

- App routes (everything under `basePath` except `/webhook`) are closed by
  default and answer `401`. The guard is registered after the webhook router
  and before every app route, so any route registered before it is public.
  `"public"` turns it off for deployments where something in front already
  authenticates.
- Embedded Signup `state` and `nonce` are checked by an app-provided verifier
  before anything is recorded or exchanged. Without one they are stored but
  not checked; Better Zap never compares them with values from the same
  request.
- Browser clients do not embed an API key. The app proxies Better Zap behind
  its own session-authenticated routes and the client sends same-origin
  credentials (`sessionTransport`). `apiKeyTransport` is for trusted
  server-to-server calls. The client's template registry is used only for type
  inference; the server owns serialization and validation.
- Raw Graph response bodies may contain untrusted text and are never logged
  verbatim. Meta's `error_user_title` and `error_user_msg` are safe to show to
  the person who made the request.
- Meta can echo the token back ("Malformed access token <token>"), so secrets
  are redacted from every string and key of returned error bodies. Only
  strings are redacted, so codes and flags keep their meaning. Bodies nested
  deeper than Meta's error bodies are dropped rather than walked.

## Consequences

Adding a route above the guard makes it public; new app routes go below it.
