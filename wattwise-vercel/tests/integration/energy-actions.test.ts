import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import pg from 'pg';
import { applyAllForwardMigrations } from '../helpers/migrations';
import { getSafeTestDbUrl } from '../helpers/test-db-guard';
const mocks = vi.hoisted(() => ({ user: vi.fn(), refresh: vi.fn() }));
vi.mock('@/server/auth/session', () => ({ requireUserId: mocks.user }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.refresh }));
import { createSourceAction, createEnergyAction, energyCsvAction } from '@/app/(product)/energy/actions';
import { csvColumns, csvMapping, csvTemplate, parseEnergyCsv } from '@/lib/energy-csv';
import { listEnergyMeasurements, listMeasurementSources } from '@/server/services/measurement.service';

describe('Energy actions through real service and PostgreSQL', () => {
  const admin = new pg.Pool({ connectionString: getSafeTestDbUrl(), max: 1 });
  const database = `phase02_${crypto.randomUUID().replaceAll('-', '')}_test`;
  const url = new URL(getSafeTestDbUrl()); url.pathname = `/${database}`;
  const pool = new pg.Pool({ connectionString: url.toString(), max: 4 });
  const form = (values: Record<string, string | undefined>) => { const data = new FormData(); for (const [k, v] of Object.entries(values)) if (v !== undefined) data.set(k, v); return data; };
  const source = () => form({ businessId: 'business', name: 'Meter utama', sourceType: 'METER', measurementBoundary: 'WHOLE_SITE', provenanceKey: crypto.randomUUID() });
  const energy = (changes: Record<string, string | undefined> = {}) => form({ businessId: 'business', measurementSourceId: 'meter', sourceTimezone: 'Asia/Jakarta', periodStart: '2026-01-01T00:00', periodEnd: '2026-01-02T00:00', energyKwh: '0.001', consumptionBasis: 'MEASURED', provenanceReference: 'log-1', ...changes });
  beforeAll(async () => {
    await admin.query(`CREATE DATABASE "${database}"`); globalThis.__dbPool = pool;
    await applyAllForwardMigrations(pool);
    await pool.query(`INSERT INTO "user"(id,name,email,email_verified) VALUES ('pilot','Pilot','phase02@example.test',false),('other','Other','phase02-other@example.test',false)`);
    await pool.query(`INSERT INTO business(id,user_id,name,business_type,segment,electrical_system) VALUES ('business','pilot','Usaha','OTHER','OTHER','ALL_IN'),('foreign','other','Other','OTHER','OTHER','ALL_IN')`);
    await pool.query(`INSERT INTO measurement_source(id,business_id,name,source_type,measurement_boundary,provenance_key) VALUES ('meter','business','Meter','METER','WHOLE_SITE','meter'),('estimate','business','Estimasi','USER_ESTIMATE','UNKNOWN','estimate')`);
  });
  beforeEach(async () => {
    mocks.user.mockReset(); mocks.user.mockResolvedValue('pilot'); mocks.refresh.mockReset();
    vi.stubEnv('NODE_ENV', 'test'); for (const key of ['VERCEL', 'VERCEL_ENV', 'VERCEL_TARGET_ENV']) vi.stubEnv(key, undefined);
    vi.stubEnv('MEASUREMENT_WRITE_ENABLED', 'true'); vi.stubEnv('MEASUREMENT_PILOT_ALLOWLIST', JSON.stringify([{ userId: 'pilot', businessId: 'business' }]));
    await pool.query('DELETE FROM energy_measurement');
  });
  afterEach(() => vi.unstubAllEnvs());
  afterAll(async () => { globalThis.__dbPool = undefined; globalThis.__dbInstance = undefined; await pool.end(); await admin.query(`DROP DATABASE "${database}"`); await admin.end(); });
  it('registers source; duplicate identity returns readable error', async () => {
    const data = source(); expect(await createSourceAction({}, data)).toHaveProperty('success');
    expect(await createSourceAction({}, data)).toHaveProperty('code', 'DUPLICATE_SOURCE');
  });
  it('persists exact decimal and offset, detects repeated/concurrent submissions and overlaps', async () => {
    const results = await Promise.all([createEnergyAction({}, energy()), createEnergyAction({}, energy())]);
    expect(results.filter(r => r.success)).toHaveLength(1); expect(results.find(r => r.code)).toHaveProperty('code', 'DUPLICATE_INTERVAL');
    expect(await createEnergyAction({}, energy({ periodEnd: '2026-01-03T00:00' }))).toHaveProperty('code', 'OVERLAPPING_INTERVAL');
    expect(await createEnergyAction({}, energy({ periodStart: '2026-01-02T00:00', periodEnd: '2026-01-03T00:00' }))).toHaveProperty('success');
    const history = await listEnergyMeasurements({ businessId: 'business', limit: 21, offset: 0 });
    expect(history).toMatchObject({ ok: true, data: [{ energyKwh: '0.001', measurementMethod: 'MANUAL', aggregationVerified: false, periodStart: new Date('2025-12-31T17:00:00Z') }, { energyKwh: '0.001' }] });
  });
  it.each([{ energyKwh: '-1' }, { energyKwh: '1.0001' }, { periodEnd: '2026-01-01T00:00' }, { periodStart: '2026-01-01T00:00:00+08:00' }])('validates malformed manual values %j', async change => {
    expect(await createEnergyAction({}, energy(change))).toHaveProperty('code', 'VALIDATION_ERROR');
    expect((await pool.query('SELECT * FROM energy_measurement')).rowCount).toBe(0);
  });
  it('keeps estimate basis and quality; rejects measured claim', async () => {
    expect(await createEnergyAction({}, energy({ measurementSourceId: 'estimate' }))).toHaveProperty('code', 'SOURCE_BASIS_MISMATCH');
    expect(await createEnergyAction({}, energy({ measurementSourceId: 'estimate', consumptionBasis: 'ESTIMATED' }))).toHaveProperty('success');
    expect((await pool.query('SELECT consumption_basis,quality_status FROM energy_measurement')).rows).toEqual([{ consumption_basis: 'ESTIMATED', quality_status: 'NEEDS_REVIEW' }]);
  });
  it.each(['flag', 'user', 'session', 'development', 'production'])('denies writes through action: %s', async reason => {
    if (reason === 'flag') vi.stubEnv('MEASUREMENT_WRITE_ENABLED', 'false');
    if (reason === 'user') mocks.user.mockResolvedValue('other');
    if (reason === 'session') mocks.user.mockRejectedValue(new Error('UNAUTHENTICATED'));
    if (reason === 'development') vi.stubEnv('NODE_ENV', 'development');
    if (reason === 'production') vi.stubEnv('VERCEL_ENV', 'production');
    expect(await createSourceAction({}, source())).toHaveProperty('code', reason === 'session' ? 'UNAUTHENTICATED' : 'MEASUREMENT_WRITE_DENIED');
    expect(await createEnergyAction({}, energy())).toHaveProperty('code', reason === 'session' ? 'UNAUTHENTICATED' : 'MEASUREMENT_WRITE_DENIED');
    expect(mocks.refresh).not.toHaveBeenCalled();
  });
  it('checks ownership even when wrong business allowlisted; no cross-tenant reads', async () => {
    vi.stubEnv('MEASUREMENT_PILOT_ALLOWLIST', JSON.stringify([{ userId: 'pilot', businessId: 'foreign' }]));
    const data = source(); data.set('businessId', 'foreign'); data.set('userId', 'other');
    expect(await createSourceAction({}, data)).toHaveProperty('code', 'NOT_FOUND');
    expect(await createEnergyAction({}, energy({ businessId: 'foreign', userId: 'other' }))).toHaveProperty('code', 'NOT_FOUND');
    expect(await listEnergyMeasurements({ businessId: 'foreign' })).toMatchObject({ ok: true, data: [] });
    expect(await listMeasurementSources('foreign')).toMatchObject({ ok: true, data: [] });
  });
  it('bounds/paginates/filter source and interval intersection', async () => {
    for (let day = 1; day <= 22; day++) expect(await createEnergyAction({}, energy({ periodStart: `2026-02-${String(day).padStart(2, '0')}T00:00`, periodEnd: `2026-02-${String(day + 1).padStart(2, '0')}T00:00` }))).toHaveProperty('success');
    expect(await listEnergyMeasurements({ businessId: 'business', limit: 21, offset: 0 })).toMatchObject({ ok: true, data: expect.arrayContaining([expect.objectContaining({ energyKwh: '0.001' })]) });
    const page = await listEnergyMeasurements({ businessId: 'business', limit: 21, offset: 20 }); expect(page.ok && page.data.length).toBe(2);
    const filtered = await listEnergyMeasurements({ businessId: 'business', measurementSourceId: 'meter', periodStart: '2026-02-02T00:00:00+07:00', periodEnd: '2026-02-03T00:00:00+07:00', limit: 21 }); expect(filtered.ok && filtered.data.length).toBe(1);
  });
  const csvRow = (start: string, end: string, kwh = '0.123') => [`2026-03-${start}T00:00:00+07:00`, `2026-03-${end}T00:00:00+07:00`, kwh, 'MEASURED', `log-${start}`, 'kWh', 'INTERVAL_ENERGY', ''];
  const csvForm = (rows: string[][], confirmed = false, changes = {}) => form({ request: JSON.stringify({ businessId: 'business', measurementSourceId: 'meter', sourceTimezone: 'Asia/Jakarta', headers: [...csvColumns], rows, mapping: Object.fromEntries(csvColumns.map((key, i) => [key, i])), ...changes }), intent: confirmed ? 'import' : 'preview', ...(confirmed ? { confirmed: 'yes' } : {}) });
  it('persists the human template with truthful estimated provenance and returns human duplicate recovery', async () => {
    const parsed = parseEnergyCsv(csvTemplate+'2026-03-01T00:00:00+07:00,2026-03-02T00:00:00+07:00,12.5,Perkiraan penggunaan,catatan-umkm,\n');
    const data = csvForm(parsed.rows, true, { headers: parsed.headers, mapping: csvMapping(parsed.headers) });
    expect(await energyCsvAction({}, data)).toMatchObject({ rows: [{ status: 'SAVED' }] });
    expect((await pool.query('SELECT energy_kwh::text,consumption_basis,quality_status,provenance_reference FROM energy_measurement')).rows).toEqual([{ energy_kwh: '12.5', consumption_basis: 'ESTIMATED', quality_status: 'NEEDS_REVIEW', provenance_reference: 'catatan-umkm' }]);
    const repeat = await energyCsvAction({}, data);
    expect(repeat.rows?.[0]).toMatchObject({ status: 'INVALID', message: expect.stringContaining('sudah pernah disimpan') });
    expect(repeat.rows?.[0].message).not.toMatch(/DUPLICATE|INTERVAL|constraint/);
  });
  it('previews without writes, confirms partial valid rows, rejects repeat import', async () => {
    const rows = [csvRow('01', '02'), csvRow('02', '03', '-1')];
    expect(await energyCsvAction({}, csvForm(rows))).toMatchObject({ imported: false, rows: [{ status: 'READY' }, { status: 'INVALID' }] });
    expect((await pool.query('SELECT * FROM energy_measurement')).rowCount).toBe(0);
    expect(await energyCsvAction({}, csvForm(rows, true))).toMatchObject({ imported: true, rows: [{ status: 'SAVED' }, { status: 'INVALID' }] });
    expect(await energyCsvAction({}, csvForm(rows, true))).toMatchObject({ rows: [{ status: 'INVALID' }, { status: 'INVALID' }] });
    expect((await pool.query('SELECT energy_kwh::text,measurement_method,provenance_reference FROM energy_measurement')).rows).toEqual([{ energy_kwh: '0.123', measurement_method: 'CSV_IMPORT', provenance_reference: 'log-01' }]);
  });
  it('rejects both duplicate/overlapping file rows and existing overlap', async () => {
    expect(await energyCsvAction({}, csvForm([csvRow('01', '02'), csvRow('01', '02')], true))).toMatchObject({ rows: [{ status: 'INVALID' }, { status: 'INVALID' }] });
    expect(await energyCsvAction({}, csvForm([csvRow('01', '03'), csvRow('02', '04')], true))).toMatchObject({ rows: [{ status: 'INVALID' }, { status: 'INVALID' }] });
    await createEnergyAction({}, energy({ periodStart: '2026-03-01T00:00', periodEnd: '2026-03-03T00:00' }));
    expect(await energyCsvAction({}, csvForm([csvRow('02', '04')], true))).toMatchObject({ rows: [{ status: 'INVALID' }] });
  });
  it('requires explicit confirmation; never bypasses flag/session/tenant/production', async () => {
    const data = csvForm([csvRow('01', '02')], true); data.delete('confirmed'); expect(await energyCsvAction({}, data)).toHaveProperty('error');
    vi.stubEnv('MEASUREMENT_WRITE_ENABLED', 'false');
    expect(await energyCsvAction({}, csvForm([csvRow('01', '02')], true))).toHaveProperty('error');
    vi.stubEnv('MEASUREMENT_WRITE_ENABLED', 'true'); vi.stubEnv('VERCEL_ENV', 'production');
    expect(await energyCsvAction({}, csvForm([csvRow('01', '02')], true))).toHaveProperty('error');
    vi.stubEnv('VERCEL_ENV', undefined); mocks.user.mockRejectedValue(new Error('UNAUTHENTICATED'));
    expect(await energyCsvAction({}, csvForm([csvRow('01', '02')], true))).toHaveProperty('error');
    mocks.user.mockResolvedValue('other');
    expect(await energyCsvAction({}, csvForm([csvRow('01', '02')], true))).toHaveProperty('error');
    expect((await pool.query('SELECT * FROM energy_measurement')).rowCount).toBe(0);
  });
  it('reports concurrent confirmation conflicts without duplicate persistence', async () => {
    const results = await Promise.all([energyCsvAction({}, csvForm([csvRow('01', '02')], true)), energyCsvAction({}, csvForm([csvRow('01', '02')], true))]);
    expect(results.flatMap(r => r.rows ?? []).filter(r => r.status === 'SAVED')).toHaveLength(1);
    expect((await pool.query('SELECT * FROM energy_measurement')).rowCount).toBe(1);
  });
  it('measures100-row parse/preflight/persist, justifies bounded pilot batch', async () => {
    const rows = Array.from({ length: 100 }, (_, i) => {
      const start = new Date(Date.UTC(2026, 3, 1, i)); const end = new Date(start.getTime() + 3600000);
      return [start.toISOString(), end.toISOString(), '0.001', 'MEASURED', `load-${i}`, 'kWh', 'INTERVAL_ENERGY', 'x'.repeat(900)];
    });
    const text = csvColumns.join(',')+'\n'+rows.map(r => r.join(',')).join('\n');
    const start = performance.now(); const parsed = parseEnergyCsv(text); const parsedAt = performance.now();
    const result = await energyCsvAction({}, csvForm(parsed.rows, true, { sourceTimezone: 'UTC' }));
    const elapsed = performance.now() - start;
    console.log(JSON.stringify({ csvLoadRows: 100, utf8Bytes: new TextEncoder().encode(text).length, parseMs: parsedAt - start, preflightPersistMs: performance.now() - parsedAt, totalMs: elapsed }));
    expect(result.rows?.filter(r => r.status === 'SAVED')).toHaveLength(100); expect(elapsed).toBeLessThan(10000);
  });
});
