---
"better-zap": patch
---

`validateMessageTemplate` checks a template against Meta's documented limits (lengths, button counts, variable numbering, missing examples) and returns a list of issues with a code and a field path. It has no server dependencies, so a form can call it directly. `TemplateService.create` and `update` now run it first and return the issues without calling Meta; pass `validate: false` to skip it.
