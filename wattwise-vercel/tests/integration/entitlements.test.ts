import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { getPool } from '../../src/server/db/client';
import {
  getUserEntitlements,
  resolveEffectivePlan,
  BusinessLimitExceededError,
} from '../../src/server/services/entitlement.service';
import { createBusiness } from '../../src/server/services/business.service';
import {
  getMonthlyReportReadModel,
  MonthlyReportHistoryGatedError,
} from '../../src/server/services/monthly-report.service';
import { applyAllForwardMigrations, readRollbackMigration } from '../helpers/migrations';

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:testpass@127.0.0.1:5439/wattwise_test';

describe('IT-DIAG-08A Entitlements & Trial Integration Tests', () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 5000, max: 12 });
    for (const table of [
      'action_outcome_evaluation', 'energy_action_plan', 'inspection_item',
      'inspection_plan', 'diagnostic_candidate', 'diagnostic_session',
      'electricity_bill', 'business', 'user_plan', 'verification', 'account',
      'session', 'user',
    ]) {
      await pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }
    await applyAllForwardMigrations(pool);
  });

  afterAll(async () => {
    delete process.env.ENTITLEMENTS_ENABLED;
    delete process.env.MONTHLY_REPORTS_ENABLED;
    for (const name of [
      '0007_action_outcome_evaluations_rollback.sql',
      '0006_energy_action_plans_rollback.sql',
      '0005_guided_inspections_rollback.sql',
      '0004_diagnostic_candidates_rollback.sql',
      '0003_diagnostic_questionnaire_rollback.sql',
      '0002_bill_first_rollback.sql',
      '0001_journey_business_rollback.sql',
      '0000_auth_schema_rollback.sql',
    ]) {
      await pool.query(readRollbackMigration(name));
    }
    await getPool().end();
  });

  beforeEach(async () => {
    delete process.env.ENTITLEMENTS_ENABLED;
    delete process.env.MONTHLY_REPORTS_ENABLED;
    for (const table of [
      'action_outcome_evaluation', 'energy_action_plan', 'inspection_item',
      'inspection_plan', 'diagnostic_candidate', 'diagnostic_session',
      'electricity_bill', 'business', 'user_plan', 'session', 'account', 'user',
    ]) {
      await pool.query(`DELETE FROM "${table}"`);
    }
  });

  async function seedUser(id: string) {
    await pool.query(
      `INSERT INTO "user" (id, name, email, email_verified) VALUES ($1, $2, $3, false)`,
      [id, `User ${id}`, `${id}@example.test`]
    );
  }

  async function seedPlan(userId: string, plan: 'FREE' | 'PRO_TRIAL', options: { trialStartsAt?: Date; trialEndsAt?: Date } = {}) {
    await pool.query(
      `INSERT INTO user_plan (id, user_id, plan, trial_starts_at, trial_ends_at, idempotency_key)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [`plan-${userId}`, userId, plan, options.trialStartsAt ?? null, options.trialEndsAt ?? null, `key-${userId}`]
    );
  }

  it('resolves effective plan for FREE user and enforces business limit (1 max) when enabled', async () => {
    process.env.ENTITLEMENTS_ENABLED = 'true';
    const userId = 'user-free-1';
    await seedUser(userId);
    await seedPlan(userId, 'FREE');

    const effective = await resolveEffectivePlan(userId);
    expect(effective.effectivePlan).toBe('FREE');
    expect(effective.isTrialExpired).toBe(false);

    // Create 1st business -> succeeds
    const biz1 = await createBusiness(userId, {
      name: 'Business 1',
      businessType: 'RETAIL',
      segment: 'RETAIL',
      electricalSystem: 'ALL_IN',
    });
    expect(biz1.id).toBeDefined();

    // Try creating 2nd business -> throws BusinessLimitExceededError
    await expect(
      createBusiness(userId, {
        name: 'Business 2',
        businessType: 'RETAIL',
        segment: 'RETAIL',
        electricalSystem: 'ALL_IN',
      })
    ).rejects.toBeInstanceOf(BusinessLimitExceededError);
  });

  it('serializes concurrent business creation for FREE user so exactly one insert succeeds', async () => {
    process.env.ENTITLEMENTS_ENABLED = 'true';
    const userId = 'user-concurrent-free';
    await seedUser(userId);
    await seedPlan(userId, 'FREE');

    const results = await Promise.allSettled([
      createBusiness(userId, { name: 'Concurrent 1', businessType: 'RETAIL', segment: 'RETAIL', electricalSystem: 'ALL_IN' }),
      createBusiness(userId, { name: 'Concurrent 2', businessType: 'RETAIL', segment: 'RETAIL', electricalSystem: 'ALL_IN' }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    if (rejected[0].status === 'rejected') {
      expect(rejected[0].reason).toBeInstanceOf(BusinessLimitExceededError);
    }

    const countRes = await pool.query(`SELECT COUNT(*) FROM business WHERE user_id = $1 AND is_active = true`, [userId]);
    expect(Number(countRes.rows[0].count)).toBe(1);
  });

  it('resolves active TRIAL user and allows up to 3 businesses when enabled', async () => {
    process.env.ENTITLEMENTS_ENABLED = 'true';
    const userId = 'user-trial-1';
    await seedUser(userId);
    const now = new Date();
    const futureEnd = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000);
    await seedPlan(userId, 'PRO_TRIAL', { trialStartsAt: now, trialEndsAt: futureEnd });

    const ent = await getUserEntitlements(userId);
    expect(ent.plan).toBe('TRIAL');
    expect(ent.limits.maxBusinesses).toBe(3);

    for (let i = 1; i <= 3; i++) {
      await createBusiness(userId, {
        name: `Trial Business ${i}`,
        businessType: 'FNB',
        segment: 'FNB',
        electricalSystem: 'ALL_IN',
      });
    }

    // 4th business creation should fail
    await expect(
      createBusiness(userId, {
        name: 'Trial Business 4',
        businessType: 'FNB',
        segment: 'FNB',
        electricalSystem: 'ALL_IN',
      })
    ).rejects.toBeInstanceOf(BusinessLimitExceededError);
  });

  it('falls back to FREE when trial has expired and limits creation to 1', async () => {
    process.env.ENTITLEMENTS_ENABLED = 'true';
    const userId = 'user-expired-trial';
    await seedUser(userId);
    const pastStart = new Date('2026-06-01T00:00:00Z');
    const pastEnd = new Date('2026-07-01T00:00:00Z');
    await seedPlan(userId, 'PRO_TRIAL', { trialStartsAt: pastStart, trialEndsAt: pastEnd });

    const ent = await getUserEntitlements(userId, new Date('2026-08-01T00:00:00Z'));
    expect(ent.plan).toBe('FREE');
    expect(ent.isTrialExpired).toBe(true);
    expect(ent.limits.maxBusinesses).toBe(1);
  });

  it('counts active owned businesses only and ignores inactive or other tenant businesses', async () => {
    process.env.ENTITLEMENTS_ENABLED = 'true';
    const ownerId = 'user-owner-count';
    const otherId = 'user-other-tenant';
    await seedUser(ownerId);
    await seedUser(otherId);
    await seedPlan(ownerId, 'FREE');
    await seedPlan(otherId, 'FREE');

    await pool.query(
      `INSERT INTO business (id, user_id, name, business_type, segment, electrical_system, is_active)
       VALUES ('inactive-biz', $1, 'Inactive', 'RETAIL', 'RETAIL', 'ALL_IN', false)`,
      [ownerId]
    );

    await pool.query(
      `INSERT INTO business (id, user_id, name, business_type, segment, electrical_system, is_active)
       VALUES ('other-biz', $1, 'Other', 'RETAIL', 'RETAIL', 'ALL_IN', true)`,
      [otherId]
    );

    const biz = await createBusiness(ownerId, {
      name: 'Active 1',
      businessType: 'RETAIL',
      segment: 'RETAIL',
      electricalSystem: 'ALL_IN',
    });
    expect(biz.id).toBeDefined();
  });

  it('allows current month, 1st past month, 2nd past month, and denies 3rd past month for FREE', async () => {
    process.env.ENTITLEMENTS_ENABLED = 'true';
    process.env.MONTHLY_REPORTS_ENABLED = 'true';
    const userId = 'user-report-window';
    await seedUser(userId);
    await seedPlan(userId, 'FREE');
    const biz = await createBusiness(userId, { name: 'Report Biz', businessType: 'RETAIL', segment: 'RETAIL', electricalSystem: 'ALL_IN' });

    const now = new Date('2026-08-15T00:00:00Z');
    // 2026-08 (0 months ago) allowed
    const r0 = await getMonthlyReportReadModel(userId, biz.id, '2026-08', now);
    expect(r0.reportCompleteness.code).toBe('NO_BILL');

    // 2026-07 (1 month ago) allowed
    const r1 = await getMonthlyReportReadModel(userId, biz.id, '2026-07', now);
    expect(r1.reportCompleteness.code).toBe('NO_BILL');

    // 2026-06 (2 months ago) allowed
    const r2 = await getMonthlyReportReadModel(userId, biz.id, '2026-06', now);
    expect(r2.reportCompleteness.code).toBe('NO_BILL');

    // 2026-05 (3 months ago) denied
    await expect(getMonthlyReportReadModel(userId, biz.id, '2026-05', now)).rejects.toBeInstanceOf(MonthlyReportHistoryGatedError);
  });

  it('presents cross-tenant business request as not-found (404) and owned history denial as 403', async () => {
    process.env.ENTITLEMENTS_ENABLED = 'true';
    process.env.MONTHLY_REPORTS_ENABLED = 'true';
    const userA = 'user-a-tenant';
    const userB = 'user-b-tenant';
    await seedUser(userA);
    await seedUser(userB);
    await seedPlan(userA, 'FREE');
    await seedPlan(userB, 'FREE');
    const bizB = await createBusiness(userB, { name: 'Biz B', businessType: 'RETAIL', segment: 'RETAIL', electricalSystem: 'ALL_IN' });

    const now = new Date('2026-08-15T00:00:00Z');
    // User A requesting User B's business -> MonthlyReportBusinessNotFoundError (404)
    await expect(getMonthlyReportReadModel(userA, bizB.id, '2026-08', now)).rejects.toThrow(/Usaha aktif tidak ditemukan/);

    // User B requesting owned business with outside window -> MonthlyReportHistoryGatedError (403)
    await expect(getMonthlyReportReadModel(userB, bizB.id, '2026-04', now)).rejects.toBeInstanceOf(MonthlyReportHistoryGatedError);
  });

  it('preserves pre-entitlement behavior when feature flag is disabled', async () => {
    delete process.env.ENTITLEMENTS_ENABLED;
    process.env.MONTHLY_REPORTS_ENABLED = 'true';
    const userId = 'user-flag-off';
    await seedUser(userId);
    await seedPlan(userId, 'FREE');
    const biz1 = await createBusiness(userId, { name: 'Biz 1', businessType: 'RETAIL', segment: 'RETAIL', electricalSystem: 'ALL_IN' });

    // Flag disabled allows 2nd business creation for FREE
    const biz2 = await createBusiness(userId, { name: 'Biz 2', businessType: 'RETAIL', segment: 'RETAIL', electricalSystem: 'ALL_IN' });
    expect(biz2.id).toBeDefined();

    // Flag disabled allows reading older report month
    const report = await getMonthlyReportReadModel(userId, biz1.id, '2026-03', new Date('2026-08-15T00:00:00Z'));
    expect(report.reportCompleteness.code).toBe('NO_BILL');
  });
});
