# better-zap

## 25.0.3

### Patch Changes

- ac638cc: Handle coexistence history media placeholders. History `media_placeholder` messages are stored as `[mídia]` with `metadata.mediaPending: true` instead of `[media_placeholder]`. When Meta later sends the real media with the same message id, the stored placeholder is replaced instead of being counted as a duplicate. `upgradedMessages` is reported to `onCoexistenceHistory`, `onSmbMessageEcho` and the sync job metadata, and a new `MESSAGE_UPDATE` sync event is sent. A placeholder never overwrites real media.

  `better-zap` adds `isMediaPlaceholder(message)`, `hasPendingMedia(record)`, `MEDIA_PLACEHOLDER_TYPE`, `MessageLoggerService.importMessage()` (returns `created`, `duplicate` or `upgraded`), and the `MessageUpdateEvent`, `ImportMessageParams` and `ImportMessageResult` types. The webhook processor now calls `logger.importMessage`. `@better-zap/fixtures` adds `historyMediaPlaceholderFixture` and `historyMediaPlaceholderFollowUpFixture`.

- 0c7a29e: Add pluggable media storage, so incoming media outlives Meta's 7-day expiry. Set `database.media` to a `MediaStore` and Better Zap downloads each image, audio, video, document and sticker once, when the webhook arrives, for `messages`, `smb_message_echoes` and `history` (including follow-up media that replaces a placeholder). The file is saved under `whatsapp/{phoneNumberId}/{waMessageId}`, the log record gets `metadata.media`, and a `MESSAGE_UPDATE` sync event is sent. Failed downloads are recorded as `metadata.media.status: "failed"` and never fail the webhook. Files over `media.maxBytes` (default 25 MiB) are recorded as `"skipped"`. Without a `MediaStore`, nothing changes.

  `better-zap` adds the `MediaStore` interface, `WhatsAppService.downloadMedia()`, `MessageLoggerService.setMessageMedia()`, the `getMessageMedia`, `getStoredMessageMedia`, `getMessageMediaPayload` and `getMediaStorageKey` helpers, and a new `better-zap/s3` entry with `createS3MediaStore()` for Cloudflare R2, AWS S3, MinIO and Backblaze B2. It signs requests with `aws4fetch`, so it runs on Workers and Node without the AWS SDK. `better-zap` also exports `tryCatch()`, which returns Go-style `[value, error]` results, plus `toError` and the `Result` type.

  `@better-zap/hono` adds `GET {basePath}/media/:waMessageId`, protected by `authorizeAppRequest`. It streams the file with long cache headers. When the store has `getSignedUrl`, images, audio, video and PDFs redirect to a presigned URL capped at 7 days (`MAX_SIGNED_URL_EXPIRES_IN`, `clampSignedUrlExpiry`); other types are always streamed as sandboxed downloads. `betterZap()` takes `media: { maxBytes, signedUrlExpiresIn }`. `createWebhookProcessor()` in `better-zap` and `createWebhookHandler()` in `@better-zap/hono` take `media` (`WebhookMediaConfig`); the download wiring lives in the framework-agnostic processor, with `storeMessageMedia()` exported.

  Media downloads never delay the bot's reply. `onMessage` runs first, then the file is queued in the background, so the next message is processed right away. Up to `media.concurrency` files (default 3) transfer at once, and each download plus upload must finish within `media.timeoutMs` (default 30 seconds) or it is cancelled and recorded as `failed`. `MediaDownloadOptions` and `MediaStorePutInfo` carry an `AbortSignal`, `tryCatch()` takes an optional signal, and `DEFAULT_MEDIA_TIMEOUT_MS` and `DEFAULT_MEDIA_CONCURRENCY` are exported. `WebhookProcessor.process()` resolves once the queued files finish, so `waitUntil` keeps the runtime alive for them. `betterZap()` now takes `webhook.runInBackground`, so Node servers can answer Meta before processing.

## 25.0.2

### Patch Changes

- e332452: Coexistence fixes. Embedded Signup accepts Meta's versionless session events and
  joins the login code and session event in either order. The result now has a
  `status`. Token exchange failures include log-safe `diagnostics`, thrown error
  text no longer contains secrets, and a 200 response without a token is reported
  as malformed. `startContactsSync()` and `startHistorySync()` now send the
  documented `messaging_product: "whatsapp"` with `sync_type`; without it Meta
  rejects the request with error 100. The webhook processor parses the documented
  history `threads`, `state_sync` and `message_echoes` shapes. It also counts failed imports and
  completes history jobs only at `progress: 100`. The Hono handler now processes
  webhooks inline when the runtime has no execution context, instead of failing
  with a 500.
- 99b62ec: Webhook dispatch for Coexistence and ordinary messages is now available directly from `better-zap` via `createWebhookProcessor`, so any runtime — not just Hono — can process a Meta webhook payload without vendoring the dispatch pipeline. `better-zap` gains `createWebhookProcessor`, `WebhookProcessor`, `WebhookProcessorConfig`, `WebhookProcessorHooks`, `getMessageContent`, and the 9 webhook hook-context types.

  `@better-zap/hono`'s `createWebhookHandler` now delegates to that processor internally; its public behavior, exported types, and `WebhookConfig` shape are unchanged. It also gains an optional `runInBackground` config field for running dispatch under any execution model (defaults to `executionCtx.waitUntil` when available, falling back to `await`).

## 25.0.1

### Patch Changes

- 078d531: Add WhatsApp-style link previews. `@better-zap/react` gets a `LinkPreviewCard` primitive, a `linkPreview` prop on `MessageBubble`, and a `resolveLinkPreview` prop on `MessageList` that adds cards without replacing the default renderer. `better-zap` gets the `LinkPreview` type and two pure helpers: `firstLinkIn(text)` and `parseOpenGraph(html, pageUrl)`. Fetching pages stays in the app.

## 25.0.0

### Migration

- Align package releases with Meta Graph API v25.0. All five public packages
  use the coordinated 25.0.x line, and future package patch releases increment
  the third number. Move consumers from the previous 0.x versions to 25.0.0 and
  update dependency ranges to ^25.0.0. The runtime Meta API defaults and
  behavior are unchanged.

## 0.2.1

### Patch Changes

- 7762b6a: Republish the core package with its complete build output. Version 0.2.0 omitted
  the code-split `client*` runtime and declaration chunks referenced by its packed
  entrypoints, breaking both runtime imports and consumer types (#56).

  Package validation now uses `publint` and Are the Types Wrong across every
  published package. Dual ESM/CommonJS export maps point each condition at its
  matching declaration format, and release metadata explicitly enables public
  npm publishing with provenance.

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
