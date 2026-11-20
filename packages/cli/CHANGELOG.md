# @better-zap/cli

## 25.0.4

### Patch Changes

- cbe7c99: `templateDefinitionFromMeta` converts a template returned by Meta into the definition used by `send.template`, so a template listed at runtime can be sent with named params.

  `better-zap generate` changes in three ways. A phone-number button no longer makes it fail. A template it cannot express (flows, carousels, ...) is skipped with a warning instead of stopping the run. Only `APPROVED` and `PAUSED` templates are generated; pass `--all-statuses` for the previous behavior. When a template exists in several languages, the entry uses `--default-language` if set, otherwise the first language code alphabetically.

  Re-run `better-zap generate` after upgrading: the output can change, and `--check` fails until you do.

- Updated dependencies [75ae858]
- Updated dependencies [0dfb258]
- Updated dependencies [6065912]
- Updated dependencies [0c224f9]
- Updated dependencies [4ba5840]
- Updated dependencies [cbe7c99]
- Updated dependencies [0238b9e]
- Updated dependencies [382ac26]
- Updated dependencies [4c91167]
- Updated dependencies [2d02c6e]
- Updated dependencies [7446341]
  - better-zap@25.0.4

## 25.0.3

### Patch Changes

- Updated dependencies [ac638cc]
- Updated dependencies [0c7a29e]
  - better-zap@25.0.3

## 25.0.2

### Patch Changes

- Updated dependencies [e332452]
- Updated dependencies [99b62ec]
  - better-zap@25.0.2

## 25.0.1

### Patch Changes

- Updated dependencies [078d531]
  - better-zap@25.0.1

## 25.0.0

### Migration

- Align package releases with Meta Graph API v25.0. All five public packages
  use the coordinated 25.0.x line, and future package patch releases increment
  the third number. Move consumers from the previous 0.x versions to 25.0.0 and
  update dependency ranges to ^25.0.0. The runtime Meta API defaults and
  behavior are unchanged.

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
