import { sql } from 'drizzle-orm';
import {
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { energyActionPlan } from './action-plans';
import { electricityBill } from './bills';
import { diagnosticSession } from './diagnostics';
import { business } from './journey';

export const OUTCOME_DIRECTIONS = ['LOWER', 'SIMILAR', 'HIGHER', 'UNAVAILABLE'] as const;
export type OutcomeDirection = (typeof OUTCOME_DIRECTIONS)[number];

export const OUTCOME_DATA_QUALITY_CODES = [
  'USAGE_COMPLETE',
  'TARIFF_CONTEXT_ONLY',
  'COST_ONLY',
] as const;
export type OutcomeDataQualityCode = (typeof OUTCOME_DATA_QUALITY_CODES)[number];

export const OVERALL_OUTCOME_CODES = [
  'POSITIVE_SIGNAL',
  'NO_CLEAR_CHANGE',
  'NEGATIVE_SIGNAL',
  'MIXED_SIGNAL',
  'INCONCLUSIVE',
] as const;
export type OverallOutcomeCode = (typeof OVERALL_OUTCOME_CODES)[number];

export const actionOutcomeEvaluation = pgTable(
  'action_outcome_evaluation',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: text('business_id')
      .notNull()
      .references(() => business.id, { onDelete: 'cascade' }),
    diagnosticSessionId: text('diagnostic_session_id')
      .notNull()
      .references(() => diagnosticSession.id, { onDelete: 'cascade' }),
    actionPlanId: text('action_plan_id')
      .notNull()
      .references(() => energyActionPlan.id, { onDelete: 'cascade' }),
    baselineBillId: text('baseline_bill_id')
      .notNull()
      .references(() => electricityBill.id, { onDelete: 'restrict' }),
    followUpBillId: text('follow_up_bill_id')
      .notNull()
      .references(() => electricityBill.id, { onDelete: 'restrict' }),
    ruleVersion: text('rule_version').notNull(),
    similarityBandBps: integer('similarity_band_bps').notNull(),
    evaluationEligibleAfterDate: date('evaluation_eligible_after_date').notNull(),
    baselineSnapshotJson: jsonb('baseline_snapshot_json').notNull(),
    followUpSnapshotJson: jsonb('follow_up_snapshot_json').notNull(),
    comparisonSnapshotJson: jsonb('comparison_snapshot_json').notNull(),
    costDirection: text('cost_direction').notNull(),
    usageDirection: text('usage_direction').notNull(),
    tariffDirection: text('tariff_direction').notNull(),
    dataQualityCode: text('data_quality_code').notNull(),
    overallOutcomeCode: text('overall_outcome_code').notNull(),
    explanationSnapshotJson: jsonb('explanation_snapshot_json').notNull(),
    evaluatedAt: timestamp('evaluated_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('action_outcome_evaluation_action_unique').on(t.actionPlanId),
    index('action_outcome_evaluation_session_idx').on(t.diagnosticSessionId, t.createdAt),
    index('action_outcome_evaluation_business_idx').on(t.businessId, t.createdAt),
    check('action_outcome_rule_check', sql`length(trim(${t.ruleVersion})) > 0`),
    check('action_outcome_band_check', sql`${t.similarityBandBps} > 0`),
    check('action_outcome_distinct_bills_check', sql`${t.followUpBillId} <> ${t.baselineBillId}`),
    check(
      'action_outcome_baseline_snapshot_check',
      sql`jsonb_typeof(${t.baselineSnapshotJson}) = 'object' AND ${t.baselineSnapshotJson} <> '{}'::jsonb`
    ),
    check(
      'action_outcome_follow_up_snapshot_check',
      sql`jsonb_typeof(${t.followUpSnapshotJson}) = 'object' AND ${t.followUpSnapshotJson} <> '{}'::jsonb`
    ),
    check(
      'action_outcome_comparison_snapshot_check',
      sql`jsonb_typeof(${t.comparisonSnapshotJson}) = 'object' AND ${t.comparisonSnapshotJson} <> '{}'::jsonb`
    ),
    check(
      'action_outcome_explanation_snapshot_check',
      sql`jsonb_typeof(${t.explanationSnapshotJson}) = 'object' AND ${t.explanationSnapshotJson} <> '{}'::jsonb`
    ),
    check(
      'action_outcome_cost_direction_check',
      sql`${t.costDirection} IN ('LOWER', 'SIMILAR', 'HIGHER')`
    ),
    check(
      'action_outcome_usage_direction_check',
      sql`${t.usageDirection} IN ('LOWER', 'SIMILAR', 'HIGHER', 'UNAVAILABLE')`
    ),
    check(
      'action_outcome_tariff_direction_check',
      sql`${t.tariffDirection} IN ('LOWER', 'SIMILAR', 'HIGHER', 'UNAVAILABLE')`
    ),
    check(
      'action_outcome_data_quality_check',
      sql`${t.dataQualityCode} IN ('USAGE_COMPLETE', 'TARIFF_CONTEXT_ONLY', 'COST_ONLY')`
    ),
    check(
      'action_outcome_overall_check',
      sql`${t.overallOutcomeCode} IN ('POSITIVE_SIGNAL', 'NO_CLEAR_CHANGE', 'NEGATIVE_SIGNAL', 'MIXED_SIGNAL', 'INCONCLUSIVE')`
    ),
  ]
);

export type ActionOutcomeEvaluation = typeof actionOutcomeEvaluation.$inferSelect;
