# 0002. Call Meta's Graph API directly and run on any `fetch` runtime

## Status

Accepted.

## Context

Better Zap runs on Cloudflare Workers, Node 20+, Deno and Bun. Workers has no
filesystem and a stricter `fetch` than Node.

## Decision

- The WhatsApp Cloud API is called directly. There is no third-party provider
  in between. Request and webhook types follow Graph API v25.0, the version in
  `META_API_VERSION`.
- Core has no runtime dependencies besides `aws4fetch`. The logger is a small
  structured JSON logger rather than a logging library.
- S3-compatible storage (`better-zap/s3`) signs requests with `aws4fetch` over
  `fetch`, not the AWS SDK.
- `fetch` is always called detached. Workers throws "Illegal invocation" when
  the built-in `fetch` runs with any `this` other than the global, as in
  `object.fetch()`. `defaultFetch` looks the global up on each call, so
  polyfills and test stubs still apply.
- HTTP retries cover network errors, 429 and 5xx, with exponential backoff
  (200ms, 400ms, ...). The request is rebuilt on every attempt so a signed
  request is signed again. Any HTTP status comes back as a response; only a
  network failure after the last attempt is an error.
- Graph error codes that Meta documents as temporary or rate limiting are
  marked transient.
- The docs site embeds each MDX source in the compiled module for the `llms`
  routes, because Workers cannot read the file at request time.

## Consequences

- Upgrading the Graph API version is a deliberate change to the constants that
  `scripts/check-release-version.mjs` checks.
- New code that stores `fetch` must call it detached or use `defaultFetch`.
