import { z } from 'zod';

const booleanFlag = z
  .preprocess((val) => val === 'true' || val === true, z.boolean())
  .default(false);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
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
