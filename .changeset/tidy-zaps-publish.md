---
"better-zap": patch
"@better-zap/react": patch
"@better-zap/hono": patch
"@better-zap/cli": patch
"@better-zap/fixtures": patch
---

Republish the core package with its complete build output. Version 0.2.0 omitted
the code-split `client*` runtime and declaration chunks referenced by its packed
entrypoints, breaking both runtime imports and consumer types (#56).

Package validation now uses `publint` and Are the Types Wrong across every
published package. Dual ESM/CommonJS export maps point each condition at its
matching declaration format, and release metadata explicitly enables public
npm publishing with provenance.
