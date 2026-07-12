---
"better-zap": patch
---

Republish the core package with its complete build output. Version 0.2.0 omitted
the code-split `client*` runtime and declaration chunks referenced by its packed
entrypoints, breaking both runtime imports and consumer types (#56).

The publish smoke check now also verifies every relative import inside packed
JavaScript and declaration files, preventing an entrypoint from referencing a
chunk that is absent from the tarball.
