import 'server-only';
import { parseEnv } from '@/config/env';
import { z } from 'zod';
import { measurementIdSchema } from '@/server/validation/measurements';

const pilotPairs = z.array(z.object({ userId: measurementIdSchema, businessId: measurementIdSchema }).strict());

export function isMeasurementWriteEnabled(): boolean {
  const config = parseEnv(process.env);
  // Vercel Preview also runs NODE_ENV=production; deployment identity, not NODE_ENV alone, distinguishes it.
  if (config.VERCEL_ENV === 'production' || config.VERCEL_TARGET_ENV === 'production') return false;
  const preview = config.VERCEL === '1' && config.VERCEL_ENV === 'preview'
    && (!config.VERCEL_TARGET_ENV || config.VERCEL_TARGET_ENV === 'preview');
  const isolatedTest = config.NODE_ENV === 'test' && !config.VERCEL && !config.VERCEL_ENV && !config.VERCEL_TARGET_ENV;
  return config.MEASUREMENT_WRITE_ENABLED && (preview || isolatedTest);
}

export function isMeasurementPilotAllowed(userId: string, businessId: string): boolean {
  if (!isMeasurementWriteEnabled()) return false;
  try {
    const pairs = pilotPairs.safeParse(JSON.parse(parseEnv(process.env).MEASUREMENT_PILOT_ALLOWLIST));
    return pairs.success && pairs.data.some(pair => pair.userId === userId && pair.businessId === businessId);
  } catch { return false; }
}
