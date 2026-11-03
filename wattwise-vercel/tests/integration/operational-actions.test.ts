import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import pg from 'pg';
import { applyAllForwardMigrations } from '../helpers/migrations';
import { getSafeTestDbUrl } from '../helpers/test-db-guard';

const mocks = vi.hoisted(() => ({ user: vi.fn(), refresh: vi.fn() }));
vi.mock('@/server/auth/session', () => ({ requireUserId: mocks.user }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.refresh }));

import { createProcessAction, createRecordAction } from '@/app/(product)/activities/actions';
import { listOperationalProcesses, listProductionRecords } from '@/server/services/operational.service';
import { getEnergyNormalization } from '@/server/services/energy-normalization.service';

describe('Operational actions and normalization through real PostgreSQL', () => {
  const admin = new pg.Pool({ connectionString: getSafeTestDbUrl(), max: 1 });
  const database = `phase03_${crypto.randomUUID().replaceAll('-', '')}_test`;
  const url = new URL(getSafeTestDbUrl());
  url.pathname = `/${database}`;
  const pool = new pg.Pool({ connectionString: url.toString(), max: 4 });

  const form = (values: Record<string, string | undefined>) => {
    const data = new FormData();
    for (const [k, v] of Object.entries(values)) {
      if (v !== undefined) data.set(k, v);
    }
    return data;
  };

  beforeAll(async () => {
    await admin.query(`CREATE DATABASE "${database}"`);
    globalThis.__dbPool = pool;
    await applyAllForwardMigrations(pool);
    await pool.query(`INSERT INTO "user"(id, name, email, email_verified) VALUES
      ('pilot', 'Pilot User', 'pilot03@example.test', false),
      ('other', 'Other User', 'other03@example.test', false)`);
    await pool.query(`INSERT INTO business(id, user_id, name, business_type, segment, electrical_system) VALUES
      ('biz1', 'pilot', 'Usaha Laundry', 'LAUNDRY', 'LAUNDRY', 'ALL_IN'),
      ('biz2', 'other', 'Usaha Lain', 'OTHER', 'OTHER', 'ALL_IN')`);
    await pool.query(`INSERT INTO measurement_source(id, business_id, name, source_type, measurement_boundary, provenance_key) VALUES
      ('meter1', 'biz1', 'Meter PLN', 'METER', 'WHOLE_SITE', 'meter-1'),
      ('sub1', 'biz1', 'Submeter Cuci', 'METER', 'SUBMETER', 'sub-1')`);
  });

  beforeEach(async () => {
    mocks.user.mockReset();
    mocks.user.mockResolvedValue('pilot');
    mocks.refresh.mockReset();
    vi.stubEnv('NODE_ENV', 'test');
    for (const key of ['VERCEL', 'VERCEL_ENV', 'VERCEL_TARGET_ENV']) vi.stubEnv(key, undefined);
    vi.stubEnv('MEASUREMENT_WRITE_ENABLED', 'true');
    vi.stubEnv('MEASUREMENT_PILOT_ALLOWLIST', JSON.stringify([{ userId: 'pilot', businessId: 'biz1' }]));
    await pool.query('DELETE FROM production_record');
    await pool.query('DELETE FROM operational_process');
    await pool.query('DELETE FROM energy_measurement');
  });

  afterEach(() => vi.unstubAllEnvs());

  afterAll(async () => {
    globalThis.__dbPool = undefined;
    globalThis.__dbInstance = undefined;
    await pool.end();
    await admin.query(`DROP DATABASE "${database}"`);
    await admin.end();
  });

  it('registers operational process and prevents duplicate name', async () => {
    const data1 = form({ businessId: 'biz1', name: 'Cuci Kiloan', outputUnit: 'kg' });
    const res1 = await createProcessAction({}, data1);
    expect(res1).toHaveProperty('success');
    expect(mocks.refresh).toHaveBeenCalledWith('/activities');

    const resDup = await createProcessAction({}, data1);
    expect(resDup).toHaveProperty('code', 'DUPLICATE_PROCESS');

    const list = await listOperationalProcesses('biz1');
    expect(list).toMatchObject({ ok: true, data: [{ name: 'Cuci Kiloan', outputUnit: 'kg' }] });
  });

  it('records production output; rejects duplicate or overlapping periods', async () => {
    // 1. Create process
    await createProcessAction({}, form({ businessId: 'biz1', name: 'Cuci Kiloan', outputUnit: 'kg' }));
    const processes = await listOperationalProcesses('biz1');
    const procId = (processes as { ok: true; data: Array<{ id: string }> }).data[0].id;

    // 2. Record 200 kg for Nov 1 to Nov 8
    const rec1 = form({
      businessId: 'biz1',
      operationalProcessId: procId,
      periodStart: '2026-11-01T00:00',
      periodEnd: '2026-11-08T00:00',
      outputQuantity: '200',
      notes: 'Minggu 1',
    });
    const res1 = await createRecordAction({}, rec1);
    expect(res1).toHaveProperty('success');

    // 3. Duplicate record rejected
    const resDup = await createRecordAction({}, rec1);
    expect(resDup).toHaveProperty('code', 'DUPLICATE_RECORD');

    // 4. Overlapping record rejected
    const recOverlap = form({
      businessId: 'biz1',
      operationalProcessId: procId,
      periodStart: '2026-11-04T00:00',
      periodEnd: '2026-11-10T00:00',
      outputQuantity: '150',
    });
    const resOverlap = await createRecordAction({}, recOverlap);
    expect(resOverlap).toHaveProperty('code', 'OVERLAPPING_PERIOD');

    // 5. Contiguous non-overlapping record accepted
    const recContiguous = form({
      businessId: 'biz1',
      operationalProcessId: procId,
      periodStart: '2026-11-08T00:00',
      periodEnd: '2026-11-15T00:00',
      outputQuantity: '250',
    });
    const resContiguous = await createRecordAction({}, recContiguous);
    expect(resContiguous).toHaveProperty('success');

    const list = await listProductionRecords({ businessId: 'biz1' });
    expect(list).toMatchObject({ ok: true, data: [{ outputQuantity: '250' }, { outputQuantity: '200' }] });
  });

  it('computes energy normalization with real energy measurement in database', async () => {
    // 1. Create process and record (200 kg from 2026-11-01T00:00:00Z to 2026-11-08T00:00:00Z)
    await pool.query(`INSERT INTO operational_process(id, business_id, name, output_unit) VALUES ('proc1', 'biz1', 'Cuci Kiloan', 'kg')`);
    await pool.query(`INSERT INTO production_record(id, business_id, operational_process_id, period_start, period_end, output_quantity)
      VALUES ('rec1', 'biz1', 'proc1', '2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z', '200')`);

    // 2. Insert matching 120 kWh energy measurement
    await pool.query(`INSERT INTO energy_measurement(id, business_id, measurement_source_id, period_start, period_end, source_timezone, energy_kwh, measurement_method, consumption_basis, quality_status, provenance_reference)
      VALUES ('m1', 'biz1', 'meter1', '2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z', 'UTC', '120.000', 'MANUAL', 'MEASURED', 'RECORDED', 'ref-1')`);

    const norm = await getEnergyNormalization('rec1');
    expect(norm).toMatchObject({
      ok: true,
      data: {
        status: 'VALID',
        statusLabel: 'Valid untuk Perbandingan',
        intensity: {
          kwhPerUnit: '0.600',
          formatted: '0,60',
          unitLabel: 'kWh/kg',
        },
        energy: {
          totalKwh: '120',
          coveragePercent: 100,
        },
      },
    });

    if (norm.ok) {
      expect(norm.data.boundaryNote).toContain('meter seluruh usaha');
    }
  });

  it('flags NEEDS_REVIEW when energy measurement contains estimated basis', async () => {
    await pool.query(`INSERT INTO operational_process(id, business_id, name, output_unit) VALUES ('proc1', 'biz1', 'Cuci Kiloan', 'kg')`);
    await pool.query(`INSERT INTO production_record(id, business_id, operational_process_id, period_start, period_end, output_quantity)
      VALUES ('rec1', 'biz1', 'proc1', '2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z', '200')`);

    await pool.query(`INSERT INTO energy_measurement(id, business_id, measurement_source_id, period_start, period_end, source_timezone, energy_kwh, measurement_method, consumption_basis, quality_status, provenance_reference)
      VALUES ('m1', 'biz1', 'meter1', '2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z', 'UTC', '120.000', 'MANUAL', 'ESTIMATED', 'NEEDS_REVIEW', 'ref-1')`);

    const norm = await getEnergyNormalization('rec1');
    expect(norm).toMatchObject({
      ok: true,
      data: {
        status: 'NEEDS_REVIEW',
        statusLabel: 'Perlu Pemeriksaan',
        intensity: {
          kwhPerUnit: '0.600',
        },
      },
    });
  });

  it('enforces multi-tenant isolation; rejects cross-tenant write and read', async () => {
    // User 'other' attempts to write to biz1
    mocks.user.mockResolvedValue('other');
    const resWrite = await createProcessAction({}, form({ businessId: 'biz1', name: 'Illegal Process', outputUnit: 'kg' }));
    expect(resWrite).toHaveProperty('code', 'OPERATIONAL_WRITE_DENIED');

    // Try reading biz1 with user 'other'
    const listRes = await listOperationalProcesses('biz1');
    expect(listRes).toMatchObject({ ok: true, data: [] });
  });
});
