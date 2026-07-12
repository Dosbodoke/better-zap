---
"@better-zap/react": patch
"@better-zap/hono": patch
"@better-zap/cli": patch
"@better-zap/fixtures": patch
---

Republish with build output. The previous `0.2.x`/`0.1.x` releases of these
scoped packages shipped tarballs containing only `LICENSE`, `README.md`, and
`package.json` — their `dist/` was never built during release, so every
`exports`/`types` target dangled and consumers hit `TS2307` / unresolved
imports (#52). These corrected versions include the built `dist/`. No source
or API changes.
