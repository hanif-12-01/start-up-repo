import { getPool } from '@/server/db/client';
import type { ActionPlanStatus } from '@/server/db/schema/action-plans';
import type { DiagnosticStatus } from '@/server/db/schema/diagnostics';
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

export const MONTHLY_REPORT_QUERY_COUNT = 4;
export const MONTHLY_REPORT_BILL_LIMIT = 12;

export interface MonthlyReportBusinessRecord {
  id: string;
  name: string;
  segment: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MonthlyReportContextSnapshot {
  businesses: MonthlyReportBusinessRecord[];
  business: MonthlyReportBusinessRecord | null;
  latestBillPeriodEnd: string | null;
  availableMonths: string[];
}

export interface MonthlyReportCandidateRecord {
  title: string;
  rank: number;
  explanation: string;
  inspection: {
    title: string;
    status: InspectionPlanStatus;
    resultCode: InspectionAnswerCode | null;
    completedAt: Date | null;
  } | null;
  actionPlan: {
    title: string;
    status: ActionPlanStatus;
    plannedStartDate: string;
    startedAt: Date | null;
    completedAt: Date | null;
    cancelledAt: Date | null;
  } | null;
  outcome: {
    baselinePeriodStart: string;
    baselinePeriodEnd: string;
    followUpPeriodStart: string;
    followUpPeriodEnd: string;
    costDirection: Exclude<OutcomeDirection, 'UNAVAILABLE'>;
    usageDirection: OutcomeDirection;
    tariffDirection: OutcomeDirection;
    dataQualityCode: OutcomeDataQualityCode;
    overallOutcomeCode: OverallOutcomeCode;
    explanation: string;
    evaluatedAt: Date;
  } | null;
}

export interface MonthlyReportJourneyRecord {
  status: DiagnosticStatus;
  startedAt: Date;
  closedAt: Date | null;
  candidates: MonthlyReportCandidateRecord[];
}

export interface MonthlyReportPeriodSnapshot {
  bills: BillRecord[];
  previousBill: BillRecord | null;
  journey: MonthlyReportJourneyRecord | null;
}

interface BusinessRow {
  id: string;
  name: string;
  segment: string;
  created_at: Date;
  updated_at: Date;
}

interface MonthMetadataRow {
  latest_bill_period_end: string | Date | null;
  available_months: string[] | null;
}

interface BillRow {
  row_kind: 'REPORT' | 'PREVIOUS';
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
  session_status: DiagnosticStatus;
  session_created_at: Date;
  session_closed_at: Date | null;
  candidate_title: string | null;
  candidate_rank: number | null;
  candidate_explanation: string | null;
  inspection_title: string | null;
  inspection_status: InspectionPlanStatus | null;
  inspection_result_code: InspectionAnswerCode | null;
  inspection_completed_at: Date | null;
  action_title: string | null;
  action_status: ActionPlanStatus | null;
  action_planned_start_date: string | Date | null;
  action_started_at: Date | null;
  action_completed_at: Date | null;
  action_cancelled_at: Date | null;
  baseline_period_start: string | null;
  baseline_period_end: string | null;
  follow_up_period_start: string | null;
  follow_up_period_end: string | null;
  cost_direction: Exclude<OutcomeDirection, 'UNAVAILABLE'> | null;
  usage_direction: OutcomeDirection | null;
  tariff_direction: OutcomeDirection | null;
  data_quality_code: OutcomeDataQualityCode | null;
  overall_outcome_code: OverallOutcomeCode | null;
  outcome_explanation: string | null;
  evaluated_at: Date | null;
}

function dateOnly(value: string | Date): string {
  if (typeof value === 'string') return value;
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function mapBusiness(row: BusinessRow): MonthlyReportBusinessRecord {
  return {
    id: row.id,
    name: row.name,
    segment: row.segment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

function mapJourney(rows: JourneyRow[]): MonthlyReportJourneyRecord | null {
  const first = rows[0];
  if (!first) return null;
  const candidates = rows.flatMap((row): MonthlyReportCandidateRecord[] => {
    if (
      row.candidate_title === null ||
      row.candidate_rank === null ||
      row.candidate_explanation === null
    ) {
      return [];
    }
    const inspection =
      row.inspection_title && row.inspection_status
        ? {
            title: row.inspection_title,
            status: row.inspection_status,
            resultCode: row.inspection_result_code,
            completedAt: row.inspection_completed_at,
          }
        : null;
    const actionPlan =
      row.action_title && row.action_status && row.action_planned_start_date
        ? {
            title: row.action_title,
            status: row.action_status,
            plannedStartDate: dateOnly(row.action_planned_start_date),
            startedAt: row.action_started_at,
            completedAt: row.action_completed_at,
            cancelledAt: row.action_cancelled_at,
          }
        : null;
    const outcome =
      row.baseline_period_start &&
      row.baseline_period_end &&
      row.follow_up_period_start &&
      row.follow_up_period_end &&
      row.cost_direction &&
      row.usage_direction &&
      row.tariff_direction &&
      row.data_quality_code &&
      row.overall_outcome_code &&
      row.outcome_explanation &&
      row.evaluated_at
        ? {
            baselinePeriodStart: row.baseline_period_start,
            baselinePeriodEnd: row.baseline_period_end,
            followUpPeriodStart: row.follow_up_period_start,
            followUpPeriodEnd: row.follow_up_period_end,
            costDirection: row.cost_direction,
            usageDirection: row.usage_direction,
            tariffDirection: row.tariff_direction,
            dataQualityCode: row.data_quality_code,
            overallOutcomeCode: row.overall_outcome_code,
            explanation: row.outcome_explanation,
            evaluatedAt: row.evaluated_at,
          }
        : null;
    return [
      {
        title: row.candidate_title,
        rank: row.candidate_rank,
        explanation: row.candidate_explanation,
        inspection,
        actionPlan,
        outcome,
      },
    ];
  });
  return {
    status: first.session_status,
    startedAt: first.session_created_at,
    closedAt: first.session_closed_at,
    candidates,
  };
}

export async function readMonthlyReportContext(
  userId: string,
  requestedBusinessId?: string
): Promise<MonthlyReportContextSnapshot> {
  if (!userId) {
    return { businesses: [], business: null, latestBillPeriodEnd: null, availableMonths: [] };
  }
  const client = await getPool().connect();
  try {
    const businessesResult = await client.query<BusinessRow>(
      `SELECT id, name, segment, created_at, updated_at
         FROM business
        WHERE user_id = $1 AND is_active = true
        ORDER BY created_at ASC, id ASC`,
      [userId]
    );
    const businesses = businessesResult.rows.map(mapBusiness);
    const business = requestedBusinessId
      ? businesses.find((item) => item.id === requestedBusinessId) ?? null
      : businesses[0] ?? null;
    if (!business) {
      return { businesses, business: null, latestBillPeriodEnd: null, availableMonths: [] };
    }
    const metadataResult = await client.query<MonthMetadataRow>(
      `WITH bill_months AS (
         SELECT to_char(period_end, 'YYYY-MM') AS month_key,
                max(period_end) AS latest_period_end
           FROM electricity_bill
          WHERE business_id = $1
          GROUP BY to_char(period_end, 'YYYY-MM')
          ORDER BY month_key DESC
          LIMIT 24
       )
       SELECT
         (SELECT max(period_end) FROM electricity_bill WHERE business_id = $1)
           AS latest_bill_period_end,
         COALESCE(array_agg(month_key ORDER BY month_key DESC), ARRAY[]::text[])
           AS available_months
         FROM bill_months`,
      [business.id]
    );
    const metadata = metadataResult.rows[0];
    return {
      businesses,
      business,
      latestBillPeriodEnd: metadata?.latest_bill_period_end
        ? dateOnly(metadata.latest_bill_period_end)
        : null,
      availableMonths: metadata?.available_months ?? [],
    };
  } finally {
    client.release();
  }
}

export async function readMonthlyReportPeriod(input: {
  userId: string;
  businessId: string;
  monthStart: string;
  nextMonthStart: string;
}): Promise<MonthlyReportPeriodSnapshot> {
  const client = await getPool().connect();
  try {
    const billsResult = await client.query<BillRow>(
      `WITH report_bills AS (
         SELECT eb.*, b.name AS business_name
           FROM electricity_bill eb
           JOIN business b ON b.id = eb.business_id
          WHERE b.user_id = $1 AND b.is_active = true
            AND eb.business_id = $2
            AND eb.period_end >= $3::date
            AND eb.period_end < $4::date
          ORDER BY eb.period_end DESC, eb.period_start DESC,
                   eb.created_at DESC, eb.id DESC
          LIMIT 13
       ), primary_bill AS (
         SELECT * FROM report_bills
          ORDER BY period_end DESC, period_start DESC, created_at DESC, id DESC
          LIMIT 1
       ), previous_bill AS (
         SELECT eb.*, b.name AS business_name
           FROM electricity_bill eb
           JOIN business b ON b.id = eb.business_id
           JOIN primary_bill pb ON pb.business_id = eb.business_id
          WHERE b.user_id = $1 AND b.is_active = true
            AND eb.period_end < pb.period_start
          ORDER BY eb.period_end DESC, eb.period_start DESC,
                   eb.created_at DESC, eb.id DESC
          LIMIT 1
       )
       SELECT 'REPORT'::text AS row_kind, id, business_id, business_name,
              period_start, period_end, total_amount_rupiah, kwh,
              tariff_rupiah_per_kwh, notes, created_at, updated_at
         FROM report_bills
       UNION ALL
       SELECT 'PREVIOUS'::text AS row_kind, id, business_id, business_name,
              period_start, period_end, total_amount_rupiah, kwh,
              tariff_rupiah_per_kwh, notes, created_at, updated_at
         FROM previous_bill`,
      [input.userId, input.businessId, input.monthStart, input.nextMonthStart]
    );
    const bills = billsResult.rows
      .filter((row) => row.row_kind === 'REPORT')
      .map(mapBill);
    const previousRow = billsResult.rows.find((row) => row.row_kind === 'PREVIOUS');
    const primaryBill = bills[0] ?? null;

    let journey: MonthlyReportJourneyRecord | null = null;
    if (primaryBill) {
      const journeyResult = await client.query<JourneyRow>(
        `WITH latest_session AS (
           SELECT ds.id, ds.status, ds.created_at, ds.closed_at
             FROM diagnostic_session ds
             JOIN business b ON b.id = ds.business_id
            WHERE b.user_id = $1 AND b.is_active = true
              AND ds.business_id = $2
              AND ds.electricity_bill_id = $3
            ORDER BY ds.created_at DESC, ds.id DESC
            LIMIT 1
         ), ranked_candidates AS (
           SELECT dc.*
             FROM diagnostic_candidate dc
             JOIN latest_session ls ON ls.id = dc.diagnostic_session_id
            ORDER BY dc.rank ASC, dc.id ASC
            LIMIT 3
         )
         SELECT ls.status AS session_status,
                ls.created_at AS session_created_at,
                ls.closed_at AS session_closed_at,
                dc.title AS candidate_title,
                dc.rank AS candidate_rank,
                dc.explanation AS candidate_explanation,
                ip.title AS inspection_title,
                ip.status AS inspection_status,
                ip.result_code AS inspection_result_code,
                ip.completed_at AS inspection_completed_at,
                ap.title_snapshot AS action_title,
                ap.status AS action_status,
                ap.planned_start_date AS action_planned_start_date,
                ap.started_at AS action_started_at,
                ap.completed_at AS action_completed_at,
                ap.cancelled_at AS action_cancelled_at,
                oe.baseline_snapshot_json->>'periodStart' AS baseline_period_start,
                oe.baseline_snapshot_json->>'periodEnd' AS baseline_period_end,
                oe.follow_up_snapshot_json->>'periodStart' AS follow_up_period_start,
                oe.follow_up_snapshot_json->>'periodEnd' AS follow_up_period_end,
                oe.cost_direction,
                oe.usage_direction,
                oe.tariff_direction,
                oe.data_quality_code,
                oe.overall_outcome_code,
                oe.explanation_snapshot_json->>'title' AS outcome_explanation,
                oe.evaluated_at
           FROM latest_session ls
           LEFT JOIN ranked_candidates dc ON true
           LEFT JOIN LATERAL (
             SELECT plan.* FROM inspection_plan plan
              WHERE plan.diagnostic_candidate_id = dc.id
              ORDER BY plan.created_at DESC, plan.id DESC
              LIMIT 1
           ) ip ON true
           LEFT JOIN energy_action_plan ap ON ap.inspection_plan_id = ip.id
           LEFT JOIN action_outcome_evaluation oe ON oe.action_plan_id = ap.id
          ORDER BY dc.rank ASC NULLS LAST, dc.id ASC`,
        [input.userId, input.businessId, primaryBill.id]
      );
      journey = mapJourney(journeyResult.rows);
    }
    return {
      bills,
      previousBill: previousRow ? mapBill(previousRow) : null,
      journey,
    };
  } finally {
    client.release();
  }
}
