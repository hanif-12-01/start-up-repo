import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { getPool } from '../../src/server/db/client';
import {
  DiagnosticCandidateGenerationNotReadyError,
  DiagnosticSessionNotFoundError,
  answerDiagnosticQuestion,
  generateCandidatesForDiagnosticSession,
  getDiagnosticCandidateResults,
  getDiagnosticQuestionnaire,
  startDiagnosticSession,
} from '../../src/server/services/diagnostic.service';
import {
  applyAllForwardMigrations,
  readRollbackMigration,
} from '../helpers/migrations';

const { Pool } = pg;
const dbUrl =
  process.env.DATABASE_URL || 'postgresql://postgres:testpass@127.0.0.1:5439/wattwise_test';

type AnswerCode = 'YES' | 'NO' | 'UNKNOWN' | 'NOT_APPLICABLE';

describe('IT-DIAG-03 PostgreSQL integration', () => {
  let pool: pg.Pool;

  async function seedTenant(
    suffix: string,
    options: {
      previousKwh?: string | null;
      currentKwh?: string | null;
      segment?: 'KOS' | 'FNB';
    } = {}
  ) {
    const userId = `candidate-user-${suffix}`;
    const businessId = `candidate-business-${suffix}`;
    const segment = options.segment ?? 'KOS';
    await pool.query(
      `INSERT INTO "user" (id, name, email, email_verified)
       VALUES ($1, $2, $3, false)`,
      [userId, `Candidate ${suffix}`, `candidate-${suffix}@example.test`]
    );
    await pool.query(
      `INSERT INTO business (
         id, user_id, name, business_type, segment, electrical_system
       ) VALUES ($1, $2, $3, $4, $5, 'ALL_IN')`,
      [
        businessId,
        userId,
        `Usaha ${suffix}`,
        segment === 'KOS' ? 'KOS_PROPERTY' : 'FNB',
        segment,
      ]
    );

    const previousBillId = `candidate-bill-${suffix}-previous`;
    const currentBillId = `candidate-bill-${suffix}-current`;
    await pool.query(
      `INSERT INTO electricity_bill (
         id, business_id, period_start, period_end, total_amount_rupiah,
         kwh, tariff_rupiah_per_kwh
       ) VALUES
         ($1, $3, '2026-01-01', '2026-01-31', 1000000, $4, 1500),
         ($2, $3, '2026-02-01', '2026-02-28', 1600000, $5, 1600)`,
      [
        previousBillId,
        currentBillId,
        businessId,
        options.previousKwh === undefined ? '310.000' : options.previousKwh,
        options.currentKwh === undefined ? '560.000' : options.currentKwh,
      ]
    );
    return { userId, businessId, previousBillId, currentBillId };
  }

  async function completeQuestionnaire(
    userId: string,
    currentBillId: string,
    answerFor: (questionCode: string) => AnswerCode
  ) {
    let view = await startDiagnosticSession(userId, currentBillId);
    while (view.nextQuestion) {
      view = await answerDiagnosticQuestion(userId, {
        sessionId: view.session.id,
        questionCode: view.nextQuestion.code,
        questionVersion: view.nextQuestion.version,
        answerCode: answerFor(view.nextQuestion.code),
      });
    }
    expect(view.completed).toBe(true);
    return view;
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 5000, max: 10 });
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
    await pool.query(readRollbackMigration('0006_energy_action_plans_rollback.sql'));
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

  it('creates the candidate schema with required constraints, FK, jsonb, and index', async () => {
    const columns = await pool.query(
      `SELECT column_name, data_type
         FROM information_schema.columns
        WHERE table_name = 'diagnostic_candidate'`
    );
    const byName = Object.fromEntries(
      columns.rows.map((row) => [row.column_name, row.data_type])
    );
    expect(byName.supporting_factors_json).toBe('jsonb');
    expect(byName.contradicting_factors_json).toBe('jsonb');
    expect(byName.internal_score).toBe('integer');

    const constraints = await pool.query(
      `SELECT constraint_name
         FROM information_schema.table_constraints
        WHERE table_name = 'diagnostic_candidate'`
    );
    const names = constraints.rows.map((row) => row.constraint_name);
    expect(names).toEqual(
      expect.arrayContaining([
        'diagnostic_candidate_session_code_version_rule_unique',
        'diagnostic_candidate_session_rule_rank_unique',
        'diagnostic_candidate_session_id_fk',
        'diagnostic_candidate_rank_check',
        'diagnostic_candidate_score_check',
        'diagnostic_candidate_type_check',
        'diagnostic_candidate_evidence_check',
      ])
    );

    const index = await pool.query(
      `SELECT indexname
         FROM pg_indexes
        WHERE tablename = 'diagnostic_candidate'
          AND indexname = 'diagnostic_candidate_session_rank_idx'`
    );
    expect(index.rowCount).toBe(1);
  });

  it('rejects DRAFT and incomplete sessions before writing candidates', async () => {
    const tenant = await seedTenant('incomplete');
    const draft = await startDiagnosticSession(tenant.userId, tenant.currentBillId);
    await expect(
      generateCandidatesForDiagnosticSession(tenant.userId, draft.session.id)
    ).rejects.toBeInstanceOf(DiagnosticCandidateGenerationNotReadyError);

    await answerDiagnosticQuestion(tenant.userId, {
      sessionId: draft.session.id,
      questionCode: draft.nextQuestion!.code,
      questionVersion: draft.nextQuestion!.version,
      answerCode: 'YES',
    });
    await expect(
      generateCandidatesForDiagnosticSession(tenant.userId, draft.session.id)
    ).rejects.toBeInstanceOf(DiagnosticCandidateGenerationNotReadyError);
    const rows = await pool.query(
      'SELECT count(*)::int AS count FROM diagnostic_candidate WHERE diagnostic_session_id = $1',
      [draft.session.id]
    );
    expect(rows.rows[0].count).toBe(0);
  });

  it('persists a ranked set atomically and transitions COLLECTING_CONTEXT to ANALYZED', async () => {
    const tenant = await seedTenant('ranked');
    const completed = await completeQuestionnaire(
      tenant.userId,
      tenant.currentBillId,
      () => 'YES'
    );
    expect(completed.session.status).toBe('COLLECTING_CONTEXT');

    const result = await generateCandidatesForDiagnosticSession(
      tenant.userId,
      completed.session.id
    );
    expect(result.session.status).toBe('ANALYZED');
    expect(result.candidates).toHaveLength(3);
    expect(result.candidates.map((candidate) => candidate.rank)).toEqual([1, 2, 3]);
    expect(
      result.candidates.every(
        (candidate) =>
          candidate.ruleVersion === 'DIAG_CANDIDATE_RULE_V1' &&
          candidate.candidateVersion === 1 &&
          candidate.supportingFactors.length > 0
      )
    ).toBe(true);

    const stored = await pool.query(
      `SELECT status,
              (SELECT count(*)::int FROM diagnostic_candidate dc
                WHERE dc.diagnostic_session_id = ds.id) AS candidate_count
         FROM diagnostic_session ds
        WHERE id = $1`,
      [completed.session.id]
    );
    expect(stored.rows[0]).toMatchObject({
      status: 'ANALYZED',
      candidate_count: 3,
    });
  });

  it('makes repeated and concurrent generation idempotent without partial rows', async () => {
    const tenant = await seedTenant('concurrent');
    const completed = await completeQuestionnaire(
      tenant.userId,
      tenant.currentBillId,
      () => 'YES'
    );
    const concurrent = await Promise.all([
      generateCandidatesForDiagnosticSession(tenant.userId, completed.session.id),
      generateCandidatesForDiagnosticSession(tenant.userId, completed.session.id),
    ]);
    expect(
      concurrent[0].candidates.map((candidate) => [
        candidate.candidateCode,
        candidate.rank,
      ])
    ).toEqual(
      concurrent[1].candidates.map((candidate) => [
        candidate.candidateCode,
        candidate.rank,
      ])
    );

    const retry = await generateCandidatesForDiagnosticSession(
      tenant.userId,
      completed.session.id
    );
    expect(retry.candidates.map((candidate) => candidate.id)).toEqual(
      concurrent[0].candidates.map((candidate) => candidate.id)
    );
    const stored = await pool.query(
      `SELECT count(*)::int AS total,
              count(DISTINCT candidate_code)::int AS unique_codes,
              min(rank)::int AS minimum_rank,
              max(rank)::int AS maximum_rank
         FROM diagnostic_candidate
        WHERE diagnostic_session_id = $1`,
      [completed.session.id]
    );
    expect(stored.rows[0]).toMatchObject({
      total: 3,
      unique_codes: 3,
      minimum_rank: 1,
      maximum_rank: 3,
    });
  });

  it('returns safe DATA_QUALITY for all UNKNOWN and an honest zero state for all NO', async () => {
    const unknownTenant = await seedTenant('unknown');
    const unknown = await completeQuestionnaire(
      unknownTenant.userId,
      unknownTenant.currentBillId,
      () => 'UNKNOWN'
    );
    const unknownResult = await generateCandidatesForDiagnosticSession(
      unknownTenant.userId,
      unknown.session.id
    );
    expect(unknownResult.candidates).toHaveLength(1);
    expect(unknownResult.candidates[0].candidateType).toBe('DATA_QUALITY');
    expect(unknownResult.candidates[0].explanation).not.toMatch(
      /penyebab pasti|probabilitas|rekomendasi/i
    );

    const noTenant = await seedTenant('all-no');
    const allNo = await completeQuestionnaire(
      noTenant.userId,
      noTenant.currentBillId,
      () => 'NO'
    );
    const noResult = await generateCandidatesForDiagnosticSession(
      noTenant.userId,
      allNo.session.id
    );
    expect(noResult.candidates).toEqual([]);
    expect(noResult.session.status).toBe('ANALYZED');
    const retry = await getDiagnosticCandidateResults(
      noTenant.userId,
      allNo.session.id
    );
    expect(retry?.candidates).toEqual([]);
  });

  it('uses missing kWh only for neutral data quality and never as usage evidence', async () => {
    const tenant = await seedTenant('missing-kwh', {
      previousKwh: null,
      currentKwh: null,
    });
    const completed = await completeQuestionnaire(
      tenant.userId,
      tenant.currentBillId,
      (questionCode) =>
        questionCode === 'NEW_ELECTRICAL_APPLIANCE' ? 'YES' : 'NO'
    );
    const result = await generateCandidatesForDiagnosticSession(
      tenant.userId,
      completed.session.id
    );
    const appliance = result.candidates.find(
      (candidate) => candidate.candidateCode === 'NEW_ELECTRICAL_APPLIANCE'
    );
    expect(
      appliance?.supportingFactors.some(
        (factor) => factor.factorCode === 'DAILY_KWH_INCREASED'
      )
    ).toBe(false);
    expect(
      result.candidates.some((candidate) => candidate.candidateType === 'DATA_QUALITY')
    ).toBe(true);
  });

  it('rolls back generation failure and keeps the session COLLECTING_CONTEXT', async () => {
    const tenant = await seedTenant('failure');
    const completed = await completeQuestionnaire(
      tenant.userId,
      tenant.currentBillId,
      () => 'NO'
    );
    await pool.query(
      `INSERT INTO diagnostic_answer (
         id, diagnostic_session_id, question_code, question_version, answer_code
       ) VALUES ($1, $2, 'UNRECOGNIZED_CONTEXT', 1, 'YES')`,
      [crypto.randomUUID(), completed.session.id]
    );

    await expect(
      generateCandidatesForDiagnosticSession(tenant.userId, completed.session.id)
    ).rejects.toBeInstanceOf(DiagnosticCandidateGenerationNotReadyError);
    const after = await pool.query(
      `SELECT status,
              (SELECT count(*)::int FROM diagnostic_candidate
                WHERE diagnostic_session_id = $1) AS candidate_count
         FROM diagnostic_session
        WHERE id = $1`,
      [completed.session.id]
    );
    expect(after.rows[0].status).toBe('COLLECTING_CONTEXT');
    expect(Number(after.rows[0].candidate_count)).toBe(0);
  });

  it('enforces tenant isolation for generation and result reads', async () => {
    const tenantA = await seedTenant('tenant-a');
    const tenantB = await seedTenant('tenant-b');
    const completed = await completeQuestionnaire(
      tenantA.userId,
      tenantA.currentBillId,
      () => 'YES'
    );

    await expect(
      generateCandidatesForDiagnosticSession(tenantB.userId, completed.session.id)
    ).rejects.toBeInstanceOf(DiagnosticSessionNotFoundError);
    expect(
      await getDiagnosticCandidateResults(tenantB.userId, completed.session.id)
    ).toBeNull();

    await generateCandidatesForDiagnosticSession(
      tenantA.userId,
      completed.session.id
    );
    expect(
      await getDiagnosticCandidateResults(tenantB.userId, completed.session.id)
    ).toBeNull();
    expect(
      (await getDiagnosticCandidateResults(tenantA.userId, completed.session.id))
        ?.candidates.length
    ).toBeGreaterThan(0);
  });

  it('enforces candidate FK, uniqueness, rank, score, type, and evidence constraints', async () => {
    const tenant = await seedTenant('constraints');
    const completed = await completeQuestionnaire(
      tenant.userId,
      tenant.currentBillId,
      () => 'YES'
    );
    const generated = await generateCandidatesForDiagnosticSession(
      tenant.userId,
      completed.session.id
    );
    const first = generated.candidates[0];
    const values = [
      crypto.randomUUID(),
      completed.session.id,
      first.candidateCode,
      first.candidateVersion,
      first.candidateType,
      first.ruleVersion,
      first.title,
      1,
      50,
      'MODERATE',
      'Safe explanation',
      '[]',
      '[]',
    ];
    await expect(
      pool.query(
        `INSERT INTO diagnostic_candidate (
           id, diagnostic_session_id, candidate_code, candidate_version,
           candidate_type, rule_version, title, rank, internal_score,
           evidence_level, explanation, supporting_factors_json,
           contradicting_factors_json
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb)`,
        values
      )
    ).rejects.toThrow();

    for (const [label, overrides] of [
      ['foreign key', { sessionId: 'missing-session', code: 'FK_TEST', rank: 1 }],
      ['rank', { sessionId: completed.session.id, code: 'RANK_TEST', rank: 4 }],
      [
        'score',
        { sessionId: completed.session.id, code: 'SCORE_TEST', rank: 3, score: 101 },
      ],
      [
        'type',
        { sessionId: completed.session.id, code: 'TYPE_TEST', rank: 3, type: 'INVENTED' },
      ],
      [
        'evidence',
        {
          sessionId: completed.session.id,
          code: 'EVIDENCE_TEST',
          rank: 3,
          evidence: 'CERTAIN',
        },
      ],
    ] as const) {
      await expect(
        pool.query(
          `INSERT INTO diagnostic_candidate (
             id, diagnostic_session_id, candidate_code, candidate_version,
             candidate_type, rule_version, title, rank, internal_score,
             evidence_level, explanation, supporting_factors_json,
             contradicting_factors_json
           ) VALUES ($1,$2,$3,1,$4,'CONSTRAINT_TEST','Test',$5,$6,$7,
                     'Safe explanation','[]'::jsonb,'[]'::jsonb)`,
          [
            crypto.randomUUID(),
            overrides.sessionId,
            overrides.code,
            'type' in overrides ? overrides.type : 'OTHER',
            overrides.rank,
            'score' in overrides ? overrides.score : 50,
            'evidence' in overrides ? overrides.evidence : 'LIMITED',
          ]
        ),
        label
      ).rejects.toThrow();
    }
  });

  it('does not create a Kos candidate session for a non-Kos business', async () => {
    const tenant = await seedTenant('fnb', { segment: 'FNB' });
    await expect(
      startDiagnosticSession(tenant.userId, tenant.currentBillId)
    ).rejects.toThrow('Questionnaire untuk segmen ini belum tersedia.');
    const count = await pool.query(
      'SELECT count(*)::int AS count FROM diagnostic_session WHERE business_id = $1',
      [tenant.businessId]
    );
    expect(count.rows[0].count).toBe(0);
  });

  it('reads stored factors and candidate versions through the owned result path', async () => {
    const tenant = await seedTenant('read-path');
    const completed = await completeQuestionnaire(
      tenant.userId,
      tenant.currentBillId,
      (questionCode) =>
        questionCode === 'WATER_PUMP_MORE_FREQUENT'
          ? 'YES'
          : questionCode === 'WATER_FLOW_LEAK_ISSUE'
            ? 'NO'
            : 'NO'
    );
    await generateCandidatesForDiagnosticSession(
      tenant.userId,
      completed.session.id
    );
    const result = await getDiagnosticCandidateResults(
      tenant.userId,
      completed.session.id
    );
    expect(result?.candidates[0]).toMatchObject({
      candidateCode: 'WATER_SYSTEM_CHANGE',
      candidateVersion: 1,
      ruleVersion: 'DIAG_CANDIDATE_RULE_V1',
      evidenceLevel: 'LIMITED',
    });
    expect(result?.candidates[0].supportingFactors.length).toBeGreaterThan(0);
    expect(result?.candidates[0].contradictingFactors.length).toBeGreaterThan(0);
    expect(await getDiagnosticQuestionnaire(tenant.userId, completed.session.id)).not.toBeNull();
  });
});
