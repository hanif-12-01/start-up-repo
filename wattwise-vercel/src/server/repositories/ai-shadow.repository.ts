import type { PoolClient } from 'pg';
import {
  AI05_ARTIFACT_SHA256,
  AI05_FEATURE_SCHEMA_SHA256,
  AI05_MODEL_VERSION,
  buildAiPayload,
  buildContiguousHistory,
  callAiService,
  classifyProspectiveForecast,
  getEffectiveAiConfig,
  historyFingerprint,
  opaqueRequestId,
  targetMonthBounds,
  type AiMode,
  type EvidenceProvenance,
} from '@/server/services/ai-forecast.service';
import { buildUsageSamplesFromBills, predictUsage } from '@/server/services/product-analysis';
import { getPool } from '@/server/db/client';

interface ShadowJobRow {
  id: string;
  business_id: string;
  request_id: string;
  forecast_origin: Date;
  target_period: string;
  data_provenance: EvidenceProvenance;
  history_phase: string;
  transient_payload: ReturnType<typeof buildAiPayload> | null;
  mode: Exclude<AiMode, 'OFF'>;
  deterministic_prediction_kwh: string | null;
  attempt_count: number;
}

export interface ShadowJobOutcome {
  id: string;
  status: 'SUCCEEDED' | 'FAILED_RETRYABLE' | 'FALLBACK';
}

function preserveProvenance(value: string): EvidenceProvenance {
  if (value === 'REAL_WATTWISE' || value === 'SYNTHETIC_DEMO') return value;
  return 'UNCLASSIFIED';
}

export async function enqueueShadowForecastInTransaction(
  client: PoolClient,
  businessId: string,
  sourceStateAt: Date
): Promise<string | null> {
  const config = getEffectiveAiConfig();
  if (config.mode === 'OFF') return null;
  const businessResult = await client.query<{
    business_type: string;
    data_provenance: string;
    tariff_rupiah_per_kwh: string | null;
  }>(
    `SELECT business_type, data_provenance, tariff_rupiah_per_kwh
       FROM business WHERE id = $1 LIMIT 1`,
    [businessId]
  );
  const business = businessResult.rows[0];
  if (!business) return null;
  if (config.mode === 'SHADOW' && (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production')) {
    const enrollment = await client.query<{ enrolled: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM ai_shadow_enrollment
          WHERE business_id = $1
            AND shadow_enabled = true
            AND approved_provenance = 'REAL_WATTWISE'
       ) AS enrolled`,
      [businessId]
    );
    if (business.data_provenance !== 'REAL_WATTWISE' || !enrollment.rows[0]?.enrolled) return null;
  }
  const bills = await client.query<{
    period_start: string | Date;
    period_end: string | Date;
    kwh: string | null;
    total_amount_rupiah: string;
    tariff_rupiah_per_kwh: string | null;
    kwh_source: string | null;
  }>(
    `SELECT period_start, period_end, kwh, total_amount_rupiah, tariff_rupiah_per_kwh, kwh_source
       FROM electricity_bill WHERE business_id = $1
      ORDER BY period_end ASC, period_start ASC, id ASC`,
    [businessId]
  );
  const normalizedBills = bills.rows.map((row) => ({
    periodStart: row.period_start instanceof Date
      ? row.period_start.toISOString().slice(0, 10)
      : String(row.period_start),
    periodEnd: row.period_end instanceof Date
      ? row.period_end.toISOString().slice(0, 10)
      : String(row.period_end),
    kwh: row.kwh,
    totalAmountRupiah: BigInt(row.total_amount_rupiah),
    tariffRupiahPerKwh: row.tariff_rupiah_per_kwh,
    kwhSource: row.kwh_source,
  }));
  const samples = buildUsageSamplesFromBills(normalizedBills);
  const usageByPeriod = new Map(samples.map((sample) => [sample.period, sample.usageKwh]));
  const history = buildContiguousHistory(
    normalizedBills.map((bill) => ({
      periodMonth: bill.periodEnd.slice(0, 7),
      periodStart: bill.periodStart,
      periodEnd: bill.periodEnd,
      usageKwh: usageByPeriod.get(bill.periodEnd.slice(0, 7)) ?? null,
    })),
    sourceStateAt
  );
  if (!history.targetPeriod || !['H06_12', 'H13_PLUS'].includes(history.phase)) return null;
  const historyPeriods = new Set(history.history.map((item) => item.period_month));
  const inferenceSamples = samples.filter((sample) => historyPeriods.has(sample.period));
  const deterministic = predictUsage(
    inferenceSamples,
    business.tariff_rupiah_per_kwh ? Number(business.tariff_rupiah_per_kwh) : null
  );
  if (!deterministic.hasPrediction || deterministic.predictedUsageKwh === null) return null;
  const fingerprint = historyFingerprint(history);
  const requestId = opaqueRequestId({
    businessId,
    targetPeriod: history.targetPeriod,
    forecastOrigin: sourceStateAt,
    historyFingerprint: fingerprint,
    mode: config.mode,
  });
  const provenance = preserveProvenance(business.data_provenance);
  const targetBounds = targetMonthBounds(history.targetPeriod);
  const targetOverlap = await client.query<{ target_exists: boolean }>(
    `SELECT EXISTS (
       SELECT 1 FROM electricity_bill
        WHERE business_id = $1
          AND period_start <= $3::date
          AND period_end >= $2::date
     ) AS target_exists`,
    [businessId, targetBounds.start, targetBounds.end]
  );
  const targetOutcomeUnknownAtForecast = !targetOverlap.rows[0]?.target_exists;
  const timing = classifyProspectiveForecast({
    targetPeriod: history.targetPeriod,
    forecastOrigin: sourceStateAt,
    historyTemporalIntegrity: history.temporalIntegrity,
    targetOutcomeUnknownAtForecast,
  });
  const payload = buildAiPayload({
    opaqueRequestId: requestId,
    forecastOrigin: sourceStateAt,
    history,
    context: {
      businessType: business.business_type || null,
      timezone: null,
      buildingArea: null,
    },
  });
  await client.query(
    `INSERT INTO ai_shadow_forecast (
       id, business_id, request_id, forecast_origin, target_period, data_provenance,
       prospective_forecast, history_phase, history_fingerprint, transient_payload,
       history_latest_period_end, history_temporal_integrity,
       target_outcome_unknown_at_forecast, forecast_days_into_target,
       mode, status, deterministic_prediction_kwh, feature_schema_sha256
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14, $15, 'PENDING', $16, $17)
     ON CONFLICT (request_id) DO NOTHING`,
    [
      crypto.randomUUID(), businessId, requestId, sourceStateAt, history.targetPeriod,
      provenance, timing.prospective, history.phase, fingerprint,
      JSON.stringify(payload), history.latestPeriodEnd, history.temporalIntegrity,
      targetOutcomeUnknownAtForecast, timing.daysIntoTarget,
      config.mode, deterministic.predictedUsageKwh,
      AI05_FEATURE_SCHEMA_SHA256,
    ]
  );
  return requestId;
}

export async function reconcileActualOutcomeInTransaction(
  client: PoolClient,
  input: {
    businessId: string;
    period: string;
    actualKwh: number | null;
    actualKwhSource: string;
    observedAt: Date;
  }
): Promise<void> {
  if (input.actualKwh === null || !Number.isFinite(input.actualKwh) || input.actualKwh < 0) return;
  const source = input.actualKwhSource === 'USER_ENTERED' || input.actualKwhSource === 'METER_DERIVED'
    ? input.actualKwhSource
    : 'LEGACY_UNKNOWN';
  await client.query(
    `UPDATE ai_shadow_forecast
        SET actual_kwh = $1,
            actual_kwh_source = $2,
            actual_observed_at = $3,
            absolute_error_ml = CASE WHEN ml_prediction_kwh IS NULL THEN NULL ELSE abs(ml_prediction_kwh - $1) END,
            absolute_error_deterministic = CASE WHEN deterministic_prediction_kwh IS NULL THEN NULL ELSE abs(deterministic_prediction_kwh - $1) END,
            scored_at = CASE WHEN ml_prediction_kwh IS NULL THEN scored_at ELSE NOW() END,
            updated_at = NOW()
      WHERE business_id = $4 AND target_period = $5`,
    [input.actualKwh, source, input.observedAt, input.businessId, input.period]
  );
}

export async function claimAndProcessShadowJob(
  fetcher: typeof fetch = fetch
): Promise<ShadowJobOutcome | null> {
  const effectiveConfig = getEffectiveAiConfig();
  if (effectiveConfig.mode === 'OFF') return null;
  const requireProductionEnrollment = effectiveConfig.mode === 'SHADOW' &&
    (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production');
  const pool = getPool();
  const claimToken = crypto.randomUUID();
  const client = await pool.connect();
  let job: ShadowJobRow | null = null;
  try {
    await client.query('BEGIN');
    const claimed = await client.query<ShadowJobRow>(
      `SELECT id, business_id, request_id, forecast_origin, target_period,
              data_provenance, history_phase, transient_payload, mode,
              deterministic_prediction_kwh, attempt_count
         FROM ai_shadow_forecast
        WHERE (
          (status IN ('PENDING', 'FAILED_RETRYABLE') AND next_attempt_at <= NOW())
          OR (status = 'PROCESSING' AND claimed_at < NOW() - INTERVAL '5 minutes')
        )
          AND (
            $1::boolean = FALSE
            OR (
              data_provenance = 'REAL_WATTWISE'
              AND EXISTS (
                SELECT 1
                  FROM ai_shadow_enrollment enrollment
                  JOIN business enrolled_business ON enrolled_business.id = enrollment.business_id
                 WHERE enrollment.business_id = ai_shadow_forecast.business_id
                   AND enrollment.shadow_enabled = TRUE
                   AND enrollment.approved_provenance = 'REAL_WATTWISE'
                   AND enrolled_business.data_provenance = 'REAL_WATTWISE'
              )
            )
          )
        ORDER BY created_at ASC
        FOR UPDATE SKIP LOCKED LIMIT 1`,
      [requireProductionEnrollment]
    );
    job = claimed.rows[0] ?? null;
    if (!job) {
      await client.query('COMMIT');
      return null;
    }
    await client.query(
      `UPDATE ai_shadow_forecast
          SET status = 'PROCESSING', claim_token = $1, claimed_at = NOW(),
              attempt_count = attempt_count + 1, updated_at = NOW()
        WHERE id = $2`,
      [claimToken, job.id]
    );
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
  if (!job?.transient_payload) return null;
  const config = effectiveConfig;
  try {
    const result = await callAiService(job.transient_payload, config, fetcher);
    await pool.query(
      `UPDATE ai_shadow_forecast
          SET status = 'SUCCEEDED', ml_prediction_kwh = $1, ml_model = $2,
              ml_model_version = $3, artifact_sha256 = $4,
              inference_latency_ms = $5, fallback_reason = NULL,
              transient_payload = NULL, claim_token = NULL, updated_at = NOW(),
              absolute_error_ml = CASE WHEN actual_kwh IS NULL THEN NULL ELSE abs(actual_kwh - $1) END,
              absolute_error_deterministic = CASE WHEN actual_kwh IS NULL THEN NULL ELSE abs(actual_kwh - deterministic_prediction_kwh) END,
              scored_at = CASE WHEN actual_kwh IS NULL THEN NULL ELSE NOW() END
        WHERE id = $6 AND claim_token = $7`,
      [
        result.prediction_kwh, result.selected_model, AI05_MODEL_VERSION,
        AI05_ARTIFACT_SHA256, result.inference_latency_ms, job.id, claimToken,
      ]
    );
    return { id: job.id, status: 'SUCCEEDED' };
  } catch (error) {
    const code = error instanceof Error ? error.message.slice(0, 100) : 'AI_FAILURE';
    const terminal = Number(job.attempt_count) + 1 >= 3;
    await pool.query(
      `UPDATE ai_shadow_forecast
          SET status = $1, fallback_reason = $2,
              transient_payload = CASE WHEN $3::boolean THEN NULL ELSE transient_payload END,
              next_attempt_at = CASE WHEN $3::boolean THEN next_attempt_at ELSE NOW() + INTERVAL '1 minute' END,
              claim_token = NULL, claimed_at = NULL, updated_at = NOW()
        WHERE id = $4 AND claim_token = $5`,
      [terminal ? 'FALLBACK' : 'FAILED_RETRYABLE', code, terminal, job.id, claimToken]
    );
    return { id: job.id, status: terminal ? 'FALLBACK' : 'FAILED_RETRYABLE' };
  }
}

export async function listPromotionGradeRealEvidence() {
  return (
    await getPool().query(
      `SELECT id, request_id, forecast_origin, target_period, history_phase,
              history_fingerprint,
              history_latest_period_end, history_temporal_integrity,
              target_outcome_unknown_at_forecast, forecast_days_into_target,
              CASE
                WHEN forecast_days_into_target BETWEEN 0 AND 1 THEN 'DAY_0_1'
                WHEN forecast_days_into_target BETWEEN 2 AND 7 THEN 'DAY_2_7'
                WHEN forecast_days_into_target >= 8 THEN 'DAY_8_PLUS'
              END AS forecast_timing_bucket,
              deterministic_prediction_kwh, ml_prediction_kwh, ml_model_version,
              artifact_sha256, feature_schema_sha256, actual_kwh, actual_kwh_source,
              actual_observed_at,
              absolute_error_ml, absolute_error_deterministic, scored_at
         FROM ai_shadow_forecast
        WHERE data_provenance = 'REAL_WATTWISE'
          AND prospective_forecast = TRUE
          AND history_temporal_integrity = TRUE
          AND target_outcome_unknown_at_forecast = TRUE
          AND forecast_days_into_target IS NOT NULL
          AND forecast_days_into_target >= 0
          AND actual_kwh_source IN ('USER_ENTERED', 'METER_DERIVED')
          AND actual_kwh IS NOT NULL
          AND actual_observed_at IS NOT NULL
          AND actual_observed_at > forecast_origin
          AND ml_prediction_kwh IS NOT NULL
          AND deterministic_prediction_kwh IS NOT NULL
          AND scored_at IS NOT NULL
        ORDER BY forecast_origin ASC, request_id ASC`
    )
  ).rows;
}

export async function listShadowForecastsForUser(userId: string, businessId?: string) {
  return (
    await getPool().query(
      `SELECT sf.* FROM ai_shadow_forecast sf
       JOIN business b ON b.id = sf.business_id
       WHERE b.user_id = $1 AND ($2::text IS NULL OR sf.business_id = $2)
       ORDER BY sf.created_at DESC`,
      [userId, businessId ?? null]
    )
  ).rows;
}
