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
import { diagnosticCandidate } from './diagnostics';
import { inspectionPlan } from './inspections';
import { business } from './journey';

export const ACTION_PLAN_STATUSES = [
  'PLANNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
] as const;
export type ActionPlanStatus = (typeof ACTION_PLAN_STATUSES)[number];

export const ACTION_PLAN_REVIEW_MODES = ['NEXT_ELIGIBLE_BILL'] as const;
export type ActionPlanReviewMode = (typeof ACTION_PLAN_REVIEW_MODES)[number];

export const energyActionPlan = pgTable(
  'energy_action_plan',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: text('business_id')
      .notNull()
      .references(() => business.id, { onDelete: 'cascade' }),
    diagnosticCandidateId: text('diagnostic_candidate_id')
      .notNull()
      .references(() => diagnosticCandidate.id, { onDelete: 'cascade' }),
    inspectionPlanId: text('inspection_plan_id')
      .notNull()
      .references(() => inspectionPlan.id, { onDelete: 'cascade' }),
    actionCode: text('action_code').notNull(),
    actionVersion: integer('action_version').notNull(),
    ruleVersion: text('rule_version').notNull(),
    titleSnapshot: text('title_snapshot').notNull(),
    descriptionSnapshot: text('description_snapshot').notNull(),
    reasonSnapshot: text('reason_snapshot').notNull(),
    stepsSnapshotJson: jsonb('steps_snapshot_json').notNull(),
    inspectionResultSnapshot: text('inspection_result_snapshot').notNull(),
    baselineSnapshotJson: jsonb('baseline_snapshot_json').notNull(),
    status: text('status').notNull().default('PLANNED'),
    reviewMode: text('review_mode').notNull().default('NEXT_ELIGIBLE_BILL'),
    plannedStartDate: date('planned_start_date').notNull(),
    userNote: text('user_note'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('energy_action_plan_inspection_unique').on(t.inspectionPlanId),
    index('energy_action_plan_business_status_idx').on(t.businessId, t.status),
    index('energy_action_plan_candidate_idx').on(t.diagnosticCandidateId),
    check('energy_action_plan_code_check', sql`length(trim(${t.actionCode})) > 0`),
    check('energy_action_plan_version_check', sql`${t.actionVersion} > 0`),
    check('energy_action_plan_rule_check', sql`length(trim(${t.ruleVersion})) > 0`),
    check('energy_action_plan_title_check', sql`length(trim(${t.titleSnapshot})) > 0`),
    check(
      'energy_action_plan_description_check',
      sql`length(trim(${t.descriptionSnapshot})) > 0`
    ),
    check('energy_action_plan_reason_check', sql`length(trim(${t.reasonSnapshot})) > 0`),
    check(
      'energy_action_plan_steps_check',
      sql`jsonb_typeof(${t.stepsSnapshotJson}) = 'array' AND jsonb_array_length(${t.stepsSnapshotJson}) > 0`
    ),
    check(
      'energy_action_plan_baseline_check',
      sql`jsonb_typeof(${t.baselineSnapshotJson}) = 'object'`
    ),
    check(
      'energy_action_plan_result_check',
      sql`${t.inspectionResultSnapshot} IN ('FOUND', 'UNKNOWN', 'NEEDS_HELP')`
    ),
    check(
      'energy_action_plan_status_check',
      sql`${t.status} IN ('PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')`
    ),
    check(
      'energy_action_plan_review_mode_check',
      sql`${t.reviewMode} = 'NEXT_ELIGIBLE_BILL'`
    ),
    check(
      'energy_action_plan_note_length_check',
      sql`${t.userNote} IS NULL OR char_length(${t.userNote}) <= 1000`
    ),
    check(
      'energy_action_plan_lifecycle_check',
      sql`(${t.status} = 'PLANNED' AND ${t.startedAt} IS NULL AND ${t.completedAt} IS NULL AND ${t.cancelledAt} IS NULL)
        OR (${t.status} = 'IN_PROGRESS' AND ${t.startedAt} IS NOT NULL AND ${t.completedAt} IS NULL AND ${t.cancelledAt} IS NULL)
        OR (${t.status} = 'COMPLETED' AND ${t.startedAt} IS NOT NULL AND ${t.completedAt} IS NOT NULL AND ${t.cancelledAt} IS NULL)
        OR (${t.status} = 'CANCELLED' AND ${t.completedAt} IS NULL AND ${t.cancelledAt} IS NOT NULL)`
    ),
  ]
);

export type EnergyActionPlan = typeof energyActionPlan.$inferSelect;
