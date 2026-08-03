import { NextResponse } from 'next/server';
import { logger } from '@/server/logger';

/**
 * Production-safe API error responses.
 *
 * Rules:
 * - In production, internal error details (stack traces, DB messages, internal
 *   paths) are never included in the HTTP response body.
 * - A generic user-facing message is always returned.
 * - The real error is logged server-side with a correlationId for tracing.
 * - The correlationId is included in the response so users can report it to support.
 */

export interface ApiErrorResponse {
  error: string;
  correlationId?: string;
}

/**
 * Return a production-safe 500 Internal Server Error response.
 * Logs the real error server-side.
 */
export function serverError(
  error: unknown,
  correlationId?: string,
  context?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  logger.error('Unhandled API error', error, { correlationId, ...context });

  return NextResponse.json(
    {
      error: 'Terjadi kesalahan internal. Silakan coba lagi.',
      ...(correlationId ? { correlationId } : {}),
    },
    { status: 500 }
  );
}

/**
 * Return a 400 Bad Request response with a safe client-facing message.
 */
export function badRequest(
  message: string,
  correlationId?: string
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      ...(correlationId ? { correlationId } : {}),
    },
    { status: 400 }
  );
}

/**
 * Return a 401 Unauthorized response.
 */
export function unauthorized(correlationId?: string): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: 'Sesi tidak valid atau sudah berakhir. Silakan masuk kembali.',
      ...(correlationId ? { correlationId } : {}),
    },
    { status: 401 }
  );
}

/**
 * Return a 404 Not Found response.
 */
export function notFoundError(correlationId?: string): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: 'Sumber daya tidak ditemukan.',
      ...(correlationId ? { correlationId } : {}),
    },
    { status: 404 }
  );
}

/**
 * Return a 429 Too Many Requests response.
 */
export function rateLimited(correlationId?: string): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: 'Terlalu banyak permintaan. Silakan tunggu sebentar.',
      ...(correlationId ? { correlationId } : {}),
    },
    { status: 429 }
  );
}
