# 0007. Embedded Signup outcomes and credential custody

## Status

Accepted.

## Context

Embedded Signup reports its result in two halves: a session event posted by
Meta's popup and an authorization code from the `FB.login` callback. Either can
arrive alone.

## Decision

- The flow settles exactly once with a status: `completed` (FINISH and a code),
  `finished_without_code` (Meta treats closing the popup on the last screen as
  success but sends a code only when the customer clicks Finish),
  `missing_session` (a code but no terminal event within `joinTimeoutMs`; not a
  confirmed onboarding), `cancelled`, `error`, `no_authorization`, or
  `torn_down`.
- Codes expire after about 30 seconds and are single-use, so the join timeout
  is short (5 seconds by default) and retrying an exchange may need a new code.
- An ERROR event alone does not start the join timer, because the popup may
  still be open.
- The result resolves before `onFinish` runs, so a throwing hook cannot strand
  it.
- Meta's documented session events have no `version`; older integrations sent
  `version: 3`. Any other explicit version is an unknown envelope. A real
  coexistence FINISH message has no version, a coexistence-specific event name
  and asset id arrays.
- After a successful exchange, the WABA is subscribed to the app by default.
  Failures are returned and recorded, not ignored.
- Account records never hold raw Meta access tokens. They hold a
  deployment-owned credential reference (a vault or key id) and non-secret
  provider metadata such as key versions, tenant ids, expiry times and labels.
- Failure summaries are safe to log: they never contain tokens, the app secret,
  the authorization code, request URLs or Meta's free-text error message.

## Consequences

Apps that need the token resolve it from their own vault using the reference.
