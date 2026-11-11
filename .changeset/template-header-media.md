---
"better-zap": patch
"@better-zap/hono": patch
---

`TemplateService.uploadHeaderMedia` uploads the sample image, video or PDF that a media-header template needs and returns the handle for `example.header_handle`. It needs the Meta app id, set once as `appId` in the service config or per call.

Failures from `TemplateService` and `CoexistenceService` no longer contain the access token when Meta echoes it in an error message: it is replaced with `[REDACTED]` in `error`, `errorUserTitle`, `errorUserMessage` and `details`.
