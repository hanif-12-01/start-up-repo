import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import pg from 'pg';
import { applyAllForwardMigrations } from '../helpers/migrations';
import { getSafeTestDbUrl } from '../helpers/test-db-guard';

const mocks = vi.hoisted(() => ({ user: vi.fn(), refresh: vi.fn() }));
vi.mock('@/server/auth/session', () => ({ requireUserId: mocks.user }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.refresh }));

import { getOperationalEnergyComparison } from '@/server/services/operational-energy-insights.service';
import { getProductAnalysisReadModel } from '@/server/services/product-analysis';

describe('Operational energy insights and contextual anomaly (Integration)', () => {
  const admin = new pg.Pool({ connectionString: getSafeTestDbUrl(), max: 1 });
  const database = `phase04_${crypto.randomUUID().replaceAll('-', '')}_test`;
  const url = new URL(getSafeTestDbUrl());
  url.pathname = `/${database}`;
  const pool = new pg.Pool({ connectionString: url.toString(), max: 4 });

  beforeAll(async () => {
    await admin.query(`CREATE DATABASE "${database}"`);
    globalThis.__dbPool = pool;
    await applyAllForwardMigrations(pool);
    await pool.query(`INSERT INTO "user"(id, name, email, email_verified) VALUES
      ('user-pilot', 'Pilot User', 'pilot04@example.test', false),
      ('user-other', 'Other User', 'other04@example.test', false)`);
    await pool.query(`INSERT INTO business(id, user_id, name, business_type, segment, electrical_system) VALUES
      ('biz-pilot', 'user-pilot', 'Laundry Barokah', 'LAUNDRY', 'LAUNDRY', 'ALL_IN'),
      ('biz-other', 'user-other', 'Usaha Lain', 'OTHER', 'OTHER', 'ALL_IN')`);
    await pool.query(`INSERT INTO measurement_source(id, business_id, name, source_type, measurement_boundary, provenance_key) VALUES
      ('source-pln', 'biz-pilot', 'Meter Induk PLN', 'METER', 'WHOLE_SITE', 'meter-1')`);
  });

  beforeEach(async () => {
    mocks.user.mockReset();
    mocks.user.mockResolvedValue('user-pilot');
    mocks.refresh.mockReset();
    vi.stubEnv('NODE_ENV', 'test');
    for (const key of ['VERCEL', 'VERCEL_ENV', 'VERCEL_TARGET_ENV']) vi.stubEnv(key, undefined);
    vi.stubEnv('MEASUREMENT_WRITE_ENABLED', 'true');
    await pool.query('DELETE FROM production_record');
    await pool.query('DELETE FROM operational_process');
    await pool.query('DELETE FROM energy_measurement');
    await pool.query('DELETE FROM electricity_bill');
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
  });

  afterAll(async () => {
    delete globalThis.__dbPool;
    await pool.end();
    await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    await admin.end();
  });

  it('returns INSUFFICIENT_DATA when fewer than two production records exist', async () => {
    const res = await getOperationalEnergyComparison('biz-pilot');
    expect(res).toMatchObject({
      ok: true,
      data: {
        status: 'INSUFFICIENT_DATA',
        hasComparison: false,
      },
    });
    if (res.ok) {
      expect(res.data.explanation).toContain('minimal dua catatan aktivitas');
    }
  });

  it('computes contextual energy comparison between two eligible consecutive production periods', async () => {
    // 1. Setup process
    await pool.query(`INSERT INTO operational_process(id, business_id, name, output_unit)
      VALUES ('proc-1', 'biz-pilot', 'Cuci Kiloan', 'kg')`);

    // 2. Setup period 1: 2026-11-01 to 2026-11-08 (200 kg, 120 kWh)
    await pool.query(`INSERT INTO production_record(id, business_id, operational_process_id, period_start, period_end, output_quantity)
      VALUES ('prod-1', 'biz-pilot', 'proc-1', '2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z', '200')`);
    await pool.query(`INSERT INTO energy_measurement(id, business_id, measurement_source_id, period_start, period_end, source_timezone, energy_kwh, measurement_method, consumption_basis, quality_status, provenance_reference)
      VALUES ('m-1', 'biz-pilot', 'source-pln', '2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z', 'UTC', '120.000', 'MANUAL', 'MEASURED', 'RECORDED', 'ref-1')`);

    // 3. Setup period 2: 2026-11-08 to 2026-11-15 (250 kg, 132 kWh)
    await pool.query(`INSERT INTO production_record(id, business_id, operational_process_id, period_start, period_end, output_quantity)
      VALUES ('prod-2', 'biz-pilot', 'proc-1', '2026-11-08T00:00:00Z', '2026-11-15T00:00:00Z', '250')`);
    await pool.query(`INSERT INTO energy_measurement(id, business_id, measurement_source_id, period_start, period_end, source_timezone, energy_kwh, measurement_method, consumption_basis, quality_status, provenance_reference)
      VALUES ('m-2', 'biz-pilot', 'source-pln', '2026-11-08T00:00:00Z', '2026-11-15T00:00:00Z', 'UTC', '132.000', 'MANUAL', 'MEASURED', 'RECORDED', 'ref-2')`);

    const res = await getOperationalEnergyComparison('biz-pilot');
    expect(res).toMatchObject({
      ok: true,
      data: {
        status: 'COMPARISON_AVAILABLE',
        hasComparison: true,
        outputUnit: 'kg',
        metrics: {
          energyChangePercent: 10,
          outputChangePercent: 25,
          intensityChangePercent: -12,
          intensityTrend: 'MORE_EFFICIENT',
        },
      },
    });

    if (res.ok) {
      expect(res.data.headline).toContain('Pemakaian Listrik Bertambah Sejalan dengan Kenaikan Produksi');
      expect(res.data.explanation).toContain('lebih hemat 12%');
    }
  });

  it('enforces multi-tenant isolation; rejects unauthorized cross-tenant business comparison', async () => {
    // User is 'user-other', trying to access 'biz-pilot'
    mocks.user.mockResolvedValue('user-other');
    const res = await getOperationalEnergyComparison('biz-pilot');
    expect(res).toMatchObject({
      ok: false,
      error: { code: 'UNAUTHORIZED' },
    });
  });

  it('integrates operational comparison seamlessly into product-analysis read model and contextual anomaly', async () => {
    // 1. Setup operational process, records and measurements
    await pool.query(`INSERT INTO operational_process(id, business_id, name, output_unit)
      VALUES ('proc-1', 'biz-pilot', 'Cuci Kiloan', 'kg')`);
    await pool.query(`INSERT INTO production_record(id, business_id, operational_process_id, period_start, period_end, output_quantity)
      VALUES ('prod-1', 'biz-pilot', 'proc-1', '2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z', '200')`);
    await pool.query(`INSERT INTO energy_measurement(id, business_id, measurement_source_id, period_start, period_end, source_timezone, energy_kwh, measurement_method, consumption_basis, quality_status, provenance_reference)
      VALUES ('m-1', 'biz-pilot', 'source-pln', '2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z', 'UTC', '120.000', 'MANUAL', 'MEASURED', 'RECORDED', 'ref-1')`);
    await pool.query(`INSERT INTO production_record(id, business_id, operational_process_id, period_start, period_end, output_quantity)
      VALUES ('prod-2', 'biz-pilot', 'proc-1', '2026-11-08T00:00:00Z', '2026-11-15T00:00:00Z', '250')`);
    await pool.query(`INSERT INTO energy_measurement(id, business_id, measurement_source_id, period_start, period_end, source_timezone, energy_kwh, measurement_method, consumption_basis, quality_status, provenance_reference)
      VALUES ('m-2', 'biz-pilot', 'source-pln', '2026-11-08T00:00:00Z', '2026-11-15T00:00:00Z', 'UTC', '132.000', 'MANUAL', 'MEASURED', 'RECORDED', 'ref-2')`);

    // 2. Setup historical monthly bills where latest bill spikes +15%
    await pool.query(`INSERT INTO electricity_bill(id, business_id, period_start, period_end, total_amount_rupiah, kwh, tariff_rupiah_per_kwh, kwh_source) VALUES
      ('b-1', 'biz-pilot', '2026-08-01', '2026-08-31', 1444000, '1000.000', '1444', 'USER_ENTERED'),
      ('b-2', 'biz-pilot', '2026-09-01', '2026-09-30', 1444000, '1000.000', '1444', 'USER_ENTERED'),
      ('b-3', 'biz-pilot', '2026-10-01', '2026-10-31', 1660600, '1150.000', '1444', 'USER_ENTERED')`);

    const model = await getProductAnalysisReadModel('user-pilot', 'biz-pilot');
    expect(model).toHaveProperty('operationalComparison');
    expect(model.operationalComparison?.hasComparison).toBe(true);
    expect(model.anomaly.status).toBe('Perlu Dicek');
    expect(model.anomaly.contextualExplanation).toMatchObject({
      hasOperationalContext: true,
      headline: 'Kenaikan Pemakaian Sejalan dengan Pertumbuhan Aktivitas',
    });
    expect(model.anomaly.contextualExplanation?.explanation).toContain('lebih hemat 12%');
  });
});
