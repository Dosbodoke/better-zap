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
| `docs-examples.test.tsx` | Renders every code example added to `packages/react/README.md` (Installation, Quick start, Two layers, Empty states, Link previews, Migration) verbatim against the published surface — the fixture is the drift check. Editing a README example requires updating the matching block here. |

Normative JS subpaths: `.`, `./bubble`, `./message`, `./message-bubble`, `./link-preview-card`, `./composer`, `./message-input`, `./message-view`, `./conversation-list`, `./whatsapp-dashboard`, `./utils` (plus `./tailwind.css` and `./package.json`).

Client entries: `index`, `link-preview-card`, `composer`, `message-input`, `message-view`, `conversation-list`, `whatsapp-dashboard`.  
Server-safe: `bubble`, `message`, `message-bubble`, `utils`. `message-bubble` imports the `link-preview-card` client entry; that import is its client boundary.

## LegendList / jsdom

`ConversationList` and `MessageList` use `@legendapp/list` virtualization. jsdom has no layout, so `setup.ts` replaces `@legendapp/list/react` with `legend-list-double.tsx`, a non-virtual list that renders every item once, in `data` order. Tests assert what the components hand the list (rows, divider order, sticky headers, callbacks), not how LegendList lays it out.

The double keeps the parts of the LegendList contract the components rely on:

- A row re-renders only when its item, `data` or `extraData` changes, not when `renderItem` changes.
- Indices in `stickyHeaderIndices` are marked `data-sticky-header`.
- `onStartReached` fires on a `scroll` event within `onStartReachedThreshold` of the top. Use `fireEvent.scroll(screen.getByTestId("legend-list"))`.

Scrolling, measuring and recycling are not covered here.

## Known product gaps (do not "fix" in production code here)

- Freeform 24h window edge cases: issue #28
- Other dashboard product bugs tracked separately

This suite is pure prewiring / characterization.
