import type { PoolClient } from 'pg';
import { getPool } from '@/server/db/client';
import type {
  DiagnosticAnswerCode,
  DiagnosticStatus,
} from '@/server/db/schema/diagnostics';
import type { BusinessSegment } from '@/server/db/schema/journey';

export interface DiagnosticBillSnapshot {
  id: string;
  periodStart: string;
  periodEnd: string;
  totalAmountRupiah: bigint;
  kwh: string | null;
  tariffRupiahPerKwh: string | null;
}

export interface DiagnosticAnswerRecord {
  id: string;
  diagnosticSessionId: string;
  questionCode: string;
  questionVersion: number;
  answerCode: DiagnosticAnswerCode;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiagnosticSessionContext {
  id: string;
  businessId: string;
  businessName: string;
  segmentCode: BusinessSegment;
  status: DiagnosticStatus;
  ruleVersion: string;
  questionnaireCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  currentBill: DiagnosticBillSnapshot;
  comparisonBill: DiagnosticBillSnapshot;
  answers: DiagnosticAnswerRecord[];
}

interface OwnedBillRow {
  id: string;
  business_id: string;
  business_name: string;
  segment: BusinessSegment;
  period_start: string | Date;
  period_end: string | Date;
  total_amount_rupiah: string;
  kwh: string | null;
  tariff_rupiah_per_kwh: string | null;
}

interface SessionRow {
  id: string;
  business_id: string;
  business_name: string;
  segment_code: BusinessSegment;
  status: DiagnosticStatus;
  rule_version: string;
  questionnaire_completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
  current_bill_id: string;
  current_period_start: string | Date;
  current_period_end: string | Date;
  current_total_amount_rupiah: string;
  current_kwh: string | null;
  current_tariff_rupiah_per_kwh: string | null;
  comparison_bill_id: string;
  comparison_period_start: string | Date;
  comparison_period_end: string | Date;
  comparison_total_amount_rupiah: string;
  comparison_kwh: string | null;
  comparison_tariff_rupiah_per_kwh: string | null;
}

interface AnswerRow {
  id: string;
  diagnostic_session_id: string;
  question_code: string;
  question_version: number;
  answer_code: DiagnosticAnswerCode;
  created_at: Date;
  updated_at: Date;
}

export type StartDiagnosticPersistenceResult =
  | { kind: 'BILL_NOT_FOUND' }
  | { kind: 'UNSUPPORTED_SEGMENT'; segment: BusinessSegment }
  | { kind: 'COMPARISON_REQUIRED' }
  | { kind: 'READY'; session: DiagnosticSessionContext; created: boolean };

export type DiagnosticEntryPersistence =
  | { kind: 'BILL_NOT_FOUND' }
  | { kind: 'UNSUPPORTED_SEGMENT'; segment: BusinessSegment }
  | { kind: 'COMPARISON_REQUIRED' }
  | { kind: 'READY'; sessionId: string | null };

function dateString(value: string | Date) {
  if (typeof value === 'string') return value;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mapAnswer(row: AnswerRow): DiagnosticAnswerRecord {
  return {
    id: row.id,
    diagnosticSessionId: row.diagnostic_session_id,
    questionCode: row.question_code,
    questionVersion: row.question_version,
    answerCode: row.answer_code,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSession(row: SessionRow, answers: DiagnosticAnswerRecord[]): DiagnosticSessionContext {
  return {
    id: row.id,
    businessId: row.business_id,
    businessName: row.business_name,
    segmentCode: row.segment_code,
    status: row.status,
    ruleVersion: row.rule_version,
    questionnaireCompletedAt: row.questionnaire_completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    currentBill: {
      id: row.current_bill_id,
      periodStart: dateString(row.current_period_start),
      periodEnd: dateString(row.current_period_end),
      totalAmountRupiah: BigInt(row.current_total_amount_rupiah),
      kwh: row.current_kwh,
      tariffRupiahPerKwh: row.current_tariff_rupiah_per_kwh,
    },
    comparisonBill: {
      id: row.comparison_bill_id,
      periodStart: dateString(row.comparison_period_start),
      periodEnd: dateString(row.comparison_period_end),
      totalAmountRupiah: BigInt(row.comparison_total_amount_rupiah),
      kwh: row.comparison_kwh,
      tariffRupiahPerKwh: row.comparison_tariff_rupiah_per_kwh,
    },
    answers,
  };
}

const SESSION_SELECT = `
  SELECT ds.id, ds.business_id, b.name AS business_name, ds.segment_code, ds.status,
         ds.rule_version, ds.questionnaire_completed_at, ds.created_at, ds.updated_at,
         current_bill.id AS current_bill_id,
         current_bill.period_start AS current_period_start,
         current_bill.period_end AS current_period_end,
         current_bill.total_amount_rupiah AS current_total_amount_rupiah,
         current_bill.kwh AS current_kwh,
         current_bill.tariff_rupiah_per_kwh AS current_tariff_rupiah_per_kwh,
         comparison_bill.id AS comparison_bill_id,
         comparison_bill.period_start AS comparison_period_start,
         comparison_bill.period_end AS comparison_period_end,
         comparison_bill.total_amount_rupiah AS comparison_total_amount_rupiah,
         comparison_bill.kwh AS comparison_kwh,
         comparison_bill.tariff_rupiah_per_kwh AS comparison_tariff_rupiah_per_kwh
    FROM diagnostic_session ds
    JOIN business b ON b.id = ds.business_id
    JOIN electricity_bill current_bill ON current_bill.id = ds.electricity_bill_id
    JOIN electricity_bill comparison_bill ON comparison_bill.id = ds.comparison_bill_id
`;

async function findOwnedBill(
  client: PoolClient,
  userId: string,
  electricityBillId: string
): Promise<OwnedBillRow | null> {
  const result = await client.query<OwnedBillRow>(
    `SELECT eb.id, eb.business_id, b.name AS business_name, b.segment,
            eb.period_start, eb.period_end, eb.total_amount_rupiah,
            eb.kwh, eb.tariff_rupiah_per_kwh
       FROM electricity_bill eb
       JOIN business b ON b.id = eb.business_id
      WHERE eb.id = $1 AND b.user_id = $2 AND b.is_active = true
      LIMIT 1`,
    [electricityBillId, userId]
  );
  return result.rows[0] ?? null;
}

async function findPreviousBill(
  client: PoolClient,
  current: OwnedBillRow
): Promise<OwnedBillRow | null> {
  const result = await client.query<OwnedBillRow>(
    `SELECT eb.id, eb.business_id, $2::text AS business_name, $3::text AS segment,
            eb.period_start, eb.period_end, eb.total_amount_rupiah,
            eb.kwh, eb.tariff_rupiah_per_kwh
       FROM electricity_bill eb
      WHERE eb.business_id = $1
        AND eb.period_end < $4::date
      ORDER BY eb.period_end DESC, eb.period_start DESC, eb.id DESC
      LIMIT 1`,
    [current.business_id, current.business_name, current.segment, dateString(current.period_start)]
  );
  return result.rows[0] ?? null;
}

async function loadAnswers(
  client: PoolClient,
  sessionId: string
): Promise<DiagnosticAnswerRecord[]> {
  const result = await client.query<AnswerRow>(
    `SELECT id, diagnostic_session_id, question_code, question_version, answer_code,
            created_at, updated_at
       FROM diagnostic_answer
      WHERE diagnostic_session_id = $1
      ORDER BY created_at ASC, id ASC`,
    [sessionId]
  );
  return result.rows.map(mapAnswer);
}

async function loadSessionByUniqueKey(
  client: PoolClient,
  businessId: string,
  billId: string,
  ruleVersion: string
) {
  const result = await client.query<SessionRow>(
    `${SESSION_SELECT}
      WHERE ds.business_id = $1
        AND ds.electricity_bill_id = $2
        AND ds.rule_version = $3
      LIMIT 1`,
    [businessId, billId, ruleVersion]
  );
  if (!result.rows[0]) return null;
  return mapSession(result.rows[0], await loadAnswers(client, result.rows[0].id));
}

export async function createOrGetDiagnosticSession(
  userId: string,
  electricityBillId: string,
  ruleVersion: string
): Promise<StartDiagnosticPersistenceResult> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const current = await findOwnedBill(client, userId, electricityBillId);
    if (!current) {
      await client.query('ROLLBACK');
      return { kind: 'BILL_NOT_FOUND' };
    }
    if (current.segment !== 'KOS') {
      await client.query('ROLLBACK');
      return { kind: 'UNSUPPORTED_SEGMENT', segment: current.segment };
    }

    // Use the same per-business lock as bill writes so the comparison snapshot is stable.
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
      current.business_id,
    ]);
    const previous = await findPreviousBill(client, current);
    if (!previous) {
      await client.query('ROLLBACK');
      return { kind: 'COMPARISON_REQUIRED' };
    }

    const inserted = await client.query<{ id: string }>(
      `INSERT INTO diagnostic_session (
         id, business_id, electricity_bill_id, comparison_bill_id,
         segment_code, status, rule_version
       )
       VALUES ($1, $2, $3, $4, $5, 'DRAFT', $6)
       ON CONFLICT (business_id, electricity_bill_id, rule_version) DO NOTHING
       RETURNING id`,
      [
        crypto.randomUUID(),
        current.business_id,
        current.id,
        previous.id,
        current.segment,
        ruleVersion,
      ]
    );
    const session = await loadSessionByUniqueKey(
      client,
      current.business_id,
      current.id,
      ruleVersion
    );
    if (!session) throw new Error('Diagnostic session was not persisted');
    await client.query('COMMIT');
    return { kind: 'READY', session, created: inserted.rowCount === 1 };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function inspectDiagnosticEntry(
  userId: string,
  electricityBillId: string,
  ruleVersion: string
): Promise<DiagnosticEntryPersistence> {
  const client = await getPool().connect();
  try {
    const current = await findOwnedBill(client, userId, electricityBillId);
    if (!current) return { kind: 'BILL_NOT_FOUND' };
    if (current.segment !== 'KOS') {
      return { kind: 'UNSUPPORTED_SEGMENT', segment: current.segment };
    }
    const previous = await findPreviousBill(client, current);
    if (!previous) return { kind: 'COMPARISON_REQUIRED' };
    const existing = await client.query<{ id: string }>(
      `SELECT ds.id
         FROM diagnostic_session ds
         JOIN business b ON b.id = ds.business_id
        WHERE ds.electricity_bill_id = $1
          AND ds.rule_version = $2
          AND b.user_id = $3
        LIMIT 1`,
      [electricityBillId, ruleVersion, userId]
    );
    return { kind: 'READY', sessionId: existing.rows[0]?.id ?? null };
  } finally {
    client.release();
  }
}

export async function findDiagnosticSessionForUser(
  userId: string,
  sessionId: string
): Promise<DiagnosticSessionContext | null> {
  const client = await getPool().connect();
  try {
    const result = await client.query<SessionRow>(
      `${SESSION_SELECT}
        WHERE ds.id = $1 AND b.user_id = $2
        LIMIT 1`,
      [sessionId, userId]
    );
    if (!result.rows[0]) return null;
    return mapSession(result.rows[0], await loadAnswers(client, sessionId));
  } finally {
    client.release();
  }
}

export async function withLockedDiagnosticSession<T>(
  userId: string,
  sessionId: string,
  work: (
    client: PoolClient,
    session: DiagnosticSessionContext
  ) => Promise<T>
): Promise<T | null> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<SessionRow>(
      `${SESSION_SELECT}
        WHERE ds.id = $1 AND b.user_id = $2
        FOR UPDATE OF ds`,
      [sessionId, userId]
    );
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    const session = mapSession(result.rows[0], await loadAnswers(client, sessionId));
    const value = await work(client, session);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function insertDiagnosticAnswer(
  client: PoolClient,
  input: {
    sessionId: string;
    questionCode: string;
    questionVersion: number;
    answerCode: DiagnosticAnswerCode;
  }
): Promise<{ answer: DiagnosticAnswerRecord; inserted: boolean }> {
  const inserted = await client.query<AnswerRow>(
    `INSERT INTO diagnostic_answer (
       id, diagnostic_session_id, question_code, question_version, answer_code
     )
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (diagnostic_session_id, question_code, question_version) DO NOTHING
     RETURNING id, diagnostic_session_id, question_code, question_version, answer_code,
               created_at, updated_at`,
    [
      crypto.randomUUID(),
      input.sessionId,
      input.questionCode,
      input.questionVersion,
      input.answerCode,
    ]
  );
  if (inserted.rows[0]) return { answer: mapAnswer(inserted.rows[0]), inserted: true };

  const existing = await client.query<AnswerRow>(
    `SELECT id, diagnostic_session_id, question_code, question_version, answer_code,
            created_at, updated_at
       FROM diagnostic_answer
      WHERE diagnostic_session_id = $1
        AND question_code = $2
        AND question_version = $3
      LIMIT 1`,
    [input.sessionId, input.questionCode, input.questionVersion]
  );
  if (!existing.rows[0]) throw new Error('Diagnostic answer conflict could not be resolved');
  return { answer: mapAnswer(existing.rows[0]), inserted: false };
}

export async function advanceDiagnosticSession(
  client: PoolClient,
  sessionId: string,
  completed: boolean
) {
  await client.query(
    `UPDATE diagnostic_session
        SET status = CASE
              WHEN status = 'DRAFT' THEN 'COLLECTING_CONTEXT'
              ELSE status
            END,
            questionnaire_completed_at = CASE
              WHEN $2::boolean THEN COALESCE(questionnaire_completed_at, now())
              ELSE questionnaire_completed_at
            END,
            updated_at = now()
      WHERE id = $1`,
    [sessionId, completed]
  );
}
