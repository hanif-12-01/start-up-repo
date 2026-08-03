import { env } from '@/config/env';
import { getPool } from '@/server/db/client';
import { logger } from '@/server/logger';

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
  message?: string;
}

export interface ReleaseInfoResult {
  name: string;
  version: string;
  target: 'vercel';
  region: string;
  timestamp: string;
}

const startTime = Date.now();
const READINESS_DB_TIMEOUT_MS = 3000;

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

  public static async getDatabaseHealth(
    correlationId?: string
  ): Promise<{ result: DatabaseHealthResult; httpStatus: number }> {
    const activeDbUrl = process.env.DATABASE_URL !== undefined ? process.env.DATABASE_URL : env.DATABASE_URL;
    const isConfigured = Boolean(activeDbUrl && activeDbUrl.length > 0);

    if (!isConfigured) {
      logger.warn('Database health check: not configured', { correlationId, event: 'health.db.unconfigured' });
      return {
        result: {
          status: 'unconfigured',
          timestamp: new Date().toISOString(),
          provider: 'neon-postgresql',
          configured: false,
        },
        httpStatus: 200,
      };
    }

    try {
      const pool = getPool();
      const start = Date.now();

      // Enforce 3000ms timeout for readiness database ping
      const queryPromise = pool.query('SELECT 1;');
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Readiness database ping timed out after 3000ms')), READINESS_DB_TIMEOUT_MS)
      );

      await Promise.race([queryPromise, timeoutPromise]);
      const durationMs = Date.now() - start;

      logger.info('Database health check: ok', {
        correlationId,
        event: 'health.db.ok',
        durationMs,
      });

      return {
        result: {
          status: 'ok',
          timestamp: new Date().toISOString(),
          provider: 'neon-postgresql',
          configured: true,
        },
        httpStatus: 200,
      };
    } catch (err) {
      // Log real error server-side; return safe message to caller without leaking DB host, credentials, or stack trace
      logger.error('Database health check failed', err, {
        correlationId,
        event: 'health.db.error',
      });

      return {
        result: {
          status: 'error',
          timestamp: new Date().toISOString(),
          provider: 'neon-postgresql',
          configured: true,
          message: 'Database connection failed',
        },
        httpStatus: 503,
      };
    }
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
