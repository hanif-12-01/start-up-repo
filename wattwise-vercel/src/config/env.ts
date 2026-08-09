import { z } from 'zod';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';

const booleanFlag = z
  .preprocess((val) => val === 'true' || val === true, z.boolean())
  .default(false);

// In production, DATABASE_URL and BETTER_AUTH_SECRET are strictly required.
// In development/test/build phase, they fall back to empty string / defaults so the build
// and unit-test suite can run without a live database.
const databaseUrlSchema = z.string().min(1, 'DATABASE_URL must not be empty');
const authSecretSchema = z.string().min(32, 'BETTER_AUTH_SECRET must be at least 32 characters');

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Production-required secrets (enforced at runtime via validateProductionEnv)
  DATABASE_URL: z.string().optional().default(''),
  BETTER_AUTH_SECRET: z.string().optional().default(''),

  BETTER_AUTH_URL: z.string().url().optional().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),

  // Feature Flags
  DASHBOARD_ENABLED: booleanFlag,
  MONTHLY_REPORTS_ENABLED: booleanFlag,
  DIAGNOSTICS_ENABLED: booleanFlag,
  ACTION_PLANS_ENABLED: booleanFlag,
  OUTCOME_TRACKING_ENABLED: booleanFlag,
  SEGMENT_TEMPLATES_ENABLED: booleanFlag,
  BUSINESS_PORTFOLIO_ENABLED: booleanFlag,
  SENSOR_IMPORT_ENABLED: booleanFlag,
  ADVANCED_ML_ENABLED: booleanFlag,
  ENTITLEMENTS_ENABLED: booleanFlag,
  FUNNEL_ANALYTICS_ENABLED: booleanFlag,
  FUNNEL_ANALYTICS_VIEWER_USER_IDS: z.string().optional().default(''),
});

export type Env = z.infer<typeof envSchema>;

export function isProductionBuild(): boolean {
  return (
    process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD ||
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NEXT_EXECUTION_DATA_COLLECTION_BUILD === '1'
  );
}

export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === 'production' && !isProductionBuild();
}

export function sanitizeEnvError(error: z.ZodError): string {
  // Format error safely without logging secret string contents
  const issueSummaries = error.issues.map(
    (issue) => `${issue.path.join('.')}: ${issue.message}`
  );
  return `Invalid environment configuration:\n - ${issueSummaries.join('\n - ')}`;
}

export function parseEnv(input: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(input);
  if (!result.success) {
    const safeErrorMessage = sanitizeEnvError(result.error);
    console.error('❌ Environment validation failed');
    throw new Error(safeErrorMessage);
  }
  return result.data;
}

/**
 * Validates that all production-required variables are present and well-formed.
 * Called once at server startup or DB pool access. Throws with a sanitized message (no secret values).
 * During Next.js production build phase, validation is skipped so compilation succeeds without live credentials.
 * Never call this in client-side code.
 */
export function validateProductionEnv(parsed: Env): void {
  if (parsed.NODE_ENV !== 'production') return;
  if (isProductionBuild()) return;

  const errors: string[] = [];

  const dbResult = databaseUrlSchema.safeParse(parsed.DATABASE_URL);
  if (!dbResult.success) errors.push('DATABASE_URL: required in production');

  const secretResult = authSecretSchema.safeParse(parsed.BETTER_AUTH_SECRET);
  if (!secretResult.success) errors.push('BETTER_AUTH_SECRET: must be at least 32 characters in production');

  if (errors.length > 0) {
    throw new Error(
      `Production startup check failed:\n - ${errors.join('\n - ')}`
    );
  }
}

export function isEntitlementsEnabled(): boolean {
  return process.env.ENTITLEMENTS_ENABLED === 'true' || env.ENTITLEMENTS_ENABLED;
}

export function isFunnelAnalyticsEnabled(): boolean {
  return process.env.FUNNEL_ANALYTICS_ENABLED === 'true' || env.FUNNEL_ANALYTICS_ENABLED;
}

export function isFunnelAnalyticsViewer(userId: string | undefined | null): boolean {
  if (!userId) return false;
  const allowlistString = process.env.FUNNEL_ANALYTICS_VIEWER_USER_IDS ?? env.FUNNEL_ANALYTICS_VIEWER_USER_IDS ?? '';
  if (!allowlistString.trim()) return false;
  const allowlist = allowlistString.split(',').map((id) => id.trim()).filter(Boolean);
  return allowlist.includes(userId);
}

export const env = parseEnv(process.env);

// NOTE: validateProductionEnv(env) is intentionally NOT called here at module load.
// next build runs with NODE_ENV=production but does not have runtime secrets.
// Instead, call validateProductionEnv(env) from server-side startup code
// (e.g., instrumentation.ts or the first request handler) when you want
// fail-fast enforcement of production secrets at actual runtime.
