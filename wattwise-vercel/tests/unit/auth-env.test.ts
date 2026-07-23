import { describe, it, expect } from 'vitest';
import { parseEnv, sanitizeEnvError } from '../../src/config/env';
import { assertResourceOwner, requireTenantOwnership, TenantAccessError } from '../../src/server/policies/tenant';
import { HealthCheckService } from '../../src/server/services/health.service';
import { z } from 'zod';

describe('Environment Variable Security & Validation', () => {
  it('sanitizes validation errors without leaking secret contents', () => {
    const dummySchema = z.object({
      SECRET_KEY: z.string().min(32, 'Secret must be at least 32 characters'),
    });

    const result = dummySchema.safeParse({ SECRET_KEY: 'short_secret' });
    expect(result.success).toBe(false);
    if (!result.success) {
      const sanitized = sanitizeEnvError(result.error);
      expect(sanitized).toContain('SECRET_KEY');
      expect(sanitized).not.toContain('short_secret');
    }
  });

  it('parses valid environment variables with safe defaults', () => {
    const parsed = parseEnv({
      NODE_ENV: 'test',
      DATABASE_URL: 'postgresql://localhost:5432/testdb',
    });
    expect(parsed.NODE_ENV).toBe('test');
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000');
    expect(parsed.ADVANCED_ML_ENABLED).toBe(false);
  });
});

describe('Tenant Ownership Policy Foundation', () => {
  it('allows access when session userId matches resource owner ID', () => {
    expect(() => assertResourceOwner('user_123', 'user_123')).not.toThrow();
    expect(() => requireTenantOwnership('user_abc', 'user_abc')).not.toThrow();
  });

  it('rejects access with TenantAccessError when userId mismatches', () => {
    expect(() => assertResourceOwner('user_123', 'user_456')).toThrow(TenantAccessError);
    expect(() => requireTenantOwnership('user_123', 'user_456')).toThrow('Access denied');
  });

  it('rejects unauthenticated or empty user ID inputs', () => {
    expect(() => assertResourceOwner('', 'user_123')).toThrow(TenantAccessError);
    expect(() => assertResourceOwner('user_123', '')).toThrow(TenantAccessError);
  });

  it('prevents caller from spoofing user ID via target resource payload', () => {
    const sessionUserId = 'authenticated_user_777';
    const clientProvidedInput = { userId: 'victim_user_999' };
    expect(() => assertResourceOwner(sessionUserId, clientProvidedInput.userId)).toThrow(TenantAccessError);
  });
});

describe('Database Health Check Unit Mapping', () => {
  it('returns unconfigured status when DATABASE_URL is empty', async () => {
    const prevEnv = process.env.DATABASE_URL;
    process.env.DATABASE_URL = '';

    const { result, httpStatus } = await HealthCheckService.getDatabaseHealth();
    expect(httpStatus).toBe(200);
    expect(result.status).toBe('unconfigured');
    expect(result.configured).toBe(false);

    process.env.DATABASE_URL = prevEnv;
  });
});
