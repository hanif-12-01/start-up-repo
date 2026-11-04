import { env } from '@/config/env';

export function isLocalNBeatsCandidateAllowed(
  host: string | null,
  config: Record<string, string | undefined> = { ...process.env, NODE_ENV: env.NODE_ENV },
): boolean {
  return config.NODE_ENV === 'test'
    && config.WATTWISE_LOCAL_NBEATS_CANDIDATE === 'true'
    && !config.VERCEL && !config.VERCEL_ENV && !config.VERCEL_TARGET_ENV && !config.VERCEL_URL
    && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host ?? '');
}
