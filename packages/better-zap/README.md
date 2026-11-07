# better-zap

Framework-agnostic Better Zap core.

## Includes

- typed template registry DSL
- typed client
- Meta send service
- logging primitives and message log store interfaces
- transport-neutral webhook event and plugin contracts
- link preview helpers: `firstLinkIn(text)` and `parseOpenGraph(html, pageUrl)` (fetching stays in your app; see the [link previews guide](https://github.com/Dosbodoke/better-zap/blob/main/landing/content/docs/guides/link-previews.mdx))
- `MediaStore` interface for keeping incoming media past Meta's 7-day expiry, and an S3-compatible adapter at `better-zap/s3` (`createS3MediaStore`, for R2, AWS S3, MinIO and B2; see the [media storage guide](https://github.com/Dosbodoke/better-zap/blob/main/landing/content/docs/guides/media-storage.mdx))

## Coexistence onboarding

`launchCoexistenceEmbeddedSignup()` waits for both halves of an Embedded Signup
completion: the `FB.login` code and the `WA_EMBEDDED_SIGNUP` session event.
They can arrive in either order. `controller.result` settles once with a
`status`:

| Status | Meaning |
| --- | --- |
| `completed` | FINISH event and code both arrived. |
| `finished_without_code` | FINISH arrived without a code. Meta sends the code only when the customer clicks Finish. |
| `missing_session` | A code arrived but no terminal event did within `joinTimeoutMs`. This is not a confirmed onboarding. |
| `cancelled` / `error` | The latest terminal event was CANCEL / ERROR. |
| `no_authorization` | The login callback had no code and no event arrived. |
| `torn_down` | `teardown()` ran first. |

Session events are accepted from `facebook.com` origins when they have no
`version` (Meta's documented shape) or `version: 3`. Other versions and
malformed data are ignored. `joinTimeoutMs` defaults to 5000. Codes expire after
about 30 seconds, so keep it short. `result` rejects only if `FB.login` throws.

`CoexistenceService.exchangeEmbeddedSignupCode()` sends `redirect_uri` only when
you pass `redirectUri`. Failures keep `error`, `errorCode`, `httpStatus` and the
raw `details` body. They also include `diagnostics`, a log-safe summary with
`kind`, HTTP status, Graph code, subcode, type, `fbtraceId` and `retryable`. It
never contains tokens, the app secret, the code, URLs or Meta's message text.
Log `diagnostics`, not `details`. A 200 response without an access token
returns `kind: "malformed_response"`.
