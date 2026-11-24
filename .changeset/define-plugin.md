---
"better-zap": patch
"@better-zap/hono": patch
---

`definePlugin()` infers a plugin's context and services from what `init` returns and types the plugin's own hooks with them, so a plugin no longer needs a `BetterZapPlugin<...>` annotation. A plugin written with `satisfies BetterZapPlugin` is now accepted by `plugins`, which used to reject any plugin whose hooks read its own context.

`betterZap()` reads each plugin's context and services from the type `init` returns, and checks every plugin's hooks against the context they will receive. A plugin whose hooks need a key no plugin provides, or a database the app doesn't have, is now a type error. Context and service types may now be interfaces. Plugins annotated with `BetterZapPlugin<...>` keep working, including next to an inline plugin whose hooks take an untyped `ctx`.

Event fields now win over plugin context keys with the same name, such as `phone`, whenever the event sets them. Before, a plugin's value replaced the event's in every hook.

`betterZap()` now throws at startup when `init` returns `context` or `services` that is not a plain object, such as a class instance, whose methods would otherwise be lost.

Type changes to check when upgrading:

- With no `plugins`, the hook `ctx` has only the core keys, so reading any other key is a type error.
- With explicit type arguments, as in `betterZap<MyDatabase>({ ... })`, plugin context and services are no longer typed (context used to be `any`). Plugins must then have hooks that only need your database and the core context: `definePlugin` plugins do, while a `satisfies` or annotated plugin whose hooks read plugin context is rejected. Drop the type arguments to get full inference.
- `InferBetterZapPluginContext` and `InferBetterZapPluginServices` return `{}` for anything that is not an array of plugins, and leave out the core keys.
- The plugin types use `NoInfer`, so apps need TypeScript 5.4 or later.
- A plugin context typed with a string index, such as `Record<string, any>`, keeps its declared keys, but other keys are now `unknown` in hooks, since a computed key may name an event field. Narrow them before use.
