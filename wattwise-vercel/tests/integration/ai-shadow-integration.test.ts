import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { getPool } from '@/server/db/client';
import { createBill } from '@/server/services/bill.service';
import {
  claimAndProcessShadowJob,
  listPromotionGradeRealEvidence,
  listShadowForecastsForUser,
} from '@/server/repositories/ai-shadow.repository';
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
    expect(rowsA[0].data_provenance).toBe('SYNTHETIC_DEMO');
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
    expect(run.prospective_forecast).toBe(false);
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
