import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { getPool } from '../../src/server/db/client';
import type { InspectionAnswerCode } from '../../src/server/db/schema/inspections';
import {
  ActionPlanDateError,
  ActionPlanNotEligibleError,
  ActionPlanNotFoundError,
  ActionPlanSelectionError,
  ActionPlanTransitionError,
  cancelActionPlan,
  completeActionPlan,
  createActionPlan,
  getActionPlan,
  getActionPlanOptions,
  startActionPlan,
} from '../../src/server/services/action-plan.service';
import {
  answerInspectionItem,
  completeInspection,
  getInspectionPlan,
  startInspection,
} from '../../src/server/services/inspection.service';
import {
  applyAllForwardMigrations,
  readForwardMigration,
  readRollbackMigration,
} from '../helpers/migrations';

const { Pool } = pg;
const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:testpass@127.0.0.1:5439/wattwise_test';

const candidateTypes: Record<string, string> = {
  BILL_ADMINISTRATION_CHANGE: 'ADMINISTRATIVE',
  OCCUPANCY_INCREASE: 'OCCUPANCY',
  SPECIAL_ACTIVITY: 'OPERATIONAL',
  NEW_ELECTRICAL_APPLIANCE: 'APPLIANCE',
  WATER_SYSTEM_CHANGE: 'WATER_SYSTEM',
  INFORMATION_COMPLETENESS: 'DATA_QUALITY',
};

describe('IT-DIAG-05 PostgreSQL integration', () => {
  let pool: pg.Pool;

  async function seedCandidate(
    suffix: string,
    options: {
      userId?: string;
      businessId?: string;
      sessionStatus?: string;
      candidateCode?: string;
      candidateVersion?: number;
      candidateRuleVersion?: string;
      candidateType?: string;
    } = {}
  ) {
    const userId = options.userId ?? `action-user-${suffix}`;
    const businessId = options.businessId ?? `action-business-${suffix}`;
    const sessionId = `action-session-${suffix}`;
    const candidateId = `action-candidate-${suffix}`;
    const candidateCode = options.candidateCode ?? 'NEW_ELECTRICAL_APPLIANCE';
    const previousBillId = `action-bill-${suffix}-previous`;
    const currentBillId = `action-bill-${suffix}-current`;
    if (!options.userId) {
      await pool.query(
        `INSERT INTO "user" (id, name, email, email_verified)
         VALUES ($1, $2, $3, false)`,
        [userId, `Action ${suffix}`, `action-${suffix}@example.test`]
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
         kwh, tariff_rupiah_per_kwh
       ) VALUES
         ($1, $3, '2026-01-01', '2026-01-31', 1000000, 300.000, 1500.00),
         ($2, $3, '2026-02-01', '2026-02-28', 1500001, 500.125, 1500.50)`,
      [previousBillId, currentBillId, businessId]
    );
    await pool.query(
      `INSERT INTO diagnostic_session (
         id, business_id, electricity_bill_id, comparison_bill_id,
         segment_code, status, rule_version, questionnaire_completed_at
       ) VALUES ($1, $2, $3, $4, 'KOS', $5, 'KOS_DIAG_RULE_V1', now())`,
      [sessionId, businessId, currentBillId, previousBillId, options.sessionStatus ?? 'ANALYZED']
    );
    await pool.query(
      `INSERT INTO diagnostic_candidate (
         id, diagnostic_session_id, candidate_code, candidate_version,
         candidate_type, rule_version, title, rank, internal_score,
         evidence_level, explanation, supporting_factors_json,
         contradicting_factors_json
       ) VALUES (
         $1, $2, $3, $4, $5, $6, 'Bagian uji', 1, 50, 'MODERATE',
         'Bagian yang perlu dicek, bukan diagnosis.', '[]'::jsonb, '[]'::jsonb
       )`,
      [
        candidateId,
        sessionId,
        candidateCode,
        options.candidateVersion ?? 1,
        options.candidateType ?? candidateTypes[candidateCode] ?? 'OTHER',
        options.candidateRuleVersion ?? 'DIAG_CANDIDATE_RULE_V1',
      ]
    );
    return {
      userId, businessId, sessionId, candidateId, previousBillId, currentBillId,
    };
  }

  async function completeInspectionWithResult(
    tenant: Awaited<ReturnType<typeof seedCandidate>>,
    result: InspectionAnswerCode
  ) {
    const started = await startInspection(tenant.userId, tenant.candidateId);
    const current = await getInspectionPlan(tenant.userId, tenant.sessionId, started.plan.id);
    if (!current) throw new Error('Missing inspection');
    for (const [index, item] of current.plan.items.entries()) {
      let answer: InspectionAnswerCode = 'NOT_FOUND';
      if (index === 0 && result === 'FOUND') answer = 'FOUND';
      if (index === 0 && result === 'UNKNOWN') answer = 'UNKNOWN';
      if (index === current.plan.items.length - 1 && result === 'NEEDS_HELP') {
        answer = 'NEEDS_HELP';
      }
      await answerInspectionItem(tenant.userId, {
        sessionId: tenant.sessionId,
        planId: started.plan.id,
        itemId: item.id,
        answerCode: answer,
        note: null,
      });
    }
    const completed = await completeInspection(tenant.userId, {
      sessionId: tenant.sessionId,
      planId: started.plan.id,
    });
    expect(completed.plan.resultCode).toBe(result);
    return completed.plan;
  }

  async function createFoundPlan(suffix: string) {
    const tenant = await seedCandidate(suffix);
    const inspection = await completeInspectionWithResult(tenant, 'FOUND');
    const options = await getActionPlanOptions(tenant.userId, tenant.sessionId, inspection.id);
    if (!options?.options[0]) throw new Error('Missing action option');
    const plan = await createActionPlan(tenant.userId, {
      sessionId: tenant.sessionId,
      inspectionPlanId: inspection.id,
      selectedActionCode: options.options[0].actionCode,
      plannedStartDate: '2026-02-28',
      userNote: 'Catatan sintetis',
    });
    return { tenant, inspection, plan, options };
  }

  async function insertRawCompletedInspection(
    tenant: Awaited<ReturnType<typeof seedCandidate>>,
    suffix: string,
    result: InspectionAnswerCode = 'FOUND'
  ) {
    const inspectionPlanId = `action-inspection-raw-${suffix}`;
    await pool.query(
      `INSERT INTO inspection_plan (
         id, business_id, diagnostic_candidate_id, inspection_code,
         inspection_version, rule_version, title, status, result_code,
         completed_at
       ) VALUES (
         $1, $2, $3, 'NEW_APPLIANCE_REVIEW', 1, 'INSPECTION_RULE_V1',
         'Pemeriksaan sintetis', 'COMPLETED', $4, now()
       )`,
      [inspectionPlanId, tenant.businessId, tenant.candidateId, result]
    );
    return inspectionPlanId;
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 5000, max: 16 });
    for (const table of [
      'energy_action_plan', 'inspection_item', 'inspection_plan',
      'diagnostic_candidate', 'diagnostic_answer', 'diagnostic_session',
      'electricity_bill', 'business', 'user_plan', 'verification', 'account',
      'session', 'user',
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
      'energy_action_plan', 'inspection_item', 'inspection_plan',
      'diagnostic_candidate', 'diagnostic_answer', 'diagnostic_session',
      'electricity_bill', 'business', 'user_plan', 'session', 'account', 'user',
    ]) {
      await pool.query(`DELETE FROM "${table}"`);
    }
  });

  it('migrates 0006 up, down, verifies absence, and migrates up again', async () => {
    expect((await pool.query(`SELECT to_regclass('public.energy_action_plan') AS name`)).rows[0].name).toBe('energy_action_plan');
    await pool.query(readRollbackMigration('0007_action_outcome_evaluations_rollback.sql'));
    await pool.query(readRollbackMigration('0006_energy_action_plans_rollback.sql'));
    expect((await pool.query(`SELECT to_regclass('public.energy_action_plan') AS name`)).rows[0].name).toBeNull();
    await pool.query(readForwardMigration('0006_energy_action_plans.sql'));
    await pool.query(readForwardMigration('0007_action_outcome_evaluations.sql'));
    expect((await pool.query(`SELECT to_regclass('public.energy_action_plan') AS name`)).rows[0].name).toBe('energy_action_plan');
  });

  it('creates a FOUND plan with exact immutable snapshots and review mode', async () => {
    const { tenant, inspection, plan } = await createFoundPlan('found');
    expect(plan).toMatchObject({
      status: 'PLANNED',
      reviewMode: 'NEXT_ELIGIBLE_BILL',
      inspectionResult: 'FOUND',
      plannedStartDate: '2026-02-28',
      userNote: 'Catatan sintetis',
    });
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.baseline).toMatchObject({
      sourceBillId: tenant.currentBillId,
      comparisonBillId: tenant.previousBillId,
      periodStart: '2026-02-01',
      periodEnd: '2026-02-28',
      inclusiveDays: 28,
      totalCostRupiah: '1500001',
      costPerDayRupiah: '53571',
      totalKwhMilliKwh: '500125',
      kwhPerDayMilliKwh: '17862',
      inspectionResultCode: 'FOUND',
    });
    expect(plan.baseline.capturedAt).toBe(plan.createdAt.toISOString());
    const stored = await pool.query(
      `SELECT count(*)::int AS count, status, review_mode,
              jsonb_typeof(steps_snapshot_json) AS steps_type,
              jsonb_typeof(baseline_snapshot_json) AS baseline_type
         FROM energy_action_plan WHERE inspection_plan_id = $1
        GROUP BY status, review_mode, steps_snapshot_json, baseline_snapshot_json`,
      [inspection.id]
    );
    expect(stored.rows[0]).toMatchObject({
      count: 1, status: 'PLANNED', review_mode: 'NEXT_ELIGIBLE_BILL',
      steps_type: 'array', baseline_type: 'object',
    });
  });

  it.each([
    ['NEEDS_HELP', 'REQUEST_COMPETENT_HELP'],
    ['UNKNOWN', 'COLLECT_MISSING_INFORMATION'],
  ] as const)('offers and creates only %s mapping', async (result, expectedCode) => {
    const tenant = await seedCandidate(`mapping-${result}`);
    const inspection = await completeInspectionWithResult(tenant, result);
    const view = await getActionPlanOptions(tenant.userId, tenant.sessionId, inspection.id);
    expect(view?.options.map((item) => item.actionCode)).toEqual([expectedCode]);
    const plan = await createActionPlan(tenant.userId, {
      sessionId: tenant.sessionId,
      inspectionPlanId: inspection.id,
      selectedActionCode: expectedCode,
      plannedStartDate: '2026-03-01',
      userNote: null,
    });
    expect(plan.actionCode).toBe(expectedCode);
    expect(plan.inspectionResult).toBe(result);
  });

  it('exposes no option and rejects create for NOT_FOUND', async () => {
    const tenant = await seedCandidate('not-found');
    const inspection = await completeInspectionWithResult(tenant, 'NOT_FOUND');
    const view = await getActionPlanOptions(tenant.userId, tenant.sessionId, inspection.id);
    expect(view?.options).toEqual([]);
    await expect(createActionPlan(tenant.userId, {
      sessionId: tenant.sessionId,
      inspectionPlanId: inspection.id,
      selectedActionCode: 'TRACK_APPLIANCE_OPERATING_TIME',
      plannedStartDate: '2026-03-01',
      userNote: null,
    })).rejects.toBeInstanceOf(ActionPlanNotEligibleError);
  });

  it('rejects IN_PROGRESS inspection, wrong action, and an early planned date', async () => {
    const tenant = await seedCandidate('invalid-create');
    const inProgress = await startInspection(tenant.userId, tenant.candidateId);
    await expect(createActionPlan(tenant.userId, {
      sessionId: tenant.sessionId,
      inspectionPlanId: inProgress.plan.id,
      selectedActionCode: 'TRACK_APPLIANCE_OPERATING_TIME',
      plannedStartDate: '2026-03-01', userNote: null,
    })).rejects.toBeInstanceOf(ActionPlanNotEligibleError);
    await completeInspectionWithResultAfterStarted(tenant, inProgress.plan.id, 'FOUND');
    await expect(createActionPlan(tenant.userId, {
      sessionId: tenant.sessionId, inspectionPlanId: inProgress.plan.id,
      selectedActionCode: 'TRACK_PUMP_OPERATION', plannedStartDate: '2026-03-01', userNote: null,
    })).rejects.toBeInstanceOf(ActionPlanSelectionError);
    await expect(createActionPlan(tenant.userId, {
      sessionId: tenant.sessionId, inspectionPlanId: inProgress.plan.id,
      selectedActionCode: 'TRACK_APPLIANCE_OPERATING_TIME', plannedStartDate: '2026-02-27', userNote: null,
    })).rejects.toBeInstanceOf(ActionPlanDateError);
  });

  it.each([
    ['unknown candidate', { candidateCode: 'UNKNOWN_CANDIDATE', candidateType: 'OTHER' }],
    ['unknown candidate version', { candidateVersion: 2 }],
    ['unknown candidate rule', { candidateRuleVersion: 'UNKNOWN_RULE' }],
    ['DATA_QUALITY candidate', { candidateCode: 'INFORMATION_COMPLETENESS', candidateType: 'DATA_QUALITY' }],
    ['CLOSED session', { sessionStatus: 'CLOSED' }],
  ])('rejects %s even when a completed inspection row exists', async (label, options) => {
    const tenant = await seedCandidate(`eligibility-${label.replaceAll(' ', '-')}`, options);
    const inspectionPlanId = await insertRawCompletedInspection(
      tenant,
      label.replaceAll(' ', '-')
    );
    await expect(getActionPlanOptions(
      tenant.userId,
      tenant.sessionId,
      inspectionPlanId
    )).rejects.toBeInstanceOf(ActionPlanNotEligibleError);
    expect((await pool.query(
      `SELECT count(*)::int AS count FROM energy_action_plan WHERE inspection_plan_id = $1`,
      [inspectionPlanId]
    )).rows[0].count).toBe(0);
  });

  async function completeInspectionWithResultAfterStarted(
    tenant: Awaited<ReturnType<typeof seedCandidate>>,
    planId: string,
    result: InspectionAnswerCode
  ) {
    const view = await getInspectionPlan(tenant.userId, tenant.sessionId, planId);
    if (!view) throw new Error('Missing inspection');
    for (const [index, item] of view.plan.items.entries()) {
      const answer = index === 0 && result === 'FOUND' ? 'FOUND' : 'NOT_FOUND';
      await answerInspectionItem(tenant.userId, {
        sessionId: tenant.sessionId, planId, itemId: item.id, answerCode: answer, note: null,
      });
    }
    return completeInspection(tenant.userId, { sessionId: tenant.sessionId, planId });
  }

  it('makes repeated and concurrent create return one identical plan and snapshot', async () => {
    const tenant = await seedCandidate('concurrent-create');
    const inspection = await completeInspectionWithResult(tenant, 'FOUND');
    const input = {
      sessionId: tenant.sessionId,
      inspectionPlanId: inspection.id,
      selectedActionCode: 'TRACK_APPLIANCE_OPERATING_TIME',
      plannedStartDate: '2026-03-01',
      userNote: null,
    };
    const results = await Promise.all([
      createActionPlan(tenant.userId, input),
      createActionPlan(tenant.userId, input),
      createActionPlan(tenant.userId, input),
    ]);
    expect(new Set(results.map((item) => item.id)).size).toBe(1);
    expect(new Set(results.map((item) => JSON.stringify(item.baseline))).size).toBe(1);
    expect(new Set(results.map((item) => JSON.stringify(item.steps))).size).toBe(1);
    expect((await pool.query(`SELECT count(*)::int AS count FROM energy_action_plan WHERE inspection_plan_id = $1`, [inspection.id])).rows[0].count).toBe(1);

    const differentRetry = await createActionPlan(tenant.userId, {
      ...input,
      selectedActionCode: 'SET_APPLIANCE_USAGE_ROUTINE',
      plannedStartDate: '2026-04-01',
    });
    expect(differentRetry.id).toBe(results[0].id);
    expect(differentRetry.actionCode).toBe('TRACK_APPLIANCE_OPERATING_TIME');
    expect(differentRetry.plannedStartDate).toBe('2026-03-01');
  });

  it('keeps baseline and action snapshots unchanged after source rows change', async () => {
    const { tenant, plan } = await createFoundPlan('immutable-snapshot');
    const baselineBefore = JSON.stringify(plan.baseline);
    const stepsBefore = JSON.stringify(plan.steps);
    await pool.query(
      `UPDATE electricity_bill
          SET total_amount_rupiah = 9999999, kwh = 999.999
        WHERE id = $1`,
      [tenant.currentBillId]
    );
    await pool.query(
      `UPDATE diagnostic_candidate SET title = 'Judul sumber berubah' WHERE id = $1`,
      [tenant.candidateId]
    );
    const reloaded = await getActionPlan(tenant.userId, tenant.sessionId, plan.id);
    expect(JSON.stringify(reloaded?.baseline)).toBe(baselineBefore);
    expect(JSON.stringify(reloaded?.steps)).toBe(stepsBefore);
    expect(reloaded?.title).toBe(plan.title);
    expect(reloaded?.reason).toBe(plan.reason);
  });

  it('starts and completes idempotently, including concurrent completion', async () => {
    const { tenant, plan } = await createFoundPlan('lifecycle');
    const started = await startActionPlan(tenant.userId, {
      sessionId: tenant.sessionId, actionPlanId: plan.id,
    });
    const startRetry = await startActionPlan(tenant.userId, {
      sessionId: tenant.sessionId, actionPlanId: plan.id,
    });
    expect(started.status).toBe('IN_PROGRESS');
    expect(startRetry.startedAt?.getTime()).toBe(started.startedAt?.getTime());
    const completed = await Promise.all([
      completeActionPlan(tenant.userId, { sessionId: tenant.sessionId, actionPlanId: plan.id }),
      completeActionPlan(tenant.userId, { sessionId: tenant.sessionId, actionPlanId: plan.id }),
    ]);
    expect(completed.every((item) => item.status === 'COMPLETED')).toBe(true);
    expect(completed[0].completedAt?.getTime()).toBe(completed[1].completedAt?.getTime());
    await expect(cancelActionPlan(tenant.userId, {
      sessionId: tenant.sessionId, actionPlanId: plan.id,
    })).rejects.toBeInstanceOf(ActionPlanTransitionError);
  });

  it.each(['PLANNED', 'IN_PROGRESS'] as const)('cancels %s and keeps terminal state immutable', async (state) => {
    const { tenant, plan } = await createFoundPlan(`cancel-${state}`);
    if (state === 'IN_PROGRESS') {
      await startActionPlan(tenant.userId, { sessionId: tenant.sessionId, actionPlanId: plan.id });
    }
    const cancelled = await cancelActionPlan(tenant.userId, {
      sessionId: tenant.sessionId, actionPlanId: plan.id,
    });
    const retry = await cancelActionPlan(tenant.userId, {
      sessionId: tenant.sessionId, actionPlanId: plan.id,
    });
    expect(cancelled.status).toBe('CANCELLED');
    expect(retry.cancelledAt?.getTime()).toBe(cancelled.cancelledAt?.getTime());
    await expect(startActionPlan(tenant.userId, {
      sessionId: tenant.sessionId, actionPlanId: plan.id,
    })).rejects.toBeInstanceOf(ActionPlanTransitionError);
  });

  it('enforces tenant isolation for options, create, read, start, complete, and cancel', async () => {
    const tenantA = await seedCandidate('tenant-a');
    const inspection = await completeInspectionWithResult(tenantA, 'FOUND');
    const tenantB = await seedCandidate('tenant-b');
    expect(await getActionPlanOptions(tenantB.userId, tenantA.sessionId, inspection.id)).toBeNull();
    await expect(createActionPlan(tenantB.userId, {
      sessionId: tenantA.sessionId, inspectionPlanId: inspection.id,
      selectedActionCode: 'TRACK_APPLIANCE_OPERATING_TIME', plannedStartDate: '2026-03-01', userNote: null,
    })).rejects.toBeInstanceOf(ActionPlanNotFoundError);
    const plan = await createActionPlan(tenantA.userId, {
      sessionId: tenantA.sessionId, inspectionPlanId: inspection.id,
      selectedActionCode: 'TRACK_APPLIANCE_OPERATING_TIME', plannedStartDate: '2026-03-01', userNote: null,
    });
    expect(await getActionPlan(tenantB.userId, tenantA.sessionId, plan.id)).toBeNull();
    for (const mutation of [startActionPlan, completeActionPlan, cancelActionPlan]) {
      await expect(mutation(tenantB.userId, {
        sessionId: tenantA.sessionId, actionPlanId: plan.id,
      })).rejects.toBeInstanceOf(ActionPlanNotFoundError);
    }
  });

  it('keeps the diagnostic session INSPECTION_IN_PROGRESS through every action transition', async () => {
    const { tenant, plan } = await createFoundPlan('session-status');
    await startActionPlan(tenant.userId, { sessionId: tenant.sessionId, actionPlanId: plan.id });
    await completeActionPlan(tenant.userId, { sessionId: tenant.sessionId, actionPlanId: plan.id });
    expect((await pool.query(`SELECT status FROM diagnostic_session WHERE id = $1`, [tenant.sessionId])).rows[0].status).toBe('INSPECTION_IN_PROGRESS');
  });

  it('enforces database FK, uniqueness, JSON, status, timestamps, and note limits', async () => {
    const { tenant, inspection, plan } = await createFoundPlan('constraints');
    await expect(pool.query(`UPDATE energy_action_plan SET user_note = $2 WHERE id = $1`, [plan.id, 'x'.repeat(1001)])).rejects.toThrow();
    await expect(pool.query(`UPDATE energy_action_plan SET status = 'COMPLETED' WHERE id = $1`, [plan.id])).rejects.toThrow();
    await expect(pool.query(`UPDATE energy_action_plan SET steps_snapshot_json = '[]'::jsonb WHERE id = $1`, [plan.id])).rejects.toThrow();
    await expect(pool.query(`UPDATE energy_action_plan SET baseline_snapshot_json = '[]'::jsonb WHERE id = $1`, [plan.id])).rejects.toThrow();
    await expect(pool.query(
      `INSERT INTO energy_action_plan (
         id, business_id, diagnostic_candidate_id, inspection_plan_id, action_code,
         action_version, rule_version, title_snapshot, description_snapshot,
         reason_snapshot, steps_snapshot_json, inspection_result_snapshot,
         baseline_snapshot_json, planned_start_date
       ) SELECT $1, business_id, diagnostic_candidate_id, inspection_plan_id, 'DUPLICATE',
         1, 'RULE', 'Title', 'Description', 'Reason', '[{"stepCode":"X"}]'::jsonb,
         'FOUND', '{}'::jsonb, '2026-03-01' FROM energy_action_plan WHERE id = $2`,
      [crypto.randomUUID(), plan.id]
    )).rejects.toThrow();
    await expect(pool.query(`UPDATE energy_action_plan SET business_id = 'missing' WHERE id = $1`, [plan.id])).rejects.toThrow();
    expect(inspection.id).toBe(plan.inspectionPlanId);
    expect(tenant.businessId).toBe(plan.businessId);
  });
});
