---
"better-zap": patch
---

New `TemplateService` creates, lists, reads, edits and deletes message templates through Meta's template management API. It takes a token and a WhatsApp Business Account id, either once in the constructor or per call, so one service can serve several accounts. It adds no HTTP routes.
