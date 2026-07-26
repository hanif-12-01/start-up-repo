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
import { electricityBill } from './bills';
import { business } from './journey';

export const DIAGNOSTIC_STATUSES = [
  'DRAFT',
  'COLLECTING_CONTEXT',
  'ANALYZED',
  'INSPECTION_IN_PROGRESS',
  'CLOSED',
] as const;
export type DiagnosticStatus = (typeof DIAGNOSTIC_STATUSES)[number];

export const DIAGNOSTIC_ANSWER_CODES = ['YES', 'NO', 'UNKNOWN', 'NOT_APPLICABLE'] as const;
export type DiagnosticAnswerCode = (typeof DIAGNOSTIC_ANSWER_CODES)[number];

export const DIAGNOSTIC_CANDIDATE_TYPES = [
  'ADMINISTRATIVE',
  'OCCUPANCY',
  'OPERATIONAL',
  'APPLIANCE',
  'WATER_SYSTEM',
  'DATA_QUALITY',
  'OTHER',
] as const;
export type DiagnosticCandidateType = (typeof DIAGNOSTIC_CANDIDATE_TYPES)[number];

export const DIAGNOSTIC_EVIDENCE_LEVELS = ['STRONG', 'MODERATE', 'LIMITED'] as const;
export type DiagnosticEvidenceLevel = (typeof DIAGNOSTIC_EVIDENCE_LEVELS)[number];

export const diagnosticSession = pgTable(
  'diagnostic_session',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    businessId: text('business_id')
      .notNull()
      .references(() => business.id, { onDelete: 'cascade' }),
    electricityBillId: text('electricity_bill_id')
      .notNull()
      .references(() => electricityBill.id, { onDelete: 'cascade' }),
    comparisonBillId: text('comparison_bill_id')
      .notNull()
      .references(() => electricityBill.id, { onDelete: 'restrict' }),
    segmentCode: text('segment_code').notNull(),
    status: text('status').notNull().default('DRAFT'),
    ruleVersion: text('rule_version').notNull(),
    questionnaireCompletedAt: timestamp('questionnaire_completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('diagnostic_session_business_bill_rule_unique').on(
      t.businessId,
      t.electricityBillId,
      t.ruleVersion
    ),
    index('diagnostic_session_business_created_idx').on(t.businessId, t.createdAt),
    check(
      'diagnostic_session_status_check',
      sql`${t.status} IN ('DRAFT', 'COLLECTING_CONTEXT', 'ANALYZED', 'INSPECTION_IN_PROGRESS', 'CLOSED')`
    ),
    check(
      'diagnostic_session_segment_check',
      sql`${t.segmentCode} IN ('KOS', 'FNB', 'LAUNDRY', 'RETAIL', 'COLD_STORAGE', 'OTHER')`
    ),
    check('diagnostic_session_rule_version_check', sql`length(trim(${t.ruleVersion})) > 0`),
    check(
      'diagnostic_session_distinct_bills_check',
      sql`${t.electricityBillId} <> ${t.comparisonBillId}`
    ),
  ]
);

export const diagnosticAnswer = pgTable(
  'diagnostic_answer',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    diagnosticSessionId: text('diagnostic_session_id')
      .notNull()
      .references(() => diagnosticSession.id, { onDelete: 'cascade' }),
    questionCode: text('question_code').notNull(),
    questionVersion: integer('question_version').notNull(),
    answerCode: text('answer_code').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('diagnostic_answer_session_question_unique').on(
      t.diagnosticSessionId,
      t.questionCode,
      t.questionVersion
    ),
    index('diagnostic_answer_session_created_idx').on(
      t.diagnosticSessionId,
      t.createdAt,
      t.id
    ),
    check('diagnostic_answer_question_code_check', sql`length(trim(${t.questionCode})) > 0`),
    check('diagnostic_answer_question_version_check', sql`${t.questionVersion} > 0`),
    check(
      'diagnostic_answer_code_check',
      sql`${t.answerCode} IN ('YES', 'NO', 'UNKNOWN', 'NOT_APPLICABLE')`
    ),
  ]
);

export const diagnosticCandidate = pgTable(
  'diagnostic_candidate',
  {
    id: text('id')
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    diagnosticSessionId: text('diagnostic_session_id')
      .notNull()
      .references(() => diagnosticSession.id, { onDelete: 'cascade' }),
    candidateCode: text('candidate_code').notNull(),
    candidateVersion: integer('candidate_version').notNull(),
    candidateType: text('candidate_type').notNull(),
    ruleVersion: text('rule_version').notNull(),
    title: text('title').notNull(),
    rank: integer('rank').notNull(),
    internalScore: integer('internal_score').notNull(),
    evidenceLevel: text('evidence_level').notNull(),
    explanation: text('explanation').notNull(),
    supportingFactorsJson: jsonb('supporting_factors_json').notNull().default([]),
    contradictingFactorsJson: jsonb('contradicting_factors_json').notNull().default([]),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('diagnostic_candidate_session_code_version_rule_unique').on(
      t.diagnosticSessionId,
      t.candidateCode,
      t.candidateVersion,
      t.ruleVersion
    ),
    unique('diagnostic_candidate_session_rule_rank_unique').on(
      t.diagnosticSessionId,
      t.ruleVersion,
      t.rank
    ),
    index('diagnostic_candidate_session_rank_idx').on(
      t.diagnosticSessionId,
      t.ruleVersion,
      t.rank
    ),
    check('diagnostic_candidate_code_check', sql`length(trim(${t.candidateCode})) > 0`),
    check('diagnostic_candidate_version_check', sql`${t.candidateVersion} > 0`),
    check('diagnostic_candidate_rule_version_check', sql`length(trim(${t.ruleVersion})) > 0`),
    check(
      'diagnostic_candidate_type_check',
      sql`${t.candidateType} IN ('ADMINISTRATIVE', 'OCCUPANCY', 'OPERATIONAL', 'APPLIANCE', 'WATER_SYSTEM', 'DATA_QUALITY', 'OTHER')`
    ),
    check('diagnostic_candidate_title_check', sql`length(trim(${t.title})) > 0`),
    check('diagnostic_candidate_rank_check', sql`${t.rank} BETWEEN 1 AND 3`),
    check('diagnostic_candidate_score_check', sql`${t.internalScore} BETWEEN 0 AND 100`),
    check(
      'diagnostic_candidate_evidence_check',
      sql`${t.evidenceLevel} IN ('STRONG', 'MODERATE', 'LIMITED')`
    ),
    check(
      'diagnostic_candidate_explanation_check',
      sql`length(trim(${t.explanation})) > 0`
    ),
    check(
      'diagnostic_candidate_supporting_factors_check',
      sql`jsonb_typeof(${t.supportingFactorsJson}) = 'array'`
    ),
    check(
      'diagnostic_candidate_contradicting_factors_check',
      sql`jsonb_typeof(${t.contradictingFactorsJson}) = 'array'`
    ),
  ]
);

export type DiagnosticSession = typeof diagnosticSession.$inferSelect;
export type DiagnosticAnswer = typeof diagnosticAnswer.$inferSelect;
export type DiagnosticCandidate = typeof diagnosticCandidate.$inferSelect;
