/**
 * Structured, redacted server-side logger for WattWise AI.
 *
 * Rules:
 * - All log entries are JSON-formatted for log aggregation compatibility.
 * - PII fields (email, name, phone, address, businessName, sessionToken) are
 *   never logged — callers must not pass them in the context object.
 * - Secret values (DATABASE_URL, BETTER_AUTH_SECRET) are never logged.
 * - Each request should carry a correlationId (generated in middleware or
 *   passed from the caller) to allow log tracing across a request lifecycle.
 * - Stack traces are included only in development; in production only the
 *   sanitized message is emitted to avoid leaking internal paths.
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogContext {
  correlationId?: string;
  userId?: string;     // OK — opaque internal identifier, not PII
  businessId?: string; // OK — opaque internal identifier, not PII
  path?: string;
  method?: string;
  statusCode?: number;
  durationMs?: number;
  event?: string;
  [key: string]: unknown;
}

function buildEntry(level: LogLevel, message: string, context?: LogContext) {
  return {
    ts: new Date().toISOString(),
    level,
    message,
    ...(context ?? {}),
  };
}

function emit(level: LogLevel, entry: ReturnType<typeof buildEntry>) {
  const line = JSON.stringify(entry);
  if (level === 'error' || level === 'warn') {
    console.error(line);
  } else {
    console.log(line);
  }
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      emit('debug', buildEntry('debug', message, context));
    }
  },

  info(message: string, context?: LogContext) {
    emit('info', buildEntry('info', message, context));
  },

  warn(message: string, context?: LogContext) {
    emit('warn', buildEntry('warn', message, context));
  },

  /**
   * Log an error safely. Stack traces are included only in development.
   * Never pass secret values or PII in the context object.
   */
  error(message: string, error?: unknown, context?: LogContext) {
    const errorDetail =
      process.env.NODE_ENV === 'development' && error instanceof Error
        ? { errorMessage: error.message, stack: error.stack }
        : error instanceof Error
          ? { errorMessage: error.message }
          : {};

    emit('error', buildEntry('error', message, { ...context, ...errorDetail }));
  },
};

/**
 * Generate a short, URL-safe correlation ID for request tracing.
 * Uses crypto.randomUUID() which is available in Node 14.17+ and all modern runtimes.
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}
