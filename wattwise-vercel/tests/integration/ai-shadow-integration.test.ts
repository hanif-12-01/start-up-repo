import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { getPool } from '@/server/db/client';
import { createBill } from '@/server/services/bill.service';
import {
  claimAndProcessShadowJob,
  enqueueShadowForecastInTransaction,
  listPromotionGradeRealEvidence,
  listShadowForecastsForUser,
  reconcileActualOutcomeInTransaction,
} from '@/server/repositories/ai-shadow.repository';
import { setShadowEnrollment } from '@/server/repositories/ai-shadow-enrollment.repository';
import { processShadowBatch } from '@/server/services/ai-shadow-operations.service';
import { getAiShadowMonitoringSummary } from '@/server/services/ai-shadow-monitoring.service';
import { applyAllForwardMigrations } from '../helpers/migrations';
import {
  AI05_ARTIFACT_SHA256,
  AI05_FEATURE_SCHEMA_SHA256,
  AI05_MODEL_VERSION,
} from '@/server/services/ai-forecast.service';

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:testpass@127.0.0.1:5439/wattwise_test';

function successResponse(requestId: string) {
  return new Response(JSON.stringify({
    schema_version: '2.0', request_id: requestId, status: 'SUCCESS',
    history_phase: 'H06_12', selected_model: 'nbeats', model_version: AI05_MODEL_VERSION,
    prediction_kwh: 150, artifact_sha256: AI05_ARTIFACT_SHA256,
    feature_schema_sha256: AI05_FEATURE_SCHEMA_SHA256, fallback_used: false,
    fallback_reason: null, inference_latency_ms: 100, worker_generation: 1,
    service_state: 'READY',
  }), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

describe('AI-05 durable shadow integration', () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    process.env.WATTWISE_AI_MODE = 'SHADOW';
    process.env.WATTWISE_AI_SERVICE_URL ||= 'http://127.0.0.1:8091';
    process.env.WATTWISE_AI_SERVICE_TOKEN ||= 'synthetic-test-token';
    pool = new Pool({ connectionString: dbUrl, max: 4 });
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    await applyAllForwardMigrations(pool);
  });

  afterAll(async () => {
    delete process.env.WATTWISE_AI_MODE;
    delete process.env.WATTWISE_AI_SERVICE_URL;
    delete process.env.WATTWISE_AI_SERVICE_TOKEN;
    await getPool().end();
    globalThis.__dbPool = undefined;
    globalThis.__dbInstance = undefined;
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE ai_shadow_forecast, electricity_bill, business, "user" CASCADE');
  });

  async function tenant(suffix: string, provenance = 'SYNTHETIC_DEMO') {
    const userId = `ai05-user-${suffix}`;
    const businessId = `ai05-business-${suffix}`;
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ($1, 'Test', $2, true)`, [userId, `${suffix}@example.test`]);
    await pool.query(
      `INSERT INTO user_plan (id, user_id, plan, trial_starts_at, trial_ends_at, idempotency_key)
       VALUES ($1, $2, 'PRO_TRIAL', NOW(), NOW() + INTERVAL '30 days', $3)`,
      [`ai05-plan-${suffix}`, userId, `ai05-plan-key-${suffix}`]
    );
    await pool.query(`INSERT INTO business (id, user_id, name, business_type, segment, electrical_system, data_provenance) VALUES ($1, $2, 'Test', 'RETAIL', 'RETAIL', 'ALL_IN', $3)`, [businessId, userId, provenance]);
    return { userId, businessId };
  }

  async function addMonth(userId: string, businessId: string, month: number, kwh: number) {
    const period = `2025-${String(month).padStart(2, '0')}`;
    const end = new Date(Date.UTC(2025, month, 0)).getUTCDate();
    return createBill(userId, {
      periodStart: `${period}-01`, periodEnd: `${period}-${end}`,
      totalAmountRupiah: BigInt(kwh * 1500), kwh: String(kwh),
      tariffRupiahPerKwh: '1500',
    }, businessId);
  }

  async function insertCalendarBill(
    businessId: string,
    period: string,
    kwh: number,
    observedAt = new Date('2026-08-01T00:00:00Z')
  ) {
    const [year, month] = period.split('-').map(Number);
    const end = new Date(Date.UTC(year, month, 0)).getUTCDate();
    await pool.query(
      `INSERT INTO electricity_bill (
         id, business_id, period_start, period_end, total_amount_rupiah,
         kwh, tariff_rupiah_per_kwh, kwh_source, created_at, updated_at
       ) VALUES ($1, $2, $3::date, $4::date, $5, $6, 1500, 'USER_ENTERED', $7, $7)`,
      [crypto.randomUUID(), businessId, `${period}-01`, `${period}-${end}`, kwh * 1500, kwh, observedAt]
    );
  }

  async function enqueueAt(businessId: string, forecastOrigin: Date) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const requestId = await enqueueShadowForecastInTransaction(client, businessId, forecastOrigin);
      await client.query('COMMIT');
      return requestId;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async function reconcileAt(businessId: string, period: string, kwh: number, observedAt: Date) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await reconcileActualOutcomeInTransaction(client, {
        businessId, period, actualKwh: kwh,
        actualKwhSource: 'USER_ENTERED', observedAt,
      });
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  it('creates one idempotent owner-scoped job and preserves deterministic output', async () => {
    const owner = await tenant('owner');
    for (let month = 1; month <= 6; month += 1) await addMonth(owner.userId, owner.businessId, month, 100 + month);
    const rows = await listShadowForecastsForUser(owner.userId, owner.businessId);
    expect(rows).toHaveLength(1);
    expect(rows[0].status).toBe('PENDING');
    expect(rows[0].data_provenance).toBe('SYNTHETIC_DEMO');
    expect(rows[0].deterministic_prediction_kwh).not.toBeNull();
    await pool.query(`UPDATE electricity_bill SET updated_at = updated_at WHERE business_id = $1`, [owner.businessId]);
    expect((await listShadowForecastsForUser(owner.userId, owner.businessId))).toHaveLength(1);
  });

  it('governs enrollment with dry-run, explicit REAL classification, and cohort disable', async () => {
    const real = await tenant('enrollment-real', 'REAL_WATTWISE');
    const unknown = await tenant('enrollment-unknown', 'UNCLASSIFIED');
    await expect(setShadowEnrollment({ businessId: unknown.businessId, action: 'ENROLL', reason: 'controlled test', dryRun: false }))
      .rejects.toThrow('REAL_WATTWISE_CLASSIFICATION_REQUIRED');
    expect(await setShadowEnrollment({ businessId: real.businessId, action: 'ENROLL', reason: 'controlled test', dryRun: true }))
      .toMatchObject({ changed: false, dryRun: true });
    await setShadowEnrollment({ businessId: real.businessId, action: 'ENROLL', reason: 'controlled test', dryRun: false });
    await setShadowEnrollment({ businessId: real.businessId, action: 'ENROLL', reason: 'controlled test', dryRun: false });
    expect((await pool.query(`SELECT count(*)::int AS count FROM ai_shadow_enrollment WHERE business_id = $1`, [real.businessId])).rows[0].count).toBe(1);
    for (let month = 1; month <= 6; month += 1) await addMonth(real.userId, real.businessId, month, 100);
    await setShadowEnrollment({ businessId: real.businessId, action: 'DISABLE', reason: 'cohort stop', dryRun: false });
    await setShadowEnrollment({ businessId: real.businessId, action: 'DISABLE', reason: 'cohort stop', dryRun: false });
    const run = (await listShadowForecastsForUser(real.userId))[0];
    expect(run.status).toBe('NOT_ELIGIBLE');
    expect(run.transient_payload).toBeNull();
  });

  it('processes bounded batches and reports aggregate monitoring with no real evidence', async () => {
    const owners = await Promise.all([tenant('batch-a'), tenant('batch-b'), tenant('batch-c')]);
    for (const owner of owners) {
      for (let month = 1; month <= 6; month += 1) await addMonth(owner.userId, owner.businessId, month, 100);
    }
    const readyFetcher: typeof fetch = async (input, init) => {
      const url = String(input);
      if (url.endsWith('/health/ready')) {
        return new Response(JSON.stringify({
          schema_version: '2.0', status: 'READY', service_state: 'READY',
          model_version: AI05_MODEL_VERSION, artifact_sha256: AI05_ARTIFACT_SHA256,
          feature_schema_sha256: AI05_FEATURE_SCHEMA_SHA256, last_failure_code: null,
          worker_generation: 1,
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      const payload = JSON.parse(String(init?.body)) as { request_id: string };
      return successResponse(payload.request_id);
    };
    const batch = await processShadowBatch({ maxJobs: 2, timeBudgetMs: 5_000, fetcher: readyFetcher });
    expect(batch).toMatchObject({ claimed: 2, succeeded: 2, serviceReady: true });
    expect((await pool.query(`SELECT count(*)::int AS count FROM ai_shadow_forecast WHERE status = 'PENDING'`)).rows[0].count).toBe(1);
    const monitoring = await getAiShadowMonitoringSummary(readyFetcher);
    expect(monitoring.outbox.pending).toBe(1);
    expect(monitoring.accuracy.pairedCount).toBe(0);
    expect(monitoring.accuracy.evidenceTier).toBe('NO_REAL_ACCURACY_EVIDENCE');
    expect(monitoring.privacy).toEqual({ aggregateOnly: true, piiIncluded: false });
    expect(JSON.stringify(monitoring)).not.toContain(owners[0].businessId);
  });

  it('retains pending work and raises an aggregate alert while the ML service is down', async () => {
    const owner = await tenant('ml-outage');
    for (let month = 1; month <= 6; month += 1) {
      await addMonth(owner.userId, owner.businessId, month, 100 + month);
    }
    const before = (await listShadowForecastsForUser(owner.userId))[0];
    expect(before).toMatchObject({ status: 'PENDING', attempt_count: '0' });
    expect(before.transient_payload).not.toBeNull();

    const unavailableFetcher: typeof fetch = async () => {
      throw new TypeError('synthetic service unavailable');
    };
    await expect(processShadowBatch({ fetcher: unavailableFetcher })).resolves.toMatchObject({
      claimed: 0, noWork: true, serviceReady: false,
    });
    const after = (await listShadowForecastsForUser(owner.userId))[0];
    expect(after).toMatchObject({ status: 'PENDING', attempt_count: '0' });
    expect(after.transient_payload).toEqual(before.transient_payload);
    const monitoring = await getAiShadowMonitoringSummary(unavailableFetcher);
    expect(monitoring.alertState).toBe('CRITICAL');
    expect(monitoring.service.serviceReady).toBe(false);
  });

  it('processes shadow response, clears transient payload, and reconciles later actual', async () => {
    const owner = await tenant('score');
    for (let month = 1; month <= 6; month += 1) await addMonth(owner.userId, owner.businessId, month, 100 + month);
    const pending = (await listShadowForecastsForUser(owner.userId))[0];
    await claimAndProcessShadowJob(async () => successResponse(pending.request_id));
    const succeeded = (await listShadowForecastsForUser(owner.userId))[0];
    expect(succeeded.status).toBe('SUCCEEDED');
    expect(succeeded.transient_payload).toBeNull();
    await addMonth(owner.userId, owner.businessId, 7, 155);
    const scored = (await listShadowForecastsForUser(owner.userId)).find((row) => row.target_period === '2025-07');
    expect(scored.actual_kwh).toBe('155.000');
    expect(scored.actual_kwh_source).toBe('USER_ENTERED');
    expect(scored.absolute_error_ml).toBe('5.000');
    expect(scored.scored_at).not.toBeNull();
  });

  it('fails closed when service is offline without breaking saved electricity data', async () => {
    const owner = await tenant('offline');
    for (let month = 1; month <= 6; month += 1) await addMonth(owner.userId, owner.businessId, month, 100);
    await expect(claimAndProcessShadowJob(async () => { throw new Error('offline'); })).resolves.not.toThrow();
    const evidence = (await listShadowForecastsForUser(owner.userId))[0];
    expect(evidence.status).toBe('FAILED_RETRYABLE');
    expect(evidence.transient_payload).not.toBeNull();
    expect((await pool.query('SELECT count(*)::int AS count FROM electricity_bill')).rows[0].count).toBe(6);
  });

  it('clears the transient payload after the third failed attempt enters terminal fallback', async () => {
    const owner = await tenant('terminal-fallback');
    for (let month = 1; month <= 6; month += 1) {
      await addMonth(owner.userId, owner.businessId, month, 100);
    }
    const offline = async () => { throw new Error('offline'); };
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await claimAndProcessShadowJob(offline);
      if (attempt < 3) {
        await pool.query(
          `UPDATE ai_shadow_forecast SET next_attempt_at = NOW()
            WHERE business_id = $1`,
          [owner.businessId]
        );
      }
    }
    const evidence = (await listShadowForecastsForUser(owner.userId))[0];
    expect(evidence.status).toBe('FALLBACK');
    expect(Number(evidence.attempt_count)).toBe(3);
    expect(evidence.transient_payload).toBeNull();
  });

  it('preserves tenant isolation and excludes unclassified businesses from real evidence', async () => {
    const a = await tenant('a', 'UNCLASSIFIED');
    const b = await tenant('b');
    for (let month = 1; month <= 6; month += 1) {
      await addMonth(a.userId, a.businessId, month, 100);
      await addMonth(b.userId, b.businessId, month, 200);
    }
    const rowsA = await listShadowForecastsForUser(a.userId);
    const rowsB = await listShadowForecastsForUser(b.userId);
    expect(rowsA).toHaveLength(1);
    expect(rowsB).toHaveLength(1);
    expect(rowsA[0].business_id).toBe(a.businessId);
    expect(rowsB[0].business_id).toBe(b.businessId);
    expect(rowsA[0].data_provenance).toBe('UNCLASSIFIED');
    expect(await listPromotionGradeRealEvidence()).toHaveLength(0);
  });

  it('claiming is concurrency-safe', async () => {
    const owner = await tenant('concurrent');
    for (let month = 1; month <= 6; month += 1) await addMonth(owner.userId, owner.businessId, month, 100);
    const pending = (await listShadowForecastsForUser(owner.userId))[0];
    const calls: string[] = [];
    const fetcher = async () => { calls.push('call'); return successResponse(pending.request_id); };
    await Promise.all([claimAndProcessShadowJob(fetcher), claimAndProcessShadowJob(fetcher)]);
    expect(calls).toHaveLength(1);
  });

  it('reclaims a stale processing lease after an interrupted worker', async () => {
    const owner = await tenant('stale-lease');
    for (let month = 1; month <= 6; month += 1) {
      await addMonth(owner.userId, owner.businessId, month, 100);
    }
    const pending = (await listShadowForecastsForUser(owner.userId))[0];
    await pool.query(
      `UPDATE ai_shadow_forecast
          SET status = 'PROCESSING', claim_token = 'abandoned',
              claimed_at = NOW() - INTERVAL '6 minutes'
        WHERE id = $1`,
      [pending.id]
    );
    await claimAndProcessShadowJob(async () => successResponse(pending.request_id));
    expect((await listShadowForecastsForUser(owner.userId))[0].status).toBe('SUCCEEDED');
  });

  it('keeps retrospective REAL_WATTWISE runs out of promotion-grade evidence', async () => {
    const owner = await tenant('real-retrospective', 'REAL_WATTWISE');
    for (let month = 1; month <= 6; month += 1) {
      await addMonth(owner.userId, owner.businessId, month, 100 + month);
    }
    const run = (await listShadowForecastsForUser(owner.userId))[0];
    expect(run.data_provenance).toBe('REAL_WATTWISE');
    expect(run.history_temporal_integrity).toBe(true);
    expect(run.history_latest_period_end).not.toBeNull();
    expect(run.prospective_forecast).toBe(false);
    expect(await listPromotionGradeRealEvidence()).toHaveLength(0);
  });

  it('supports the complete prospective REAL_WATTWISE evidence lifecycle and immutable corrections', async () => {
    const owner = await tenant('real-positive-lifecycle', 'REAL_WATTWISE');
    for (let month = 2; month <= 7; month += 1) {
      await insertCalendarBill(owner.businessId, `2026-${String(month).padStart(2, '0')}`, 100 + month);
    }
    const forecastOrigin = new Date('2026-07-31T17:00:00Z');
    const requestId = await enqueueAt(owner.businessId, forecastOrigin);
    expect(requestId).not.toBeNull();
    const pending = (await listShadowForecastsForUser(owner.userId))[0];
    expect(pending).toMatchObject({
      target_period: '2026-08', history_phase: 'H06_12',
      history_temporal_integrity: true,
      target_outcome_unknown_at_forecast: true,
      prospective_forecast: true,
      forecast_days_into_target: 0,
    });
    expect(pending.transient_payload.history).toHaveLength(6);
    expect(pending.transient_payload.history.every((item: { period_month: string }) => item.period_month < '2026-08')).toBe(true);
    await claimAndProcessShadowJob(async () => successResponse(pending.request_id));
    expect(await listPromotionGradeRealEvidence()).toHaveLength(0);

    await insertCalendarBill(owner.businessId, '2026-08', 160, new Date('2026-09-01T00:00:00Z'));
    await reconcileAt(owner.businessId, '2026-08', 160, new Date('2026-09-01T00:00:00Z'));
    const firstEvidence = (await listPromotionGradeRealEvidence())[0];
    expect(firstEvidence.actual_kwh).toBe('160.000');
    expect(firstEvidence.absolute_error_ml).toBe('10.000');
    expect(firstEvidence.absolute_error_deterministic).not.toBeNull();
    expect(firstEvidence.forecast_timing_bucket).toBe('DAY_0_1');
    const frozen = {
      ml: firstEvidence.ml_prediction_kwh,
      deterministic: firstEvidence.deterministic_prediction_kwh,
      origin: firstEvidence.forecast_origin,
      artifact: firstEvidence.artifact_sha256,
      historyFingerprint: firstEvidence.history_fingerprint,
    };

    await reconcileAt(owner.businessId, '2026-08', 165, new Date('2026-09-02T00:00:00Z'));
    const corrected = (await listPromotionGradeRealEvidence())[0];
    expect(corrected.ml_prediction_kwh).toBe(frozen.ml);
    expect(corrected.deterministic_prediction_kwh).toBe(frozen.deterministic);
    expect(corrected.forecast_origin).toEqual(frozen.origin);
    expect(corrected.artifact_sha256).toBe(frozen.artifact);
    expect(corrected.history_fingerprint).toBe(frozen.historyFingerprint);
    expect(corrected.actual_kwh).toBe('165.000');
    expect(corrected.absolute_error_ml).toBe('15.000');
  });

  it('fails closed when target outcome already exists and excludes it from inference', async () => {
    const owner = await tenant('target-known', 'REAL_WATTWISE');
    for (let month = 2; month <= 8; month += 1) {
      await insertCalendarBill(owner.businessId, `2026-${String(month).padStart(2, '0')}`, month === 8 ? 99999 : 100 + month);
    }
    await enqueueAt(owner.businessId, new Date('2026-07-31T17:00:00Z'));
    const run = (await listShadowForecastsForUser(owner.userId))[0];
    expect(run.target_period).toBe('2026-08');
    expect(run.target_outcome_unknown_at_forecast).toBe(false);
    expect(run.prospective_forecast).toBe(false);
    expect(run.transient_payload.history.every((item: { period_month: string }) => item.period_month < '2026-08')).toBe(true);
    expect(JSON.stringify(run.transient_payload)).not.toContain('99999');
  });

  it('requires temporal integrity in the promotion-grade query', async () => {
    const owner = await tenant('promotion-filter', 'REAL_WATTWISE');
    await pool.query(
      `INSERT INTO ai_shadow_forecast (
         id, business_id, request_id, forecast_origin, target_period,
         data_provenance, prospective_forecast, history_phase, history_fingerprint,
         mode, status, deterministic_prediction_kwh, ml_prediction_kwh, ml_model_version,
         artifact_sha256, feature_schema_sha256, actual_kwh, actual_kwh_source, scored_at,
         actual_observed_at, history_temporal_integrity,
         target_outcome_unknown_at_forecast, forecast_days_into_target
       ) VALUES (
         'promotion-filter-run', $1, 'promotion-filter-request', '2026-08-01T00:00:00Z', '2026-08',
         'REAL_WATTWISE', true, 'H06_12', $2, 'SHADOW', 'SUCCEEDED', 100, 110,
         $3, $4, $5, 105, 'USER_ENTERED', NOW(), '2026-09-01T00:00:00Z', false, true, 0
       )`,
      [
        owner.businessId, 'f'.repeat(64), AI05_MODEL_VERSION,
        AI05_ARTIFACT_SHA256, AI05_FEATURE_SCHEMA_SHA256,
      ]
    );
    expect(await listPromotionGradeRealEvidence()).toHaveLength(0);
    await pool.query(
      `UPDATE ai_shadow_forecast
          SET history_temporal_integrity = true,
              history_latest_period_end = '2026-07-31'
        WHERE id = 'promotion-filter-run'`
    );
    expect(await listPromotionGradeRealEvidence()).toHaveLength(1);
    await pool.query(
      `UPDATE ai_shadow_forecast SET actual_observed_at = forecast_origin
        WHERE id = 'promotion-filter-run'`
    );
    expect(await listPromotionGradeRealEvidence()).toHaveLength(0);
  });

  it.skipIf(process.env.WATTWISE_AI_REAL_SERVICE_E2E !== 'true')(
    'persists a real artifact response through the authenticated v2 gateway',
    async () => {
      const owner = await tenant('real-artifact-e2e');
      for (let month = 1; month <= 6; month += 1) {
        await addMonth(owner.userId, owner.businessId, month, 110 + month);
      }
      await claimAndProcessShadowJob();
      const run = (await listShadowForecastsForUser(owner.userId))[0];
      expect(run.status, run.fallback_reason ?? 'no failure code').toBe('SUCCEEDED');
      expect(run.ml_model_version).toBe(AI05_MODEL_VERSION);
      expect(run.artifact_sha256).toBe(AI05_ARTIFACT_SHA256);
      expect(run.transient_payload).toBeNull();
      expect(run.deterministic_prediction_kwh).not.toBeNull();
    }
  );
});
