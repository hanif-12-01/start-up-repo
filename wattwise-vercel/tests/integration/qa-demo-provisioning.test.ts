import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import { verifyPassword } from 'better-auth/crypto';
import { applyAllForwardMigrations } from '../helpers/migrations';
import {
  seedQaDemoAccount,
  resetQaDemoAccount,
  checkQaDemoAccount,
} from '@/server/services/qa-demo-provisioning.service';

const { Pool } = pg;

describe('QA Demo Provisioning Integration Tests', () => {
  let pool: pg.Pool;
  const dbUrl = process.env.DATABASE_URL || 'postgresql://wattwise_test_user:synthetic_test_password_01b@127.0.0.1:5439/wattwise_test';
  const originalEnv = { ...process.env };

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
    process.env = originalEnv;
  });

  beforeEach(async () => {
    process.env = { ...originalEnv };
    process.env.DATABASE_URL = dbUrl;
    process.env.QA_DEMO_EMAIL = 'qa-integration@wattwise.test';
    process.env.QA_DEMO_PASSWORD = 'TestPassword123!_QaDemo';
    delete process.env.VERCEL_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';

    await pool.query('DELETE FROM action_outcome_evaluation');
    await pool.query('DELETE FROM energy_action_plan');
    await pool.query('DELETE FROM inspection_item');
    await pool.query('DELETE FROM inspection_plan');
    await pool.query('DELETE FROM diagnostic_candidate');
    await pool.query('DELETE FROM diagnostic_session');
    await pool.query('DELETE FROM appliance');
    await pool.query('DELETE FROM revenue_entry');
    await pool.query('DELETE FROM electricity_bill');
    await pool.query('DELETE FROM business');
    await pool.query('DELETE FROM user_plan');
    await pool.query('DELETE FROM session');
    await pool.query('DELETE FROM account');
    await pool.query('DELETE FROM "user"');
  });

  it('unconditionally refuses provisioning when VERCEL_ENV is production and leaves database untouched', async () => {
    process.env.VERCEL_ENV = 'production';

    await expect(seedQaDemoAccount()).rejects.toThrow('QA Demo provisioning rejected');

    const userRes = await pool.query('SELECT count(*) FROM "user"');
    expect(parseInt(userRes.rows[0].count, 10)).toBe(0);
  });

  it('creates a Better Auth-compatible user and account with verifiable password hash', async () => {
    const res = await seedQaDemoAccount();
    expect(res.email).toBe('qa-integration@wattwise.test');

    const userRes = await pool.query('SELECT * FROM "user" WHERE email = $1', [res.email]);
    expect(userRes.rows.length).toBe(1);
    expect(userRes.rows[0].name).toBe('WattWise QA Demo');
    expect(userRes.rows[0].email_verified).toBe(true);

    const accRes = await pool.query('SELECT * FROM account WHERE user_id = $1 AND provider_id = $2', [
      res.userId,
      'credential',
    ]);
    expect(accRes.rows.length).toBe(1);
    expect(accRes.rows[0].password).toBeDefined();

    const isPasswordValid = await verifyPassword({
      password: 'TestPassword123!_QaDemo',
      hash: accRes.rows[0].password,
    });
    expect(isPasswordValid).toBe(true);
  });

  it('provisions 18 consecutive months of bills and revenue with provenance mix and PRO_TRIAL plan', async () => {
    const res = await seedQaDemoAccount({ anchorMonth: '2026-08' });

    const billRes = await pool.query('SELECT * FROM electricity_bill WHERE business_id = $1 ORDER BY period_start ASC', [
      res.businessId,
    ]);
    expect(billRes.rows.length).toBe(18);

    const revRes = await pool.query('SELECT * FROM revenue_entry WHERE business_id = $1 ORDER BY period_month ASC', [
      res.businessId,
    ]);
    expect(revRes.rows.length).toBe(18);

    // Verify provenance mix
    const sources = billRes.rows.map((r) => r.kwh_source);
    expect(sources).toContain('LEGACY_UNKNOWN');
    expect(sources).toContain('USER_ENTERED');
    expect(sources).toContain('METER_DERIVED');

    // Verify zero usage bill
    const zeroBill = billRes.rows.find((r) => r.kwh === '0.000');
    expect(zeroBill).toBeDefined();
    expect(zeroBill.total_amount_rupiah).toBe('50000');

    // Verify PRO_TRIAL plan
    const planRes = await pool.query('SELECT * FROM user_plan WHERE user_id = $1', [res.userId]);
    expect(planRes.rows[0].plan).toBe('PRO_TRIAL');
    expect(planRes.rows[0].status).toBe('ACTIVE');
  });

  it('provisions referenced bill locked by diagnostic session and unreferenced editable bills', async () => {
    const res = await seedQaDemoAccount({ anchorMonth: '2026-08' });

    const check = await checkQaDemoAccount();
    expect(check.ready).toBe(true);
    expect(check.details.referencedBillCount).toBe(2); // Month 14 & Month 13 comparison
    expect(check.details.unreferencedBillCount).toBe(16);
    expect(check.details.diagnosticSessionCount).toBe(1);
    expect(check.details.anomalyStatus).toBe('Boros');
  });

  it('guarantees sequential and concurrent idempotency without creating duplicate rows', async () => {
    await seedQaDemoAccount({ anchorMonth: '2026-08' });
    await seedQaDemoAccount({ anchorMonth: '2026-08' }); // Second call

    const check = await checkQaDemoAccount();
    expect(check.ready).toBe(true);
    expect(check.details.billCount).toBe(18);
    expect(check.details.revenueCount).toBe(18);
    expect(check.details.applianceCount).toBe(7);
  });

  it('resets demo account cleanly without affecting other users data', async () => {
    // Seed foreign user
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u-other', 'Other User', 'other@example.test', true)`);
    await pool.query(`INSERT INTO business (id, user_id, name, business_type, segment, electrical_system) VALUES ('b-other', 'u-other', 'Other Biz', 'KOS_PROPERTY', 'KOS', 'ALL_IN')`);

    // Seed demo
    await seedQaDemoAccount({ anchorMonth: '2026-08' });

    // Reset demo
    await resetQaDemoAccount({ anchorMonth: '2026-08' });

    // Verify demo ready
    const check = await checkQaDemoAccount();
    expect(check.ready).toBe(true);

    // Verify foreign business unaffected
    const otherBiz = await pool.query('SELECT * FROM business WHERE id = $1', ['b-other']);
    expect(otherBiz.rows.length).toBe(1);
  });
});
