/**
 * Structured, redacted server-side logger for WattWise AI.
 *
 * Rules:
 * - All log entries are JSON-formatted for log aggregation compatibility.
 * - Sensitive keys (password, token, authorization, cookie, secrets, PII, SQL params)
 *   are automatically sanitized/redacted to prevent accidental leakage.
 * - Each request should carry a correlationId for tracing across request lifecycles.
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

const SENSITIVE_KEY_PATTERN =
  /password|token|authorization|cookie|database_url|databaseurl|auth_secret|authsecret|secret|email|phone|address|questionnaire|inspectionnotes|actionnotes|requestbody|sqlparams/i;

export function redactValue(key: string, value: unknown): unknown {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const redactedObj: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      redactedObj[k] = redactValue(k, v);
    }
    return redactedObj;
  }
  if (SENSITIVE_KEY_PATTERN.test(key)) {
    return '[REDACTED]';
  }
  if (Array.isArray(value)) {
    return value.map((item) =>
      typeof item === 'object' && item !== null
        ? redactValue(key, item)
        : item
    );
  }
  return value;
}

function buildEntry(level: LogLevel, message: string, context?: LogContext) {
  const sanitizedContext: Record<string, unknown> = {};
  if (context) {
    for (const [k, v] of Object.entries(context)) {
      sanitizedContext[k] = redactValue(k, v);
    }
  }

  return {
    ts: new Date().toISOString(),
    level,
    message,
    ...sanitizedContext,
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

    emit('error', buildEntry('error', message, redactValue('context', { ...context, ...errorDetail }) as LogContext));
  },
};

/**
 * Generate a short, URL-safe correlation ID for request tracing.
 * Uses crypto.randomUUID() which is available in Node 14.17+ and all modern runtimes.
 * Enforces safe character format (UUID v4) and max length limit (64 chars).
 */
export function generateCorrelationId(): string {
  return crypto.randomUUID();
}

export function sanitizeCorrelationId(id: string | null | undefined): string {
  if (!id) return generateCorrelationId();
  // Safe character check: alphanumeric and hyphens only, max 64 chars
  const sanitized = id.trim();
  if (/^[a-zA-Z0-9-]{1,64}$/.test(sanitized)) {
    return sanitized;
  }
  return generateCorrelationId();
}
