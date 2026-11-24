import { isMediaPlaceholder } from "../utils/media-placeholder";
import { asRecord } from "../utils/record";
import {
  STORABLE_MEDIA_TYPES,
  type MessageMedia,
  type StorableMediaType,
  type StoredMessageMedia,
} from "./types";

export interface MessageMediaPayload {
  type: StorableMediaType;
  id: string;
  mimeType?: string;
  sha256?: string;
  filename?: string;
}

export function getMessageMediaPayload(
  message: { type?: unknown; [key: string]: unknown } | null | undefined,
): MessageMediaPayload | undefined {
  if (!message || isMediaPlaceholder(message)) return undefined;
  if (!isStorableMediaType(message.type)) return undefined;

  const type = message.type;
  const media = asRecord(message[type]);
  if (typeof media.id !== "string" || media.id.length === 0) return undefined;

  return {
    type,
    id: media.id,
    mimeType: typeof media.mime_type === "string" ? media.mime_type : undefined,
    sha256: typeof media.sha256 === "string" ? media.sha256 : undefined,
    filename: typeof media.filename === "string" ? media.filename : undefined,
  };
}

export function getMediaStorageKey(input: {
  phoneNumberId?: string | null;
  waMessageId: string;
}): string {
  return [
    "whatsapp",
    encodeURIComponent(input.phoneNumberId || "unknown"),
    encodeURIComponent(input.waMessageId),
  ].join("/");
}

export function getMessageMedia(
  record: { metadata?: unknown } | null | undefined,
): MessageMedia | undefined {
  const media = asRecord(asRecord(record?.metadata).media);
  if (!MEDIA_STATUSES.includes(media.status as MessageMedia["status"])) return undefined;
  return media as unknown as MessageMedia;
}

export function getStoredMessageMedia(
  record: { metadata?: unknown } | null | undefined,
): StoredMessageMedia | undefined {
  const media = getMessageMedia(record);
  return media?.status === "stored" && typeof media.key === "string"
    ? media
    : undefined;
}

const MEDIA_STATUSES: readonly MessageMedia["status"][] = ["stored", "failed", "skipped"];

function isStorableMediaType(type: unknown): type is StorableMediaType {
  return STORABLE_MEDIA_TYPES.includes(type as StorableMediaType);
}
