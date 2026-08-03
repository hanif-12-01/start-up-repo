import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PROTECTED_PREFIXES = ['/dashboard', '/setup', '/plan', '/onboarding', '/businesses'];

function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has('wattwise.session_token') ||
    request.cookies.has('better-auth.session_token') ||
    request.cookies.has('__Secure-wattwise.session_token') ||
    request.cookies.has('__Secure-better-auth.session_token')
  );
}

/**
 * Generate a short URL-safe correlation ID for request tracing.
 * Attached as X-Correlation-Id response header on every request.
 */
function generateCorrelationId(): string {
  return crypto.randomUUID();
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = hasSessionCookie(request);
  const correlationId = request.headers.get('x-correlation-id') || generateCorrelationId();

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));

  let response: NextResponse;

  if (isProtected && !hasCookie) {
    response = NextResponse.redirect(new URL('/login', request.url));
  } else if ((pathname === '/login' || pathname === '/register') && hasCookie) {
    response = NextResponse.redirect(new URL('/dashboard', request.url));
  } else {
    response = NextResponse.next();
  }

  // Propagate correlation ID on every response for log tracing
  response.headers.set('x-correlation-id', correlationId);

  return response;
}

export const config = {
  matcher: ['/dashboard/:path*', '/setup/:path*', '/plan/:path*', '/onboarding/:path*', '/businesses/:path*', '/login', '/register'],
};
