# 0008. Download media once and serve it safely

## Status

Accepted.

## Context

Meta deletes webhook media after 7 days. Its download URL expires 5 minutes
after it is issued.

## Decision

- When the app provides a `MediaStore` (`database.media`), each image, audio,
  video, document and sticker is downloaded once, when it arrives, and recorded
  in `metadata.media`. Without one, only the text label and Meta's media id are
  kept.
- A download is a lookup (`GET /{media-id}`) and a fetch with the same bearer
  token. On 404 the URL is looked up again once. Files over `maxBytes` are not
  read; the body is read with a running size check.
- Meta's docs do not say whether the file hash is hex or base64, so both are
  accepted. Values that are neither are ignored rather than failing the
  download. Base64 decoding follows forgiving-base64.
- The time limit covers download and upload together.
- Media sent to another business's number uses that business's token.
- Storage keys are `whatsapp/{phoneNumberId}/{waMessageId}`, each segment
  URI-encoded so ids with `/` or `=` stay one segment.
- The S3 store reads streams into memory, because S3 needs a Content-Length,
  and signs the payload hash so the bucket rejects a corrupted upload. Bucket
  in path is the default for every endpoint except AWS.
- Signed URLs live at most 7 days, the S3 limit (3600 seconds by default).
- The media route redirects to a signed URL only for types that are safe to
  show inline (images, audio, video, PDF), because the bucket would serve
  anything else (HTML, SVG) without download headers. Everything else is
  streamed as a download with a sandbox CSP, so a file sent by a contact cannot
  run script on the app's origin.
- Stored files never change, so responses are cacheable for a year. Redirects
  are cached for less time than the signed URL lives.

## Consequences

Memory use per upload is bounded by `maxBytes` (25 MiB by default).
