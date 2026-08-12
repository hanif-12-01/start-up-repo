import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  check,
  index,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';
import { business } from './journey';

export const aiShadowForecast = pgTable(
  'ai_shadow_forecast',
  {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    businessId: text('business_id').notNull().references(() => business.id, { onDelete: 'cascade' }),
    requestId: text('request_id').notNull(),
    forecastOrigin: timestamp('forecast_origin', { withTimezone: true }).notNull(),
    targetPeriod: text('target_period').notNull(),
    dataProvenance: text('data_provenance').notNull(),
    prospectiveForecast: boolean('prospective_forecast').notNull().default(true),
    historyPhase: text('history_phase').notNull(),
    historyFingerprint: text('history_fingerprint').notNull(),
    transientPayload: jsonb('transient_payload'),
    mode: text('mode').notNull(),
    status: text('status').notNull(),
    deterministicPredictionKwh: numeric('deterministic_prediction_kwh', { precision: 15, scale: 3 }),
    mlPredictionKwh: numeric('ml_prediction_kwh', { precision: 15, scale: 3 }),
    mlModel: text('ml_model'),
    mlModelVersion: text('ml_model_version'),
    artifactSha256: text('artifact_sha256'),
    featureSchemaSha256: text('feature_schema_sha256').notNull(),
    fallbackReason: text('fallback_reason'),
    inferenceLatencyMs: numeric('inference_latency_ms', { precision: 15, scale: 3 }),
    actualKwh: numeric('actual_kwh', { precision: 15, scale: 3 }),
    actualKwhSource: text('actual_kwh_source'),
    actualObservedAt: timestamp('actual_observed_at', { withTimezone: true }),
    absoluteErrorMl: numeric('absolute_error_ml', { precision: 15, scale: 3 }),
    absoluteErrorDeterministic: numeric('absolute_error_deterministic', { precision: 15, scale: 3 }),
    scoredAt: timestamp('scored_at', { withTimezone: true }),
    claimToken: text('claim_token'),
    claimedAt: timestamp('claimed_at', { withTimezone: true }),
    attemptCount: bigint('attempt_count', { mode: 'number' }).notNull().default(0),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('ai_shadow_forecast_request_unique').on(t.requestId),
    index('ai_shadow_forecast_claim_idx').on(t.status, t.nextAttemptAt, t.createdAt),
    index('ai_shadow_forecast_business_target_idx').on(t.businessId, t.targetPeriod),
    index('ai_shadow_forecast_real_evidence_idx')
      .on(t.dataProvenance, t.prospectiveForecast, t.scoredAt)
      .where(sql`${t.dataProvenance} = 'REAL_WATTWISE' AND ${t.prospectiveForecast} = true`),
    check('ai_shadow_forecast_mode_check', sql`${t.mode} IN ('SHADOW', 'LOCAL_EXPERIMENTAL')`),
    check('ai_shadow_forecast_provenance_check', sql`${t.dataProvenance} IN ('REAL_WATTWISE', 'SYNTHETIC_DEMO')`),
    check('ai_shadow_forecast_status_check', sql`${t.status} IN ('PENDING', 'PROCESSING', 'SUCCEEDED', 'FALLBACK', 'NOT_ELIGIBLE', 'FAILED_RETRYABLE', 'FAILED_TERMINAL')`),
    check('ai_shadow_forecast_phase_check', sql`${t.historyPhase} IN ('H00', 'H01_02', 'H03_05', 'H06_12', 'H13_PLUS')`),
    check('ai_shadow_forecast_actual_source_check', sql`${t.actualKwhSource} IS NULL OR ${t.actualKwhSource} IN ('USER_ENTERED', 'METER_DERIVED', 'LEGACY_UNKNOWN')`),
  ]
);

export type AiShadowForecast = typeof aiShadowForecast.$inferSelect;
