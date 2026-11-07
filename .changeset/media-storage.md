---
"better-zap": patch
"@better-zap/hono": patch
---

Add pluggable media storage, so incoming media outlives Meta's 7-day expiry. Set `database.media` to a `MediaStore` and Better Zap downloads each image, audio, video, document and sticker once, when the webhook arrives, for `messages`, `smb_message_echoes` and `history` (including follow-up media that replaces a placeholder). The file is saved under `whatsapp/{phoneNumberId}/{waMessageId}`, the log record gets `metadata.media`, and a `MESSAGE_UPDATE` sync event is sent. Failed downloads are recorded as `metadata.media.status: "failed"` and never fail the webhook. Files over `media.maxBytes` (default 25 MiB) are recorded as `"skipped"`. Without a `MediaStore`, nothing changes.

`better-zap` adds the `MediaStore` interface, `WhatsAppService.downloadMedia()`, `MessageLoggerService.setMessageMedia()`, the `getMessageMedia`, `getStoredMessageMedia`, `getMessageMediaPayload` and `getMediaStorageKey` helpers, and a new `better-zap/s3` entry with `createS3MediaStore()` for Cloudflare R2, AWS S3, MinIO and Backblaze B2. It signs requests with `aws4fetch`, so it runs on Workers and Node without the AWS SDK. `better-zap` also exports `tryCatch()`, which returns Go-style `[value, error]` results, plus `toError` and the `Result` type.

`@better-zap/hono` adds `GET {basePath}/media/:waMessageId`, protected by `authorizeAppRequest`. It streams the file with long cache headers. When the store has `getSignedUrl`, images, audio, video and PDFs redirect to a presigned URL capped at 7 days (`MAX_SIGNED_URL_EXPIRES_IN`, `clampSignedUrlExpiry`); other types are always streamed as sandboxed downloads. `betterZap()` takes `media: { maxBytes, signedUrlExpiresIn }`. `createWebhookProcessor()` in `better-zap` and `createWebhookHandler()` in `@better-zap/hono` take `media` (`WebhookMediaConfig`); the download wiring lives in the framework-agnostic processor, with `storeMessageMedia()` exported.
