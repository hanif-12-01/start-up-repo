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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasCookie = hasSessionCookie(request);

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));

  if (isProtected && !hasCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if ((pathname === '/login' || pathname === '/register') && hasCookie) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/setup/:path*', '/plan/:path*', '/onboarding/:path*', '/businesses/:path*', '/login', '/register'],
};
