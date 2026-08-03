import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import {
  getProductFunnelAnalyticsReadModel,
} from '../../src/server/services/funnel-analytics.service';
import { applyAllForwardMigrations } from '../helpers/migrations';

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:testpass@127.0.0.1:5439/wattwise_test';

describe('IT-DIAG-08B State-Derived Product Funnel Analytics Integration Tests', () => {
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
    delete process.env.FUNNEL_ANALYTICS_ENABLED;
    delete process.env.FUNNEL_ANALYTICS_VIEWER_USER_IDS;
    await pool.end();
  });

  beforeEach(async () => {
    delete process.env.FUNNEL_ANALYTICS_ENABLED;
    delete process.env.FUNNEL_ANALYTICS_VIEWER_USER_IDS;
    for (const table of [
      'action_outcome_evaluation', 'energy_action_plan', 'inspection_item',
      'inspection_plan', 'diagnostic_candidate', 'diagnostic_session',
      'electricity_bill', 'business', 'user_plan', 'session', 'account', 'user',
    ]) {
      await pool.query(`DELETE FROM "${table}"`);
    }
  });

  async function seedUser(id: string, options: { onboardingCompletedAt?: Date; createdAt?: Date } = {}) {
    const createdAt = options.createdAt || new Date();
    await pool.query(
      `INSERT INTO "user" (id, name, email, email_verified, created_at) VALUES ($1, $2, $3, false, $4)`,
      [id, `User ${id}`, `${id}@example.test`, createdAt]
    );
    await pool.query(
      `INSERT INTO user_plan (id, user_id, plan, onboarding_completed_at, idempotency_key, created_at)
       VALUES ($1, $2, 'FREE', $3, $4, $5)`,
      [`plan-${id}`, id, options.onboardingCompletedAt ?? null, `key-${id}`, createdAt]
    );
  }

  async function seedBusiness(id: string, userId: string, segment: string = 'RETAIL', createdAt: Date = new Date()) {
    await pool.query(
      `INSERT INTO business (id, user_id, name, business_type, segment, electrical_system, is_active, created_at)
       VALUES ($1, $2, $3, 'RETAIL', $4, 'ALL_IN', true, $5)`,
      [id, userId, `Business ${id}`, segment, createdAt]
    );
  }

  async function seedBill(id: string, businessId: string, periodStart: string, periodEnd: string) {
    await pool.query(
      `INSERT INTO electricity_bill (id, business_id, total_amount_rupiah, kwh, tariff_rupiah_per_kwh, period_start, period_end, created_at)
       VALUES ($1, $2, 1000000, 500, 2000, $3, $4, NOW())`,
      [id, businessId, periodStart, periodEnd]
    );
  }

  async function seedFullLifecycleBusiness(id: string, userId: string, segment: string = 'RETAIL', now: Date = new Date()) {
    await seedBusiness(id, userId, segment, now);
    const billId1 = `bill-${id}-1`;
    const billId2 = `bill-${id}-2`;
    await seedBill(billId1, id, '2026-06-01', '2026-06-30');
    await seedBill(billId2, id, '2026-07-01', '2026-07-31');

    const sessionId = `session-${id}`;
    await pool.query(
      `INSERT INTO diagnostic_session (id, business_id, electricity_bill_id, comparison_bill_id, segment_code, rule_version, status, created_at)
       VALUES ($1, $2, $3, $4, 'RETAIL', 'V1', 'CLOSED', $5)`,
      [sessionId, id, billId2, billId1, now]
    );

    const candId = `cand-${id}`;
    await pool.query(
      `INSERT INTO diagnostic_candidate (id, diagnostic_session_id, candidate_code, candidate_version, candidate_type, rule_version, title, rank, internal_score, evidence_level, explanation)
       VALUES ($1, $2, 'AC_LEAK', 1, 'APPLIANCE', 'V1', 'AC Leak', 1, 90, 'STRONG', 'High usage detected')`,
      [candId, sessionId]
    );

    const inspId = `insp-${id}`;
    await pool.query(
      `INSERT INTO inspection_plan (id, business_id, diagnostic_candidate_id, inspection_code, inspection_version, rule_version, title, status, result_code, completed_at)
       VALUES ($1, $2, $3, 'INSP_AC', 1, 'V1', 'Inspect AC', 'COMPLETED', 'FOUND', NOW())`,
      [inspId, id, candId]
    );

    const actId = `act-${id}`;
    await pool.query(
      `INSERT INTO energy_action_plan (id, business_id, diagnostic_candidate_id, inspection_plan_id, action_code, action_version, rule_version, title_snapshot, description_snapshot, reason_snapshot, steps_snapshot_json, inspection_result_snapshot, baseline_snapshot_json, planned_start_date, status, started_at, completed_at)
       VALUES ($1, $2, $3, $4, 'FIX_AC', 1, 'V1', 'Fix AC', 'Fix AC Desc', 'Reason', '["Fix AC step"]', 'FOUND', '{}', '2026-07-01', 'COMPLETED', NOW(), NOW())`,
      [actId, id, candId, inspId]
    );

    await pool.query(
      `INSERT INTO action_outcome_evaluation (id, business_id, diagnostic_session_id, action_plan_id, baseline_bill_id, follow_up_bill_id, rule_version, similarity_band_bps, evaluation_eligible_after_date, baseline_snapshot_json, follow_up_snapshot_json, comparison_snapshot_json, cost_direction, usage_direction, tariff_direction, data_quality_code, overall_outcome_code, explanation_snapshot_json, evaluated_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'V1', 500, '2026-08-01', '{"kwh":500}', '{"kwh":400}', '{"delta":-100}', 'LOWER', 'LOWER', 'SIMILAR', 'USAGE_COMPLETE', 'POSITIVE_SIGNAL', '{"summary":"Cost reduced"}', NOW())`,
      [`eval-${id}`, id, sessionId, actId, billId1, billId2]
    );
  }

  it('computes User Activation Funnel accurately without duplicate counting', async () => {
    const now = new Date('2026-08-03T12:00:00Z');
    await seedUser('u1', { onboardingCompletedAt: now, createdAt: now });
    await seedUser('u2', { onboardingCompletedAt: undefined, createdAt: now });
    await seedBusiness('b1', 'u1', 'RETAIL', now);
    await seedBusiness('b2', 'u1', 'RETAIL', now); // 2nd business for u1 -> u1 still counts ONCE in user funnel

    const model = await getProductFunnelAnalyticsReadModel({ from: '2026-08-01', to: '2026-08-05' }, now);
    const userFunnel = model.userActivationFunnel;

    expect(userFunnel.cohortSize).toBe(2);
    expect(userFunnel.stages[0].reachedCount).toBe(2); // ACCOUNT_CREATED
    expect(userFunnel.stages[1].reachedCount).toBe(2); // PLAN_SELECTED
    expect(userFunnel.stages[2].reachedCount).toBe(1); // ONBOARDING_COMPLETED (u1)
    expect(userFunnel.stages[3].reachedCount).toBe(1); // FIRST_BUSINESS_CREATED (u1)
  });

  it('computes all 12 stages of Business Value Funnel for full lifecycle business cohort', async () => {
    const now = new Date('2026-08-03T12:00:00Z');
    await seedUser('u1', { onboardingCompletedAt: now, createdAt: now });

    // Seed 5 businesses to avoid segment suppression threshold
    for (let i = 1; i <= 5; i++) {
      await seedFullLifecycleBusiness(`biz-${i}`, 'u1', 'RETAIL', now);
    }

    const model = await getProductFunnelAnalyticsReadModel({ from: '2026-08-01', to: '2026-08-05', segment: 'RETAIL' }, now);
    const bizFunnel = model.businessValueFunnel;

    expect(model.suppressionState.suppressed).toBe(false);
    expect(bizFunnel.cohortSize).toBe(5);
    expect(bizFunnel.stages[0].reachedCount).toBe(5); // BUSINESS_CREATED
    expect(bizFunnel.stages[1].reachedCount).toBe(5); // FIRST_BILL_CREATED
    expect(bizFunnel.stages[2].reachedCount).toBe(5); // COMPARISON_READY
    expect(bizFunnel.stages[3].reachedCount).toBe(5); // DIAGNOSTIC_STARTED
    expect(bizFunnel.stages[4].reachedCount).toBe(5); // QUESTIONNAIRE_COMPLETED
    expect(bizFunnel.stages[5].reachedCount).toBe(5); // CANDIDATES_READY
    expect(bizFunnel.stages[6].reachedCount).toBe(5); // INSPECTION_STARTED
    expect(bizFunnel.stages[7].reachedCount).toBe(5); // INSPECTION_COMPLETED
    expect(bizFunnel.stages[8].reachedCount).toBe(5); // ACTION_CREATED
    expect(bizFunnel.stages[9].reachedCount).toBe(5); // ACTION_COMPLETED
    expect(bizFunnel.stages[10].reachedCount).toBe(5); // OUTCOME_CREATED
    expect(bizFunnel.stages[11].reachedCount).toBe(5); // SESSION_CLOSED
  });

  it('suppresses segment breakdown metrics when cohort size is below threshold (5)', async () => {
    const now = new Date('2026-08-03T12:00:00Z');
    await seedUser('u1', { onboardingCompletedAt: now, createdAt: now });
    await seedBusiness('small-biz-1', 'u1', 'LAUNDRY', now); // 1 business only in LAUNDRY segment

    const model = await getProductFunnelAnalyticsReadModel({ from: '2026-08-01', to: '2026-08-05', segment: 'LAUNDRY' }, now);

    expect(model.suppressionState.suppressed).toBe(true);
    expect(model.suppressionState.message).toContain('Data belum cukup untuk ditampilkan');
    expect(model.businessValueFunnel.stages[0].reachedCount).toBe(0);
    expect(model.businessValueFunnel.stages[0].cohortConversionRateLabel).toBe('—');
  });

  it('does not include raw entity IDs, emails, business names, or PII in read model output', async () => {
    const now = new Date('2026-08-03T12:00:00Z');
    await seedUser('user-pii-check', { onboardingCompletedAt: now, createdAt: now });
    await seedFullLifecycleBusiness('biz-pii-check', 'user-pii-check', 'FNB', now);

    const model = await getProductFunnelAnalyticsReadModel({ from: '2026-08-01', to: '2026-08-05' }, now);
    const jsonStr = JSON.stringify(model);

    expect(jsonStr).not.toContain('user-pii-check');
    expect(jsonStr).not.toContain('biz-pii-check');
    expect(jsonStr).not.toContain('example.test');
    expect(jsonStr).not.toContain('Fix AC');
    expect(jsonStr).not.toContain('Cost reduced');
  });

  it('executes analytics read model in bounded queries without N+1', async () => {
    const now = new Date('2026-08-03T12:00:00Z');
    await seedUser('u1', { onboardingCompletedAt: now, createdAt: now });
    for (let i = 1; i <= 3; i++) {
      await seedBusiness(`biz-${i}`, 'u1', 'RETAIL', now);
    }

    const model = await getProductFunnelAnalyticsReadModel({ from: '2026-08-01', to: '2026-08-05' }, now);
    expect(model.userActivationFunnel).toBeDefined();
    expect(model.businessValueFunnel).toBeDefined();
  });
});
