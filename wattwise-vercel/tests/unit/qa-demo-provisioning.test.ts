import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isDemoEnvironmentAllowed,
  getDemoCredentials,
} from '@/server/services/qa-demo-provisioning.service';

describe('QA Demo Provisioning Unit Tests', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Environment Safety Guard', () => {
    it('refuses provisioning when VERCEL_ENV is production', () => {
      process.env.VERCEL_ENV = 'production';
      const guard = isDemoEnvironmentAllowed();
      expect(guard.allowed).toBe(false);
      expect(guard.reason).toContain('production');
    });

    it('refuses provisioning even if QA_DEMO_ALLOW_PROD is set when VERCEL_ENV is production', () => {
      process.env.VERCEL_ENV = 'production';
      process.env.QA_DEMO_ALLOW_PROD = 'true';
      const guard = isDemoEnvironmentAllowed();
      expect(guard.allowed).toBe(false);
      expect(guard.reason).toContain('production');
    });

    it('refuses provisioning when NODE_ENV is production and QA_DEMO_ENABLED is not true', () => {
      delete process.env.VERCEL_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      delete process.env.QA_DEMO_ENABLED;
      const guard = isDemoEnvironmentAllowed();
      expect(guard.allowed).toBe(false);
    });

    it('allows provisioning in development or test environment', () => {
      delete process.env.VERCEL_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'test';
      const guard = isDemoEnvironmentAllowed();
      expect(guard.allowed).toBe(true);
    });

    it('allows provisioning in Vercel preview environment when QA_DEMO_ENABLED is set', () => {
      process.env.VERCEL_ENV = 'preview';
      process.env.QA_DEMO_ENABLED = 'true';
      const guard = isDemoEnvironmentAllowed();
      expect(guard.allowed).toBe(true);
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
});
