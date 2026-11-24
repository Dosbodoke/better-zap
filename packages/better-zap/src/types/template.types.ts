import type {
  CoexistenceGraphErrorDiagnostics,
  CoexistenceGraphFailureKind,
} from "./coexistence.types";
import type { MetaGraphFailure } from "./graph.types";
import type { MessageTemplateIssue } from "../template-validation";

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
  text?: string;
  example?: {
    header_text?: string[];
    header_text_named_params?: MessageTemplateNamedExample[];
    header_handle?: string[];
  };
}

export const TEMPLATE_HEADER_MEDIA_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "video/mp4",
  "application/pdf",
] as const;

export type TemplateHeaderMediaType = (typeof TEMPLATE_HEADER_MEDIA_TYPES)[number];

export interface MessageTemplateBodyComponent {
  type: "BODY";
  text: string;
  example?: {
    body_text?: string[][];
    body_text_named_params?: MessageTemplateNamedExample[];
  };
}

export interface MessageTemplateFooterComponent {
  type: "FOOTER";
  text: string;
}

export type MessageTemplateButton =
  | { type: "QUICK_REPLY"; text: string }
  | { type: "URL"; text: string; url: string; example?: string[] }
  | { type: "PHONE_NUMBER"; text: string; phone_number: string }
  | { type: "COPY_CODE"; example: string }
  | MessageTemplateOtherButton;

export interface MessageTemplateOtherButton {
  type: "OTP" | "MPM" | "CATALOG" | "FLOW" | "VOICE_CALL";
  [key: string]: unknown;
}

export interface MessageTemplateButtonsComponent {
  type: "BUTTONS";
  buttons: MessageTemplateButton[];
}

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

export interface MessageTemplateDefinition {
  name: string;
  language: string;
  category: MessageTemplateCategory;
  components: MessageTemplateComponent[];
  parameter_format?: MessageTemplateParameterFormat;
  allow_category_change?: boolean;
  message_send_ttl_seconds?: number;
}

export interface MessageTemplateChanges {
  components?: MessageTemplateComponent[];
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
  issues?: MessageTemplateIssue[];
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
