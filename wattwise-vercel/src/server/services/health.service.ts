import { env } from '@/config/env';

export interface HealthCheckResult {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  region: string;
}

export interface DatabaseHealthResult {
  status: 'ok' | 'unconfigured' | 'error';
  timestamp: string;
  provider: 'neon-postgresql';
  configured: boolean;
}

export interface ReleaseInfoResult {
  name: string;
  version: string;
  target: 'vercel';
  region: string;
  timestamp: string;
}

const startTime = Date.now();

export class HealthCheckService {
  public static getSystemHealth(): HealthCheckResult {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
      environment: env.NODE_ENV,
      region: process.env.VERCEL_REGION || 'sin1',
    };
  }

  public static getDatabaseHealth(): DatabaseHealthResult {
    const isConfigured = Boolean(env.DATABASE_URL && env.DATABASE_URL.length > 0);
    return {
      status: isConfigured ? 'ok' : 'unconfigured',
      timestamp: new Date().toISOString(),
      provider: 'neon-postgresql',
      configured: isConfigured,
    };
  }

  public static getReleaseInfo(): ReleaseInfoResult {
    return {
      name: 'wattwise-vercel',
      version: '0.1.0',
      target: 'vercel',
      region: process.env.VERCEL_REGION || 'sin1',
      timestamp: new Date().toISOString(),
    };
  }
}
