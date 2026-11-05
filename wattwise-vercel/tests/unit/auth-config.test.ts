import { describe, expect, it } from 'vitest';
import { getAuthConfig } from '../../src/server/auth/config';

// Reserved example domains and synthetic secrets, never deployment configuration.
const preview = {
  NODE_ENV: 'production', VERCEL: '1', VERCEL_ENV: 'preview',
  BETTER_AUTH_SECRET: 'synthetic-test-only-secret-32-bytes-minimum',
  BETTER_AUTH_URL: 'https://preview.example.test',
  NEXT_PUBLIC_APP_URL: 'https://preview.example.test',
};

describe('Exact environment-specific auth policy', () => {
  it('trusts only the configured Preview origin, not platform-supplied hostnames', () => {
    const config = getAuthConfig({ ...preview, VERCEL_URL: 'unapproved.vercel.app', VERCEL_PROJECT_PRODUCTION_URL: 'production.example.test' });
    expect(config.trustedOrigins).toEqual(['https://preview.example.test']);
    expect(config.advanced).toEqual({ cookiePrefix: 'wattwise', useSecureCookies: true, disableOriginCheck: false, disableCSRFCheck: false });
  });

  it.each(['https://*.vercel.app', 'https://preview.example.test/', 'https://preview.example.test/path',
    'https://preview.example.test?x=1', 'https://preview.example.test#fragment',
    'https://user:password@preview.example.test', 'http://preview.example.test',
    'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'not-a-url', ''])('rejects invalid hosted origin %s', (value) => {
    expect(() => getAuthConfig({ ...preview, BETTER_AUTH_URL: value })).toThrow('BETTER_AUTH_URL: exact HTTPS origin required');
  });

  it('rejects missing or mismatched app origin without disclosing the input', () => {
    expect(() => getAuthConfig({ ...preview, BETTER_AUTH_URL: undefined })).toThrow('BETTER_AUTH_URL');
    expect(() => getAuthConfig({ ...preview, NEXT_PUBLIC_APP_URL: undefined })).toThrow('NEXT_PUBLIC_APP_URL');
    expect(() => getAuthConfig({ ...preview, NEXT_PUBLIC_APP_URL: 'https://other.example.test' })).toThrow('must match');
  });

  it.each([undefined, '', 'short', ' '.repeat(40), 'dev_fallback_secret_32_characters_minimum_length_required_for_auth'])('requires an explicit hosted secret', (secret) => {
    expect(() => getAuthConfig({ ...preview, BETTER_AUTH_SECRET: secret })).toThrow('BETTER_AUTH_SECRET:');
    expect(() => getAuthConfig({ ...preview, BETTER_AUTH_SECRET: secret }, true)).toThrow('BETTER_AUTH_SECRET:');
  });

  it('keeps explicit Production auth/app origins without trusting Preview or localhost', () => {
    const config = getAuthConfig({ ...preview, VERCEL_ENV: 'production', NEXT_PUBLIC_APP_URL: 'https://app.example.test' });
    expect(config.trustedOrigins).toEqual(['https://preview.example.test', 'https://app.example.test']);
    expect(config.advanced.useSecureCookies).toBe(true);
  });

  it('requires real configuration at non-Vercel Production runtime too', () => {
    expect(() => getAuthConfig({ NODE_ENV: 'production' })).toThrow('BETTER_AUTH_SECRET:');
  });

  it('keeps local development ports and an explicit configured exact origin', () => {
    const config = getAuthConfig({ NODE_ENV: 'development', PORT: '4321', BETTER_AUTH_URL: 'http://localhost:4321', NEXT_PUBLIC_APP_URL: 'http://localhost:4321' });
    expect(config.baseURL).toBe('http://localhost:4321');
    expect(config.trustedOrigins).toContain('http://127.0.0.1:4321');
    expect(config.trustedOrigins).toContain('http://localhost:3002');
    expect(config.advanced.useSecureCookies).toBe(false);
    expect(() => getAuthConfig({ BETTER_AUTH_URL: 'https://*.vercel.app' })).toThrow();
    expect(getAuthConfig({ PORT: '99999' }).trustedOrigins).not.toContain('http://localhost:99999');
  });

  it('allows credential-free local compilation only, never hosted build fallback', () => {
    expect(getAuthConfig({ NODE_ENV: 'production' }, true).baseURL).toBe('http://localhost:3000');
    expect(() => getAuthConfig({ NODE_ENV: 'production', VERCEL: '1' }, true)).toThrow();
  });
});
