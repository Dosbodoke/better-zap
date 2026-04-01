/**
 * Centralized Logger for Better Zap
 *
 * Lightweight, injectable logger with structured JSON output.
 * Cloudflare Workers compatible (no external dependencies).
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

/** User-facing configuration (on betterZap config). */
export interface LoggerConfig {
  disabled?: boolean;
  level?: LogLevel;
  log?: (
    level: LogLevel,
    message: string,
    context: Record<string, unknown>,
  ) => void;
}

/** Internal logger interface injected into services. */
export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

const LOG_LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const CONSOLE_METHODS: Record<LogLevel, "debug" | "info" | "warn" | "error"> = {
  debug: "debug",
  info: "info",
  warn: "warn",
  error: "error",
};

function defaultLog(
  level: LogLevel,
  message: string,
  context: Record<string, unknown>,
): void {
  const entry = { level, message, context, timestamp: new Date().toISOString() };
  console[CONSOLE_METHODS[level]](JSON.stringify(entry));
}

export function createLogger(config?: LoggerConfig): Logger {
  if (config?.disabled) return noopLogger;

  const minLevel = LOG_LEVEL_ORDER[config?.level ?? "info"];
  const logFn = config?.log ?? defaultLog;

  function emit(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    if (LOG_LEVEL_ORDER[level] >= minLevel) {
      logFn(level, message, context ?? {});
    }
  }

  return {
    debug: (msg, ctx) => emit("debug", msg, ctx),
    info: (msg, ctx) => emit("info", msg, ctx),
    warn: (msg, ctx) => emit("warn", msg, ctx),
    error: (msg, ctx) => emit("error", msg, ctx),
  };
}

export const noopLogger: Logger = {
  debug() {},
  info() {},
  warn() {},
  error() {},
};

export function serializeError(err: unknown): Record<string, unknown> {
  if (err instanceof Error) {
    return { message: err.message, name: err.name, stack: err.stack };
  }
  return { message: String(err) };
}
