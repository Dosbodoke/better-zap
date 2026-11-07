---
"better-zap": patch
"@better-zap/hono": patch
"@better-zap/fixtures": patch
---

Handle coexistence history media placeholders. History `media_placeholder` messages are stored as `[mídia]` with `metadata.mediaPending: true` instead of `[media_placeholder]`. When Meta later sends the real media with the same message id, the stored placeholder is replaced instead of being counted as a duplicate. `upgradedMessages` is reported to `onCoexistenceHistory`, `onSmbMessageEcho` and the sync job metadata, and a new `MESSAGE_UPDATE` sync event is sent. A placeholder never overwrites real media.

`better-zap` adds `isMediaPlaceholder(message)`, `hasPendingMedia(record)`, `MEDIA_PLACEHOLDER_TYPE`, `MessageLoggerService.importMessage()` (returns `created`, `duplicate` or `upgraded`), and the `MessageUpdateEvent`, `ImportMessageParams` and `ImportMessageResult` types. The webhook processor now calls `logger.importMessage`. `@better-zap/fixtures` adds `historyMediaPlaceholderFixture` and `historyMediaPlaceholderFollowUpFixture`.
