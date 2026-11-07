/**
 * Coexistence history sync sends older media as `type: "media_placeholder"`
 * with no media object. For media sent within 14 days of onboarding, Meta later
 * sends another history webhook with the same message id and the real media.
 */

import { asRecord } from "./record";

export const MEDIA_PLACEHOLDER_TYPE = "media_placeholder";

/** True when a webhook message is a history media placeholder. */
export function isMediaPlaceholder(
  message: { type?: unknown } | null | undefined,
): boolean {
  return message?.type === MEDIA_PLACEHOLDER_TYPE;
}

/**
 * True when a stored log record still holds a media placeholder, so UIs can
 * show "media unavailable" instead of the text label.
 *
 * Checks the `mediaPending` flag set by the SDK, and falls back to the raw
 * message type for records stored before the flag existed.
 */
export function hasPendingMedia(
  record: { metadata?: unknown } | null | undefined,
): boolean {
  const metadata = asRecord(record?.metadata);
  if (metadata.mediaPending === true) return true;
  return isMediaPlaceholder(asRecord(metadata.raw));
}
