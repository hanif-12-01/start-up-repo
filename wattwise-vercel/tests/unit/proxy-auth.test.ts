import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from '@/proxy';

describe('Proxy Auth & Stale Session Redirection Tests', () => {
  const baseUrl = 'http://localhost:3000';

  function createRequest(path: string, cookies: Record<string, string> = {}, headers: Record<string, string> = {}) {
    const cookieHeader = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');

    const reqHeaders: Record<string, string> = { ...headers };
    if (cookieHeader) {
      reqHeaders['cookie'] = cookieHeader;
    }

    return new NextRequest(new URL(path, baseUrl), {
      headers: reqHeaders,
    });
  }

  it('CASE 1: /login without session cookie is NOT redirected to /dashboard', () => {
    const req = createRequest('/login');
    const res = proxy(req);

    // Should pass through to render login page (status 200 / not redirect 307)
    expect(res.status).not.toBe(307);
    expect(res.status).not.toBe(308);
    expect(res.headers.get('location')).toBeNull();
  });

  it('CASE 2: /login with arbitrary/stale wattwise session cookie is NOT redirected to /dashboard', () => {
    const req = createRequest('/login', {
      'wattwise.session_token': 'arbitrary_expired_or_stale_token_123',
    });
    const res = proxy(req);

    // Stale session must NOT blindly redirect to /dashboard
    expect(res.headers.get('location')).toBeNull();
  });

  it('CASE 3: /register with stale cookie does not blind-redirect to /dashboard', () => {
    const req = createRequest('/register', {
      'better-auth.session_token': 'expired_token_abc',
    });
    const res = proxy(req);

    expect(res.headers.get('location')).toBeNull();
  });

  it('CASE 4: protected route without auth cookie redirects to /login', () => {
    const protectedPaths = [
      '/dashboard',
      '/analysis',
      '/anomalies',
      '/predictions',
      '/bills',
      '/reports',
      '/settings',
    ];

    for (const path of protectedPaths) {
      const req = createRequest(path);
      const res = proxy(req);

      expect(res.status).toBe(307);
      expect(res.headers.get('location')).toBe('http://localhost:3000/login');
    }
  });

  it('CASE 5: protected route with session cookie passes through for server-side auth validation', () => {
    const req = createRequest('/dashboard', {
      'wattwise.session_token': 'existing_cookie_value',
    });
    const res = proxy(req);

    // Passes through so server component can validate the token against database
    expect(res.status).not.toBe(307);
    expect(res.headers.get('location')).toBeNull();
  });

  it('CASE 6: unrelated public routes are unchanged and pass through', () => {
    const publicPaths = ['/', '/api/health'];

    for (const path of publicPaths) {
      const req = createRequest(path);
      const res = proxy(req);

      expect(res.headers.get('location')).toBeNull();
    }
  });

  it('CASE 7: x-correlation-id header is sanitized and propagated on all responses', () => {
    const req = createRequest('/login', {}, { 'x-correlation-id': 'custom-cid-123' });
    const res = proxy(req);

    expect(res.headers.get('x-correlation-id')).toBe('custom-cid-123');
  });
});
