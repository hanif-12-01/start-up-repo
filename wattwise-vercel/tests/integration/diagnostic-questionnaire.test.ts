import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { getPool } from '../../src/server/db/client';
import {
  DiagnosticAnswerImmutableError,
  DiagnosticBillNotFoundError,
  DiagnosticComparisonRequiredError,
  DiagnosticQuestionMismatchError,
  DiagnosticSessionNotFoundError,
  answerDiagnosticQuestion,
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

describe('IT-DIAG-02 PostgreSQL integration', () => {
  let pool: pg.Pool;

  async function seedTenant(
    suffix: string,
    segment: 'KOS' | 'FNB' = 'KOS',
    billCount = 2
  ) {
    const userId = `diag-user-${suffix}`;
    const businessId = `diag-business-${suffix}`;
    await pool.query(
      `INSERT INTO "user" (id, name, email, email_verified)
       VALUES ($1, $2, $3, false)`,
      [userId, `Diagnostic ${suffix}`, `diagnostic-${suffix}@example.test`]
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

    const billIds: string[] = [];
    const periods = [
      ['2026-01-01', '2026-01-31', '1000000'],
      ['2026-02-01', '2026-02-28', '1500000'],
      ['2026-03-01', '2026-03-31', '1750000'],
    ];
    for (let index = 0; index < billCount; index += 1) {
      const billId = `diag-bill-${suffix}-${index + 1}`;
      const [start, end, amount] = periods[index];
      await pool.query(
        `INSERT INTO electricity_bill (
           id, business_id, period_start, period_end, total_amount_rupiah
         ) VALUES ($1, $2, $3::date, $4::date, $5)`,
        [billId, businessId, start, end, amount]
      );
      billIds.push(billId);
    }
    return { userId, businessId, billIds };
  }

  async function answerCurrent(
    userId: string,
    sessionId: string,
    answerCode: 'YES' | 'NO' | 'UNKNOWN' | 'NOT_APPLICABLE'
  ) {
    const view = await getDiagnosticQuestionnaire(userId, sessionId);
    if (!view?.nextQuestion) throw new Error('Expected an active question');
    return answerDiagnosticQuestion(userId, {
      sessionId,
      questionCode: view.nextQuestion.code,
      questionVersion: view.nextQuestion.version,
      answerCode,
    });
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 5000, max: 8 });
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

  it('creates a DRAFT session with bill, comparison, segment, and rule snapshots', async () => {
    const tenant = await seedTenant('snapshot');
    const view = await startDiagnosticSession(tenant.userId, tenant.billIds[1]);
    expect(view.session.status).toBe('DRAFT');
    expect(view.session.currentBill.id).toBe(tenant.billIds[1]);
    expect(view.session.comparisonBill.id).toBe(tenant.billIds[0]);
    expect(view.session.segmentCode).toBe('KOS');
    expect(view.session.ruleVersion).toBe('KOS_CONTEXT_V1');
    expect(view.session.questionnaireCompletedAt).toBeNull();
    expect(view.nextQuestion?.code).toBe('ADMIN_RECORDING_CHANGED');
  });

  it('returns one session for concurrent and repeated starts', async () => {
    const tenant = await seedTenant('concurrent-start');
    const results = await Promise.all(
      Array.from({ length: 6 }, () =>
        startDiagnosticSession(tenant.userId, tenant.billIds[1])
      )
    );
    expect(new Set(results.map((result) => result.session.id)).size).toBe(1);
    const count = await pool.query(
      'SELECT count(*)::int AS count FROM diagnostic_session WHERE business_id = $1',
      [tenant.businessId]
    );
    expect(count.rows[0].count).toBe(1);
  });

  it('requires a comparison and never falls back from a non-Kos segment', async () => {
    const oneBill = await seedTenant('one-bill', 'KOS', 1);
    await expect(
      startDiagnosticSession(oneBill.userId, oneBill.billIds[0])
    ).rejects.toBeInstanceOf(DiagnosticComparisonRequiredError);

    const fnb = await seedTenant('fnb', 'FNB');
    await expect(startDiagnosticSession(fnb.userId, fnb.billIds[1])).rejects.toThrow(
      'Questionnaire untuk segmen ini belum tersedia.'
    );
    const count = await pool.query('SELECT count(*)::int AS count FROM diagnostic_session');
    expect(count.rows[0].count).toBe(0);
  });

  it('resumes from the next unanswered question', async () => {
    const tenant = await seedTenant('resume');
    const started = await startDiagnosticSession(tenant.userId, tenant.billIds[1]);
    await answerCurrent(tenant.userId, started.session.id, 'NO');
    const resumed = await startDiagnosticSession(tenant.userId, tenant.billIds[1]);
    expect(resumed.session.id).toBe(started.session.id);
    expect(resumed.answeredCount).toBe(1);
    expect(resumed.nextQuestion?.code).toBe('ADMIN_TARIFF_POWER_CHANGED');
  });

  it('skips the water-flow question and completes after six NO answers', async () => {
    const tenant = await seedTenant('skip');
    let view = await startDiagnosticSession(tenant.userId, tenant.billIds[1]);
    for (let index = 0; index < 6; index += 1) {
      view = await answerCurrent(tenant.userId, view.session.id, 'NO');
    }
    expect(view.completed).toBe(true);
    expect(view.answeredCount).toBe(6);
    expect(view.session.status).toBe('COLLECTING_CONTEXT');
    expect(view.session.questionnaireCompletedAt).not.toBeNull();
    const rows = await pool.query(
      'SELECT question_code FROM diagnostic_answer WHERE diagnostic_session_id = $1',
      [view.session.id]
    );
    expect(rows.rows.map((row) => row.question_code)).not.toContain(
      'WATER_FLOW_LEAK_ISSUE'
    );
  });

  it('uses the seven-question path for pump YES and for all UNKNOWN', async () => {
    const pumpYes = await seedTenant('pump-yes');
    let yesView = await startDiagnosticSession(pumpYes.userId, pumpYes.billIds[1]);
    for (let index = 0; index < 5; index += 1) {
      yesView = await answerCurrent(pumpYes.userId, yesView.session.id, 'NO');
    }
    yesView = await answerCurrent(pumpYes.userId, yesView.session.id, 'YES');
    expect(yesView.nextQuestion?.code).toBe('WATER_FLOW_LEAK_ISSUE');
    yesView = await answerCurrent(pumpYes.userId, yesView.session.id, 'NO');
    expect(yesView.completed).toBe(true);
    expect(yesView.answeredCount).toBe(7);

    const unknown = await seedTenant('all-unknown');
    let unknownView = await startDiagnosticSession(unknown.userId, unknown.billIds[1]);
    for (let index = 0; index < 7; index += 1) {
      unknownView = await answerCurrent(unknown.userId, unknownView.session.id, 'UNKNOWN');
    }
    expect(unknownView.completed).toBe(true);
    expect(unknownView.answeredCount).toBe(7);
  });

  it('makes same-answer retries idempotent and rejects back-editing', async () => {
    const tenant = await seedTenant('idempotent-answer');
    const started = await startDiagnosticSession(tenant.userId, tenant.billIds[1]);
    const question = started.nextQuestion!;
    const input = {
      sessionId: started.session.id,
      questionCode: question.code,
      questionVersion: question.version,
      answerCode: 'YES' as const,
    };
    await answerDiagnosticQuestion(tenant.userId, input);
    const retry = await answerDiagnosticQuestion(tenant.userId, input);
    expect(retry.answeredCount).toBe(1);
    await expect(
      answerDiagnosticQuestion(tenant.userId, { ...input, answerCode: 'NO' })
    ).rejects.toBeInstanceOf(DiagnosticAnswerImmutableError);
    const count = await pool.query(
      'SELECT count(*)::int AS count FROM diagnostic_answer WHERE diagnostic_session_id = $1',
      [started.session.id]
    );
    expect(count.rows[0].count).toBe(1);
  });

  it('rejects out-of-order questions', async () => {
    const tenant = await seedTenant('out-of-order');
    const started = await startDiagnosticSession(tenant.userId, tenant.billIds[1]);
    await expect(
      answerDiagnosticQuestion(tenant.userId, {
        sessionId: started.session.id,
        questionCode: 'OCCUPANCY_INCREASED',
        questionVersion: 1,
        answerCode: 'YES',
      })
    ).rejects.toBeInstanceOf(DiagnosticQuestionMismatchError);
  });

  it('enforces tenant isolation for reads and writes', async () => {
    const tenantA = await seedTenant('tenant-a');
    const tenantB = await seedTenant('tenant-b');
    await expect(
      startDiagnosticSession(tenantB.userId, tenantA.billIds[1])
    ).rejects.toBeInstanceOf(DiagnosticBillNotFoundError);
    const started = await startDiagnosticSession(tenantA.userId, tenantA.billIds[1]);
    expect(await getDiagnosticQuestionnaire(tenantB.userId, started.session.id)).toBeNull();
    await expect(
      answerDiagnosticQuestion(tenantB.userId, {
        sessionId: started.session.id,
        questionCode: 'ADMIN_RECORDING_CHANGED',
        questionVersion: 1,
        answerCode: 'YES',
      })
    ).rejects.toBeInstanceOf(DiagnosticSessionNotFoundError);
  });

  it('allows canonical lifecycle statuses and rejects invented statuses', async () => {
    const tenant = await seedTenant('status');
    const started = await startDiagnosticSession(tenant.userId, tenant.billIds[1]);
    for (const status of [
      'DRAFT',
      'COLLECTING_CONTEXT',
      'ANALYZED',
      'INSPECTION_IN_PROGRESS',
      'CLOSED',
    ]) {
      await expect(
        pool.query('UPDATE diagnostic_session SET status = $1 WHERE id = $2', [
          status,
          started.session.id,
        ])
      ).resolves.toBeTruthy();
    }
    await expect(
      pool.query(`UPDATE diagnostic_session SET status = 'COMPLETED' WHERE id = $1`, [
        started.session.id,
      ])
    ).rejects.toThrow();
  });

  it('enforces answer uniqueness and answer-code constraints at DB level', async () => {
    const tenant = await seedTenant('constraints');
    const started = await startDiagnosticSession(tenant.userId, tenant.billIds[1]);
    await pool.query(
      `INSERT INTO diagnostic_answer (
         id, diagnostic_session_id, question_code, question_version, answer_code
       ) VALUES ('answer-1', $1, 'ADMIN_RECORDING_CHANGED', 1, 'YES')`,
      [started.session.id]
    );
    await expect(
      pool.query(
        `INSERT INTO diagnostic_answer (
           id, diagnostic_session_id, question_code, question_version, answer_code
         ) VALUES ('answer-2', $1, 'ADMIN_RECORDING_CHANGED', 1, 'NO')`,
        [started.session.id]
      )
    ).rejects.toThrow();
    await expect(
      pool.query(
        `INSERT INTO diagnostic_answer (
           id, diagnostic_session_id, question_code, question_version, answer_code
         ) VALUES ('answer-3', $1, 'SPECIAL_ACTIVITY', 1, 'MAYBE')`,
        [started.session.id]
      )
    ).rejects.toThrow();
  });
});
