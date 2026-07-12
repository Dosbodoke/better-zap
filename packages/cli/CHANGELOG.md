# @better-zap/cli

## 0.1.3

### Patch Changes

- 7762b6a: Republish the core package with its complete build output. Version 0.2.0 omitted
  the code-split `client*` runtime and declaration chunks referenced by its packed
  entrypoints, breaking both runtime imports and consumer types (#56).

  Package validation now uses `publint` and Are the Types Wrong across every
  published package. Dual ESM/CommonJS export maps point each condition at its
  matching declaration format, and release metadata explicitly enables public
  npm publishing with provenance.

- Updated dependencies [7762b6a]
  - better-zap@0.2.1

## 0.1.2

### Patch Changes

- 81aaf83: Republish with build output. The previous `0.2.x`/`0.1.x` releases of these
  scoped packages shipped tarballs containing only `LICENSE`, `README.md`, and
  `package.json` — their `dist/` was never built during release, so every
  `exports`/`types` target dangled and consumers hit `TS2307` / unresolved
  imports (#52). These corrected versions include the built `dist/`. No source
  or API changes.

## 0.1.1

### Patch Changes

- b31640d: Release the improve-codebase batch with app route protection, dependency updates,
  storage docs repair, landing verification, and atomic webhook dedupe.
- Updated dependencies [b31640d]
- Updated dependencies [9d1707f]
- Updated dependencies [9014013]
- Updated dependencies [b7f79ea]
- Updated dependencies [9584809]
  - better-zap@0.2.0
