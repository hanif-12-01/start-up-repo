import { describe, it, expect } from 'vitest';
import { parseEnv, validateProductionEnv, sanitizeEnvError } from '../../src/config/env';
import { z } from 'zod';

describe('Environment Schema Validation', () => {
  it('should apply safe defaults when environment variables are omitted', () => {
    const parsed = parseEnv({});
    expect(parsed.NODE_ENV).toBe('development');
    expect(parsed.MONTHLY_REPORTS_ENABLED).toBe(false);
    expect(parsed.DIAGNOSTICS_ENABLED).toBe(false);
    expect(parsed.ACTION_PLANS_ENABLED).toBe(false);
    expect(parsed.OUTCOME_TRACKING_ENABLED).toBe(false);
    expect(parsed.ADVANCED_ML_ENABLED).toBe(false);
    expect(parsed.ENTITLEMENTS_ENABLED).toBe(false);
    expect(parsed.FUNNEL_ANALYTICS_ENABLED).toBe(false);
    expect(parsed.FUNNEL_ANALYTICS_VIEWER_USER_IDS).toBe('');
  });

  it('should parse boolean string feature flags correctly', () => {
    const parsed = parseEnv({
      DIAGNOSTICS_ENABLED: 'true',
      MONTHLY_REPORTS_ENABLED: 'true',
      ADVANCED_ML_ENABLED: 'false',
    });
    expect(parsed.DIAGNOSTICS_ENABLED).toBe(true);
    expect(parsed.MONTHLY_REPORTS_ENABLED).toBe(true);
    expect(parsed.ADVANCED_ML_ENABLED).toBe(false);
  });
});

describe('validateProductionEnv', () => {
  it('should not throw in development even without DATABASE_URL and BETTER_AUTH_SECRET', () => {
    const parsed = parseEnv({ NODE_ENV: 'development' });
    expect(() => validateProductionEnv(parsed)).not.toThrow();
  });

  it('should not throw in test even without DATABASE_URL and BETTER_AUTH_SECRET', () => {
    const parsed = parseEnv({ NODE_ENV: 'test' });
    expect(() => validateProductionEnv(parsed)).not.toThrow();
  });

  it('should throw in production when DATABASE_URL is absent', () => {
    const parsed = parseEnv({
      NODE_ENV: 'production',
      BETTER_AUTH_SECRET: 'a-very-long-secret-that-is-at-least-32-chars-long',
    });
    expect(() => validateProductionEnv(parsed)).toThrow('DATABASE_URL: required in production');
  });

  it('should throw in production when BETTER_AUTH_SECRET is too short', () => {
    const parsed = parseEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@host/db',
      BETTER_AUTH_SECRET: 'too-short',
    });
    expect(() => validateProductionEnv(parsed)).toThrow('BETTER_AUTH_SECRET');
  });

  it('should not throw in production when all required variables are provided', () => {
    const parsed = parseEnv({
      NODE_ENV: 'production',
      DATABASE_URL: 'postgresql://user:pass@host/db',
      BETTER_AUTH_SECRET: 'a-very-long-secret-that-is-at-least-32-chars-long',
    });
    expect(() => validateProductionEnv(parsed)).not.toThrow();
  });

  it('should throw with a message that does not include the secret value', () => {
    const secretValue = 'my-production-secret-value-here';
    const parsed = parseEnv({
      NODE_ENV: 'production',
      BETTER_AUTH_SECRET: secretValue,
    });
    let caughtMessage = '';
    try {
      validateProductionEnv(parsed);
    } catch (e) {
      caughtMessage = (e as Error).message;
    }
    // Error message must never contain the actual secret value
    expect(caughtMessage).not.toContain(secretValue);
    expect(caughtMessage).toContain('DATABASE_URL');
  });
});

describe('sanitizeEnvError', () => {
  it('should produce a message listing field paths without secret values', () => {
    // Use a real Zod parse to generate a well-typed ZodError
    const strictSchema = z.object({ BETTER_AUTH_SECRET: z.string().min(32) });
    const result = strictSchema.safeParse({ BETTER_AUTH_SECRET: 'short' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const msg = sanitizeEnvError(result.error);
      expect(msg).toContain('BETTER_AUTH_SECRET');
      // Must not contain the actual value
      expect(msg).not.toContain('short');
    }
  });
});
