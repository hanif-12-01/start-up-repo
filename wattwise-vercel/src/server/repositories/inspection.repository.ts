import type { PoolClient } from 'pg';
import { getPool } from '@/server/db/client';
import type {
  InspectionAnswerCode,
  InspectionItemStatus,
  InspectionPlanStatus,
  InspectionSafetyLevel,
} from '@/server/db/schema/inspections';
import type { DiagnosticStatus } from '@/server/db/schema/diagnostics';
import type { InspectionDefinition } from '@/server/services/inspection-catalog';

interface CandidateContextRow {
  id: string;
  diagnostic_session_id: string;
  business_id: string;
  candidate_code: string;
  candidate_version: number;
  candidate_type: string;
  candidate_rule_version: string;
  rank: number;
  session_status: DiagnosticStatus;
}

export interface InspectionCandidateContext {
  id: string;
  diagnosticSessionId: string;
  businessId: string;
  candidateCode: string;
  candidateVersion: number;
  candidateType: string;
  candidateRuleVersion: string;
  rank: number;
  sessionStatus: DiagnosticStatus;
}

interface InspectionPlanRow {
  id: string;
  business_id: string;
  diagnostic_candidate_id: string;
  diagnostic_session_id: string;
  inspection_code: string;
  inspection_version: number;
  rule_version: string;
  title: string;
  status: InspectionPlanStatus;
  result_code: InspectionAnswerCode | null;
  user_note: string | null;
  started_at: Date;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface InspectionItemRow {
  id: string;
  plan_id: string;
  item_code: string;
  item_version: number;
  instruction_snapshot: string;
  safety_level: InspectionSafetyLevel;
  result_options_json: unknown;
  sort_order: number;
  status: InspectionItemStatus;
  answer_code: InspectionAnswerCode | null;
  note: string | null;
  completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface InspectionItemRecord {
  id: string;
  planId: string;
  itemCode: string;
  itemVersion: number;
  instruction: string;
  safetyLevel: InspectionSafetyLevel;
  resultOptions: InspectionAnswerCode[];
  sortOrder: number;
  status: InspectionItemStatus;
  answerCode: InspectionAnswerCode | null;
  note: string | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface InspectionPlanRecord {
  id: string;
  businessId: string;
  diagnosticCandidateId: string;
  diagnosticSessionId: string;
  inspectionCode: string;
  inspectionVersion: number;
  ruleVersion: string;
  title: string;
  status: InspectionPlanStatus;
  resultCode: InspectionAnswerCode | null;
  userNote: string | null;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  items: InspectionItemRecord[];
}

export interface InspectionPlanSummary {
  id: string;
  diagnosticCandidateId: string;
  status: InspectionPlanStatus;
  resultCode: InspectionAnswerCode | null;
}

const PLAN_COLUMNS = `
  ip.id, ip.business_id, ip.diagnostic_candidate_id,
  dc.diagnostic_session_id, ip.inspection_code, ip.inspection_version,
  ip.rule_version, ip.title, ip.status, ip.result_code, ip.user_note,
  ip.started_at, ip.completed_at, ip.created_at, ip.updated_at
`;

function candidateContext(row: CandidateContextRow): InspectionCandidateContext {
  return {
    id: row.id,
    diagnosticSessionId: row.diagnostic_session_id,
    businessId: row.business_id,
    candidateCode: row.candidate_code,
    candidateVersion: row.candidate_version,
    candidateType: row.candidate_type,
    candidateRuleVersion: row.candidate_rule_version,
    rank: row.rank,
    sessionStatus: row.session_status,
  };
}

function resultOptions(value: unknown): InspectionAnswerCode[] {
  const allowed = new Set<InspectionAnswerCode>([
    'FOUND',
    'NOT_FOUND',
    'UNKNOWN',
    'NEEDS_HELP',
  ]);
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.some((option) => typeof option !== 'string' || !allowed.has(option as InspectionAnswerCode))
  ) {
    throw new Error('Persisted inspection result options are invalid');
  }
  return value as InspectionAnswerCode[];
}

function mapItem(row: InspectionItemRow): InspectionItemRecord {
  return {
    id: row.id,
    planId: row.plan_id,
    itemCode: row.item_code,
    itemVersion: row.item_version,
    instruction: row.instruction_snapshot,
    safetyLevel: row.safety_level,
    resultOptions: resultOptions(row.result_options_json),
    sortOrder: row.sort_order,
    status: row.status,
    answerCode: row.answer_code,
    note: row.note,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPlan(
  row: InspectionPlanRow,
  items: InspectionItemRecord[]
): InspectionPlanRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    diagnosticCandidateId: row.diagnostic_candidate_id,
    diagnosticSessionId: row.diagnostic_session_id,
    inspectionCode: row.inspection_code,
    inspectionVersion: row.inspection_version,
    ruleVersion: row.rule_version,
    title: row.title,
    status: row.status,
    resultCode: row.result_code,
    userNote: row.user_note,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items,
  };
}

async function loadItems(
  client: PoolClient,
  planId: string,
  forUpdate = false
): Promise<InspectionItemRecord[]> {
  const result = await client.query<InspectionItemRow>(
    `SELECT id, plan_id, item_code, item_version, instruction_snapshot,
            safety_level, result_options_json, sort_order, status, answer_code,
            note, completed_at, created_at, updated_at
       FROM inspection_item
      WHERE plan_id = $1
      ORDER BY sort_order ASC, id ASC
      ${forUpdate ? 'FOR UPDATE' : ''}`,
    [planId]
  );
  return result.rows.map(mapItem);
}

async function loadPlanByCandidate(
  client: PoolClient,
  candidateId: string,
  definition: InspectionDefinition
): Promise<InspectionPlanRecord | null> {
  const result = await client.query<InspectionPlanRow>(
    `SELECT ${PLAN_COLUMNS}
       FROM inspection_plan ip
       JOIN diagnostic_candidate dc ON dc.id = ip.diagnostic_candidate_id
      WHERE ip.diagnostic_candidate_id = $1
        AND ip.inspection_code = $2
        AND ip.inspection_version = $3
        AND ip.rule_version = $4
      LIMIT 1`,
    [candidateId, definition.code, definition.version, definition.ruleVersion]
  );
  if (!result.rows[0]) return null;
  return mapPlan(result.rows[0], await loadItems(client, result.rows[0].id));
}

export async function createOrGetInspectionPlan(
  userId: string,
  candidateId: string,
  resolveDefinition: (
    candidate: InspectionCandidateContext
  ) => InspectionDefinition
): Promise<InspectionPlanRecord | null> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const owned = await client.query<CandidateContextRow>(
      `SELECT dc.id, dc.diagnostic_session_id, ds.business_id,
              dc.candidate_code, dc.candidate_version, dc.candidate_type,
              dc.rule_version AS candidate_rule_version, dc.rank,
              ds.status AS session_status
         FROM diagnostic_candidate dc
         JOIN diagnostic_session ds ON ds.id = dc.diagnostic_session_id
         JOIN business b ON b.id = ds.business_id
        WHERE dc.id = $1 AND b.user_id = $2 AND b.is_active = true
        FOR UPDATE OF ds, dc`,
      [candidateId, userId]
    );
    if (!owned.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }

    const candidate = candidateContext(owned.rows[0]);
    const definition = resolveDefinition(candidate);
    const existing = await loadPlanByCandidate(client, candidate.id, definition);
    if (existing) {
      await client.query('COMMIT');
      return existing;
    }

    const planId = crypto.randomUUID();
    await client.query(
      `INSERT INTO inspection_plan (
         id, business_id, diagnostic_candidate_id, inspection_code,
         inspection_version, rule_version, title
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        planId,
        candidate.businessId,
        candidate.id,
        definition.code,
        definition.version,
        definition.ruleVersion,
        definition.title,
      ]
    );
    for (const item of definition.items) {
      await client.query(
        `INSERT INTO inspection_item (
           id, plan_id, item_code, item_version, instruction_snapshot,
           safety_level, result_options_json, sort_order
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)`,
        [
          crypto.randomUUID(),
          planId,
          item.code,
          item.version,
          item.instruction,
          item.safetyLevel,
          JSON.stringify(item.resultOptions),
          item.sortOrder,
        ]
      );
    }
    await client.query(
      `UPDATE diagnostic_session
          SET status = 'INSPECTION_IN_PROGRESS', updated_at = now()
        WHERE id = $1 AND status = 'ANALYZED'`,
      [candidate.diagnosticSessionId]
    );

    const created = await loadPlanByCandidate(client, candidate.id, definition);
    if (!created) throw new Error('Inspection plan was not persisted');
    await client.query('COMMIT');
    return created;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function findInspectionPlanForUser(
  userId: string,
  sessionId: string,
  planId: string
): Promise<InspectionPlanRecord | null> {
  const client = await getPool().connect();
  try {
    const result = await client.query<InspectionPlanRow>(
      `SELECT ${PLAN_COLUMNS}
         FROM inspection_plan ip
         JOIN diagnostic_candidate dc ON dc.id = ip.diagnostic_candidate_id
         JOIN diagnostic_session ds ON ds.id = dc.diagnostic_session_id
         JOIN business b ON b.id = ds.business_id
        WHERE ip.id = $1 AND ds.id = $2 AND b.user_id = $3 AND b.is_active = true
        LIMIT 1`,
      [planId, sessionId, userId]
    );
    if (!result.rows[0]) return null;
    return mapPlan(result.rows[0], await loadItems(client, planId));
  } finally {
    client.release();
  }
}

export async function findInspectionPlanSummariesForSession(
  userId: string,
  sessionId: string
): Promise<InspectionPlanSummary[] | null> {
  const pool = getPool();
  const owned = await pool.query(
    `SELECT 1
       FROM diagnostic_session ds
       JOIN business b ON b.id = ds.business_id
      WHERE ds.id = $1 AND b.user_id = $2 AND b.is_active = true
      LIMIT 1`,
    [sessionId, userId]
  );
  if (!owned.rowCount) return null;
  const result = await pool.query<{
    id: string;
    diagnostic_candidate_id: string;
    status: InspectionPlanStatus;
    result_code: InspectionAnswerCode | null;
  }>(
    `SELECT ip.id, ip.diagnostic_candidate_id, ip.status, ip.result_code
       FROM inspection_plan ip
       JOIN diagnostic_candidate dc ON dc.id = ip.diagnostic_candidate_id
      WHERE dc.diagnostic_session_id = $1
      ORDER BY ip.created_at ASC, ip.id ASC`,
    [sessionId]
  );
  return result.rows.map((row) => ({
    id: row.id,
    diagnosticCandidateId: row.diagnostic_candidate_id,
    status: row.status,
    resultCode: row.result_code,
  }));
}

export async function withLockedInspectionPlan<T>(
  userId: string,
  sessionId: string,
  planId: string,
  work: (
    client: PoolClient,
    plan: InspectionPlanRecord
  ) => Promise<T>
): Promise<T | null> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<InspectionPlanRow>(
      `SELECT ${PLAN_COLUMNS}
         FROM inspection_plan ip
         JOIN diagnostic_candidate dc ON dc.id = ip.diagnostic_candidate_id
         JOIN diagnostic_session ds ON ds.id = dc.diagnostic_session_id
         JOIN business b ON b.id = ds.business_id
        WHERE ip.id = $1 AND ds.id = $2 AND b.user_id = $3 AND b.is_active = true
        FOR UPDATE OF ip`,
      [planId, sessionId, userId]
    );
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    const plan = mapPlan(
      result.rows[0],
      await loadItems(client, planId, true)
    );
    const value = await work(client, plan);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function saveInspectionItemAnswer(
  client: PoolClient,
  input: {
    itemId: string;
    answerCode: InspectionAnswerCode;
    note: string | null;
  }
) {
  const result = await client.query<{
    completed_at: Date;
    updated_at: Date;
  }>(
    `UPDATE inspection_item
        SET status = 'ANSWERED',
            answer_code = $2,
            note = $3,
            completed_at = now(),
            updated_at = now()
      WHERE id = $1
      RETURNING completed_at, updated_at`,
    [input.itemId, input.answerCode, input.note]
  );
  if (!result.rows[0]) throw new Error('Inspection item answer was not persisted');
  return {
    completedAt: result.rows[0].completed_at,
    updatedAt: result.rows[0].updated_at,
  };
}

export async function completeInspectionPlanRecord(
  client: PoolClient,
  planId: string,
  resultCode: InspectionAnswerCode
) {
  const result = await client.query<{
    completed_at: Date;
    updated_at: Date;
  }>(
    `UPDATE inspection_plan
        SET status = 'COMPLETED',
            result_code = $2,
            completed_at = now(),
            updated_at = now()
      WHERE id = $1 AND status = 'IN_PROGRESS'
      RETURNING completed_at, updated_at`,
    [planId, resultCode]
  );
  if (!result.rows[0]) {
    throw new Error('Inspection plan could not transition to COMPLETED');
  }
  return {
    completedAt: result.rows[0].completed_at,
    updatedAt: result.rows[0].updated_at,
  };
}
