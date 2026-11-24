---
"better-zap": patch
"@better-zap/hono": patch
---

`definePlugin()` infers a plugin's context and services from what `init` returns and types the plugin's own hooks with them, so a plugin no longer needs a `BetterZapPlugin<...>` annotation. A plugin written with `satisfies BetterZapPlugin` is now accepted by `plugins`, which used to reject any plugin whose hooks read its own context.

`betterZap()` reads each plugin's context and services from the type `init` returns, and the `plugins` option accepts the new `AnyBetterZapPlugin` type. Plugins annotated with `BetterZapPlugin<...>` keep working.
