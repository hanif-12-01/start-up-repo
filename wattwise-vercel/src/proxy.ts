import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { sanitizeCorrelationId } from '@/server/logger';

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/analysis',
  '/anomalies',
  '/predictions',
  '/recommendations',
  '/bills',
  '/revenue',
  '/appliances',
  '/businesses',
  '/diagnostics',
  '/reports',
  '/plans',
  '/plan',
  '/setup',
  '/onboarding',
  '/settings',
];

function hasSessionCookie(request: NextRequest): boolean {
  return (
    request.cookies.has('wattwise.session_token') ||
    request.cookies.has('better-auth.session_token') ||
    request.cookies.has('__Secure-wattwise.session_token') ||
    request.cookies.has('__Secure-better-auth.session_token')
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = hasSessionCookie(request);
  const rawCorrelationId = request.headers.get('x-correlation-id');
  const correlationId = sanitizeCorrelationId(rawCorrelationId);

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));

  let response: NextResponse;

  if (isProtected && !hasCookie) {
    response = NextResponse.redirect(new URL('/login', request.url));
  } else if ((pathname === '/login' || pathname === '/register') && hasCookie) {
    response = NextResponse.redirect(new URL('/dashboard', request.url));
  } else {
    response = NextResponse.next();
  }

  // Propagate sanitized correlation ID on every response for log tracing
  response.headers.set('x-correlation-id', correlationId);

  return response;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/analysis/:path*',
    '/anomalies/:path*',
    '/predictions/:path*',
    '/recommendations/:path*',
    '/bills/:path*',
    '/revenue/:path*',
    '/appliances/:path*',
    '/businesses/:path*',
    '/diagnostics/:path*',
    '/reports/:path*',
    '/plans/:path*',
    '/plan/:path*',
    '/setup/:path*',
    '/onboarding/:path*',
    '/settings/:path*',
    '/login',
    '/register',
  ],
};
