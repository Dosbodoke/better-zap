import type { CoexistenceGraphErrorDiagnostics } from "./coexistence.types";

export interface MetaGraphSuccess<TData> {
  success: true;
  data: TData;
  httpStatus?: number;
}

export interface MetaGraphFailure {
  success: false;
  error: string;
  errorCode?: number;
  errorSubcode?: number;
  /** Meta's `error_user_title`. Safe to show to the person who made the request. */
  errorUserTitle?: string;
  /** Meta's `error_user_msg`. Safe to show to the person who made the request. */
  errorUserMessage?: string;
  httpStatus?: number;
  /** Raw response body. May contain untrusted text; do not log it verbatim. */
  details?: unknown;
  diagnostics: CoexistenceGraphErrorDiagnostics;
}

export type MetaGraphResult<TData> = MetaGraphSuccess<TData> | MetaGraphFailure;
