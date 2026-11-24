# 0006. Coexistence history, sync and echo webhooks

## Status

Accepted.

## Context

Coexistence (a number shared between the WhatsApp Business app and the Cloud
API) adds webhooks whose documented shapes changed over time. The fixtures in
`@better-zap/fixtures` encode Meta's coexistence webhook reference.

## Decision

Meta behaviour the SDK relies on:

- History sync has three phases: 0 is day 0–1, 1 is day 1–90, 2 is day
  90–180. A phase number does not mean the phase finished. `progress` (0–100)
  is overall progress; 100 means complete.
- Chunks can arrive out of order and more than once; messages are deduplicated
  by message id. History webhooks can carry statuses without messages.
- Group chats are excluded from history.
- Older media arrives as `type: "media_placeholder"` with no media object.
  Media sent within 14 days of onboarding carries asset ids, and Meta later
  sends a second history webhook with the same message id and the real media,
  with the messages directly under `value` rather than `history[]`. Media older
  than 14 days arrives without asset ids and must still be processed.
- History and state sync webhooks carry no `request_id`, so the SDK falls back
  to the store's in-flight job for that phone number and sync type.
- An opt-out error such as code 2593109, or any message, status or contact the
  store fails to write, fails the sync job.
- `from` is omitted when the user's phone number is unavailable;
  `from_user_id`/`to_user_id` carry the business-scoped user id (BSUID)
  instead. Meta sets `from_user_id` only on messages sent by the user. Contacts
  are identified by phone first, then BSUID.
- `smb_app_state_sync` `add` covers adds and edits; `remove` deletes.
- `account_reconnected` covers re-registration, reinstall and device switch.
- Valid coexistence webhooks for unknown phone numbers are stored as unrouted
  raw events.

Compatibility:

- Documented shapes come first; legacy shapes only fill gaps. Thread messages
  win over the legacy flat list, `state_sync` over legacy `contacts`, and
  `message_echoes` over legacy `messages` (the Hono handler merges both into
  `messages` before calling hooks).
- Older payloads without chunk metadata complete the sync job per webhook.
- Legacy payloads without BSUIDs that do not match a contact by `wa_id` fall
  back to the first contact.
- Stored records that predate the `mediaPending` flag are recognised as
  placeholders by their raw message type.

## Consequences

Dropping a legacy shape is a breaking change and needs its own decision.
