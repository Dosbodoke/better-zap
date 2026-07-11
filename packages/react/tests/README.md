# `@better-zap/react` consumer verification

These tests import the **published** package surface (`@better-zap/react` → `dist/` via `package.json` exports), not `src/`.

## Running

```bash
pnpm --filter @better-zap/react test
```

The package `test` script builds first (`pnpm run build && vitest run`) so assertions always hit current dist artifacts.

## LegendList / jsdom

`ConversationList` and `MessageList` use `@legendapp/list` virtualization. jsdom has no real layout, so tests stub `offsetHeight` / `offsetWidth` / `getBoundingClientRect` (see `helpers.ts`).

If row virtualization still fails to paint items after those stubs, prefer characterizing chrome (search, chips, loading/error/empty) and document the gap here rather than reaching into `src/`.

LegendList absolute-position pooling can also scramble **document order** of sticky date dividers relative to messages. Prefer asserting message-body order (or presence of dividers) rather than strict DOM order of `HOJE`/`ONTEM` nodes.

## Known product gaps (do not "fix" in production code here)

- Freeform 24h window edge cases: issue #28
- Other dashboard product bugs tracked separately (e.g. #32)

This suite is pure prewiring / characterization.
