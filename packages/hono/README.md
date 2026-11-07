# @better-zap/hono

Hono runtime and webhook adapter for Better Zap.

## Coexistence webhooks

`createWebhookHandler()` passes payloads to `createWebhookProcessor()` from
`better-zap`, which reads the payload shapes in Meta's coexistence webhook
reference and still accepts the older flat shapes:

- `history`: `history[].threads[].messages` with `history[].metadata`
  (`phase`, `chunk_order`, `progress`), the legacy `history[].messages`, and
  media asset deliveries in `value.messages`. Messages present in both shapes
  are imported once.
- `smb_app_state_sync`: `state_sync[]` contact items with `add` or `remove`
  actions, plus legacy `contacts[]`. A contact without a phone number is stored
  under its business-scoped user ID (`waId`, also in `userId`).
- `smb_message_echoes`: `message_echoes[]` plus legacy `messages[]`. Hooks get
  both merged into `value.messages`.
- `messages`: `edit` and `revoke` types go to the edit and revoke hooks.

Meta's history and state sync webhooks have no `request_id`. When it is
missing, the processor uses `getInFlightSyncJob()` from your coexistence store to
find the job for that phone number.

A history job completes only when a chunk reports `progress: 100`. Before that
it stays `processing`. Legacy payloads without chunk metadata still complete on
each webhook. If any message, status or contact fails to store, the processor logs
`webhook.coexistence_import_failed` or `webhook.coexistence_contact_failed`,
counts it in `failedMessages` or `failedContacts`, and marks the job `failed`.

The processor does not read the job back before writing. Make your store keep
`completed` and `failed` terminal. Otherwise a redelivered earlier chunk can
move a finished job back to `processing`.

When the runtime passes no execution context and no `runInBackground` is set,
the handler awaits the processor before responding.
