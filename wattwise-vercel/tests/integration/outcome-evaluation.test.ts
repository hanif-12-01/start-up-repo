import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { getPool } from '../../src/server/db/client';
import {
  ActionPlanNotEligibleError,
  getActionPlanOptions,
} from '../../src/server/services/action-plan.service';
import {
  OutcomeActionNotFoundError,
  OutcomeNotEligibleError,
  OutcomeWaitingForBillError,
  evaluateActionOutcome,
  getOutcomeEvaluationState,
} from '../../src/server/services/outcome.service';
import {
  SessionClosureNotEligibleError,
  SessionClosureNotFoundError,
  closeDiagnosticSession,
  getSessionClosureState,
} from '../../src/server/services/session-closure.service';
import { InspectionNotEligibleError, startInspection } from '../../src/server/services/inspection.service';
import {
  applyAllForwardMigrations,
  readForwardMigration,
  readRollbackMigration,
} from '../helpers/migrations';

const { Pool } = pg;
const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:testpass@127.0.0.1:5439/wattwise_test';

describe('IT-DIAG-06 PostgreSQL integration', () => {
  let pool: pg.Pool;

  async function seedPlan(
    suffix: string,
    options: {
      userId?: string;
      businessId?: string;
      sessionId?: string;
      status?: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
      sessionStatus?: string;
      completedAt?: string;
      baselineKwh?: string | null;
      baselineTariff?: string | null;
      actionVersion?: number;
      baselineOverride?: Record<string, unknown>;
    } = {}
  ) {
    const userId = options.userId ?? `outcome-user-${suffix}`;
    const businessId = options.businessId ?? `outcome-business-${suffix}`;
    const sessionId = options.sessionId ?? `outcome-session-${suffix}`;
    const candidateId = `outcome-candidate-${suffix}`;
    const inspectionId = `outcome-inspection-${suffix}`;
    const actionPlanId = `outcome-action-${suffix}`;
    const comparisonBillId = `outcome-bill-${suffix}-comparison`;
    const baselineBillId = `outcome-bill-${suffix}-baseline`;
    const status = options.status ?? 'COMPLETED';
    const completedAt = options.completedAt ?? '2026-07-31T18:00:00.000Z';

    if (!options.userId) {
      await pool.query(
        `INSERT INTO "user" (id, name, email, email_verified)
         VALUES ($1, $2, $3, false)`,
        [userId, `Outcome ${suffix}`, `outcome-${suffix}@example.test`]
      );
    }
    if (!options.businessId) {
      await pool.query(
        `INSERT INTO business (
           id, user_id, name, business_type, segment, electrical_system
         ) VALUES ($1, $2, $3, 'KOS_PROPERTY', 'KOS', 'ALL_IN')`,
        [businessId, userId, `Kos ${suffix}`]
      );
    }
    await pool.query(
      `INSERT INTO electricity_bill (
         id, business_id, period_start, period_end, total_amount_rupiah,
         kwh, tariff_rupiah_per_kwh, created_at, updated_at
       ) VALUES
         ($1, $3, '2026-05-01', '2026-05-31', 2900000, 290.000, 1500.00, '2026-06-01', '2026-06-01'),
         ($2, $3, '2026-06-01', '2026-06-30', 3000000, $4, $5, '2026-07-01', '2026-07-01')`,
      [
        comparisonBillId,
        baselineBillId,
        businessId,
        options.baselineKwh === undefined ? '300.000' : options.baselineKwh,
        options.baselineTariff === undefined ? '1500.00' : options.baselineTariff,
      ]
    );
    await pool.query(
      `INSERT INTO diagnostic_session (
         id, business_id, electricity_bill_id, comparison_bill_id,
         segment_code, status, rule_version, questionnaire_completed_at
       ) VALUES ($1, $2, $3, $4, 'KOS', $5, 'KOS_DIAG_RULE_V1', now())`,
      [sessionId, businessId, baselineBillId, comparisonBillId, options.sessionStatus ?? 'INSPECTION_IN_PROGRESS']
    );
    await pool.query(
      `INSERT INTO diagnostic_candidate (
         id, diagnostic_session_id, candidate_code, candidate_version,
         candidate_type, rule_version, title, rank, internal_score,
         evidence_level, explanation, supporting_factors_json,
         contradicting_factors_json
       ) VALUES (
         $1, $2, 'SPECIAL_ACTIVITY', 1, 'OPERATIONAL',
         'DIAG_CANDIDATE_RULE_V1', 'Kegiatan khusus', 1, 50, 'MODERATE',
         'Konteks sintetis, bukan diagnosis.', '[]'::jsonb, '[]'::jsonb
       )`,
      [candidateId, sessionId]
    );
    await pool.query(
      `INSERT INTO inspection_plan (
         id, business_id, diagnostic_candidate_id, inspection_code,
         inspection_version, rule_version, title, status, result_code,
         started_at, completed_at
       ) VALUES (
         $1, $2, $3, 'SPECIAL_ACTIVITY_REVIEW', 1, 'INSPECTION_RULE_V1',
         'Pemeriksaan kegiatan khusus', 'COMPLETED', 'FOUND', '2026-07-01', '2026-07-02'
       )`,
      [inspectionId, businessId, candidateId]
    );
    const baseline = {
      sourceBillId: baselineBillId,
      comparisonBillId,
      periodStart: '2026-06-01',
      periodEnd: '2026-06-30',
      inclusiveDays: 30,
      totalCostRupiah: '3000000',
      costPerDayRupiah: '100000',
      totalKwhMilliKwh:
        options.baselineKwh === null
          ? null
          : options.baselineKwh === undefined
            ? '300000'
            : options.baselineKwh.replace('.', '').padEnd(6, '0').slice(0, 6),
      kwhPerDayMilliKwh: options.baselineKwh === null ? null : '10000',
      tariffRupiahPerKwh:
        options.baselineTariff === undefined ? '1500.00' : options.baselineTariff,
      comparisonPeriodStart: '2026-05-01',
      comparisonPeriodEnd: '2026-05-31',
      comparisonInclusiveDays: 31,
      comparisonTotalCostRupiah: '2900000',
      comparisonCostPerDayRupiah: '93548',
      comparisonTotalKwhMilliKwh: '290000',
      comparisonKwhPerDayMilliKwh: '9355',
      candidateCode: 'SPECIAL_ACTIVITY',
      candidateVersion: 1,
      inspectionCode: 'SPECIAL_ACTIVITY_REVIEW',
      inspectionVersion: 1,
      inspectionResultCode: 'FOUND',
      capturedAt: '2026-07-02T00:00:00.000Z',
      ...options.baselineOverride,
    };
    const lifecycle = {
      PLANNED: [null, null, null],
      IN_PROGRESS: ['2026-07-01T00:00:00.000Z', null, null],
      COMPLETED: ['2026-07-01T00:00:00.000Z', completedAt, null],
      CANCELLED: [null, null, '2026-07-01T00:00:00.000Z'],
    }[status];
    await pool.query(
      `INSERT INTO energy_action_plan (
         id, business_id, diagnostic_candidate_id, inspection_plan_id,
         action_code, action_version, rule_version, title_snapshot,
         description_snapshot, reason_snapshot, steps_snapshot_json,
         inspection_result_snapshot, baseline_snapshot_json, status,
         review_mode, planned_start_date, started_at, completed_at, cancelled_at
       ) VALUES (
         $1, $2, $3, $4, 'LOG_SPECIAL_ACTIVITY', $5, 'ACTION_PLAN_RULE_V1',
         'Catat kegiatan khusus', 'Deskripsi aman', 'Alasan aman',
         '[{"stepCode":"LOG","instruction":"Catat aktivitas.","order":1}]'::jsonb,
         'FOUND', $6::jsonb, $7, 'NEXT_ELIGIBLE_BILL', '2026-07-01', $8, $9, $10
       )`,
      [
        actionPlanId,
        businessId,
        candidateId,
        inspectionId,
        options.actionVersion ?? 1,
        JSON.stringify(baseline),
        status,
        lifecycle[0],
        lifecycle[1],
        lifecycle[2],
      ]
    );
    return {
      userId,
      businessId,
      sessionId,
      candidateId,
      inspectionId,
      actionPlanId,
      comparisonBillId,
      baselineBillId,
      completedAt,
      baseline,
    };
  }

  async function insertFollowUp(
    tenant: Awaited<ReturnType<typeof seedPlan>>,
    suffix: string,
    options: {
      periodStart?: string;
      periodEnd?: string;
      totalCost?: string;
      kwh?: string | null;
      tariff?: string | null;
      createdAt?: string;
    } = {}
  ) {
    const id = `outcome-follow-${suffix}`;
    await pool.query(
      `INSERT INTO electricity_bill (
         id, business_id, period_start, period_end, total_amount_rupiah,
         kwh, tariff_rupiah_per_kwh, created_at, updated_at
       ) VALUES ($1, $2, $3::date, $4::date, $5, $6, $7, $8, $8)`,
      [
        id,
        tenant.businessId,
        options.periodStart ?? '2026-08-02',
        options.periodEnd ?? '2026-08-31',
        options.totalCost ?? '2700000',
        options.kwh === undefined ? '270.000' : options.kwh,
        options.tariff === undefined ? '1500.00' : options.tariff,
        options.createdAt ?? '2026-09-01T00:00:00.000Z',
      ]
    );
    return id;
  }

  async function insertAdditionalAction(
    tenant: Awaited<ReturnType<typeof seedPlan>>,
    suffix: string,
    status: 'IN_PROGRESS' | 'COMPLETED'
  ) {
    const candidateId = `outcome-extra-candidate-${suffix}`;
    const inspectionId = `outcome-extra-inspection-${suffix}`;
    const actionPlanId = `outcome-extra-action-${suffix}`;
    await pool.query(
      `INSERT INTO diagnostic_candidate (
         id, diagnostic_session_id, candidate_code, candidate_version,
         candidate_type, rule_version, title, rank, internal_score,
         evidence_level, explanation, supporting_factors_json, contradicting_factors_json
       ) VALUES ($1, $2, 'OCCUPANCY_INCREASE', 1, 'OCCUPANCY',
         'DIAG_CANDIDATE_RULE_V1', 'Okupansi', 2, 40, 'LIMITED',
         'Evidence sintetis.', '[]'::jsonb, '[]'::jsonb)`,
      [candidateId, tenant.sessionId]
    );
    await pool.query(
      `INSERT INTO inspection_plan (
         id, business_id, diagnostic_candidate_id, inspection_code,
         inspection_version, rule_version, title, status, result_code,
         started_at, completed_at
       ) VALUES ($1, $2, $3, 'OCCUPANCY_REVIEW', 1, 'INSPECTION_RULE_V1',
         'Pemeriksaan okupansi', 'COMPLETED', 'FOUND', '2026-07-01', '2026-07-02')`,
      [inspectionId, tenant.businessId, candidateId]
    );
    await pool.query(
      `INSERT INTO energy_action_plan (
         id, business_id, diagnostic_candidate_id, inspection_plan_id,
         action_code, action_version, rule_version, title_snapshot,
         description_snapshot, reason_snapshot, steps_snapshot_json,
         inspection_result_snapshot, baseline_snapshot_json, status,
         review_mode, planned_start_date, started_at, completed_at
       ) VALUES ($1, $2, $3, $4, 'TRACK_OCCUPANCY_AND_SHARED_USAGE', 1,
         'ACTION_PLAN_RULE_V1', 'Catat okupansi', 'Deskripsi aman', 'Alasan aman',
         '[{"stepCode":"LOG","instruction":"Catat okupansi.","order":1}]'::jsonb,
         'FOUND', $5::jsonb, $6, 'NEXT_ELIGIBLE_BILL', '2026-07-01',
         '2026-07-01', CASE WHEN $6 = 'COMPLETED' THEN '2026-07-31T18:00:00Z'::timestamptz ELSE NULL END)`,
      [actionPlanId, tenant.businessId, candidateId, inspectionId, JSON.stringify(tenant.baseline), status]
    );
    return actionPlanId;
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 5000, max: 20 });
    for (const table of [
      'action_outcome_evaluation', 'energy_action_plan', 'inspection_item',
      'inspection_plan', 'diagnostic_candidate', 'diagnostic_answer',
      'diagnostic_session', 'electricity_bill', 'business', 'user_plan',
      'verification', 'account', 'session', 'user',
    ]) {
      await pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }
    await applyAllForwardMigrations(pool);
  });

  afterAll(async () => {
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
    globalThis.__dbPool = undefined;
    globalThis.__dbInstance = undefined;
    await pool.end();
  });

  beforeEach(async () => {
    for (const table of [
      'action_outcome_evaluation', 'energy_action_plan', 'inspection_item',
      'inspection_plan', 'diagnostic_candidate', 'diagnostic_answer',
      'diagnostic_session', 'electricity_bill', 'business', 'user_plan',
      'session', 'account', 'user',
    ]) {
      await pool.query(`DELETE FROM "${table}"`);
    }
  });

  it('migrates 0007 up, down, verifies schema, and migrates up again', async () => {
    expect(
      (await pool.query(`SELECT to_regclass('public.action_outcome_evaluation') AS name`)).rows[0].name
    ).toBe('action_outcome_evaluation');
    expect(
      (await pool.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'diagnostic_session' AND column_name = 'closed_at'`)).rowCount
    ).toBe(1);
    await pool.query(readRollbackMigration('0007_action_outcome_evaluations_rollback.sql'));
    expect(
      (await pool.query(`SELECT to_regclass('public.action_outcome_evaluation') AS name`)).rows[0].name
    ).toBeNull();
    await pool.query(readForwardMigration('0007_action_outcome_evaluations.sql'));
    expect(
      (await pool.query(`SELECT to_regclass('public.action_outcome_evaluation') AS name`)).rows[0].name
    ).toBe('action_outcome_evaluation');
  });

  it('waits without a row, skips same-day bill, and selects earliest eligible bill', async () => {
    const tenant = await seedPlan('waiting');
    await insertFollowUp(tenant, 'same-day', {
      periodStart: '2026-08-01',
      periodEnd: '2026-08-01',
    });
    expect((await getOutcomeEvaluationState(tenant.userId, tenant.sessionId, tenant.actionPlanId))?.kind).toBe('WAITING_FOR_BILL');
    expect((await pool.query('SELECT count(*)::int AS count FROM action_outcome_evaluation')).rows[0].count).toBe(0);
    await expect(evaluateActionOutcome(tenant.userId, tenant.actionPlanId)).rejects.toBeInstanceOf(OutcomeWaitingForBillError);

    const later = await insertFollowUp(tenant, 'later', {
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
    });
    const earliest = await insertFollowUp(tenant, 'earliest', {
      periodStart: '2026-08-02',
      periodEnd: '2026-08-31',
    });
    const outcome = await evaluateActionOutcome(tenant.userId, tenant.actionPlanId);
    expect(outcome.followUpBillId).toBe(earliest);
    expect(outcome.followUpBillId).not.toBe(later);
    expect(outcome.evaluationEligibleAfterDate).toBe('2026-08-01');
  });

  it('uses deterministic period-end, created-at, and ID tie breaks', async () => {
    const tenant = await seedPlan('tie');
    await insertFollowUp(tenant, 'long', {
      periodStart: '2026-08-02',
      periodEnd: '2026-09-01',
      createdAt: '2026-09-02T00:00:00.000Z',
    });
    const selected = await insertFollowUp(tenant, 'short', {
      periodStart: '2026-08-02',
      periodEnd: '2026-08-31',
      createdAt: '2026-09-03T00:00:00.000Z',
    });
    expect((await evaluateActionOutcome(tenant.userId, tenant.actionPlanId)).followUpBillId).toBe(selected);
  });

  it('persists exact immutable snapshots and usage-complete positive signal', async () => {
    const tenant = await seedPlan('exact');
    const followUpBillId = await insertFollowUp(tenant, 'exact');
    const outcome = await evaluateActionOutcome(tenant.userId, tenant.actionPlanId);
    expect(outcome).toMatchObject({
      baselineBillId: tenant.baselineBillId,
      followUpBillId,
      ruleVersion: 'OUTCOME_EVALUATION_RULE_V1',
      similarityBandBps: 500,
      costDirection: 'LOWER',
      usageDirection: 'LOWER',
      tariffDirection: 'SIMILAR',
      dataQualityCode: 'USAGE_COMPLETE',
      overallOutcomeCode: 'POSITIVE_SIGNAL',
    });
    expect(outcome.baseline).toEqual(tenant.baseline);
    expect(outcome.followUp.totalCostRupiah).toBe('2700000');
    expect(outcome.followUp.totalKwhMilliKwh).toBe('270000');
    expect(outcome.comparison.costDeltaBps).toBe('-1000');
    expect(outcome.evaluatedAt.toISOString()).toBe(outcome.followUp.capturedAt);
  });

  it.each(['PLANNED', 'IN_PROGRESS', 'CANCELLED'] as const)(
    'rejects %s actions without creating an outcome',
    async (status) => {
      const tenant = await seedPlan(`reject-${status}`, { status });
      await insertFollowUp(tenant, `reject-${status}`);
      await expect(evaluateActionOutcome(tenant.userId, tenant.actionPlanId)).rejects.toBeInstanceOf(OutcomeNotEligibleError);
      expect((await pool.query('SELECT count(*)::int AS count FROM action_outcome_evaluation')).rows[0].count).toBe(0);
    }
  );

  it('rejects unknown action versions and invalid baseline snapshots', async () => {
    const unknown = await seedPlan('unknown-version', { actionVersion: 99 });
    await insertFollowUp(unknown, 'unknown-version');
    await expect(evaluateActionOutcome(unknown.userId, unknown.actionPlanId)).rejects.toBeInstanceOf(OutcomeNotEligibleError);

    const invalid = await seedPlan('invalid-baseline', {
      baselineOverride: { inclusiveDays: 29 },
    });
    await insertFollowUp(invalid, 'invalid-baseline');
    await expect(evaluateActionOutcome(invalid.userId, invalid.actionPlanId)).rejects.toThrow();
  });

  it('makes repeated and concurrent evaluation return one immutable row and timestamp', async () => {
    const tenant = await seedPlan('concurrent');
    await insertFollowUp(tenant, 'concurrent');
    const [left, right] = await Promise.all([
      evaluateActionOutcome(tenant.userId, tenant.actionPlanId),
      evaluateActionOutcome(tenant.userId, tenant.actionPlanId),
    ]);
    const repeated = await evaluateActionOutcome(tenant.userId, tenant.actionPlanId);
    expect(left.id).toBe(right.id);
    expect(left.id).toBe(repeated.id);
    expect(left.followUpBillId).toBe(right.followUpBillId);
    expect(left.evaluatedAt.toISOString()).toBe(right.evaluatedAt.toISOString());
    expect(left.comparison).toEqual(right.comparison);
    expect((await pool.query('SELECT count(*)::int AS count FROM action_outcome_evaluation')).rows[0].count).toBe(1);
  });

  it('does not recompute after source changes or an earlier bill is added later', async () => {
    const tenant = await seedPlan('immutable');
    const selected = await insertFollowUp(tenant, 'immutable-selected', {
      periodStart: '2026-09-01',
      periodEnd: '2026-09-30',
    });
    const first = await evaluateActionOutcome(tenant.userId, tenant.actionPlanId);
    await pool.query(`UPDATE electricity_bill SET total_amount_rupiah = 9999999, kwh = 999.999 WHERE id IN ($1, $2)`, [tenant.baselineBillId, selected]);
    await insertFollowUp(tenant, 'immutable-earlier', {
      periodStart: '2026-08-02',
      periodEnd: '2026-08-31',
    });
    const repeated = await evaluateActionOutcome(tenant.userId, tenant.actionPlanId);
    expect(repeated.id).toBe(first.id);
    expect(repeated.followUpBillId).toBe(selected);
    expect(repeated.baseline.totalCostRupiah).toBe('3000000');
    expect(repeated.followUp.totalCostRupiah).toBe('2700000');
  });

  it('persists cost-only inconclusive, tariff-context positive, negative, mixed, and similar outcomes', async () => {
    const costOnly = await seedPlan('cost-only', { baselineKwh: null, baselineTariff: null });
    await insertFollowUp(costOnly, 'cost-only', { kwh: null, tariff: null });
    expect(await evaluateActionOutcome(costOnly.userId, costOnly.actionPlanId)).toMatchObject({
      dataQualityCode: 'COST_ONLY', overallOutcomeCode: 'INCONCLUSIVE', usageDirection: 'UNAVAILABLE', tariffDirection: 'UNAVAILABLE',
    });

    const tariff = await seedPlan('tariff-only', { baselineKwh: null });
    await insertFollowUp(tariff, 'tariff-only', { kwh: null });
    expect(await evaluateActionOutcome(tariff.userId, tariff.actionPlanId)).toMatchObject({
      dataQualityCode: 'TARIFF_CONTEXT_ONLY', overallOutcomeCode: 'POSITIVE_SIGNAL', tariffDirection: 'SIMILAR',
    });

    const negative = await seedPlan('negative');
    await insertFollowUp(negative, 'negative', { totalCost: '3300000', kwh: '330.000' });
    expect((await evaluateActionOutcome(negative.userId, negative.actionPlanId)).overallOutcomeCode).toBe('NEGATIVE_SIGNAL');

    const mixed = await seedPlan('mixed');
    await insertFollowUp(mixed, 'mixed', { totalCost: '2700000', kwh: '330.000' });
    expect((await evaluateActionOutcome(mixed.userId, mixed.actionPlanId)).overallOutcomeCode).toBe('MIXED_SIGNAL');

    const similar = await seedPlan('similar');
    await insertFollowUp(similar, 'similar', { totalCost: '3150000', kwh: '315.000' });
    expect((await evaluateActionOutcome(similar.userId, similar.actionPlanId)).overallOutcomeCode).toBe('NO_CLEAR_CHANGE');
  });

  it('enforces outcome foreign keys, uniqueness, enums, and JSON constraints', async () => {
    const tenant = await seedPlan('constraints');
    await insertFollowUp(tenant, 'constraints');
    const outcome = await evaluateActionOutcome(tenant.userId, tenant.actionPlanId);
    await expect(pool.query(`UPDATE action_outcome_evaluation SET cost_direction = 'UNKNOWN' WHERE id = $1`, [outcome.id])).rejects.toThrow();
    await expect(pool.query(`UPDATE action_outcome_evaluation SET comparison_snapshot_json = '{}'::jsonb WHERE id = $1`, [outcome.id])).rejects.toThrow();
    await expect(pool.query(`UPDATE action_outcome_evaluation SET follow_up_bill_id = baseline_bill_id WHERE id = $1`, [outcome.id])).rejects.toThrow();
    await expect(pool.query(`UPDATE action_outcome_evaluation SET business_id = 'missing' WHERE id = $1`, [outcome.id])).rejects.toThrow();
    await expect(pool.query(`INSERT INTO action_outcome_evaluation SELECT 'duplicate', business_id, diagnostic_session_id, action_plan_id, baseline_bill_id, follow_up_bill_id, rule_version, similarity_band_bps, evaluation_eligible_after_date, baseline_snapshot_json, follow_up_snapshot_json, comparison_snapshot_json, cost_direction, usage_direction, tariff_direction, data_quality_code, overall_outcome_code, explanation_snapshot_json, evaluated_at, created_at, updated_at FROM action_outcome_evaluation WHERE id = $1`, [outcome.id])).rejects.toThrow();
  });

  it('enforces cross-tenant evaluate, read, and close isolation', async () => {
    const owner = await seedPlan('owner');
    await insertFollowUp(owner, 'owner');
    await expect(evaluateActionOutcome('other-user', owner.actionPlanId)).rejects.toBeInstanceOf(OutcomeActionNotFoundError);
    expect(await getOutcomeEvaluationState('other-user', owner.sessionId, owner.actionPlanId)).toBeNull();
    await expect(closeDiagnosticSession('other-user', owner.sessionId)).rejects.toBeInstanceOf(SessionClosureNotFoundError);
  });

  it('blocks closure for active or missing outcomes, then closes atomically and idempotently', async () => {
    const tenant = await seedPlan('closure');
    await insertFollowUp(tenant, 'closure');
    let closure = await getSessionClosureState(tenant.userId, tenant.sessionId);
    expect(closure?.eligibility.eligible).toBe(false);
    await expect(closeDiagnosticSession(tenant.userId, tenant.sessionId)).rejects.toBeInstanceOf(SessionClosureNotEligibleError);
    await evaluateActionOutcome(tenant.userId, tenant.actionPlanId);

    const activeActionPlanId = await insertAdditionalAction(tenant, 'closure-active', 'IN_PROGRESS');
    closure = await getSessionClosureState(tenant.userId, tenant.sessionId);
    expect(closure?.eligibility.eligible).toBe(false);
    await pool.query(`UPDATE energy_action_plan SET status = 'CANCELLED', completed_at = NULL, cancelled_at = now(), updated_at = now() WHERE id = $1`, [activeActionPlanId]);

    closure = await getSessionClosureState(tenant.userId, tenant.sessionId);
    expect(closure?.eligibility.eligible).toBe(true);
    const first = await closeDiagnosticSession(tenant.userId, tenant.sessionId);
    const second = await closeDiagnosticSession(tenant.userId, tenant.sessionId);
    expect(first.status).toBe('CLOSED');
    expect(second.closedAt.toISOString()).toBe(first.closedAt.toISOString());
    const stored = await pool.query(`SELECT status, closed_at FROM diagnostic_session WHERE id = $1`, [tenant.sessionId]);
    expect(stored.rows[0].status).toBe('CLOSED');
    expect(stored.rows[0].closed_at.toISOString()).toBe(first.closedAt.toISOString());
    expect((await getOutcomeEvaluationState(tenant.userId, tenant.sessionId, tenant.actionPlanId))?.kind).toBe('EVALUATED');
  });

  it('keeps CLOSED sessions read-only for new inspection, action, and outcome mutations', async () => {
    const tenant = await seedPlan('closed');
    await insertFollowUp(tenant, 'closed');
    await evaluateActionOutcome(tenant.userId, tenant.actionPlanId);
    await closeDiagnosticSession(tenant.userId, tenant.sessionId);

    const candidateId = 'outcome-candidate-after-close';
    await pool.query(
      `INSERT INTO diagnostic_candidate (
         id, diagnostic_session_id, candidate_code, candidate_version,
         candidate_type, rule_version, title, rank, internal_score,
         evidence_level, explanation, supporting_factors_json, contradicting_factors_json
       ) VALUES ($1, $2, 'OCCUPANCY_INCREASE', 1, 'OCCUPANCY', 'DIAG_CANDIDATE_RULE_V1', 'Okupansi', 2, 40, 'LIMITED', 'Evidence sintetis.', '[]'::jsonb, '[]'::jsonb)`,
      [candidateId, tenant.sessionId]
    );
    await expect(startInspection(tenant.userId, candidateId)).rejects.toBeInstanceOf(InspectionNotEligibleError);

    const noPlanInspection = 'inspection-after-close';
    await pool.query(
      `INSERT INTO inspection_plan (
         id, business_id, diagnostic_candidate_id, inspection_code, inspection_version,
         rule_version, title, status, result_code, completed_at
       ) VALUES ($1, $2, $3, 'OCCUPANCY_REVIEW', 1, 'INSPECTION_RULE_V1', 'Pemeriksaan', 'COMPLETED', 'FOUND', now())`,
      [noPlanInspection, tenant.businessId, candidateId]
    );
    await expect(
      getActionPlanOptions(tenant.userId, tenant.sessionId, noPlanInspection)
    ).rejects.toBeInstanceOf(ActionPlanNotEligibleError);

    const closedActionPlanId = 'outcome-action-after-close';
    await pool.query(
      `INSERT INTO energy_action_plan (
         id, business_id, diagnostic_candidate_id, inspection_plan_id,
         action_code, action_version, rule_version, title_snapshot,
         description_snapshot, reason_snapshot, steps_snapshot_json,
         inspection_result_snapshot, baseline_snapshot_json, status,
         review_mode, planned_start_date, started_at, completed_at
       ) VALUES ($1, $2, $3, $4, 'TRACK_OCCUPANCY_AND_SHARED_USAGE', 1,
         'ACTION_PLAN_RULE_V1', 'Catat okupansi', 'Deskripsi aman', 'Alasan aman',
         '[{"stepCode":"LOG","instruction":"Catat okupansi.","order":1}]'::jsonb,
         'FOUND', $5::jsonb, 'COMPLETED', 'NEXT_ELIGIBLE_BILL', '2026-07-01',
         '2026-07-01', '2026-07-31T18:00:00Z')`,
      [closedActionPlanId, tenant.businessId, candidateId, noPlanInspection, JSON.stringify(tenant.baseline)]
    );
    await expect(evaluateActionOutcome(tenant.userId, closedActionPlanId)).rejects.toBeInstanceOf(OutcomeNotEligibleError);
  });
});
