import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { getPool } from '../../src/server/db/client';
import {
  getUserEntitlements,
  resolveEffectivePlan,
  BusinessLimitExceededError,
} from '../../src/server/services/entitlement.service';
import { createBusiness } from '../../src/server/services/business.service';
import { getMonthlyReportReadModel, MonthlyReportHistoryGatedError } from '../../src/server/services/monthly-report.service';
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

  it('enforces monthly report history window (3 months for FREE) when flag enabled', async () => {
    process.env.ENTITLEMENTS_ENABLED = 'true';
    process.env.MONTHLY_REPORTS_ENABLED = 'true';
    const userId = 'user-report-gating';
    await seedUser(userId);
    await seedPlan(userId, 'FREE');
    await createBusiness(userId, {
      name: 'Report Business',
      businessType: 'LAUNDRY',
      segment: 'LAUNDRY',
      electricalSystem: 'ALL_IN',
    });

    const now = new Date('2026-08-15T00:00:00Z');
    // FREE plan allows current month (2026-08), 2026-07, 2026-06.
    // Requesting 2026-04 (4 months ago) should throw MonthlyReportHistoryGatedError.
    await expect(
      getMonthlyReportReadModel(userId, undefined, '2026-04', now)
    ).rejects.toBeInstanceOf(MonthlyReportHistoryGatedError);
  });
});
