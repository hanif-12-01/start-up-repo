import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  isDemoEnvironmentAllowed,
  getDemoCredentials,
  checkQaDemoAccount,
} from '@/server/services/qa-demo-provisioning.service';

// Mock the DB client so checkQaDemoAccount can be tested without a real DB
vi.mock('@/server/db/client', () => ({
  getDb: vi.fn(),
}));

describe('QA Demo Provisioning Unit Tests (IT-QC-DEMO-01B Hardened)', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('GAP 1: Environment Safety Guard Matrix', () => {
    it('allows when NODE_ENV=development and VERCEL_ENV is unset', () => {
      delete process.env.VERCEL_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
      const guard = isDemoEnvironmentAllowed();
      expect(guard.allowed).toBe(true);
    });

    it('allows when NODE_ENV=test and VERCEL_ENV is unset', () => {
      delete process.env.VERCEL_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
      const guard = isDemoEnvironmentAllowed();
      expect(guard.allowed).toBe(true);
    });

    it('allows when NODE_ENV=production, VERCEL_ENV=preview, and QA_DEMO_ENABLED=true', () => {
      process.env.VERCEL_ENV = 'preview';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      process.env.QA_DEMO_ENABLED = 'true';
      const guard = isDemoEnvironmentAllowed();
      expect(guard.allowed).toBe(true);
    });

    it('denies when NODE_ENV=production, VERCEL_ENV=preview, and QA_DEMO_ENABLED is missing', () => {
      process.env.VERCEL_ENV = 'preview';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      delete process.env.QA_DEMO_ENABLED;
      const guard = isDemoEnvironmentAllowed();
      expect(guard.allowed).toBe(false);
      expect(guard.reason).toContain('QA_DEMO_ENABLED is not set to true');
    });

    it('denies when NODE_ENV=production, VERCEL_ENV=preview, and QA_DEMO_ENABLED=false', () => {
      process.env.VERCEL_ENV = 'preview';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      process.env.QA_DEMO_ENABLED = 'false';
      const guard = isDemoEnvironmentAllowed();
      expect(guard.allowed).toBe(false);
      expect(guard.reason).toContain('QA_DEMO_ENABLED is not set to true');
    });

    it('denies unconditionally when VERCEL_ENV=production, even if QA_DEMO_ENABLED=true', () => {
      process.env.VERCEL_ENV = 'production';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      process.env.QA_DEMO_ENABLED = 'true';
      const guard = isDemoEnvironmentAllowed();
      expect(guard.allowed).toBe(false);
      expect(guard.reason).toContain('VERCEL_ENV is set to production');
    });

    it('denies when NODE_ENV=production and VERCEL_ENV is unset, even if QA_DEMO_ENABLED=true', () => {
      delete process.env.VERCEL_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      process.env.QA_DEMO_ENABLED = 'true';
      const guard = isDemoEnvironmentAllowed();
      expect(guard.allowed).toBe(false);
      expect(guard.reason).toContain('non-Vercel runtime detected');
    });

    it('denies when VERCEL_ENV has an unknown value in production-like runtime', () => {
      process.env.VERCEL_ENV = 'staging_custom';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      const guard = isDemoEnvironmentAllowed();
      expect(guard.allowed).toBe(false);
      expect(guard.reason).toContain('Unrecognized VERCEL_ENV');
    });
  });

  describe('Credentials Resolution', () => {
    it('uses QA_DEMO_EMAIL from environment or default synthetic address', () => {
      process.env.QA_DEMO_EMAIL = 'custom-qa@wattwise.test';
      const creds = getDemoCredentials();
      expect(creds.email).toBe('custom-qa@wattwise.test');
    });

    it('reads QA_DEMO_PASSWORD from environment', () => {
      process.env.QA_DEMO_PASSWORD = 'SecretTestPassword123!';
      const creds = getDemoCredentials();
      expect(creds.password).toBe('SecretTestPassword123!');
    });
  });

  describe('MONTHLY_REPORTS_ENABLED guard in checkQaDemoAccount', () => {
    it('returns NOT READY immediately when MONTHLY_REPORTS_ENABLED is unset', async () => {
      delete process.env.MONTHLY_REPORTS_ENABLED;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
      delete process.env.VERCEL_ENV;
      const result = await checkQaDemoAccount();
      expect(result.ready).toBe(false);
      expect(result.reason).toContain('MONTHLY_REPORTS_ENABLED is not enabled');
      // Must NOT have mutated the env var
      expect(process.env.MONTHLY_REPORTS_ENABLED).toBeUndefined();
    });

    it('returns NOT READY immediately when MONTHLY_REPORTS_ENABLED=false', async () => {
      process.env.MONTHLY_REPORTS_ENABLED = 'false';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development';
      delete process.env.VERCEL_ENV;
      const result = await checkQaDemoAccount();
      expect(result.ready).toBe(false);
      expect(result.reason).toContain('MONTHLY_REPORTS_ENABLED is not enabled');
      // Must NOT have changed the flag value
      expect(process.env.MONTHLY_REPORTS_ENABLED).toBe('false');
    });
  });
});

