import { describe, expect, it } from 'vitest';
import { betterAuth } from 'better-auth';
import { memoryAdapter } from 'better-auth/adapters/memory';
import { getAuthConfig } from '../../src/server/auth/config';

// Real Better Auth HTTP handler + in-memory adapter: no sockets, SQL, seed or migration.
describe.each(['preview', 'production', 'development'])('Better Auth %s policy integration', (environment) => {
  const origin = environment === 'development' ? 'http://localhost:3000' : `https://${environment}.example.test`;
  function setup() {
    const data: Record<string, Record<string, unknown>[]> = { user: [], account: [], session: [], verification: [] };
    const auth = betterAuth({
      ...getAuthConfig({ NODE_ENV: environment === 'development' ? 'development' : 'production',
        VERCEL_ENV: environment === 'development' ? undefined : environment,
        BETTER_AUTH_URL: origin, NEXT_PUBLIC_APP_URL: origin,
        BETTER_AUTH_SECRET: 'synthetic-test-only-secret-32-bytes-minimum' }),
      database: memoryAdapter(data), emailAndPassword: { enabled: true },
      logger: { disabled: true },
    });
    const request = (path: string, body?: Record<string, unknown>, requestOrigin = origin, cookie?: string) => auth.handler(new Request(`${origin}/api/auth/${path}`, {
      method: body ? 'POST' : 'GET',
      headers: { ...(body ? { 'content-type': 'application/json' } : {}), origin: requestOrigin, ...(cookie ? { cookie } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    }));
    return { data, request, auth };
  }
  const signup = { name: 'Synthetic Test', email: 'auth-policy@example.test', password: 'Synthetic-test-password-123!' };

  it('allows exact origin, issues host-only session cookies, authenticates then logs out', async () => {
    const { request } = setup();
    const response = await request('sign-up/email', { ...signup, callbackURL: `${origin}/dashboard` });
    expect(response.status).toBe(200);
    const cookies = response.headers.getSetCookie();
    const session = cookies.find(value => value.includes('wattwise.session_token='));
    expect(session).toBeDefined();
    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/SameSite=Lax/i);
    expect(session).not.toMatch(/;\s*Domain=/i);
    expect(session).toMatch(/Path=\//i);
    if (environment !== 'development') expect(session).toMatch(/;\s*Secure/i);
    const cookie = cookies.map(value => value.split(';')[0]).join('; ');
    const active = await request('get-session', undefined, origin, cookie);
    expect((await active.json()).user.email).toBe(signup.email);
    expect((await request('sign-out', {}, origin, cookie)).status).toBe(200);
    expect(await (await request('get-session', undefined, origin, cookie)).json()).toBeNull();
  });

  it.each(['https://evil.example.test', `${origin}.evil.example.test`, 'https://unrelated.vercel.app'])('denies hostile origin %s before persistence', async (hostile) => {
    const { data, request } = setup();
    expect((await request('sign-up/email', signup, hostile)).status).toBe(403);
    expect(data.user).toHaveLength(0);
    expect(data.session).toHaveLength(0);
  });

  it.each(['https://evil.example.test/dashboard', '//evil.example.test/dashboard', 'javascript:alert(1)'])('denies external callback %s', async (callbackURL) => {
    const { data, request } = setup();
    expect((await request('sign-up/email', { ...signup, callbackURL })).status).toBe(403);
    expect(data.user).toHaveLength(0);
  });

  it('rejects expired and forged sessions', async () => {
    const { data, request } = setup();
    const response = await request('sign-up/email', signup);
    expect(response.status).toBe(200);
    const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    data.session[0].expiresAt = new Date(0);
    expect(await (await request('get-session', undefined, origin, cookie)).json()).toBeNull();
    expect(await (await request('get-session', undefined, origin, 'wattwise.session_token=forged')).json()).toBeNull();
  });

  it('allows relative callbacks and password login but rejects a wrong password', async () => {
    const { request } = setup();
    expect((await request('sign-up/email', { ...signup, callbackURL: '/dashboard' })).status).toBe(200);
    expect((await request('sign-in/email', { email: signup.email, password: signup.password, callbackURL: '/dashboard' })).status).toBe(200);
    expect((await request('sign-in/email', { email: signup.email, password: 'Wrong-synthetic-password-123!' })).status).toBe(401);
  });

  it('blocks cookie-authenticated POST without Origin and cross-site navigation CSRF', async () => {
    const { request, auth } = setup();
    const response = await request('sign-up/email', signup);
    const cookie = response.headers.getSetCookie().map(value => value.split(';')[0]).join('; ');
    expect((await request('sign-out', {}, '', cookie)).status).toBe(403);
    const csrf = await request('sign-out', {}, 'https://evil.example.test', cookie);
    expect(csrf.status).toBe(403);
    const navigation = await auth.handler(new Request(`${origin}/api/auth/sign-in/email`, {
      method: 'POST', headers: { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site', 'sec-fetch-mode': 'navigate' },
      body: JSON.stringify({ email: signup.email, password: signup.password }),
    }));
    expect(navigation.status).toBe(403);
  });
});
