---
"better-zap": patch
---

One failing item no longer stops the rest of a webhook payload. Before, the first error while processing a request (a storage failure on one message, or a status with a malformed timestamp) skipped every later message, status and change in that request, and Meta does not retry because it already got `200 OK`. Each change, message and status is now processed on its own. Failures are logged as `webhook.change_failed`, `webhook.message_failed` or `webhook.status_failed`. A status with an unreadable timestamp is applied with the current time and logged as `webhook.status_invalid_timestamp`.
