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
  errorUserTitle?: string;
  errorUserMessage?: string;
  httpStatus?: number;
  details?: unknown;
  diagnostics: CoexistenceGraphErrorDiagnostics;
}

export type MetaGraphResult<TData> = MetaGraphSuccess<TData> | MetaGraphFailure;
