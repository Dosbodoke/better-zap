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
- A plugin's types come from its shape, as in better-auth: `betterZap()` reads
  the context and services from the type `init` returns, not from
  `BetterZapPlugin`'s type arguments, and leaves out the core keys.
- The `plugins` option takes two checks. Its constraint, `AnyBetterZapPlugin`,
  accepts any plugin-shaped object: its hooks take `never`. Then
  `ValidateBetterZapPlugins` checks each plugin's hooks against the context
  they will receive: the app's database plus every plugin's context. So a
  missing dependency or a database the app lacks is a type error where the
  plugin is passed.
- When the plugin types can't be inferred (explicit type arguments on
  `betterZap()`, or a list typed with erased plugins), the default and the
  check fall back to `BetterZapPluginFor<TDatabase>`. Its hooks may only need
  the app's database and the core context. The database is always checked,
  and plugins whose hooks read plugin context are rejected there.
- `betterZap()` takes `plugins` as a `const` type parameter, so a list is a
  tuple. In an array, TypeScript reduces subtypes, and `{ id }` would absorb
  a sibling that adds services. `definePlugin()` keeps the literal `id`, so
  two of its plugins are never subtypes of each other in a list kept in a
  variable. A spread of a non-tuple list still yields an array, so the docs
  ask for `as const` there.
- Hook contexts are typed the way the runtime merges them: plugin context is
  spread over the event context, so a plugin key that names an event field
  replaces its type.
- `definePlugin()` infers the plugin's context for its own hooks and its
  database from the `init` parameter. When it declares context, `init` is
  required and must always return it. Its hooks do not take part in inference
  (`NoInfer`), so a hook cannot declare context that `init` does not return.
  It returns hooks typed with the core context only, because the runtime
  always passes them the plugin's own context. That keeps them valid under
  `BetterZapPluginFor`.
- The runtime copies the own properties of `context` and `services`, so
  `init` must return plain objects; it throws for anything else.
- The types treat whatever `init` can return as provided. An `init` that
  sometimes returns nothing, or a union of plugins, still types every key as
  present. Making those keys optional would make every annotated plugin's
  context optional, since `BetterZapPlugin`'s `init` returns `... | void`.

## Consequences

- Hooks must not assume media is stored when they run.
- Node deployments that skip `runInBackground` answer Meta only after
  processing.
