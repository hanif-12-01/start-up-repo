import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import { env } from '@/config/env';
import * as schema from './schema';

const { Pool } = pg;

declare global {
  var __dbPool: pg.Pool | undefined;
  var __dbInstance: NodePgDatabase<typeof schema> | undefined;
}

export function getPool(): pg.Pool {
  const dbUrl = env.DATABASE_URL || 'postgresql://build_noop:build_noop@127.0.0.1:5432/build_noop';

  if (!globalThis.__dbPool) {
    const isNeon = dbUrl.includes('neon.tech') || dbUrl.includes('sslmode=require');
    globalThis.__dbPool = new Pool({
      connectionString: dbUrl,
      max: process.env.NODE_ENV === 'production' ? 10 : 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
      ...(isNeon ? { ssl: true } : {}),
    });
  }
  return globalThis.__dbPool;
}

export function getDb(): NodePgDatabase<typeof schema> {
  if (!globalThis.__dbInstance) {
    const pool = getPool();
    globalThis.__dbInstance = drizzle(pool, { schema });
  }
  return globalThis.__dbInstance;
}
