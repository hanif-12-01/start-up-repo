import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { getPool } from '../../src/server/db/client';
import type { InspectionAnswerCode } from '../../src/server/db/schema/inspections';
import {
  InspectionAnswerNotAllowedError,
  InspectionCompletionNotReadyError,
  InspectionImmutableError,
  InspectionItemMismatchError,
  InspectionNotEligibleError,
  InspectionNotFoundError,
  answerInspectionItem,
  completeInspection,
  getCandidateInspectionAvailability,
  getInspectionPlan,
  startInspection,
} from '../../src/server/services/inspection.service';
import {
  applyAllForwardMigrations,
  readRollbackMigration,
} from '../helpers/migrations';

const { Pool } = pg;
const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:testpass@127.0.0.1:5439/wattwise_test';

type SessionStatus =
  | 'DRAFT'
  | 'COLLECTING_CONTEXT'
  | 'ANALYZED'
  | 'INSPECTION_IN_PROGRESS'
  | 'CLOSED';

const candidateTypes: Record<string, string> = {
  BILL_ADMINISTRATION_CHANGE: 'ADMINISTRATIVE',
  OCCUPANCY_INCREASE: 'OCCUPANCY',
  SPECIAL_ACTIVITY: 'OPERATIONAL',
  NEW_ELECTRICAL_APPLIANCE: 'APPLIANCE',
  WATER_SYSTEM_CHANGE: 'WATER_SYSTEM',
  INFORMATION_COMPLETENESS: 'DATA_QUALITY',
};

describe('IT-DIAG-04 PostgreSQL integration', () => {
  let pool: pg.Pool;

  async function seedCandidate(
    suffix: string,
    options: {
      userId?: string;
      businessId?: string;
      status?: SessionStatus;
      candidateCode?: string;
      candidateVersion?: number;
      candidateRuleVersion?: string;
      rank?: number;
      candidateType?: string;
    } = {}
  ) {
    const userId = options.userId ?? `inspection-user-${suffix}`;
    const businessId = options.businessId ?? `inspection-business-${suffix}`;
    const sessionId = `inspection-session-${suffix}`;
    const candidateId = `inspection-candidate-${suffix}`;
    const candidateCode = options.candidateCode ?? 'NEW_ELECTRICAL_APPLIANCE';
    const previousBillId = `inspection-bill-${suffix}-previous`;
    const currentBillId = `inspection-bill-${suffix}-current`;

    if (!options.userId) {
      await pool.query(
        `INSERT INTO "user" (id, name, email, email_verified)
         VALUES ($1, $2, $3, false)`,
        [userId, `Inspection ${suffix}`, `inspection-${suffix}@example.test`]
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
         ($1, $3, '2026-01-01', '2026-01-31', 1000000, 300, 1500),
         ($2, $3, '2026-02-01', '2026-02-28', 1500000, 500, 1500)`,
      [previousBillId, currentBillId, businessId]
    );
    await pool.query(
      `INSERT INTO diagnostic_session (
         id, business_id, electricity_bill_id, comparison_bill_id,
         segment_code, status, rule_version, questionnaire_completed_at
       ) VALUES ($1, $2, $3, $4, 'KOS', $5, 'KOS_DIAG_RULE_V1', now())`,
      [
        sessionId,
        businessId,
        currentBillId,
        previousBillId,
        options.status ?? 'ANALYZED',
      ]
    );
    await pool.query(
      `INSERT INTO diagnostic_candidate (
         id, diagnostic_session_id, candidate_code, candidate_version,
         candidate_type, rule_version, title, rank, internal_score,
         evidence_level, explanation, supporting_factors_json,
         contradicting_factors_json
       ) VALUES (
         $1, $2, $3, $4, $5, $6, 'Bagian uji', $7, 50, 'MODERATE',
         'Bagian yang perlu dicek, bukan diagnosis.', '[]'::jsonb, '[]'::jsonb
       )`,
      [
        candidateId,
        sessionId,
        candidateCode,
        options.candidateVersion ?? 1,
        options.candidateType ?? candidateTypes[candidateCode] ?? 'OTHER',
        options.candidateRuleVersion ?? 'DIAG_CANDIDATE_RULE_V1',
        options.rank ?? 1,
      ]
    );
    return { userId, businessId, sessionId, candidateId };
  }

  async function seedAdditionalCandidate(
    tenant: { sessionId: string },
    suffix: string,
    candidateCode: string,
    rank: number
  ) {
    const candidateId = `inspection-candidate-${suffix}`;
    await pool.query(
      `INSERT INTO diagnostic_candidate (
         id, diagnostic_session_id, candidate_code, candidate_version,
         candidate_type, rule_version, title, rank, internal_score,
         evidence_level, explanation, supporting_factors_json,
         contradicting_factors_json
       ) VALUES (
         $1, $2, $3, 1, $4, 'DIAG_CANDIDATE_RULE_V1', 'Bagian uji',
         $5, 40, 'LIMITED', 'Bagian yang perlu dicek, bukan diagnosis.',
         '[]'::jsonb, '[]'::jsonb
       )`,
      [
        candidateId,
        tenant.sessionId,
        candidateCode,
        candidateTypes[candidateCode] ?? 'OTHER',
        rank,
      ]
    );
    return candidateId;
  }

  async function answerAll(
    tenant: { userId: string; sessionId: string },
    planId: string,
    answers: InspectionAnswerCode[]
  ) {
    const current = await getInspectionPlan(
      tenant.userId,
      tenant.sessionId,
      planId
    );
    if (!current) throw new Error('Missing test inspection');
    for (const [index, item] of current.plan.items.entries()) {
      const requested = answers[index] ?? answers.at(-1) ?? 'UNKNOWN';
      const answer = item.resultOptions.includes(requested)
        ? requested
        : 'NEEDS_HELP';
      await answerInspectionItem(tenant.userId, {
        sessionId: tenant.sessionId,
        planId,
        itemId: item.id,
        answerCode: answer,
        note: `Catatan ${index + 1}`,
      });
    }
  }

  beforeAll(async () => {
    pool = new Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: 5000,
      max: 12,
    });
    await pool.query('DROP TABLE IF EXISTS "inspection_item" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "inspection_plan" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "diagnostic_candidate" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "diagnostic_answer" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "diagnostic_session" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "electricity_bill" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "business" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "user_plan" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "verification" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "account" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "session" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "user" CASCADE');
    await applyAllForwardMigrations(pool);
  });

  afterAll(async () => {
    await pool.query(readRollbackMigration('0005_guided_inspections_rollback.sql'));
    await pool.query(readRollbackMigration('0004_diagnostic_candidates_rollback.sql'));
    await pool.query(readRollbackMigration('0003_diagnostic_questionnaire_rollback.sql'));
    await pool.query(readRollbackMigration('0002_bill_first_rollback.sql'));
    await pool.query(readRollbackMigration('0001_journey_business_rollback.sql'));
    await pool.query(readRollbackMigration('0000_auth_schema_rollback.sql'));
    await getPool().end();
    globalThis.__dbPool = undefined;
    globalThis.__dbInstance = undefined;
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM inspection_item');
    await pool.query('DELETE FROM inspection_plan');
    await pool.query('DELETE FROM diagnostic_candidate');
    await pool.query('DELETE FROM diagnostic_answer');
    await pool.query('DELETE FROM diagnostic_session');
    await pool.query('DELETE FROM electricity_bill');
    await pool.query('DELETE FROM business');
    await pool.query('DELETE FROM user_plan');
    await pool.query('DELETE FROM session');
    await pool.query('DELETE FROM account');
    await pool.query('DELETE FROM "user"');
  });

  it('creates required tables, constraints, FKs, json snapshots, and indexes', async () => {
    const columns = await pool.query(
      `SELECT table_name, column_name, data_type
         FROM information_schema.columns
        WHERE table_name IN ('inspection_plan', 'inspection_item')`
    );
    expect(
      columns.rows.find(
        (row) =>
          row.table_name === 'inspection_item' &&
          row.column_name === 'result_options_json'
      )?.data_type
    ).toBe('jsonb');

    const constraints = await pool.query(
      `SELECT table_name, constraint_name
         FROM information_schema.table_constraints
        WHERE table_name IN ('inspection_plan', 'inspection_item')`
    );
    const names = constraints.rows.map((row) => row.constraint_name);
    expect(names).toEqual(
      expect.arrayContaining([
        'inspection_plan_candidate_code_version_rule_unique',
        'inspection_plan_business_id_fk',
        'inspection_plan_candidate_id_fk',
        'inspection_plan_completion_check',
        'inspection_item_plan_code_version_unique',
        'inspection_item_plan_sort_unique',
        'inspection_item_plan_id_fk',
        'inspection_item_safety_check',
        'inspection_item_note_length_check',
      ])
    );

    const indexes = await pool.query(
      `SELECT indexname FROM pg_indexes
        WHERE tablename IN ('inspection_plan', 'inspection_item')`
    );
    expect(indexes.rows.map((row) => row.indexname)).toEqual(
      expect.arrayContaining([
        'inspection_plan_business_status_idx',
        'inspection_plan_candidate_idx',
        'inspection_item_plan_order_idx',
      ])
    );
  });

  it('starts one snapshot plan and transitions ANALYZED to INSPECTION_IN_PROGRESS', async () => {
    const tenant = await seedCandidate('start');
    const view = await startInspection(tenant.userId, tenant.candidateId);
    expect(view.plan.status).toBe('IN_PROGRESS');
    expect(view.plan.items).toHaveLength(4);
    expect(view.plan.items.map((item) => item.sortOrder)).toEqual([1, 2, 3, 4]);
    expect(view.plan.items.every((item) => item.instruction.length > 0)).toBe(true);
    expect(
      view.plan.items.some(
        (item) => item.safetyLevel === 'PROFESSIONAL_REQUIRED'
      )
    ).toBe(true);

    const stored = await pool.query(
      `SELECT ds.status, ip.inspection_code, ip.inspection_version, ip.rule_version,
              (SELECT count(*)::int FROM inspection_item ii WHERE ii.plan_id = ip.id) AS item_count
         FROM inspection_plan ip
         JOIN diagnostic_candidate dc ON dc.id = ip.diagnostic_candidate_id
         JOIN diagnostic_session ds ON ds.id = dc.diagnostic_session_id
        WHERE ip.id = $1`,
      [view.plan.id]
    );
    expect(stored.rows[0]).toMatchObject({
      status: 'INSPECTION_IN_PROGRESS',
      inspection_code: 'NEW_APPLIANCE_REVIEW',
      inspection_version: 1,
      rule_version: 'INSPECTION_RULE_V1',
      item_count: 4,
    });
  });

  it('makes repeated and concurrent starts return exactly one plan and item set', async () => {
    const tenant = await seedCandidate('concurrent-start');
    const results = await Promise.all([
      startInspection(tenant.userId, tenant.candidateId),
      startInspection(tenant.userId, tenant.candidateId),
      startInspection(tenant.userId, tenant.candidateId),
    ]);
    expect(new Set(results.map((result) => result.plan.id)).size).toBe(1);
    const count = await pool.query(
      `SELECT count(DISTINCT ip.id)::int AS plans,
              count(ii.id)::int AS items
         FROM inspection_plan ip
         JOIN inspection_item ii ON ii.plan_id = ip.id
        WHERE ip.diagnostic_candidate_id = $1`,
      [tenant.candidateId]
    );
    expect(count.rows[0]).toMatchObject({ plans: 1, items: 4 });
  });

  it.each(['DRAFT', 'COLLECTING_CONTEXT', 'CLOSED'] as const)(
    'rejects a %s session without creating a plan or changing status',
    async (status) => {
      const tenant = await seedCandidate(`status-${status}`, { status });
      await expect(
        startInspection(tenant.userId, tenant.candidateId)
      ).rejects.toBeInstanceOf(InspectionNotEligibleError);
      const stored = await pool.query(
        `SELECT ds.status,
                (SELECT count(*)::int FROM inspection_plan ip
                  WHERE ip.diagnostic_candidate_id = $2) AS plan_count
           FROM diagnostic_session ds
          WHERE ds.id = $1`,
        [tenant.sessionId, tenant.candidateId]
      );
      expect(stored.rows[0].status).toBe(status);
      expect(Number(stored.rows[0].plan_count)).toBe(0);
    }
  );

  it.each([
    ['data quality', { candidateCode: 'INFORMATION_COMPLETENESS' }],
    ['unknown code', { candidateCode: 'UNRECOGNIZED_PART', candidateType: 'OTHER' }],
    ['unknown version', { candidateVersion: 2 }],
    ['unknown rule', { candidateRuleVersion: 'MANIPULATED_RULE' }],
  ])('rejects %s eligibility and rolls back atomically', async (_label, options) => {
    const tenant = await seedCandidate(`invalid-${_label.replace(' ', '-')}`, options);
    await expect(
      startInspection(tenant.userId, tenant.candidateId)
    ).rejects.toBeInstanceOf(InspectionNotEligibleError);
    const stored = await pool.query(
      `SELECT status,
              (SELECT count(*)::int FROM inspection_plan
                WHERE diagnostic_candidate_id = $2) AS plan_count
         FROM diagnostic_session
        WHERE id = $1`,
      [tenant.sessionId, tenant.candidateId]
    );
    expect(stored.rows[0].status).toBe('ANALYZED');
    expect(Number(stored.rows[0].plan_count)).toBe(0);
  });

  it('enforces cross-tenant isolation for start, read, answer, and complete', async () => {
    const tenantA = await seedCandidate('tenant-a');
    const tenantB = await seedCandidate('tenant-b');
    await expect(
      startInspection(tenantB.userId, tenantA.candidateId)
    ).rejects.toBeInstanceOf(InspectionNotFoundError);
    const plan = await startInspection(tenantA.userId, tenantA.candidateId);
    expect(
      await getInspectionPlan(tenantB.userId, tenantA.sessionId, plan.plan.id)
    ).toBeNull();
    await expect(
      answerInspectionItem(tenantB.userId, {
        sessionId: tenantA.sessionId,
        planId: plan.plan.id,
        itemId: plan.plan.items[0].id,
        answerCode: 'UNKNOWN',
        note: null,
      })
    ).rejects.toBeInstanceOf(InspectionNotFoundError);
    await expect(
      completeInspection(tenantB.userId, {
        sessionId: tenantA.sessionId,
        planId: plan.plan.id,
      })
    ).rejects.toBeInstanceOf(InspectionNotFoundError);
  });

  it('saves, retries idempotently, and changes answers only before completion', async () => {
    const tenant = await seedCandidate('answers');
    const started = await startInspection(tenant.userId, tenant.candidateId);
    const item = started.plan.items[0];
    const first = await answerInspectionItem(tenant.userId, {
      sessionId: tenant.sessionId,
      planId: started.plan.id,
      itemId: item.id,
      answerCode: 'FOUND',
      note: '  Terlihat saat penggunaan normal.  ',
    });
    const firstTimestamp = first.plan.items[0].completedAt?.getTime();
    const retry = await answerInspectionItem(tenant.userId, {
      sessionId: tenant.sessionId,
      planId: started.plan.id,
      itemId: item.id,
      answerCode: 'FOUND',
      note: 'Terlihat saat penggunaan normal.',
    });
    expect(retry.plan.items[0].completedAt?.getTime()).toBe(firstTimestamp);

    const changed = await answerInspectionItem(tenant.userId, {
      sessionId: tenant.sessionId,
      planId: started.plan.id,
      itemId: item.id,
      answerCode: 'UNKNOWN',
      note: '',
    });
    expect(changed.plan.items[0]).toMatchObject({
      status: 'ANSWERED',
      answerCode: 'UNKNOWN',
      note: null,
    });
  });

  it('rejects a foreign item and an answer excluded by the item snapshot', async () => {
    const tenant = await seedCandidate('mismatch');
    const started = await startInspection(tenant.userId, tenant.candidateId);
    await expect(
      answerInspectionItem(tenant.userId, {
        sessionId: tenant.sessionId,
        planId: started.plan.id,
        itemId: 'missing-item',
        answerCode: 'UNKNOWN',
        note: null,
      })
    ).rejects.toBeInstanceOf(InspectionItemMismatchError);
    const hazard = started.plan.items.find(
      (item) => item.safetyLevel === 'PROFESSIONAL_REQUIRED'
    )!;
    await expect(
      answerInspectionItem(tenant.userId, {
        sessionId: tenant.sessionId,
        planId: started.plan.id,
        itemId: hazard.id,
        answerCode: 'FOUND',
        note: null,
      })
    ).rejects.toBeInstanceOf(InspectionAnswerNotAllowedError);
  });

  it('requires every item, resolves NEEDS_HELP precedence, and freezes completion', async () => {
    const tenant = await seedCandidate('complete');
    const started = await startInspection(tenant.userId, tenant.candidateId);
    await expect(
      completeInspection(tenant.userId, {
        sessionId: tenant.sessionId,
        planId: started.plan.id,
      })
    ).rejects.toBeInstanceOf(InspectionCompletionNotReadyError);

    await answerAll(tenant, started.plan.id, [
      'FOUND',
      'NOT_FOUND',
      'UNKNOWN',
      'NEEDS_HELP',
    ]);
    const completed = await completeInspection(tenant.userId, {
      sessionId: tenant.sessionId,
      planId: started.plan.id,
    });
    expect(completed.plan).toMatchObject({
      status: 'COMPLETED',
      resultCode: 'NEEDS_HELP',
    });

    const retry = await completeInspection(tenant.userId, {
      sessionId: tenant.sessionId,
      planId: started.plan.id,
    });
    expect(retry.plan.completedAt?.getTime()).toBe(
      completed.plan.completedAt?.getTime()
    );
    await expect(
      answerInspectionItem(tenant.userId, {
        sessionId: tenant.sessionId,
        planId: started.plan.id,
        itemId: started.plan.items[0].id,
        answerCode: 'NOT_FOUND',
        note: null,
      })
    ).rejects.toBeInstanceOf(InspectionImmutableError);
  });

  it.each([
    ['FOUND', ['FOUND', 'NOT_FOUND', 'UNKNOWN', 'NOT_FOUND']],
    ['NOT_FOUND', ['NOT_FOUND', 'NOT_FOUND', 'NOT_FOUND', 'NOT_FOUND']],
    ['UNKNOWN', ['UNKNOWN', 'NOT_FOUND', 'UNKNOWN', 'NOT_FOUND']],
  ] as const)('persists the %s aggregate result', async (expected, answers) => {
    const tenant = await seedCandidate(`aggregate-${expected}`);
    const started = await startInspection(tenant.userId, tenant.candidateId);
    await answerAll(tenant, started.plan.id, [...answers]);
    const completed = await completeInspection(tenant.userId, {
      sessionId: tenant.sessionId,
      planId: started.plan.id,
    });
    expect(completed.plan.resultCode).toBe(expected);
  });

  it('serializes concurrent completion and returns one immutable outcome', async () => {
    const tenant = await seedCandidate('concurrent-complete');
    const started = await startInspection(tenant.userId, tenant.candidateId);
    await answerAll(tenant, started.plan.id, [
      'NOT_FOUND',
      'NOT_FOUND',
      'NOT_FOUND',
      'NOT_FOUND',
    ]);
    const results = await Promise.all([
      completeInspection(tenant.userId, {
        sessionId: tenant.sessionId,
        planId: started.plan.id,
      }),
      completeInspection(tenant.userId, {
        sessionId: tenant.sessionId,
        planId: started.plan.id,
      }),
    ]);
    expect(results[0].plan.resultCode).toBe('NOT_FOUND');
    expect(results[1].plan.resultCode).toBe('NOT_FOUND');
    expect(results[0].plan.completedAt?.getTime()).toBe(
      results[1].plan.completedAt?.getTime()
    );
  });

  it('allows a second candidate plan while the session is already in inspection', async () => {
    const first = await seedCandidate('multi-first');
    const secondCandidateId = await seedAdditionalCandidate(
      first,
      'multi-second',
      'WATER_SYSTEM_CHANGE',
      2
    );
    await startInspection(first.userId, first.candidateId);
    const next = await startInspection(first.userId, secondCandidateId);
    expect(next.plan.inspectionCode).toBe('WATER_SYSTEM_REVIEW');
    const plans = await pool.query(
      `SELECT count(*)::int AS count FROM inspection_plan
        WHERE business_id = $1`,
      [first.businessId]
    );
    expect(plans.rows[0].count).toBe(2);
  });

  it('returns inspectable and resumable state without exposing a physical CTA for data quality', async () => {
    const physical = await seedCandidate('availability-physical');
    const dataQualityCandidateId = await seedAdditionalCandidate(
      physical,
      'availability-data',
      'INFORMATION_COMPLETENESS',
      2
    );
    const started = await startInspection(
      physical.userId,
      physical.candidateId
    );
    const candidates = [
      {
        id: physical.candidateId,
        candidateType: 'APPLIANCE',
        candidateCode: 'NEW_ELECTRICAL_APPLIANCE',
        candidateVersion: 1,
        ruleVersion: 'DIAG_CANDIDATE_RULE_V1',
      },
      {
        id: dataQualityCandidateId,
        candidateType: 'DATA_QUALITY',
        candidateCode: 'INFORMATION_COMPLETENESS',
        candidateVersion: 1,
        ruleVersion: 'DIAG_CANDIDATE_RULE_V1',
      },
    ] as never;
    const availability = await getCandidateInspectionAvailability(
      physical.userId,
      physical.sessionId,
      candidates
    );
    expect(availability?.[0]).toMatchObject({
      inspectable: true,
      planId: started.plan.id,
      planStatus: 'IN_PROGRESS',
    });
    expect(availability?.[1]).toMatchObject({
      inspectable: false,
      planId: null,
    });
  });

  it('enforces database status, safety, ordering, uniqueness, FK, and note limits', async () => {
    const tenant = await seedCandidate('db-constraints');
    const started = await startInspection(tenant.userId, tenant.candidateId);
    await expect(
      pool.query(
        `UPDATE inspection_item SET note = $2 WHERE id = $1`,
        [started.plan.items[0].id, 'x'.repeat(1001)]
      )
    ).rejects.toThrow();
    await expect(
      pool.query(
        `UPDATE inspection_item SET safety_level = 'UNSAFE' WHERE id = $1`,
        [started.plan.items[0].id]
      )
    ).rejects.toThrow();
    await expect(
      pool.query(
        `INSERT INTO inspection_item (
           id, plan_id, item_code, item_version, instruction_snapshot,
           safety_level, result_options_json, sort_order
         ) VALUES ($1, $2, 'DUPLICATE_ORDER', 1, 'Observe safely',
                   'SAFE_OBSERVATION', '["UNKNOWN"]'::jsonb, 1)`,
        [crypto.randomUUID(), started.plan.id]
      )
    ).rejects.toThrow();
    await expect(
      pool.query(
        `INSERT INTO inspection_plan (
           id, business_id, diagnostic_candidate_id, inspection_code,
           inspection_version, rule_version, title
         ) VALUES ($1, $2, 'missing-candidate', 'TEST', 1, 'TEST_RULE', 'Test')`,
        [crypto.randomUUID(), tenant.businessId]
      )
    ).rejects.toThrow();
  });
});
