# @better-zap/fixtures

## 0.1.2

### Patch Changes

- 7762b6a: Republish the core package with its complete build output. Version 0.2.0 omitted
  the code-split `client*` runtime and declaration chunks referenced by its packed
  entrypoints, breaking both runtime imports and consumer types (#56).

  Package validation now uses `publint` and Are the Types Wrong across every
  published package. Dual ESM/CommonJS export maps point each condition at its
  matching declaration format, and release metadata explicitly enables public
  npm publishing with provenance.

## 0.1.1

### Patch Changes

- 81aaf83: Republish with build output. The previous `0.2.x`/`0.1.x` releases of these
  scoped packages shipped tarballs containing only `LICENSE`, `README.md`, and
  `package.json` — their `dist/` was never built during release, so every
  `exports`/`types` target dangled and consumers hit `TS2307` / unresolved
  imports (#52). These corrected versions include the built `dist/`. No source
  or API changes.

## 0.1.0

### Minor Changes

- 9014013: Close the ES v4 coexistence audit gaps: subscribe the WABA after code exchange
  with credential-reference custody on the connected account (#17); sync deadline
  tracking, duplicate in-flight guards, and typed eligibility/billing preflight
  failures (#18); the official Meta-derived webhook fixture catalog as the new
  @better-zap/fixtures package with an exhaustive dispatcher (#19); and
  account_offboarded/account_reconnected handling that blocks unusable accounts
  (#20).
- 9c7a22a: Add a standalone coexistence WhatsApp webhook fixture package.
