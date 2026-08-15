import { describe, expect, it, vi } from 'vitest';
import {
  isAuthorized,
  validateEnvironmentGuard,
  GET,
  POST,
  DELETE,
} from '@/app/api/internal/ai-validation/route';
import * as demoService from '@/server/services/ai-validation-demo.service';

describe('AI Validation Route Security & Guards', () => {
  const dummyAdminToken = 'test_admin_token_abcdef1234567890';

  describe('isAuthorized (Constant-time token authentication)', () => {
    it('rejects when AI_VALIDATION_ADMIN_TOKEN is missing or empty in environment', () => {
      const request = new Request('https://preview.local/api/internal/ai-validation', {
        headers: { Authorization: `Bearer ${dummyAdminToken}` },
      });
      expect(isAuthorized(request, {})).toBe(false);
      expect(isAuthorized(request, { AI_VALIDATION_ADMIN_TOKEN: '' })).toBe(false);
      expect(isAuthorized(request, { AI_VALIDATION_ADMIN_TOKEN: '   ' })).toBe(false);
    });

    it('rejects when authorization header is missing or malformed', () => {
      const emptyHeaderRequest = new Request('https://preview.local/api/internal/ai-validation');
      expect(isAuthorized(emptyHeaderRequest, { AI_VALIDATION_ADMIN_TOKEN: dummyAdminToken })).toBe(false);

      const wrongSchemeRequest = new Request('https://preview.local/api/internal/ai-validation', {
        headers: { Authorization: `Basic ${dummyAdminToken}` },
      });
      expect(isAuthorized(wrongSchemeRequest, { AI_VALIDATION_ADMIN_TOKEN: dummyAdminToken })).toBe(false);
    });

    it('rejects wrong token or mismatched length token without throwing', () => {
      const wrongTokenRequest = new Request('https://preview.local/api/internal/ai-validation', {
        headers: { Authorization: 'Bearer wrong_token_entirely_1234' },
      });
      expect(isAuthorized(wrongTokenRequest, { AI_VALIDATION_ADMIN_TOKEN: dummyAdminToken })).toBe(false);

      const shorterTokenRequest = new Request('https://preview.local/api/internal/ai-validation', {
        headers: { Authorization: 'Bearer short' },
      });
      expect(isAuthorized(shorterTokenRequest, { AI_VALIDATION_ADMIN_TOKEN: dummyAdminToken })).toBe(false);
    });

    it('strictly rejects any revoked or unknown token when admin token is configured or unset', () => {
      const revokedToken = 'revoked_token_example_do_not_use';
      const request = new Request('https://preview.local/api/internal/ai-validation', {
        headers: { Authorization: `Bearer ${revokedToken}` },
      });
      // When unset: fail closed (no hardcoded fallback)
      expect(isAuthorized(request, {})).toBe(false);
      // When configured: fail
      expect(isAuthorized(request, { AI_VALIDATION_ADMIN_TOKEN: dummyAdminToken })).toBe(false);
    });

    it('authorizes when bearer token matches AI_VALIDATION_ADMIN_TOKEN exactly', () => {
      const validRequest = new Request('https://preview.local/api/internal/ai-validation', {
        headers: { Authorization: `Bearer ${dummyAdminToken}` },
      });
      expect(isAuthorized(validRequest, { AI_VALIDATION_ADMIN_TOKEN: dummyAdminToken })).toBe(true);
    });
  });

  describe('validateEnvironmentGuard (Strict Preview isolation)', () => {
    const validPreviewEnv = {
      VERCEL_ENV: 'preview',
      QA_DEMO_ENABLED: 'true',
      WATTWISE_AI_VALIDATION_PROFILE_ENABLED: 'true',
      WATTWISE_PREVIEW_DATABASE_PROJECT_ID: demoService.AI_VALIDATION_PREVIEW_PROJECT_ID,
    };

    it('unconditionally rejects Production environment even with valid flags', () => {
      const guard = validateEnvironmentGuard({
        ...validPreviewEnv,
        VERCEL_ENV: 'production',
      });
      expect(guard.allowed).toBe(false);
      expect(guard.reason).toContain('strictly forbidden in Production');
    });

    it('rejects local/development runtime or unset VERCEL_ENV', () => {
      const guard = validateEnvironmentGuard({
        ...validPreviewEnv,
        VERCEL_ENV: 'development',
      });
      expect(guard.allowed).toBe(false);
      expect(guard.reason).toContain('restricted strictly to Preview runtime');
    });

    it('rejects when QA_DEMO_ENABLED is not true', () => {
      const guard = validateEnvironmentGuard({
        ...validPreviewEnv,
        QA_DEMO_ENABLED: 'false',
      });
      expect(guard.allowed).toBe(false);
      expect(guard.reason).toContain('QA demo provisioning is disabled');
    });

    it('rejects when WATTWISE_AI_VALIDATION_PROFILE_ENABLED is not true', () => {
      const guard = validateEnvironmentGuard({
        ...validPreviewEnv,
        WATTWISE_AI_VALIDATION_PROFILE_ENABLED: 'false',
      });
      expect(guard.allowed).toBe(false);
      expect(guard.reason).toContain('AI validation profile is disabled');
    });

    it('rejects when WATTWISE_PREVIEW_DATABASE_PROJECT_ID does not match expected Preview DB', () => {
      const guard = validateEnvironmentGuard({
        ...validPreviewEnv,
        WATTWISE_PREVIEW_DATABASE_PROJECT_ID: 'broad-truth-57130495', // Production DB ID!
      });
      expect(guard.allowed).toBe(false);
      expect(guard.reason).toContain('Preview database project ID mismatch');
    });

    it('allows Preview execution when all environment guards match', () => {
      const guard = validateEnvironmentGuard(validPreviewEnv);
      expect(guard.allowed).toBe(true);
    });
  });

  describe('Route Handler Responses & Error Sanitization (HTTP 401, 403, 500)', () => {
    it('returns HTTP 401 for unauthorized GET / POST / DELETE requests', async () => {
      const unauthRequest = new Request('https://preview.local/api/internal/ai-validation', {
        headers: { Authorization: 'Bearer wrong_token' },
      });

      const getRes = await GET(unauthRequest);
      expect(getRes.status).toBe(401);
      const getJson = await getRes.json();
      expect(getJson.error).toBe('Unauthorized request.');

      const postRes = await POST(unauthRequest);
      expect(postRes.status).toBe(401);
      const postJson = await postRes.json();
      expect(postJson.error).toBe('Unauthorized request.');

      const delRes = await DELETE(unauthRequest);
      expect(delRes.status).toBe(401);
      const delJson = await delRes.json();
      expect(delJson.error).toBe('Unauthorized request.');
    });

    it('returns sanitized generic error messages and suppresses raw exceptions on 500', async () => {
      process.env.AI_VALIDATION_ADMIN_TOKEN = dummyAdminToken;
      process.env.VERCEL_ENV = 'preview';
      process.env.QA_DEMO_ENABLED = 'true';
      process.env.WATTWISE_AI_VALIDATION_PROFILE_ENABLED = 'true';
      process.env.WATTWISE_PREVIEW_DATABASE_PROJECT_ID = demoService.AI_VALIDATION_PREVIEW_PROJECT_ID;

      const spy = vi.spyOn(demoService, 'checkAiValidationDemo').mockRejectedValueOnce(
        new Error('Sensitive PostgreSQL connection details: password=secret')
      );

      const request = new Request('https://preview.local/api/internal/ai-validation', {
        headers: { Authorization: `Bearer ${dummyAdminToken}` },
      });

      const response = await GET(request);
      expect(response.status).toBe(500);
      const body = await response.json();
      expect(body.error).toBe('Internal error during validation check.');
      expect(JSON.stringify(body)).not.toContain('Sensitive');
      expect(JSON.stringify(body)).not.toContain('secret');
      spy.mockRestore();
    });
  });
});
