import { z } from 'zod';

const booleanFlag = z.preprocess(
  (val) => val === 'true' || val === true,
  z.boolean()
).default(false);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().optional().default(''),
  BETTER_AUTH_SECRET: z.string().optional().default(''),
  BETTER_AUTH_URL: z.string().url().optional().default('http://localhost:3000'),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),

  // Feature Flags
  DIAGNOSTICS_ENABLED: booleanFlag,
  ACTION_PLANS_ENABLED: booleanFlag,
  OUTCOME_TRACKING_ENABLED: booleanFlag,
  SEGMENT_TEMPLATES_ENABLED: booleanFlag,
  BUSINESS_PORTFOLIO_ENABLED: booleanFlag,
  SENSOR_IMPORT_ENABLED: booleanFlag,
  ADVANCED_ML_ENABLED: booleanFlag,
});

export type Env = z.infer<typeof envSchema>;

export function parseEnv(input: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(input);
  if (!result.success) {
    console.error('❌ Invalid environment variables configuration:', result.error.format());
    throw new Error('Invalid environment variables configuration');
  }
  return result.data;
}

export const env = parseEnv(process.env);
