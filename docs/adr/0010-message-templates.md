# 0010. Message templates: validation, webhooks and generation

## Status

Accepted.

## Decision

- `api.templates` manages templates in Meta. It is not the `templates` option
  of `betterZap()`, which is the typed registry used by `send.template`.
- Definitions and Meta responses can come from untyped JSON, so every field is
  read as `unknown` and helpers such as upper-casing never throw on odd
  values.
- Local validation applies Meta's documented limits, counted in code points so
  an emoji counts once: names are lower-case letters, digits and underscores up
  to 512 characters; a TEXT header is at most 60 characters with one variable;
  the body at most 1024; the footer at most 60. Category and parameter format
  are accepted in either case. Variable numbering restarts in each component.
- The parameter format is `NAMED` when any header or body variable is not a
  number, else `POSITIONAL` (Meta's default when omitted).
- Authentication templates use a different component model and are not
  checked. An edit usually has no category, so they are also recognised by
  their one-time password button.
- `update` replaces every component. Meta rejects a category change on an
  approved template.
- A header media handle comes from Meta's Resumable Upload API. The upload
  session id can carry a query string that becomes the upload request's query.
- Webhooks: language codes have `-` replaced by `_`; a reason of `"NONE"` reads
  as `null`; a category change is `scheduled` when Meta announces it (with
  `correct_category`) and `changed` when it applies it (with
  `previous_category`); a timestamp outside `Date`'s range is treated as
  missing, since `toISOString` would throw.
- Definitions built from Meta name numeric variables by position (`body_1`)
  and named ones by name (`body_first_name`). A phone-number button takes no
  value but still counts towards the index of later buttons.
- The CLI generator keeps `APPROVED` and `PAUSED` templates by default and
  picks the default language when present, else the code that sorts first, so
  the output does not depend on the order Meta returns.
