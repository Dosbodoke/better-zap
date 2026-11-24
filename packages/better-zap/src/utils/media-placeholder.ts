import { asRecord } from "./record";

export const MEDIA_PLACEHOLDER_TYPE = "media_placeholder";

export function isMediaPlaceholder(
  message: { type?: unknown } | null | undefined,
): boolean {
  return message?.type === MEDIA_PLACEHOLDER_TYPE;
}

export function hasPendingMedia(
  record: { metadata?: unknown } | null | undefined,
): boolean {
  const metadata = asRecord(record?.metadata);
  if (metadata.mediaPending === true) return true;
  return isMediaPlaceholder(asRecord(metadata.raw));
}
