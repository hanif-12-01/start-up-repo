import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasSessionCookie =
    request.cookies.has('wattwise.session_token') ||
    request.cookies.has('better-auth.session_token') ||
    request.cookies.has('__Secure-wattwise.session_token') ||
    request.cookies.has('__Secure-better-auth.session_token');

  if (pathname.startsWith('/setup') && !hasSessionCookie) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if ((pathname === '/login' || pathname === '/register') && hasSessionCookie) {
    return NextResponse.redirect(new URL('/setup', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/setup/:path*', '/login', '/register'],
};
