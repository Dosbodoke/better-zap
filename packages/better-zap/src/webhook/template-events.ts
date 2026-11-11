import type {
  MessageTemplateCategory,
  MessageTemplateQualityScore,
} from "../types/template.types";
import type { WebhookChange } from "../types/whatsapp.types";

export type TemplateStatusEvent =
  | "APPROVED"
  | "ARCHIVED"
  | "UNARCHIVED"
  | "DELETED"
  | "DISABLED"
  | "FLAGGED"
  | "IN_APPEAL"
  | "LIMIT_EXCEEDED"
  | "LOCKED"
  | "PAUSED"
  | "PENDING"
  | "REINSTATED"
  | "PENDING_DELETION"
  | "REJECTED"
  | (string & {});

export type TemplateStatusReason =
  | "ABUSIVE_CONTENT"
  | "CATEGORY_NOT_AVAILABLE"
  | "INCORRECT_CATEGORY"
  | "INVALID_FORMAT"
  | "NONE"
  | "PROMOTIONAL"
  | "SCAM"
  | "TAG_CONTENT_MISMATCH"
  | (string & {});

interface TemplateWebhookValueBase {
  message_template_id: number | string;
  message_template_name: string;
  message_template_language?: string;
}

export interface TemplateStatusUpdateValue extends TemplateWebhookValueBase {
  event: TemplateStatusEvent;
  reason?: TemplateStatusReason | null;
  message_template_category?: MessageTemplateCategory | (string & {});
  disable_info?: { disable_date?: number | string };
  other_info?: { title?: string; description?: string };
  rejection_info?: { reason?: string; recommendation?: string };
}

export interface TemplateQualityUpdateValue extends TemplateWebhookValueBase {
  previous_quality_score?: MessageTemplateQualityScore;
  new_quality_score?: MessageTemplateQualityScore;
}

export interface TemplateCategoryUpdateValue extends TemplateWebhookValueBase {
  previous_category?: string;
  new_category?: string;
  correct_category?: string;
  category_update_timestamp?: number | string;
}

export interface TemplateComponentsUpdateValue extends TemplateWebhookValueBase {
  message_template_element?: string;
  message_template_title?: string;
  message_template_footer?: string;
  message_template_buttons?: Array<{
    message_template_button_type?: string;
    message_template_button_text?: string;
    message_template_button_url?: string;
    message_template_button_phone_number?: string;
  }>;
}

/** Fields every template hook receives. */
export interface TemplateWebhookContext<TValue> {
  /** The WhatsApp Business Account that owns the template (the webhook entry id). */
  wabaId: string;
  /** Template id, always a string. */
  templateId: string;
  templateName: string;
  /** Language code with `-` replaced by `_`, e.g. `en_US`. Empty string when Meta sends none. */
  templateLanguage: string;
  /** The payload exactly as Meta sent it. */
  value: TValue;
  change: WebhookChange;
}

export interface TemplateStatusUpdateContext
  extends TemplateWebhookContext<TemplateStatusUpdateValue> {
  event: TemplateStatusEvent;
  /** `null` when Meta sends no reason or the literal `"NONE"`. */
  reason: TemplateStatusReason | null;
  category?: MessageTemplateCategory | (string & {});
}

export interface TemplateQualityUpdateContext
  extends TemplateWebhookContext<TemplateQualityUpdateValue> {
  previousQualityScore: MessageTemplateQualityScore;
  newQualityScore: MessageTemplateQualityScore;
}

export interface TemplateCategoryUpdateContext
  extends TemplateWebhookContext<TemplateCategoryUpdateValue> {
  /** `"scheduled"`: Meta announced a change. `"changed"`: the change happened. */
  phase: "scheduled" | "changed";
  /** The category the template has now. */
  currentCategory?: string;
  /** Only when `phase` is `"changed"`. */
  previousCategory?: string;
  /** Only when `phase` is `"scheduled"`: the category Meta will apply. */
  nextCategory?: string;
  /** Only when `phase` is `"scheduled"`: ISO 8601 time of the change. */
  scheduledFor?: string;
}

export interface TemplateComponentsUpdateContext
  extends TemplateWebhookContext<TemplateComponentsUpdateValue> {
  body?: string;
  header?: string;
  footer?: string;
  buttons: Array<{ type: string; text?: string; url?: string; phoneNumber?: string }>;
}

type RawValue = Record<string, unknown>;

/** Reads a `message_template_status_update` change. Returns `null` when it is malformed. */
export function readTemplateStatusUpdate(
  change: WebhookChange,
  wabaId: string,
): TemplateStatusUpdateContext | null {
  const base = readBase<TemplateStatusUpdateValue>(change, wabaId);
  if (!base || !isNonEmptyString(base.raw.event)) return null;

  const { raw, context } = base;
  const reason = raw.reason;
  const category = raw.message_template_category;

  return {
    ...context,
    event: raw.event as string,
    reason: typeof reason === "string" && reason !== "NONE" ? reason : null,
    ...(typeof category === "string" ? { category } : {}),
  };
}

/** Reads a `message_template_quality_update` change. Returns `null` when it is malformed. */
export function readTemplateQualityUpdate(
  change: WebhookChange,
  wabaId: string,
): TemplateQualityUpdateContext | null {
  const base = readBase<TemplateQualityUpdateValue>(change, wabaId);
  if (!base) return null;

  const { raw, context } = base;
  return {
    ...context,
    previousQualityScore: readQualityScore(raw.previous_quality_score),
    newQualityScore: readQualityScore(raw.new_quality_score),
  };
}

/** Reads a `template_category_update` change. Returns `null` when it is malformed. */
export function readTemplateCategoryUpdate(
  change: WebhookChange,
  wabaId: string,
): TemplateCategoryUpdateContext | null {
  const base = readBase<TemplateCategoryUpdateValue>(change, wabaId);
  if (!base) return null;

  const { raw, context } = base;
  const currentCategory = readString(raw.new_category);

  // Meta announces a change with `correct_category` and applies it with `previous_category`.
  if (typeof raw.correct_category === "string") {
    const scheduledFor = readUnixTimestamp(raw.category_update_timestamp);
    return {
      ...context,
      phase: "scheduled",
      ...(currentCategory !== undefined ? { currentCategory } : {}),
      nextCategory: raw.correct_category,
      ...(scheduledFor !== undefined ? { scheduledFor } : {}),
    };
  }

  const previousCategory = readString(raw.previous_category);
  return {
    ...context,
    phase: "changed",
    ...(currentCategory !== undefined ? { currentCategory } : {}),
    ...(previousCategory !== undefined ? { previousCategory } : {}),
  };
}

/** Reads a `message_template_components_update` change. Returns `null` when it is malformed. */
export function readTemplateComponentsUpdate(
  change: WebhookChange,
  wabaId: string,
): TemplateComponentsUpdateContext | null {
  const base = readBase<TemplateComponentsUpdateValue>(change, wabaId);
  if (!base) return null;

  const { raw, context } = base;
  const body = readString(raw.message_template_element);
  const header = readString(raw.message_template_title);
  const footer = readString(raw.message_template_footer);
  const buttons = Array.isArray(raw.message_template_buttons)
    ? raw.message_template_buttons.filter(isObject).map(readButton)
    : [];

  return {
    ...context,
    ...(body !== undefined ? { body } : {}),
    ...(header !== undefined ? { header } : {}),
    ...(footer !== undefined ? { footer } : {}),
    buttons,
  };
}

/** Reads the id, name and language every template webhook carries. */
function readBase<TValue>(
  change: WebhookChange,
  wabaId: string,
): { raw: RawValue; context: TemplateWebhookContext<TValue> } | null {
  const raw = change.value as unknown;
  if (!isObject(raw)) return null;

  const id = raw.message_template_id;
  const name = raw.message_template_name;
  if (typeof id !== "number" && !isNonEmptyString(id)) return null;
  if (!isNonEmptyString(name)) return null;

  const language = raw.message_template_language;
  return {
    raw,
    context: {
      wabaId,
      templateId: String(id),
      templateName: name,
      templateLanguage:
        typeof language === "string" ? language.replaceAll("-", "_") : "",
      value: raw as TValue,
      change,
    },
  };
}

function readButton(button: RawValue): TemplateComponentsUpdateContext["buttons"][number] {
  const text = readString(button.message_template_button_text);
  const url = readString(button.message_template_button_url);
  const phoneNumber = readString(button.message_template_button_phone_number);

  return {
    type: String(button.message_template_button_type ?? ""),
    ...(text !== undefined ? { text } : {}),
    ...(url !== undefined ? { url } : {}),
    ...(phoneNumber !== undefined ? { phoneNumber } : {}),
  };
}

function readQualityScore(score: unknown): MessageTemplateQualityScore {
  return typeof score === "string" ? score : "UNKNOWN";
}

function readUnixTimestamp(timestamp: unknown): string | undefined {
  const seconds = Number(timestamp);
  if (!Number.isFinite(seconds) || seconds <= 0) return undefined;
  return new Date(seconds * 1000).toISOString();
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function isObject(value: unknown): value is RawValue {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
