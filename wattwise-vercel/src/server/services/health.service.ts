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
  schemaCompatible?: boolean;
  message?: string;
}

export interface ReleaseInfoResult {
  name: string;
  version: string;
  target: 'vercel';
  region: string;
  environment: string;
  gitSha: string;
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
          schemaCompatible: false,
        },
        httpStatus: 200,
      };
    }

    try {
      const pool = getPool();
      const start = Date.now();

      // Enforce 3000ms timeout for readiness database ping & schema readiness validation
      const queryPromise = pool.query(`
        SELECT 1 AS ping,
          (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_plan' AND column_name = 'trial_used_at' LIMIT 1) IS NOT NULL AS has_user_plan_trial,
          (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_plan' AND column_name = 'status' LIMIT 1) IS NOT NULL AS has_user_plan_status,
          (SELECT 1 FROM information_schema.columns WHERE table_name = 'electricity_bill' AND column_name = 'kwh_source' LIMIT 1) IS NOT NULL AS has_bill_kwh_source;
      `);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Readiness database ping timed out after 3000ms')), READINESS_DB_TIMEOUT_MS)
      );

      const res = await Promise.race([queryPromise, timeoutPromise]);
      const durationMs = Date.now() - start;

      const row = res.rows[0];
      const schemaCompatible = Boolean(
        row && row.has_user_plan_trial && row.has_user_plan_status && row.has_bill_kwh_source
      );

      const status = schemaCompatible ? 'ok' : 'error';
      const httpStatus = schemaCompatible ? 200 : 503;

      logger.info('Database health check', {
        correlationId,
        event: schemaCompatible ? 'health.db.ok' : 'health.db.schema_incompatible',
        durationMs,
        schemaCompatible,
      });

      return {
        result: {
          status,
          timestamp: new Date().toISOString(),
          provider: 'neon-postgresql',
          configured: true,
          schemaCompatible,
          ...(schemaCompatible ? {} : { message: 'Database schema incompatible' }),
        },
        httpStatus,
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
          schemaCompatible: false,
          message: 'Database connection failed',
        },
        httpStatus: 503,
      };
    }
  }

  public static getReleaseInfo(): ReleaseInfoResult {
    const gitSha =
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
      process.env.GIT_COMMIT_SHA ||
      'ce7349b93b2737da165a1f7269abbf3987162df7';

    return {
      name: 'wattwise-vercel',
      version: '0.1.0',
      target: 'vercel',
      region: process.env.VERCEL_REGION || 'sin1',
      environment: process.env.VERCEL_ENV || env.NODE_ENV || 'development',
      gitSha,
      timestamp: new Date().toISOString(),
    };
  }
}
