import type { PoolClient } from 'pg';
import { getPool } from '@/server/db/client';
import type {
  ActionPlanReviewMode,
  ActionPlanStatus,
} from '@/server/db/schema/action-plans';
import type { DiagnosticStatus } from '@/server/db/schema/diagnostics';
import type { InspectionAnswerCode } from '@/server/db/schema/inspections';
import type { ActionStepDefinition } from '@/server/services/action-plan-catalog';
import type { ActionPlanBaselineSnapshot } from '@/server/services/action-plan-baseline';

interface ActionPlanRow {
  id: string;
  business_id: string;
  diagnostic_candidate_id: string;
  inspection_plan_id: string;
  diagnostic_session_id: string;
  candidate_title: string;
  action_code: string;
  action_version: number;
  rule_version: string;
  title_snapshot: string;
  description_snapshot: string;
  reason_snapshot: string;
  steps_snapshot_json: unknown;
  inspection_result_snapshot: InspectionAnswerCode;
  baseline_snapshot_json: unknown;
  status: ActionPlanStatus;
  review_mode: ActionPlanReviewMode;
  planned_start_date: string | Date;
  user_note: string | null;
  started_at: Date | null;
  completed_at: Date | null;
  cancelled_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface ActionPlanContextRow {
  inspection_plan_id: string;
  inspection_status: string;
  inspection_result: InspectionAnswerCode | null;
  inspection_code: string;
  inspection_version: number;
  inspection_rule_version: string;
  business_id: string;
  diagnostic_candidate_id: string;
  diagnostic_session_id: string;
  candidate_code: string;
  candidate_version: number;
  candidate_rule_version: string;
  candidate_type: string;
  candidate_title: string;
  session_status: DiagnosticStatus;
  source_bill_id: string;
  source_period_start: string | Date;
  source_period_end: string | Date;
  source_total_amount_rupiah: string;
  source_kwh: string | null;
  source_tariff: string | null;
  comparison_bill_id: string;
  comparison_period_start: string | Date;
  comparison_period_end: string | Date;
  comparison_total_amount_rupiah: string;
  comparison_kwh: string | null;
  comparison_tariff: string | null;
}

export interface ActionPlanContext {
  inspectionPlanId: string;
  inspectionStatus: string;
  inspectionResult: InspectionAnswerCode | null;
  inspectionCode: string;
  inspectionVersion: number;
  inspectionRuleVersion: string;
  businessId: string;
  diagnosticCandidateId: string;
  diagnosticSessionId: string;
  candidateCode: string;
  candidateVersion: number;
  candidateRuleVersion: string;
  candidateType: string;
  candidateTitle: string;
  sessionStatus: DiagnosticStatus;
  currentBill: {
    id: string;
    periodStart: string;
    periodEnd: string;
    totalAmountRupiah: bigint;
    kwh: string | null;
    tariffRupiahPerKwh: string | null;
  };
  comparisonBill: {
    id: string;
    periodStart: string;
    periodEnd: string;
    totalAmountRupiah: bigint;
    kwh: string | null;
    tariffRupiahPerKwh: string | null;
  };
}

export interface ActionPlanRecord {
  id: string;
  businessId: string;
  diagnosticCandidateId: string;
  inspectionPlanId: string;
  diagnosticSessionId: string;
  candidateTitle: string;
  actionCode: string;
  actionVersion: number;
  ruleVersion: string;
  title: string;
  description: string;
  reason: string;
  steps: ActionStepDefinition[];
  inspectionResult: InspectionAnswerCode;
  baseline: ActionPlanBaselineSnapshot;
  status: ActionPlanStatus;
  reviewMode: ActionPlanReviewMode;
  plannedStartDate: string;
  userNote: string | null;
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const PLAN_COLUMNS = `
  eap.id, eap.business_id, eap.diagnostic_candidate_id, eap.inspection_plan_id,
  dc.diagnostic_session_id, dc.title AS candidate_title,
  eap.action_code, eap.action_version, eap.rule_version,
  eap.title_snapshot, eap.description_snapshot, eap.reason_snapshot,
  eap.steps_snapshot_json, eap.inspection_result_snapshot,
  eap.baseline_snapshot_json, eap.status, eap.review_mode,
  eap.planned_start_date, eap.user_note, eap.started_at, eap.completed_at,
  eap.cancelled_at, eap.created_at, eap.updated_at
`;

function dateString(value: string | Date): string {
  if (typeof value === 'string') return value;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mapContext(row: ActionPlanContextRow): ActionPlanContext {
  return {
    inspectionPlanId: row.inspection_plan_id,
    inspectionStatus: row.inspection_status,
    inspectionResult: row.inspection_result,
    inspectionCode: row.inspection_code,
    inspectionVersion: row.inspection_version,
    inspectionRuleVersion: row.inspection_rule_version,
    businessId: row.business_id,
    diagnosticCandidateId: row.diagnostic_candidate_id,
    diagnosticSessionId: row.diagnostic_session_id,
    candidateCode: row.candidate_code,
    candidateVersion: row.candidate_version,
    candidateRuleVersion: row.candidate_rule_version,
    candidateType: row.candidate_type,
    candidateTitle: row.candidate_title,
    sessionStatus: row.session_status,
    currentBill: {
      id: row.source_bill_id,
      periodStart: dateString(row.source_period_start),
      periodEnd: dateString(row.source_period_end),
      totalAmountRupiah: BigInt(row.source_total_amount_rupiah),
      kwh: row.source_kwh,
      tariffRupiahPerKwh: row.source_tariff,
    },
    comparisonBill: {
      id: row.comparison_bill_id,
      periodStart: dateString(row.comparison_period_start),
      periodEnd: dateString(row.comparison_period_end),
      totalAmountRupiah: BigInt(row.comparison_total_amount_rupiah),
      kwh: row.comparison_kwh,
      tariffRupiahPerKwh: row.comparison_tariff,
    },
  };
}

function mapPlan(row: ActionPlanRow): ActionPlanRecord {
  if (!Array.isArray(row.steps_snapshot_json) || row.steps_snapshot_json.length === 0) {
    throw new Error('Persisted action steps are invalid');
  }
  if (
    !row.baseline_snapshot_json ||
    typeof row.baseline_snapshot_json !== 'object' ||
    Array.isArray(row.baseline_snapshot_json)
  ) {
    throw new Error('Persisted action baseline is invalid');
  }
  return {
    id: row.id,
    businessId: row.business_id,
    diagnosticCandidateId: row.diagnostic_candidate_id,
    inspectionPlanId: row.inspection_plan_id,
    diagnosticSessionId: row.diagnostic_session_id,
    candidateTitle: row.candidate_title,
    actionCode: row.action_code,
    actionVersion: row.action_version,
    ruleVersion: row.rule_version,
    title: row.title_snapshot,
    description: row.description_snapshot,
    reason: row.reason_snapshot,
    steps: row.steps_snapshot_json as ActionStepDefinition[],
    inspectionResult: row.inspection_result_snapshot,
    baseline: row.baseline_snapshot_json as ActionPlanBaselineSnapshot,
    status: row.status,
    reviewMode: row.review_mode,
    plannedStartDate: dateString(row.planned_start_date),
    userNote: row.user_note,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const CONTEXT_SELECT = `
  SELECT ip.id AS inspection_plan_id, ip.status AS inspection_status,
         ip.result_code AS inspection_result, ip.inspection_code,
         ip.inspection_version, ip.rule_version AS inspection_rule_version,
         ds.business_id, dc.id AS diagnostic_candidate_id,
         ds.id AS diagnostic_session_id, dc.candidate_code,
         dc.candidate_version, dc.rule_version AS candidate_rule_version,
         dc.candidate_type, dc.title AS candidate_title, ds.status AS session_status,
         current_bill.id AS source_bill_id,
         current_bill.period_start AS source_period_start,
         current_bill.period_end AS source_period_end,
         current_bill.total_amount_rupiah AS source_total_amount_rupiah,
         current_bill.kwh AS source_kwh,
         current_bill.tariff_rupiah_per_kwh AS source_tariff,
         comparison_bill.id AS comparison_bill_id,
         comparison_bill.period_start AS comparison_period_start,
         comparison_bill.period_end AS comparison_period_end,
         comparison_bill.total_amount_rupiah AS comparison_total_amount_rupiah,
         comparison_bill.kwh AS comparison_kwh,
         comparison_bill.tariff_rupiah_per_kwh AS comparison_tariff
    FROM inspection_plan ip
    JOIN diagnostic_candidate dc ON dc.id = ip.diagnostic_candidate_id
    JOIN diagnostic_session ds ON ds.id = dc.diagnostic_session_id
    JOIN business b ON b.id = ds.business_id
    JOIN electricity_bill current_bill ON current_bill.id = ds.electricity_bill_id
    JOIN electricity_bill comparison_bill ON comparison_bill.id = ds.comparison_bill_id
`;

async function loadPlanByInspection(
  client: PoolClient,
  inspectionPlanId: string
): Promise<ActionPlanRecord | null> {
  const result = await client.query<ActionPlanRow>(
    `SELECT ${PLAN_COLUMNS}
       FROM energy_action_plan eap
       JOIN diagnostic_candidate dc ON dc.id = eap.diagnostic_candidate_id
      WHERE eap.inspection_plan_id = $1
      LIMIT 1`,
    [inspectionPlanId]
  );
  return result.rows[0] ? mapPlan(result.rows[0]) : null;
}

export async function findActionPlanContextForUser(
  userId: string,
  sessionId: string,
  inspectionPlanId: string
): Promise<ActionPlanContext | null> {
  const result = await getPool().query<ActionPlanContextRow>(
    `${CONTEXT_SELECT}
      WHERE ip.id = $1 AND ds.id = $2 AND b.user_id = $3 AND b.is_active = true
      LIMIT 1`,
    [inspectionPlanId, sessionId, userId]
  );
  return result.rows[0] ? mapContext(result.rows[0]) : null;
}

export async function findActionPlanForUser(
  userId: string,
  sessionId: string,
  actionPlanId: string
): Promise<ActionPlanRecord | null> {
  const result = await getPool().query<ActionPlanRow>(
    `SELECT ${PLAN_COLUMNS}
       FROM energy_action_plan eap
       JOIN diagnostic_candidate dc ON dc.id = eap.diagnostic_candidate_id
       JOIN diagnostic_session ds ON ds.id = dc.diagnostic_session_id
       JOIN business b ON b.id = ds.business_id
      WHERE eap.id = $1 AND ds.id = $2 AND b.user_id = $3 AND b.is_active = true
      LIMIT 1`,
    [actionPlanId, sessionId, userId]
  );
  return result.rows[0] ? mapPlan(result.rows[0]) : null;
}

export async function findActionPlanForInspectionForUser(
  userId: string,
  sessionId: string,
  inspectionPlanId: string
): Promise<ActionPlanRecord | null> {
  const result = await getPool().query<ActionPlanRow>(
    `SELECT ${PLAN_COLUMNS}
       FROM energy_action_plan eap
       JOIN diagnostic_candidate dc ON dc.id = eap.diagnostic_candidate_id
       JOIN diagnostic_session ds ON ds.id = dc.diagnostic_session_id
       JOIN business b ON b.id = ds.business_id
      WHERE eap.inspection_plan_id = $1
        AND ds.id = $2
        AND b.user_id = $3
        AND b.is_active = true
      LIMIT 1`,
    [inspectionPlanId, sessionId, userId]
  );
  return result.rows[0] ? mapPlan(result.rows[0]) : null;
}

export async function createOrGetActionPlan(
  userId: string,
  input: {
    sessionId: string;
    inspectionPlanId: string;
    selectedActionCode: string;
    plannedStartDate: string;
    userNote: string | null;
  },
  resolve: (
    context: ActionPlanContext,
    capturedAt: Date
  ) => {
    actionCode: string;
    actionVersion: number;
    ruleVersion: string;
    title: string;
    description: string;
    reason: string;
    steps: ReadonlyArray<ActionStepDefinition>;
    inspectionResult: InspectionAnswerCode;
    baseline: ActionPlanBaselineSnapshot;
    reviewMode: ActionPlanReviewMode;
  }
): Promise<ActionPlanRecord | null> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const owned = await client.query<ActionPlanContextRow>(
      `${CONTEXT_SELECT}
        WHERE ip.id = $1 AND ds.id = $2 AND b.user_id = $3 AND b.is_active = true
        FOR UPDATE OF ip, dc, ds`,
      [input.inspectionPlanId, input.sessionId, userId]
    );
    if (!owned.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
      input.inspectionPlanId,
    ]);
    const existing = await loadPlanByInspection(client, input.inspectionPlanId);
    if (existing) {
      await client.query('COMMIT');
      return existing;
    }
    const captured = await client.query<{ captured_at: Date }>('SELECT now() AS captured_at');
    const context = mapContext(owned.rows[0]);
    const snapshot = resolve(context, captured.rows[0].captured_at);
    const inserted = await client.query<ActionPlanRow>(
      `INSERT INTO energy_action_plan (
         id, business_id, diagnostic_candidate_id, inspection_plan_id,
         action_code, action_version, rule_version, title_snapshot,
         description_snapshot, reason_snapshot, steps_snapshot_json,
         inspection_result_snapshot, baseline_snapshot_json, status,
         review_mode, planned_start_date, user_note, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb,
         $12, $13::jsonb, 'PLANNED', $14, $15::date, $16, $17, $17
       )
       RETURNING id, business_id, diagnostic_candidate_id, inspection_plan_id,
         $18::text AS diagnostic_session_id, $19::text AS candidate_title,
         action_code, action_version, rule_version, title_snapshot,
         description_snapshot, reason_snapshot, steps_snapshot_json,
         inspection_result_snapshot, baseline_snapshot_json, status,
         review_mode, planned_start_date, user_note, started_at, completed_at,
         cancelled_at, created_at, updated_at`,
      [
        crypto.randomUUID(),
        context.businessId,
        context.diagnosticCandidateId,
        context.inspectionPlanId,
        snapshot.actionCode,
        snapshot.actionVersion,
        snapshot.ruleVersion,
        snapshot.title,
        snapshot.description,
        snapshot.reason,
        JSON.stringify(snapshot.steps),
        snapshot.inspectionResult,
        JSON.stringify(snapshot.baseline),
        snapshot.reviewMode,
        input.plannedStartDate,
        input.userNote,
        captured.rows[0].captured_at,
        context.diagnosticSessionId,
        context.candidateTitle,
      ]
    );
    await client.query('COMMIT');
    return mapPlan(inserted.rows[0]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function withLockedActionPlan<T>(
  userId: string,
  sessionId: string,
  actionPlanId: string,
  work: (client: PoolClient, plan: ActionPlanRecord) => Promise<T>
): Promise<T | null> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await client.query<ActionPlanRow>(
      `SELECT ${PLAN_COLUMNS}
         FROM energy_action_plan eap
         JOIN diagnostic_candidate dc ON dc.id = eap.diagnostic_candidate_id
         JOIN diagnostic_session ds ON ds.id = dc.diagnostic_session_id
         JOIN business b ON b.id = ds.business_id
        WHERE eap.id = $1 AND ds.id = $2 AND b.user_id = $3 AND b.is_active = true
        FOR UPDATE OF eap`,
      [actionPlanId, sessionId, userId]
    );
    if (!result.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    const value = await work(client, mapPlan(result.rows[0]));
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function persistActionPlanTransition(
  client: PoolClient,
  plan: ActionPlanRecord,
  nextStatus: ActionPlanStatus
): Promise<ActionPlanRecord> {
  const result = await client.query<ActionPlanRow>(
    `UPDATE energy_action_plan
        SET status = $2,
            started_at = CASE WHEN $2 = 'IN_PROGRESS' THEN now() ELSE started_at END,
            completed_at = CASE WHEN $2 = 'COMPLETED' THEN now() ELSE completed_at END,
            cancelled_at = CASE WHEN $2 = 'CANCELLED' THEN now() ELSE cancelled_at END,
            updated_at = now()
      WHERE id = $1
      RETURNING id, business_id, diagnostic_candidate_id, inspection_plan_id,
        $3::text AS diagnostic_session_id, $4::text AS candidate_title,
        action_code, action_version, rule_version, title_snapshot,
        description_snapshot, reason_snapshot, steps_snapshot_json,
        inspection_result_snapshot, baseline_snapshot_json, status,
        review_mode, planned_start_date, user_note, started_at, completed_at,
        cancelled_at, created_at, updated_at`,
    [plan.id, nextStatus, plan.diagnosticSessionId, plan.candidateTitle]
  );
  if (!result.rows[0]) throw new Error('Action plan transition was not persisted');
  return mapPlan(result.rows[0]);
}
