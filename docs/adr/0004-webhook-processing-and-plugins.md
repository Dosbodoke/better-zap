# 0004. Webhook processing, hook order and plugins

## Status

Accepted.

## Context

Meta gives up on a webhook after 20 seconds and retries it. App hooks and media
downloads can take longer than that.

## Decision

The webhook handler guarantees, and apps cannot change:

- The signature is verified before anything else.
- Meta gets `200 OK` right away. Processing runs in `runInBackground` when
  given, else `executionCtx.waitUntil`. Hono's `executionCtx` getter throws
  outside Workers-style runtimes; without an execution context the handler
  awaits processing before answering. A long-running Node server should pass
  `runInBackground: (work) => { void work; }`.
- A hook that throws is logged and does not stop the others or the webhook.
- The contact is resolved and the content extracted before `onMessage`, and
  the status timestamp is parsed to ISO before `onStatusUpdate`.

Order inside one payload:

1. Each incoming message is logged and deduplicated by `waMessageId`, then
   `onMessage` runs.
2. Media downloads are queued after the hook, so a bot's reply is never held
   up by a slow file. Duplicates are not queued, so a replayed webhook never
   downloads twice.
3. `process` resolves once every hook has run and this payload's downloads
   have settled, so `waitUntil` keeps the runtime alive for them.

One media queue is shared per processor, so concurrent webhooks share the
download limit. The limiter hands a freed slot straight to the next waiting
task so a new caller cannot take it in between.

Template webhooks are addressed to the business account: the entry id is the
WABA id and there is no phone number id.

Plugins:

- Plugin ids are unique. `init` runs once, synchronously, when `betterZap()` is
  called, in array order; each plugin sees the context and services of the
  ones before it. Returned keys may not collide with core keys or another
  plugin's keys, and the runtime remembers which plugin provided each key so a
  collision names it.
- For each event, plugin hooks run in array order, then the app's own hook.
  A plugin hook that throws is logged with fields identifying the event.
- The list of hookable events (`WEBHOOK_EVENT_NAMES`) is checked at compile time
  against `WebhookProcessorHooks`, so a new hook cannot be forgotten.

## Consequences

- Hooks must not assume media is stored when they run.
- Node deployments that skip `runInBackground` answer Meta only after
  processing.
