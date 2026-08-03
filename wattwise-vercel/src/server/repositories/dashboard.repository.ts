import { getPool } from '@/server/db/client';
import type { ActionPlanStatus } from '@/server/db/schema/action-plans';
import type {
  DiagnosticCandidateType,
  DiagnosticEvidenceLevel,
  DiagnosticStatus,
} from '@/server/db/schema/diagnostics';
import type {
  InspectionAnswerCode,
  InspectionPlanStatus,
} from '@/server/db/schema/inspections';
import type {
  OutcomeDataQualityCode,
  OutcomeDirection,
  OverallOutcomeCode,
} from '@/server/db/schema/outcomes';
import type { BillRecord } from '@/server/repositories/bill.repository';

export const DASHBOARD_QUERY_COUNT = 3;

export interface DashboardBusinessRecord {
  id: string;
  name: string;
  segment: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DashboardCandidateRecord {
  id: string;
  candidateCode: string;
  candidateVersion: number;
  candidateType: DiagnosticCandidateType;
  candidateRuleVersion: string;
  title: string;
  rank: number;
  evidenceLevel: DiagnosticEvidenceLevel;
  explanation: string;
  updatedAt: Date;
  inspection: {
    id: string;
    ruleVersion: string;
    title: string;
    status: InspectionPlanStatus;
    resultCode: InspectionAnswerCode | null;
    updatedAt: Date;
  } | null;
  actionPlan: {
    id: string;
    title: string;
    status: ActionPlanStatus;
    plannedStartDate: string;
    completedAt: Date | null;
    hasEligibleEvaluationBill: boolean;
    updatedAt: Date;
  } | null;
  outcome: {
    id: string;
    actionPlanId: string;
    baselinePeriodStart: string;
    baselinePeriodEnd: string;
    followUpPeriodStart: string;
    followUpPeriodEnd: string;
    costDirection: Exclude<OutcomeDirection, 'UNAVAILABLE'>;
    usageDirection: OutcomeDirection;
    dataQualityCode: OutcomeDataQualityCode;
    overallOutcomeCode: OverallOutcomeCode;
    evaluatedAt: Date;
    updatedAt: Date;
  } | null;
}

export interface DashboardDiagnosticRecord {
  id: string;
  electricityBillId: string;
  comparisonBillId: string;
  status: DiagnosticStatus;
  createdAt: Date;
  updatedAt: Date;
  closedAt: Date | null;
  candidates: DashboardCandidateRecord[];
}

export interface DashboardRepositorySnapshot {
  businesses: DashboardBusinessRecord[];
  business: DashboardBusinessRecord | null;
  bills: BillRecord[];
  diagnostic: DashboardDiagnosticRecord | null;
}

interface BusinessRow {
  id: string;
  name: string;
  segment: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface BillRow {
  id: string;
  business_id: string;
  business_name: string;
  period_start: string | Date;
  period_end: string | Date;
  total_amount_rupiah: string;
  kwh: string | null;
  tariff_rupiah_per_kwh: string | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

interface JourneyRow {
  session_id: string;
  electricity_bill_id: string;
  comparison_bill_id: string;
  session_status: DiagnosticStatus;
  session_created_at: Date;
  session_updated_at: Date;
  session_closed_at: Date | null;
  candidate_id: string | null;
  candidate_code: string | null;
  candidate_version: number | null;
  candidate_type: DiagnosticCandidateType | null;
  candidate_rule_version: string | null;
  candidate_title: string | null;
  candidate_rank: number | null;
  evidence_level: DiagnosticEvidenceLevel | null;
  candidate_explanation: string | null;
  candidate_updated_at: Date | null;
  inspection_id: string | null;
  inspection_rule_version: string | null;
  inspection_title: string | null;
  inspection_status: InspectionPlanStatus | null;
  inspection_result_code: InspectionAnswerCode | null;
  inspection_updated_at: Date | null;
  action_plan_id: string | null;
  action_title: string | null;
  action_status: ActionPlanStatus | null;
  action_planned_start_date: string | Date | null;
  action_completed_at: Date | null;
  action_updated_at: Date | null;
  has_eligible_evaluation_bill: boolean | null;
  outcome_id: string | null;
  outcome_action_plan_id: string | null;
  baseline_period_start: string | null;
  baseline_period_end: string | null;
  follow_up_period_start: string | null;
  follow_up_period_end: string | null;
  cost_direction: Exclude<OutcomeDirection, 'UNAVAILABLE'> | null;
  usage_direction: OutcomeDirection | null;
  data_quality_code: OutcomeDataQualityCode | null;
  overall_outcome_code: OverallOutcomeCode | null;
  evaluated_at: Date | null;
  outcome_updated_at: Date | null;
}

function dateOnly(value: string | Date): string {
  if (typeof value === 'string') return value;
  const parts = new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: 'Asia/Jakarta',
  }).formatToParts(value);
  const year = parts.find((part) => part.type === 'year')?.value;
  const month = parts.find((part) => part.type === 'month')?.value;
  const day = parts.find((part) => part.type === 'day')?.value;
  if (!year || !month || !day) throw new Error('Invalid dashboard date');
  return `${year}-${month}-${day}`;
}

function mapBill(row: BillRow): BillRecord {
  return {
    id: row.id,
    businessId: row.business_id,
    businessName: row.business_name,
    periodStart: dateOnly(row.period_start),
    periodEnd: dateOnly(row.period_end),
    totalAmountRupiah: BigInt(row.total_amount_rupiah),
    kwh: row.kwh,
    tariffRupiahPerKwh: row.tariff_rupiah_per_kwh,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapJourney(rows: JourneyRow[]): DashboardDiagnosticRecord | null {
  const first = rows[0];
  if (!first) return null;

  const candidates = rows.flatMap((row): DashboardCandidateRecord[] => {
    if (
      !row.candidate_id ||
      !row.candidate_code ||
      row.candidate_version === null ||
      !row.candidate_type ||
      !row.candidate_rule_version ||
      !row.candidate_title ||
      row.candidate_rank === null ||
      !row.evidence_level ||
      !row.candidate_explanation ||
      !row.candidate_updated_at
    ) {
      return [];
    }

    const inspection =
      row.inspection_id &&
      row.inspection_rule_version &&
      row.inspection_title &&
      row.inspection_status &&
      row.inspection_updated_at
        ? {
            id: row.inspection_id,
            ruleVersion: row.inspection_rule_version,
            title: row.inspection_title,
            status: row.inspection_status,
            resultCode: row.inspection_result_code,
            updatedAt: row.inspection_updated_at,
          }
        : null;

    const actionPlan =
      row.action_plan_id &&
      row.action_title &&
      row.action_status &&
      row.action_planned_start_date &&
      row.action_updated_at
        ? {
            id: row.action_plan_id,
            title: row.action_title,
            status: row.action_status,
            plannedStartDate: dateOnly(row.action_planned_start_date),
            completedAt: row.action_completed_at,
            hasEligibleEvaluationBill: row.has_eligible_evaluation_bill === true,
            updatedAt: row.action_updated_at,
          }
        : null;

    const outcome =
      row.outcome_id &&
      row.outcome_action_plan_id &&
      row.baseline_period_start &&
      row.baseline_period_end &&
      row.follow_up_period_start &&
      row.follow_up_period_end &&
      row.cost_direction &&
      row.usage_direction &&
      row.data_quality_code &&
      row.overall_outcome_code &&
      row.evaluated_at &&
      row.outcome_updated_at
        ? {
            id: row.outcome_id,
            actionPlanId: row.outcome_action_plan_id,
            baselinePeriodStart: row.baseline_period_start,
            baselinePeriodEnd: row.baseline_period_end,
            followUpPeriodStart: row.follow_up_period_start,
            followUpPeriodEnd: row.follow_up_period_end,
            costDirection: row.cost_direction,
            usageDirection: row.usage_direction,
            dataQualityCode: row.data_quality_code,
            overallOutcomeCode: row.overall_outcome_code,
            evaluatedAt: row.evaluated_at,
            updatedAt: row.outcome_updated_at,
          }
        : null;

    return [
      {
        id: row.candidate_id,
        candidateCode: row.candidate_code,
        candidateVersion: row.candidate_version,
        candidateType: row.candidate_type,
        candidateRuleVersion: row.candidate_rule_version,
        title: row.candidate_title,
        rank: row.candidate_rank,
        evidenceLevel: row.evidence_level,
        explanation: row.candidate_explanation,
        updatedAt: row.candidate_updated_at,
        inspection,
        actionPlan,
        outcome,
      },
    ];
  });

  return {
    id: first.session_id,
    electricityBillId: first.electricity_bill_id,
    comparisonBillId: first.comparison_bill_id,
    status: first.session_status,
    createdAt: first.session_created_at,
    updatedAt: first.session_updated_at,
    closedAt: first.session_closed_at,
    candidates,
  };
}

/**
 * Reads the entire dashboard in exactly three bounded queries. The relevant session is the
 * newest non-closed session, or the newest closed session when no active session exists.
 */
export async function readDashboardSnapshot(
  userId: string,
  requestedBusinessId?: string
): Promise<DashboardRepositorySnapshot> {
  if (!userId) return { businesses: [], business: null, bills: [], diagnostic: null };

  const client = await getPool().connect();
  try {
    const businessResult = await client.query<BusinessRow>(
      `SELECT id, name, segment, is_active, created_at, updated_at
         FROM business
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at ASC, id ASC`,
      [userId]
    );
    const businesses = businessResult.rows.map((row) => ({
      id: row.id,
      name: row.name,
      segment: row.segment,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
    const business = requestedBusinessId
      ? businesses.find((item) => item.id === requestedBusinessId) ?? null
      : businesses[0] ?? null;

    const billResult = await client.query<BillRow>(
      `SELECT eb.id, eb.business_id, b.name AS business_name, eb.period_start, eb.period_end,
              eb.total_amount_rupiah, eb.kwh, eb.tariff_rupiah_per_kwh, eb.notes,
              eb.created_at, eb.updated_at
         FROM electricity_bill eb
         JOIN business b ON b.id = eb.business_id
        WHERE b.user_id = $1 AND b.is_active = true AND eb.business_id = $2
        ORDER BY eb.period_end DESC, eb.period_start DESC, eb.id DESC
        LIMIT 2`,
      [userId, business?.id ?? null]
    );

    const journeyResult = await client.query<JourneyRow>(
      `WITH latest_session AS (
         SELECT ds.id, ds.electricity_bill_id, ds.comparison_bill_id, ds.status,
                ds.created_at, ds.updated_at, ds.closed_at
           FROM diagnostic_session ds
           JOIN business b ON b.id = ds.business_id
          WHERE b.user_id = $1 AND b.is_active = true AND ds.business_id = $2
          ORDER BY (ds.status <> 'CLOSED') DESC, ds.created_at DESC, ds.id DESC
          LIMIT 1
       ), ranked_candidates AS (
         SELECT dc.*
           FROM diagnostic_candidate dc
           JOIN latest_session ls ON ls.id = dc.diagnostic_session_id
          ORDER BY dc.rank ASC, dc.id ASC
          LIMIT 3
       )
       SELECT
         ls.id AS session_id,
         ls.electricity_bill_id,
         ls.comparison_bill_id,
         ls.status AS session_status,
         ls.created_at AS session_created_at,
         ls.updated_at AS session_updated_at,
         ls.closed_at AS session_closed_at,
         dc.id AS candidate_id,
         dc.candidate_code,
         dc.candidate_version,
         dc.candidate_type,
         dc.rule_version AS candidate_rule_version,
         dc.title AS candidate_title,
         dc.rank AS candidate_rank,
         dc.evidence_level,
         dc.explanation AS candidate_explanation,
         dc.updated_at AS candidate_updated_at,
         ip.id AS inspection_id,
         ip.rule_version AS inspection_rule_version,
         ip.title AS inspection_title,
         ip.status AS inspection_status,
         ip.result_code AS inspection_result_code,
         ip.updated_at AS inspection_updated_at,
         ap.id AS action_plan_id,
         ap.title_snapshot AS action_title,
         ap.status AS action_status,
         ap.planned_start_date AS action_planned_start_date,
         ap.completed_at AS action_completed_at,
         ap.updated_at AS action_updated_at,
         CASE WHEN ap.status = 'COMPLETED' AND ap.completed_at IS NOT NULL THEN EXISTS (
           SELECT 1
             FROM electricity_bill eligible_bill
            WHERE eligible_bill.business_id = $2
              AND eligible_bill.period_start > (ap.completed_at AT TIME ZONE 'Asia/Jakarta')::date
              AND eligible_bill.id <> COALESCE(ap.baseline_snapshot_json->>'sourceBillId', '')
              AND eligible_bill.id <> COALESCE(ap.baseline_snapshot_json->>'comparisonBillId', '')
         ) ELSE false END AS has_eligible_evaluation_bill,
         oe.id AS outcome_id,
         oe.action_plan_id AS outcome_action_plan_id,
         oe.baseline_snapshot_json->>'periodStart' AS baseline_period_start,
         oe.baseline_snapshot_json->>'periodEnd' AS baseline_period_end,
         oe.follow_up_snapshot_json->>'periodStart' AS follow_up_period_start,
         oe.follow_up_snapshot_json->>'periodEnd' AS follow_up_period_end,
         oe.cost_direction,
         oe.usage_direction,
         oe.data_quality_code,
         oe.overall_outcome_code,
         oe.evaluated_at,
         oe.updated_at AS outcome_updated_at
       FROM latest_session ls
       LEFT JOIN ranked_candidates dc ON true
       LEFT JOIN inspection_plan ip ON ip.diagnostic_candidate_id = dc.id
       LEFT JOIN energy_action_plan ap ON ap.inspection_plan_id = ip.id
       LEFT JOIN action_outcome_evaluation oe ON oe.action_plan_id = ap.id
       ORDER BY dc.rank ASC NULLS LAST, dc.id ASC`,
      [userId, business?.id ?? null]
    );

    return {
      businesses,
      business,
      bills: billResult.rows.map(mapBill),
      diagnostic: mapJourney(journeyResult.rows),
    };
  } finally {
    client.release();
  }
}
