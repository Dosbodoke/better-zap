import type {
  CoexistenceGraphErrorDiagnostics,
  CoexistenceGraphFailureKind,
} from "./coexistence.types";
import type { MetaGraphFailure } from "./graph.types";

export type MessageTemplateCategory = "MARKETING" | "UTILITY" | "AUTHENTICATION";

export type MessageTemplateStatus =
  | "APPROVED"
  | "IN_APPEAL"
  | "PENDING"
  | "REJECTED"
  | "PENDING_DELETION"
  | "DELETED"
  | "DISABLED"
  | "PAUSED"
  | "LIMIT_EXCEEDED"
  | "ARCHIVED"
  | (string & {});

export type MessageTemplateQualityScore =
  | "GREEN"
  | "YELLOW"
  | "RED"
  | "UNKNOWN"
  | (string & {});

export type MessageTemplateParameterFormat = "NAMED" | "POSITIONAL";

export interface MessageTemplateNamedExample {
  param_name: string;
  example: string;
}

export interface MessageTemplateHeaderComponent {
  type: "HEADER";
  format: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION" | "GIF";
  /** Only for `format: "TEXT"`. At most 60 characters and one variable. */
  text?: string;
  example?: {
    header_text?: string[];
    header_text_named_params?: MessageTemplateNamedExample[];
    /** Media formats: one handle from Meta's Resumable Upload API. */
    header_handle?: string[];
  };
}

export interface MessageTemplateBodyComponent {
  type: "BODY";
  /** At most 1024 characters. */
  text: string;
  example?: {
    /** Positional variables: one inner array with one example per variable. */
    body_text?: string[][];
    body_text_named_params?: MessageTemplateNamedExample[];
  };
}

export interface MessageTemplateFooterComponent {
  type: "FOOTER";
  /** At most 60 characters. */
  text: string;
}

export type MessageTemplateButton =
  | { type: "QUICK_REPLY"; text: string }
  | { type: "URL"; text: string; url: string; example?: string[] }
  | { type: "PHONE_NUMBER"; text: string; phone_number: string }
  | { type: "COPY_CODE"; example: string }
  | MessageTemplateOtherButton;

/** Button types Better Zap passes through without modelling their fields. */
export interface MessageTemplateOtherButton {
  type: "OTP" | "MPM" | "CATALOG" | "FLOW" | "VOICE_CALL";
  [key: string]: unknown;
}

export interface MessageTemplateButtonsComponent {
  type: "BUTTONS";
  buttons: MessageTemplateButton[];
}

/** Component types Better Zap passes through without modelling their fields. */
export interface MessageTemplateOtherComponent {
  type: "CAROUSEL" | "LIMITED_TIME_OFFER" | "CALL_PERMISSION_REQUEST";
  [key: string]: unknown;
}

export type MessageTemplateComponent =
  | MessageTemplateHeaderComponent
  | MessageTemplateBodyComponent
  | MessageTemplateFooterComponent
  | MessageTemplateButtonsComponent
  | MessageTemplateOtherComponent;

/** A template as Meta returns it. */
export interface MessageTemplate {
  id: string;
  name: string;
  language: string;
  status: MessageTemplateStatus;
  category: MessageTemplateCategory | (string & {});
  components: MessageTemplateComponent[];
  parameter_format?: MessageTemplateParameterFormat;
  sub_category?: string;
  quality_score?: { score?: MessageTemplateQualityScore; [key: string]: unknown };
  rejected_reason?: string;
  previous_category?: string;
  correct_category?: string;
  last_updated_time?: string;
  message_send_ttl_seconds?: number;
}

/** What `create` sends. */
export interface MessageTemplateDefinition {
  /** Lower-case letters, digits and underscores. At most 512 characters. */
  name: string;
  /** Language code such as `pt_BR` or `en_US`. */
  language: string;
  category: MessageTemplateCategory;
  components: MessageTemplateComponent[];
  /** Meta uses `POSITIONAL` when omitted. */
  parameter_format?: MessageTemplateParameterFormat;
  allow_category_change?: boolean;
  message_send_ttl_seconds?: number;
}

/** What `update` sends. `components` replaces every existing component. */
export interface MessageTemplateChanges {
  components?: MessageTemplateComponent[];
  /** Meta rejects a category change on an approved template. */
  category?: MessageTemplateCategory;
  message_send_ttl_seconds?: number;
}

export interface MessageTemplatePage {
  templates: MessageTemplate[];
  paging: { before?: string; after?: string; hasNextPage: boolean };
}

export type TemplateFailureKind = CoexistenceGraphFailureKind | "invalid_input";

export interface TemplateFailure extends Omit<MetaGraphFailure, "diagnostics"> {
  diagnostics: Omit<CoexistenceGraphErrorDiagnostics, "kind"> & {
    kind: TemplateFailureKind;
  };
}

export type TemplateResult<TData> =
  | { success: true; data: TData }
  | TemplateFailure;

export const DEFAULT_MESSAGE_TEMPLATE_FIELDS = [
  "id",
  "name",
  "language",
  "status",
  "category",
  "sub_category",
  "components",
  "parameter_format",
  "quality_score",
  "rejected_reason",
  "previous_category",
  "correct_category",
  "last_updated_time",
] as const;
