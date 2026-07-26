import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { diagnosticCandidate } from './diagnostics';
import { business } from './journey';

export const INSPECTION_PLAN_STATUSES = ['IN_PROGRESS', 'COMPLETED'] as const;
export type InspectionPlanStatus = (typeof INSPECTION_PLAN_STATUSES)[number];

export const INSPECTION_ITEM_STATUSES = ['PENDING', 'ANSWERED'] as const;
export type InspectionItemStatus = (typeof INSPECTION_ITEM_STATUSES)[number];

export const INSPECTION_ANSWER_CODES = [
  'FOUND',
  'NOT_FOUND',
  'UNKNOWN',
  'NEEDS_HELP',
] as const;
export type InspectionAnswerCode = (typeof INSPECTION_ANSWER_CODES)[number];

export const INSPECTION_SAFETY_LEVELS = [
  'SAFE_OBSERVATION',
  'PROFESSIONAL_REQUIRED',
] as const;
export type InspectionSafetyLevel = (typeof INSPECTION_SAFETY_LEVELS)[number];

export const inspectionPlan = pgTable(
  'inspection_plan',
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
    inspectionCode: text('inspection_code').notNull(),
    inspectionVersion: integer('inspection_version').notNull(),
    ruleVersion: text('rule_version').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull().default('IN_PROGRESS'),
    resultCode: text('result_code'),
    userNote: text('user_note'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('inspection_plan_candidate_code_version_rule_unique').on(
      t.diagnosticCandidateId,
      t.inspectionCode,
      t.inspectionVersion,
      t.ruleVersion
    ),
    index('inspection_plan_business_status_idx').on(t.businessId, t.status),
    index('inspection_plan_candidate_idx').on(t.diagnosticCandidateId),
    check('inspection_plan_code_check', sql`length(trim(${t.inspectionCode})) > 0`),
    check('inspection_plan_version_check', sql`${t.inspectionVersion} > 0`),
    check('inspection_plan_rule_version_check', sql`length(trim(${t.ruleVersion})) > 0`),
    check('inspection_plan_title_check', sql`length(trim(${t.title})) > 0`),
    check(
      'inspection_plan_status_check',
      sql`${t.status} IN ('IN_PROGRESS', 'COMPLETED')`
    ),
    check(
      'inspection_plan_result_check',
      sql`${t.resultCode} IS NULL OR ${t.resultCode} IN ('FOUND', 'NOT_FOUND', 'UNKNOWN', 'NEEDS_HELP')`
    ),
    check(
      'inspection_plan_note_length_check',
      sql`${t.userNote} IS NULL OR char_length(${t.userNote}) <= 1000`
    ),
    check(
      'inspection_plan_completion_check',
      sql`(${t.status} = 'IN_PROGRESS' AND ${t.resultCode} IS NULL AND ${t.completedAt} IS NULL)
        OR (${t.status} = 'COMPLETED' AND ${t.resultCode} IS NOT NULL AND ${t.completedAt} IS NOT NULL)`
    ),
  ]
);

export const inspectionItem = pgTable(
  'inspection_item',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    planId: text('plan_id')
      .notNull()
      .references(() => inspectionPlan.id, { onDelete: 'cascade' }),
    itemCode: text('item_code').notNull(),
    itemVersion: integer('item_version').notNull(),
    instructionSnapshot: text('instruction_snapshot').notNull(),
    safetyLevel: text('safety_level').notNull(),
    resultOptionsJson: jsonb('result_options_json').notNull().default([]),
    sortOrder: integer('sort_order').notNull(),
    status: text('status').notNull().default('PENDING'),
    answerCode: text('answer_code'),
    note: text('note'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('inspection_item_plan_code_version_unique').on(
      t.planId,
      t.itemCode,
      t.itemVersion
    ),
    unique('inspection_item_plan_sort_unique').on(t.planId, t.sortOrder),
    index('inspection_item_plan_order_idx').on(t.planId, t.sortOrder),
    check('inspection_item_code_check', sql`length(trim(${t.itemCode})) > 0`),
    check('inspection_item_version_check', sql`${t.itemVersion} > 0`),
    check(
      'inspection_item_instruction_check',
      sql`length(trim(${t.instructionSnapshot})) > 0`
    ),
    check(
      'inspection_item_safety_check',
      sql`${t.safetyLevel} IN ('SAFE_OBSERVATION', 'PROFESSIONAL_REQUIRED')`
    ),
    check(
      'inspection_item_result_options_check',
      sql`jsonb_typeof(${t.resultOptionsJson}) = 'array' AND jsonb_array_length(${t.resultOptionsJson}) > 0`
    ),
    check('inspection_item_sort_order_check', sql`${t.sortOrder} > 0`),
    check(
      'inspection_item_status_check',
      sql`${t.status} IN ('PENDING', 'ANSWERED')`
    ),
    check(
      'inspection_item_answer_check',
      sql`${t.answerCode} IS NULL OR ${t.answerCode} IN ('FOUND', 'NOT_FOUND', 'UNKNOWN', 'NEEDS_HELP')`
    ),
    check(
      'inspection_item_note_length_check',
      sql`${t.note} IS NULL OR char_length(${t.note}) <= 1000`
    ),
    check(
      'inspection_item_completion_check',
      sql`(${t.status} = 'PENDING' AND ${t.answerCode} IS NULL AND ${t.completedAt} IS NULL)
        OR (${t.status} = 'ANSWERED' AND ${t.answerCode} IS NOT NULL AND ${t.completedAt} IS NOT NULL)`
    ),
  ]
);

export type InspectionPlan = typeof inspectionPlan.$inferSelect;
export type InspectionItem = typeof inspectionItem.$inferSelect;
