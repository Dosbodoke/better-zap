---
"better-zap": patch
"@better-zap/cli": patch
---

`templateDefinitionFromMeta` converts a template returned by Meta into the definition used by `send.template`, so a template listed at runtime can be sent with named params.

`better-zap generate` changes in three ways. A phone-number button no longer makes it fail. A template it cannot express (flows, carousels, ...) is skipped with a warning instead of stopping the run. Only `APPROVED` and `PAUSED` templates are generated; pass `--all-statuses` for the previous behavior. When a template exists in several languages, the entry uses `--default-language` if set, otherwise the first language code alphabetically.

Re-run `better-zap generate` after upgrading: the output can change, and `--check` fails until you do.
