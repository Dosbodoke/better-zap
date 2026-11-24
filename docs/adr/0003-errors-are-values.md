# 0003. Errors are returned as values

## Status

Accepted.

## Context

Webhook handlers and background jobs must not crash on one bad payload, one
failed download or one failing app hook.

## Decision

- `Result` is a Go-style tuple: `[value, null]` on success, `[null, error]` on
  failure.
- `tryCatch` is the one place that catches. With a `signal` it resolves with
  the abort reason as soon as the signal aborts, even when the function ignores
  it. The function may keep running; the caller stops waiting.
- These never throw and return results instead: `sendGraphRequest`,
  `TemplateService` methods, `downloadMetaMedia`, `storeMessageMedia`, the
  webhook processor's `process`, `buildTemplateDefinitionFromMeta`, phone
  normalization, the media queue's promises, and the Embedded Signup flow
  (which rejects only when `FB.login` itself throws).
- Entry points that call several steps still wrap the whole run in `tryCatch`,
  so a step that throws unexpectedly (a custom `fetch` that throws
  synchronously, an app-provided `download` or `put` that ignores the abort
  signal) cannot break the promise.
- The S3 store's request helper throws only when every attempt hit a network
  error; the `MediaStore` caller turns that into a result.
- A failed `response.body.cancel()` on a body we will not read is ignored; it
  has no effect on the result.
- `TemplateService` calls are not retried.

## Consequences

- Callers check results instead of writing `try`/`catch`.
- Code that adds a new I/O step should return a result rather than throw.
