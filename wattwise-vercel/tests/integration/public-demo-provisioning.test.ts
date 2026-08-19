import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { applyAllForwardMigrations } from '../helpers/migrations';
import { ensurePublicDemoAccount, PUBLIC_DEMO_EMAIL, PUBLIC_DEMO_PASSWORD } from '@/server/services/public-demo-provisioning.service';
import { getProductAnalysisReadModel } from '@/server/services/product-analysis';
import { auth } from '@/server/auth';

const { Pool } = pg;

describe('Public Demo Provisioning Integration Tests', () => {
  let pool: pg.Pool;
  const dbUrl = process.env.DATABASE_URL || 'postgresql://wattwise_test_user:synthetic_test_password_01b@127.0.0.1:5439/wattwise_test';

  beforeAll(async () => {
    pool = new Pool({ connectionString: dbUrl, max: 2 });
    await pool.query(`
      DO $$ DECLARE r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
        FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON n.nspname = 'public' AND t.typtype = 'e') LOOP
          EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    await applyAllForwardMigrations(pool);
  });

  afterAll(async () => {
    if (pool) await pool.end();
  });

  it('provisions public demo account and verifies login and 3 demo businesses', async () => {
    const res = await ensurePublicDemoAccount();
    expect(res.email).toBe(PUBLIC_DEMO_EMAIL);
    expect(res.businessIds.demo01).toBeDefined();
    expect(res.businessIds.demo02).toBeDefined();
    expect(res.businessIds.demo03).toBeDefined();

    // Verify Better Auth sign in works with demo credentials
    const signInRes = await auth.api.signInEmail({
      body: {
        email: PUBLIC_DEMO_EMAIL,
        password: PUBLIC_DEMO_PASSWORD,
      },
      headers: new Headers(),
    });

    expect(signInRes).toBeDefined();
    expect(signInRes.user).toBeDefined();
    expect(signInRes.user.email).toBe(PUBLIC_DEMO_EMAIL);

    // Verify DEMO 03 continuous history triggers N-BEATS AI prediction
    const analysis03 = await getProductAnalysisReadModel(res.userId, res.businessIds.demo03);
    expect(analysis03).toBeDefined();
    expect(analysis03.forecastPlan.requestedEngine).toBe('nbeats');
    expect(analysis03.forecastPlan.eligible).toBe(true);
    expect(analysis03.forecastPlan.continuousHistoryMonths).toBe(6);
  });

  it('is idempotent when called multiple times', async () => {
    const res1 = await ensurePublicDemoAccount();
    const res2 = await ensurePublicDemoAccount();
    expect(res1.userId).toBe(res2.userId);
  });
});
