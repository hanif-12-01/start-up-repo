import type { PoolClient } from 'pg';
import { getPool } from '@/server/db/client';
import type { ActionPlanStatus } from '@/server/db/schema/action-plans';
import type { DiagnosticStatus } from '@/server/db/schema/diagnostics';
import type {
  OutcomeDataQualityCode,
  OutcomeDirection,
  OverallOutcomeCode,
} from '@/server/db/schema/outcomes';
import type { ActionPlanBaselineSnapshot } from '@/server/services/action-plan-baseline';
import type {
  FollowUpBillSnapshot,
  OutcomeBillInput,
  OutcomeComparisonSnapshot,
  OutcomeExplanationSnapshot,
  ResolvedOutcomeEvaluation,
} from '@/server/services/outcome-evaluation';

interface OutcomeRow {
  id: string;
  business_id: string;
  diagnostic_session_id: string;
  action_plan_id: string;
  baseline_bill_id: string;
  follow_up_bill_id: string;
  rule_version: string;
  similarity_band_bps: number;
  evaluation_eligible_after_date: string | Date;
  baseline_snapshot_json: unknown;
  follow_up_snapshot_json: unknown;
  comparison_snapshot_json: unknown;
  cost_direction: Exclude<OutcomeDirection, 'UNAVAILABLE'>;
  usage_direction: OutcomeDirection;
  tariff_direction: OutcomeDirection;
  data_quality_code: OutcomeDataQualityCode;
  overall_outcome_code: OverallOutcomeCode;
  explanation_snapshot_json: unknown;
  evaluated_at: Date;
  created_at: Date;
  updated_at: Date;
}

interface BillRow {
  id: string;
  business_id: string;
  period_start: string | Date;
  period_end: string | Date;
  total_amount_rupiah: string;
  kwh: string | null;
  tariff_rupiah_per_kwh: string | null;
  created_at: Date;
}

export interface OutcomeEvaluationRecord {
  id: string;
  businessId: string;
  diagnosticSessionId: string;
  actionPlanId: string;
  baselineBillId: string;
  followUpBillId: string;
  ruleVersion: string;
  similarityBandBps: number;
  evaluationEligibleAfterDate: string;
  baseline: ActionPlanBaselineSnapshot;
  followUp: FollowUpBillSnapshot;
  comparison: OutcomeComparisonSnapshot;
  costDirection: Exclude<OutcomeDirection, 'UNAVAILABLE'>;
  usageDirection: OutcomeDirection;
  tariffDirection: OutcomeDirection;
  dataQualityCode: OutcomeDataQualityCode;
  overallOutcomeCode: OverallOutcomeCode;
  explanation: OutcomeExplanationSnapshot;
  evaluatedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionClosurePlanState {
  id: string;
  status: ActionPlanStatus;
  hasOutcome: boolean;
}

export interface SessionClosureContext {
  id: string;
  status: DiagnosticStatus;
  closedAt: Date | null;
  plans: SessionClosurePlanState[];
}

async function loadClosurePlans(
  client: PoolClient,
  sessionId: string,
  forUpdate = false
): Promise<SessionClosurePlanState[]> {
  const plans = await client.query<{
    id: string;
    status: ActionPlanStatus;
    has_outcome: boolean;
  }>(
    `SELECT eap.id, eap.status, (aoe.id IS NOT NULL) AS has_outcome
       FROM energy_action_plan eap
       JOIN diagnostic_candidate dc ON dc.id = eap.diagnostic_candidate_id
       LEFT JOIN action_outcome_evaluation aoe ON aoe.action_plan_id = eap.id
      WHERE dc.diagnostic_session_id = $1
      ORDER BY eap.created_at ASC, eap.id ASC
      ${forUpdate ? 'FOR UPDATE OF eap' : ''}`,
    [sessionId]
  );
  return plans.rows.map((plan) => ({
    id: plan.id,
    status: plan.status,
    hasOutcome: plan.has_outcome,
  }));
}

const OUTCOME_COLUMNS = `
  aoe.id, aoe.business_id, aoe.diagnostic_session_id, aoe.action_plan_id,
  aoe.baseline_bill_id, aoe.follow_up_bill_id, aoe.rule_version,
  aoe.similarity_band_bps, aoe.evaluation_eligible_after_date,
  aoe.baseline_snapshot_json, aoe.follow_up_snapshot_json,
  aoe.comparison_snapshot_json, aoe.cost_direction, aoe.usage_direction,
  aoe.tariff_direction, aoe.data_quality_code, aoe.overall_outcome_code,
  aoe.explanation_snapshot_json, aoe.evaluated_at, aoe.created_at, aoe.updated_at
`;

function dateString(value: string | Date): string {
  if (typeof value === 'string') return value;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function objectSnapshot<T>(value: unknown, name: string): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Persisted ${name} snapshot is invalid`);
  }
  return value as T;
}

function mapOutcome(row: OutcomeRow): OutcomeEvaluationRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    diagnosticSessionId: row.diagnostic_session_id,
    actionPlanId: row.action_plan_id,
    baselineBillId: row.baseline_bill_id,
    followUpBillId: row.follow_up_bill_id,
    ruleVersion: row.rule_version,
    similarityBandBps: row.similarity_band_bps,
    evaluationEligibleAfterDate: dateString(row.evaluation_eligible_after_date),
    baseline: objectSnapshot<ActionPlanBaselineSnapshot>(
      row.baseline_snapshot_json,
      'baseline'
    ),
    followUp: objectSnapshot<FollowUpBillSnapshot>(row.follow_up_snapshot_json, 'follow-up'),
    comparison: objectSnapshot<OutcomeComparisonSnapshot>(
      row.comparison_snapshot_json,
      'comparison'
    ),
    costDirection: row.cost_direction,
    usageDirection: row.usage_direction,
    tariffDirection: row.tariff_direction,
    dataQualityCode: row.data_quality_code,
    overallOutcomeCode: row.overall_outcome_code,
    explanation: objectSnapshot<OutcomeExplanationSnapshot>(
      row.explanation_snapshot_json,
      'explanation'
    ),
    evaluatedAt: row.evaluated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBill(row: BillRow): OutcomeBillInput {
  return {
    id: row.id,
    businessId: row.business_id,
    periodStart: dateString(row.period_start),
    periodEnd: dateString(row.period_end),
    totalAmountRupiah: BigInt(row.total_amount_rupiah),
    kwh: row.kwh,
    tariffRupiahPerKwh: row.tariff_rupiah_per_kwh,
    createdAt: row.created_at,
  };
}

export async function loadOutcomeByAction(
  client: PoolClient,
  actionPlanId: string
): Promise<OutcomeEvaluationRecord | null> {
  const result = await client.query<OutcomeRow>(
    `SELECT ${OUTCOME_COLUMNS}
       FROM action_outcome_evaluation aoe
      WHERE aoe.action_plan_id = $1
      LIMIT 1`,
    [actionPlanId]
  );
  return result.rows[0] ? mapOutcome(result.rows[0]) : null;
}

export async function findOutcomeForUser(
  userId: string,
  sessionId: string,
  actionPlanId: string
): Promise<OutcomeEvaluationRecord | null> {
  const result = await getPool().query<OutcomeRow>(
    `SELECT ${OUTCOME_COLUMNS}
       FROM action_outcome_evaluation aoe
       JOIN diagnostic_session ds ON ds.id = aoe.diagnostic_session_id
       JOIN business b ON b.id = aoe.business_id
      WHERE aoe.action_plan_id = $1
        AND ds.id = $2
        AND b.user_id = $3
        AND b.is_active = true
      LIMIT 1`,
    [actionPlanId, sessionId, userId]
  );
  return result.rows[0] ? mapOutcome(result.rows[0]) : null;
}

export async function findNextEligibleBill(
  client: PoolClient,
  input: {
    businessId: string;
    baselineBillId: string;
    comparisonBillId: string | null;
    eligibleAfterDate: string;
  }
): Promise<OutcomeBillInput | null> {
  const result = await client.query<BillRow>(
    `SELECT id, business_id, period_start, period_end, total_amount_rupiah,
            kwh, tariff_rupiah_per_kwh, created_at
       FROM electricity_bill
      WHERE business_id = $1
        AND id <> $2
        AND ($3::text IS NULL OR id <> $3)
        AND period_start > $4::date
      ORDER BY period_start ASC, period_end ASC, created_at ASC, id ASC
      LIMIT 1`,
    [
      input.businessId,
      input.baselineBillId,
      input.comparisonBillId,
      input.eligibleAfterDate,
    ]
  );
  return result.rows[0] ? mapBill(result.rows[0]) : null;
}

export async function findNextEligibleBillForUser(input: {
  userId: string;
  businessId: string;
  baselineBillId: string;
  comparisonBillId: string | null;
  eligibleAfterDate: string;
}): Promise<OutcomeBillInput | null> {
  const client = await getPool().connect();
  try {
    const owned = await client.query(
      `SELECT 1 FROM business
        WHERE id = $1 AND user_id = $2 AND is_active = true
        LIMIT 1`,
      [input.businessId, input.userId]
    );
    if (!owned.rowCount) return null;
    return findNextEligibleBill(client, input);
  } finally {
    client.release();
  }
}

export async function insertOutcomeEvaluation(
  client: PoolClient,
  input: {
    id: string;
    businessId: string;
    diagnosticSessionId: string;
    actionPlanId: string;
    baselineBillId: string;
    followUpBillId: string;
    ruleVersion: string;
    similarityBandBps: bigint;
    eligibleAfterDate: string;
    evaluation: ResolvedOutcomeEvaluation;
    evaluatedAt: Date;
  }
): Promise<OutcomeEvaluationRecord> {
  const result = await client.query<OutcomeRow>(
    `INSERT INTO action_outcome_evaluation (
       id, business_id, diagnostic_session_id, action_plan_id,
       baseline_bill_id, follow_up_bill_id, rule_version, similarity_band_bps,
       evaluation_eligible_after_date, baseline_snapshot_json,
       follow_up_snapshot_json, comparison_snapshot_json, cost_direction,
       usage_direction, tariff_direction, data_quality_code,
       overall_outcome_code, explanation_snapshot_json,
       evaluated_at, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9::date, $10::jsonb,
       $11::jsonb, $12::jsonb, $13, $14, $15, $16, $17, $18::jsonb,
       $19, $19, $19
     )
     RETURNING ${OUTCOME_COLUMNS.replaceAll('aoe.', '')}`,
    [
      input.id,
      input.businessId,
      input.diagnosticSessionId,
      input.actionPlanId,
      input.baselineBillId,
      input.followUpBillId,
      input.ruleVersion,
      input.similarityBandBps.toString(),
      input.eligibleAfterDate,
      JSON.stringify(input.evaluation.baseline),
      JSON.stringify(input.evaluation.followUp),
      JSON.stringify(input.evaluation.comparison),
      input.evaluation.comparison.costDirection,
      input.evaluation.comparison.usageDirection,
      input.evaluation.comparison.tariffDirection,
      input.evaluation.comparison.dataQualityCode,
      input.evaluation.comparison.overallOutcomeCode,
      JSON.stringify(input.evaluation.explanation),
      input.evaluatedAt,
    ]
  );
  if (!result.rows[0]) throw new Error('Outcome evaluation was not persisted');
  return mapOutcome(result.rows[0]);
}

export async function findSessionClosureContextForUser(
  userId: string,
  sessionId: string
): Promise<SessionClosureContext | null> {
  const client = await getPool().connect();
  try {
    const session = await client.query<{
      id: string;
      status: DiagnosticStatus;
      closed_at: Date | null;
    }>(
      `SELECT ds.id, ds.status, ds.closed_at
         FROM diagnostic_session ds
         JOIN business b ON b.id = ds.business_id
        WHERE ds.id = $1 AND b.user_id = $2 AND b.is_active = true
        LIMIT 1`,
      [sessionId, userId]
    );
    if (!session.rows[0]) return null;
    return {
      id: session.rows[0].id,
      status: session.rows[0].status,
      closedAt: session.rows[0].closed_at,
      plans: await loadClosurePlans(client, sessionId),
    };
  } finally {
    client.release();
  }
}

export async function withLockedSessionClosure<T>(
  userId: string,
  sessionId: string,
  work: (client: PoolClient, context: SessionClosureContext) => Promise<T>
): Promise<T | null> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const session = await client.query<{
      id: string;
      status: DiagnosticStatus;
      closed_at: Date | null;
    }>(
      `SELECT ds.id, ds.status, ds.closed_at
         FROM diagnostic_session ds
         JOIN business b ON b.id = ds.business_id
        WHERE ds.id = $1 AND b.user_id = $2 AND b.is_active = true
        FOR UPDATE OF ds`,
      [sessionId, userId]
    );
    if (!session.rows[0]) {
      await client.query('ROLLBACK');
      return null;
    }
    await client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [sessionId]);
    const value = await work(client, {
      id: session.rows[0].id,
      status: session.rows[0].status,
      closedAt: session.rows[0].closed_at,
      plans: await loadClosurePlans(client, sessionId, true),
    });
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function persistSessionClosure(
  client: PoolClient,
  sessionId: string
): Promise<{ status: 'CLOSED'; closedAt: Date }> {
  const result = await client.query<{ status: 'CLOSED'; closed_at: Date }>(
    `UPDATE diagnostic_session
        SET status = 'CLOSED', closed_at = COALESCE(closed_at, now()), updated_at = now()
      WHERE id = $1 AND status = 'INSPECTION_IN_PROGRESS'
      RETURNING status, closed_at`,
    [sessionId]
  );
  if (!result.rows[0]) throw new Error('Diagnostic session closure was not persisted');
  return { status: result.rows[0].status, closedAt: result.rows[0].closed_at };
}
