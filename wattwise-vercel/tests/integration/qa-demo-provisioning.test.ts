import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import { applyAllForwardMigrations } from '../helpers/migrations';
import { auth } from '@/server/auth';
import {
  seedQaDemoAccount,
  resetQaDemoAccount,
  checkQaDemoAccount,
} from '@/server/services/qa-demo-provisioning.service';
import { getProductAnalysisReadModel } from '@/server/services/product-analysis';
import { getMonthlyReportReadModel } from '@/server/services/monthly-report.service';

const { Pool } = pg;

describe('QA Demo Provisioning Integration Tests (IT-QC-DEMO-01B Hardened)', () => {
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
    process.env.MONTHLY_REPORTS_ENABLED = 'true';
    delete process.env.VERCEL_ENV;
    delete process.env.QA_DEMO_ENABLED;
    (process.env as Record<string, string | undefined>).NODE_ENV = 'test';

    await pool.query(`
      DO $$ BEGIN
        DELETE FROM action_outcome_evaluation;
        DELETE FROM energy_action_plan;
        DELETE FROM inspection_item;
        DELETE FROM inspection_plan;
        DELETE FROM diagnostic_candidate;
        DELETE FROM diagnostic_session;
        DELETE FROM appliance;
        DELETE FROM revenue_entry;
        DELETE FROM electricity_bill;
        DELETE FROM business;
        DELETE FROM user_plan;
        DELETE FROM session;
        DELETE FROM account;
        DELETE FROM "user";
      EXCEPTION WHEN OTHERS THEN NULL;
      END $$;
    `);
  });

  describe('GAP 1: Strict Environment Fail-Closed Integrations', () => {
    it('unconditionally refuses provisioning when VERCEL_ENV is production and leaves database untouched', async () => {
      process.env.VERCEL_ENV = 'production';

      await expect(seedQaDemoAccount()).rejects.toThrow('QA Demo provisioning rejected');

      const userRes = await pool.query('SELECT count(*) FROM "user"');
      expect(parseInt(userRes.rows[0].count, 10)).toBe(0);
    });

    it('denies provisioning in Vercel preview when QA_DEMO_ENABLED is missing', async () => {
      process.env.VERCEL_ENV = 'preview';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      delete process.env.QA_DEMO_ENABLED;

      await expect(seedQaDemoAccount()).rejects.toThrow('QA_DEMO_ENABLED is not set to true');

      const userRes = await pool.query('SELECT count(*) FROM "user"');
      expect(parseInt(userRes.rows[0].count, 10)).toBe(0);
    });

    it('allows provisioning in Vercel preview when QA_DEMO_ENABLED=true', async () => {
      process.env.VERCEL_ENV = 'preview';
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';
      process.env.QA_DEMO_ENABLED = 'true';

      const res = await seedQaDemoAccount();
      expect(res.email).toBe('qa-integration@wattwise.test');
    });

    it('denies provisioning in non-Vercel NODE_ENV=production runtime', async () => {
      delete process.env.VERCEL_ENV;
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production';

      await expect(seedQaDemoAccount()).rejects.toThrow('non-Vercel runtime detected');
    });
  });

  describe('GAP 2: Non-Demo User Hijack Protection', () => {
    it('refuses provisioning when configured email belongs to a normal non-demo user and preserves database', async () => {
      // Seed normal user with email matching configured QA_DEMO_EMAIL
      await pool.query(
        `INSERT INTO "user" (id, name, email, email_verified) VALUES ('user-real-preview-01', 'Real Preview User', $1, true)`,
        ['qa-integration@wattwise.test']
      );

      await expect(seedQaDemoAccount()).rejects.toThrow('belongs to a non-demo user');

      // Verify normal user untouched
      const userRes = await pool.query('SELECT * FROM "user" WHERE id = $1', ['user-real-preview-01']);
      expect(userRes.rows[0].name).toBe('Real Preview User');

      const bizRes = await pool.query('SELECT count(*) FROM business WHERE user_id = $1', ['user-real-preview-01']);
      expect(parseInt(bizRes.rows[0].count, 10)).toBe(0);
    });
  });

  describe('GAP 3: Business-Scoped Reset & Isolation', () => {
    it('resets Kos Melati Demo but preserves second manually created QA business owned by demo user', async () => {
      const res = await seedQaDemoAccount({ anchorMonth: '2026-08' });

      // Create second manual business owned by demo user
      await pool.query(
        `INSERT INTO business (id, user_id, name, business_type, segment, electrical_system)
         VALUES ('biz-second-qa', $1, 'Second Manual QA Business', 'KOS_PROPERTY', 'KOS', 'ALL_IN')`,
        [res.userId]
      );

      // Perform reset
      await resetQaDemoAccount({ anchorMonth: '2026-08' });

      // Verify Kos Melati Demo reset & ready
      const check = await checkQaDemoAccount({ anchorMonth: '2026-08' });
      expect(check.ready).toBe(true);

      // Verify second manual business preserved
      const secondBizRes = await pool.query('SELECT * FROM business WHERE id = $1', ['biz-second-qa']);
      expect(secondBizRes.rows.length).toBe(1);
      expect(secondBizRes.rows[0].name).toBe('Second Manual QA Business');
    });

    it('refuses reset when configured email belongs to a normal non-demo user', async () => {
      await pool.query(
        `INSERT INTO "user" (id, name, email, email_verified) VALUES ('user-real-02', 'Real User Two', $1, true)`,
        ['qa-integration@wattwise.test']
      );

      await expect(resetQaDemoAccount()).rejects.toThrow('belongs to a non-demo user');

      const userRes = await pool.query('SELECT * FROM "user" WHERE id = $1', ['user-real-02']);
      expect(userRes.rows[0].name).toBe('Real User Two');
    });
  });

  describe('GAP 4: Real Promise.all Concurrent Idempotency', () => {
    it('executes concurrent seed calls safely with pg_advisory_xact_lock resulting in exact count assertions', async () => {
      await Promise.all([
        seedQaDemoAccount({ anchorMonth: '2026-08' }),
        seedQaDemoAccount({ anchorMonth: '2026-08' }),
        seedQaDemoAccount({ anchorMonth: '2026-08' }),
      ]);

      const check = await checkQaDemoAccount({ anchorMonth: '2026-08' });
      expect(check.ready).toBe(true);
      expect(check.details.billCount).toBe(18);
      expect(check.details.revenueCount).toBe(18);
      expect(check.details.applianceCount).toBe(7);
      expect(check.details.diagnosticSessionCount).toBe(1);
    });
  });

  describe('GAP 5: Real Better Auth Sign-In Integration', () => {
    it('proves that Better Auth accepts sign-in with configured email and password', async () => {
      await seedQaDemoAccount();

      const authResult = await auth.api.signInEmail({
        body: {
          email: 'qa-integration@wattwise.test',
          password: 'TestPassword123!_QaDemo',
        },
        headers: new Headers(),
      });

      expect(authResult).toBeDefined();
      expect(authResult.user).toBeDefined();
      expect(authResult.user.email).toBe('qa-integration@wattwise.test');
      expect(authResult.user.name).toBe('WattWise QA Demo');
    });

    it('rejects sign-in attempt with wrong password', async () => {
      await seedQaDemoAccount();

      await expect(
        auth.api.signInEmail({
          body: {
            email: 'qa-integration@wattwise.test',
            password: 'WrongPassword123!',
          },
          headers: new Headers(),
        })
      ).rejects.toThrow();
    });
  });

  describe('GAP 6 & 7: Provenance & Historical Report Readiness', () => {
    it('stores kwh=null with LEGACY_UNKNOWN and derives BILL_TARIFF_DERIVED in read model', async () => {
      const res = await seedQaDemoAccount({ anchorMonth: '2026-08' });

      // Verify raw database row for Month 10 (i=9)
      const billsRes = await pool.query(
        `SELECT * FROM electricity_bill WHERE business_id = $1 ORDER BY period_start ASC`,
        [res.businessId]
      );
      const month10Bill = billsRes.rows[9];
      expect(month10Bill.kwh).toBeNull();
      expect(month10Bill.kwh_source).toBe('LEGACY_UNKNOWN');

      // Verify read model resolution
      const analysisModel = await getProductAnalysisReadModel(res.userId, res.businessId);
      const derivedSample = analysisModel.samples.find((s) => s.usageSource === 'BILL_TARIFF_DERIVED');
      expect(derivedSample).toBeDefined();
      expect(derivedSample?.isEstimated).toBe(true);

      // Verify zero usage sample (Month 11, i=10)
      const zeroSample = analysisModel.samples.find((s) => s.usageKwh === 0);
      expect(zeroSample).toBeDefined();
      expect(zeroSample?.usageSource).toBe('USER_ENTERED');
      expect(zeroSample?.isEstimated).toBe(false);
    });

    it('resolves historical report with cash-flow context and enforces Boros anomaly state in check', async () => {
      const res = await seedQaDemoAccount({ anchorMonth: '2026-08' });

      // Verify historical report service for Month 14 (2026-04)
      const historicalReport = await getMonthlyReportReadModel(res.userId, res.businessId, '2026-04');
      expect(historicalReport).toBeDefined();
      expect(historicalReport.primaryBillSummary).toBeDefined();
      expect(historicalReport.primaryBillSummary?.totalCost).toBeDefined();
      expect(historicalReport.revenueSummary).not.toBeNull();

      // Verify qa:demo:check
      const check = await checkQaDemoAccount({ anchorMonth: '2026-08' });
      expect(check.ready).toBe(true);
      expect(check.details.historicalReportReady).toBe(true);
      expect(check.details.historicalReportMonth).toBe('2026-04');
      expect(check.details.historicalRevenueReady).toBe(true);
      expect(check.details.anomalyStatus).toBe('Boros');
      expect(check.details.anomalyExpectedBoros).toBe(true);
    });
  });
});
