# 0005. The message log and the status lifecycle

## Status

Accepted.

## Context

Every WhatsApp message is logged for an LGPD audit trail. Meta delivers
webhooks more than once and out of order.

## Decision

- Persistence goes through the `WhatsAppLogStore` interface, so Better Zap has
  no dependency on an app's database.
- Status only moves forward: `sent` (1) → `delivered` (2) → `read` (3).
  `failed` (4) always wins. The store applies an update atomically, in one
  conditional query, only when it advances the lifecycle, so duplicates and
  regressions are skipped without races. `onStatusUpdate` runs only when an
  update was applied.
- Imported messages (history, echoes) are deduplicated by `waMessageId`.
  `createWhatsAppLog` returns the existing row with `created: false` for a known
  id. Results are `created`, `duplicate` or `upgraded`.
- A stored history media placeholder is replaced when the real media arrives,
  and a `MESSAGE_UPDATE` sync event is sent. A placeholder never overwrites
  real content. Stored fields the follow-up lacks, such as the original
  `requestId`, are kept.
- Saving a media result writes only `metadata.media`. A stored file is never
  replaced by a later failed or skipped result.
- Patches skip `undefined` values so they never erase stored fields.

## Consequences

Stores must implement the conditional status update and the
return-existing-row contract for deduplication to hold.
