import { getPool } from '@/server/db/client';
import { countEnabledRealEnrollments } from '@/server/repositories/ai-shadow-enrollment.repository';
import { listPromotionGradeRealEvidence } from '@/server/repositories/ai-shadow.repository';
import { getAiIntegrationDiagnostics } from './ai-forecast.service';
import { calculateEvidenceMetrics, segmentEvidence, type EvidencePair } from './ai-evidence-metrics.service';
import { logger } from '@/server/logger';

export interface AiMonitoringThresholds {
  latencyWarningMs: number;
  latencyCriticalMs: number;
  failureWarningRate: number;
  failureCriticalRate: number;
  backlogWarningSeconds: number;
  backlogCriticalSeconds: number;
}

export const DEFAULT_AI_MONITORING_THRESHOLDS: AiMonitoringThresholds = {
  latencyWarningMs: 500,
  latencyCriticalMs: 750,
  failureWarningRate: 0.005,
  failureCriticalRate: 0.01,
  backlogWarningSeconds: 15 * 60,
  backlogCriticalSeconds: 60 * 60,
};

function finiteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function evaluateAlertState(input: {
  serviceReady: boolean;
  identityMatch: boolean;
  p95LatencyMs: number | null;
  systemFailureRate: number;
  oldestEligibleSeconds: number | null;
}, thresholds = DEFAULT_AI_MONITORING_THRESHOLDS): 'OK' | 'WARNING' | 'CRITICAL' {
  if (!input.serviceReady || !input.identityMatch ||
      input.systemFailureRate > thresholds.failureCriticalRate ||
      (input.p95LatencyMs ?? 0) > thresholds.latencyCriticalMs ||
      (input.oldestEligibleSeconds ?? 0) > thresholds.backlogCriticalSeconds) return 'CRITICAL';
  if (input.systemFailureRate > thresholds.failureWarningRate ||
      (input.p95LatencyMs ?? 0) > thresholds.latencyWarningMs ||
      (input.oldestEligibleSeconds ?? 0) > thresholds.backlogWarningSeconds) return 'WARNING';
  return 'OK';
}

export async function getAiShadowMonitoringSummary(fetcher: typeof fetch = fetch) {
  const pool = getPool();
  const [outboxResult, latencyResult, evidenceCounts, domainDistribution, enrolled, evidenceRows, diagnostics] = await Promise.all([
    pool.query(`
      SELECT
        count(*) FILTER (WHERE status = 'PENDING')::int AS pending,
        count(*) FILTER (WHERE status = 'PROCESSING')::int AS processing,
        count(*) FILTER (WHERE status = 'SUCCEEDED')::int AS succeeded,
        count(*) FILTER (WHERE status = 'FAILED_RETRYABLE')::int AS failed_retryable,
        count(*) FILTER (WHERE status = 'FALLBACK')::int AS fallback,
        extract(epoch FROM (NOW() - min(created_at) FILTER (WHERE status = 'PENDING'))) AS oldest_pending_seconds,
        extract(epoch FROM (NOW() - min(updated_at) FILTER (WHERE status = 'FAILED_RETRYABLE'))) AS oldest_retryable_seconds,
        count(*) FILTER (WHERE status = 'PROCESSING' AND claimed_at < NOW() - INTERVAL '5 minutes')::int AS stale_processing,
        coalesce(avg(attempt_count), 0)::float AS average_attempt_count,
        coalesce(max(attempt_count), 0)::int AS max_attempt_count
      FROM ai_shadow_forecast`),
    pool.query(`
      WITH real_payloads AS (
        SELECT transient_payload
          FROM ai_shadow_forecast
         WHERE data_provenance = 'REAL_WATTWISE'
           AND transient_payload IS NOT NULL
      ), observations AS (
        SELECT (observation->>'usage_kwh')::float AS usage_kwh
          FROM real_payloads
          CROSS JOIN LATERAL jsonb_array_elements(transient_payload->'history') observation
      ), business_types AS (
        SELECT coalesce(transient_payload->'contextual_features'->>'business_type', 'MISSING') AS business_type,
               count(*)::int AS count
          FROM real_payloads
         GROUP BY 1
      )
      SELECT
        (SELECT count(*)::int FROM real_payloads) AS payload_count,
        (SELECT avg(jsonb_array_length(transient_payload->'history'))::float FROM real_payloads) AS average_history_length,
        (SELECT avg(usage_kwh)::float FROM observations) AS average_monthly_usage_kwh,
        (SELECT CASE WHEN count(*) = 0 THEN NULL ELSE count(*) FILTER (WHERE usage_kwh = 0)::float / count(*) END FROM observations) AS zero_usage_rate,
        (SELECT CASE WHEN count(*) = 0 THEN NULL ELSE count(*) FILTER (
          WHERE transient_payload->'contextual_features'->>'business_type' IS NULL
             OR transient_payload->'contextual_features'->>'timezone' IS NULL
             OR transient_payload->'contextual_features'->>'building_area' IS NULL
        )::float / count(*) END FROM real_payloads) AS missing_context_rate,
        (SELECT coalesce(jsonb_object_agg(business_type, count), '{}'::jsonb) FROM business_types) AS business_type_distribution`),
    pool.query(`
      SELECT count(inference_latency_ms)::int AS count,
             percentile_cont(0.5) WITHIN GROUP (ORDER BY inference_latency_ms) AS p50,
             percentile_cont(0.95) WITHIN GROUP (ORDER BY inference_latency_ms) AS p95,
             percentile_cont(0.99) WITHIN GROUP (ORDER BY inference_latency_ms) AS p99,
             max(inference_latency_ms) AS max
        FROM ai_shadow_forecast
       WHERE status = 'SUCCEEDED' AND inference_latency_ms IS NOT NULL`),
    pool.query(`
      SELECT
        count(*) FILTER (WHERE data_provenance = 'REAL_WATTWISE' AND prospective_forecast)::int AS prospective,
        count(*) FILTER (WHERE data_provenance = 'REAL_WATTWISE' AND status = 'SUCCEEDED')::int AS successful,
        count(*) FILTER (WHERE data_provenance = 'REAL_WATTWISE' AND status = 'SUCCEEDED' AND actual_kwh IS NULL)::int AS awaiting_actual,
        count(*) FILTER (WHERE data_provenance = 'REAL_WATTWISE' AND scored_at IS NOT NULL)::int AS scored,
        count(*) FILTER (WHERE data_provenance = 'UNCLASSIFIED')::int AS excluded_unclassified,
        count(*) FILTER (WHERE data_provenance = 'SYNTHETIC_DEMO')::int AS excluded_synthetic,
        count(*) FILTER (WHERE NOT prospective_forecast)::int AS excluded_not_prospective,
        count(*) FILTER (WHERE NOT target_outcome_unknown_at_forecast)::int AS excluded_target_known,
        count(*) FILTER (WHERE actual_kwh_source = 'LEGACY_UNKNOWN')::int AS excluded_invalid_source,
        count(*) FILTER (WHERE ml_prediction_kwh IS NULL)::int AS excluded_ml_unavailable,
        count(*) FILTER (WHERE forecast_days_into_target IS NULL)::int AS excluded_timing_invalid
      FROM ai_shadow_forecast`),
    countEnabledRealEnrollments(),
    listPromotionGradeRealEvidence(),
    getAiIntegrationDiagnostics(undefined, fetcher),
  ]);
  const pairs: EvidencePair[] = evidenceRows.map((row) => ({
    actualKwh: Number(row.actual_kwh), nbeatsKwh: Number(row.ml_prediction_kwh),
    deterministicKwh: Number(row.deterministic_prediction_kwh),
    historyPhase: row.history_phase, timingBucket: row.forecast_timing_bucket,
    actualSource: row.actual_kwh_source, modelVersion: row.ml_model_version,
    artifactSha256: row.artifact_sha256, featureSchemaSha256: row.feature_schema_sha256,
    fingerprintKey: `${row.request_id}|${row.actual_observed_at.toISOString()}|${row.actual_kwh}`,
  }));
  const outbox = outboxResult.rows[0];
  const latencyRaw = latencyResult.rows[0];
  const validAttempts = Number(outbox.succeeded) + Number(outbox.failed_retryable) + Number(outbox.fallback);
  const systemFailureRate = validAttempts === 0 ? 0
    : (Number(outbox.failed_retryable) + Number(outbox.fallback)) / validAttempts;
  const p95 = finiteNumber(latencyRaw.p95);
  const oldestEligible = Math.max(
    finiteNumber(outbox.oldest_pending_seconds) ?? 0,
    finiteNumber(outbox.oldest_retryable_seconds) ?? 0
  ) || null;
  const identityMatch = diagnostics.modelVersionMatch && diagnostics.artifactChecksumMatch && diagnostics.featureSchemaMatch;
  const alertState = evaluateAlertState({
    serviceReady: diagnostics.serviceReady, identityMatch, p95LatencyMs: p95,
    systemFailureRate, oldestEligibleSeconds: oldestEligible,
  });
  if (alertState !== 'OK') {
    logger.warn('AI shadow monitoring alert', {
      event: 'ai_shadow_monitoring_alert', alertState,
      workerState: diagnostics.workerState, oldestEligibleSeconds: oldestEligible,
      systemFailureRate, p95LatencyMs: p95,
    });
  }
  const distribution = domainDistribution.rows[0];
  return {
    schemaVersion: '1.0', generatedAt: new Date().toISOString(), alertState,
    outbox: {
      pending: Number(outbox.pending), processing: Number(outbox.processing),
      succeeded: Number(outbox.succeeded), failedRetryable: Number(outbox.failed_retryable),
      fallback: Number(outbox.fallback), oldestPendingSeconds: finiteNumber(outbox.oldest_pending_seconds),
      oldestRetryableSeconds: finiteNumber(outbox.oldest_retryable_seconds),
      staleProcessing: Number(outbox.stale_processing), averageAttemptCount: finiteNumber(outbox.average_attempt_count),
      maxAttemptCount: Number(outbox.max_attempt_count), systemFailureRate,
    },
    service: diagnostics,
    latency: { count: Number(latencyRaw.count), p50: finiteNumber(latencyRaw.p50), p95, p99: finiteNumber(latencyRaw.p99), max: finiteNumber(latencyRaw.max) },
    evidenceCounts: { enrolledBusinesses: enrolled, ...evidenceCounts.rows[0] },
    accuracy: calculateEvidenceMetrics(pairs),
    segments: segmentEvidence(pairs),
    modelCohorts: Object.fromEntries([...new Set(pairs.map((pair) =>
      `${pair.modelVersion}|${pair.artifactSha256}|${pair.featureSchemaSha256}`
    ))].sort().map((cohort) => [
      cohort, calculateEvidenceMetrics(pairs.filter((pair) =>
        `${pair.modelVersion}|${pair.artifactSha256}|${pair.featureSchemaSha256}` === cohort
      )),
    ])),
    domainShift: {
      state: 'INSUFFICIENT_REFERENCE',
      reason: 'No approved product-domain training reference distribution.',
      observed: {
        payloadCount: Number(distribution.payload_count),
        averageHistoryLength: finiteNumber(distribution.average_history_length),
        averageMonthlyUsageKwh: finiteNumber(distribution.average_monthly_usage_kwh),
        zeroUsageRate: finiteNumber(distribution.zero_usage_rate),
        missingContextRate: finiteNumber(distribution.missing_context_rate),
        businessTypeDistribution: distribution.business_type_distribution,
      },
    },
    privacy: { aggregateOnly: true, piiIncluded: false },
  };
}
