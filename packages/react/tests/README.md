# `@better-zap/react` consumer verification

These tests import the **published** package surface (`@better-zap/react` → `dist/` via `package.json` exports), not `src/`.

## Running

```bash
pnpm --filter @better-zap/react test
```

The package `test` script builds first (`pnpm run build && vitest run`) so assertions always hit current dist artifacts.

## Packaging / entrypoint contracts

| File | What it guards |
| --- | --- |
| `packaging.test.ts` | Exact `package.json#exports` keys (no wildcards), per-subpath `types`/`import`/`require`, `sideEffects` stylesheet-only, root CJS/ESM name parity + required UI symbols |
| `entrypoints.test.ts` | Leading `"use client"` on client entries only; zero directive on server-safe entries; bubble/message static graph free of `@legendapp/list` and `@hugeicons/*`; ESM/CJS subpath symbols; CJS `message-view` `require` + `createElement` (import.meta shim); packed tarball includes entries, `tailwind.css`, `wpp-bg.webp`, and the export map |

Normative JS subpaths: `.`, `./bubble`, `./message`, `./message-bubble`, `./composer`, `./message-input`, `./message-view`, `./conversation-list`, `./whatsapp-dashboard`, `./utils` (plus `./tailwind.css` and `./package.json`).

Client entries: `index`, `composer`, `message-input`, `message-view`, `conversation-list`, `whatsapp-dashboard`.  
Server-safe: `bubble`, `message`, `message-bubble`, `utils`.

## LegendList / jsdom

`ConversationList` and `MessageList` use `@legendapp/list` virtualization. jsdom has no real layout, so tests stub `offsetHeight` / `offsetWidth` / `getBoundingClientRect` (see `helpers.ts`).

If row virtualization still fails to paint items after those stubs, prefer characterizing chrome (search, chips, loading/error/empty) and document the gap here rather than reaching into `src/`.

LegendList absolute-position pooling can also scramble **document order** of sticky date dividers relative to messages. Prefer asserting message-body order (or presence of dividers) rather than strict DOM order of `HOJE`/`ONTEM` nodes.

## Known product gaps (do not "fix" in production code here)

- Freeform 24h window edge cases: issue #28
- Other dashboard product bugs tracked separately

This suite is pure prewiring / characterization.
