import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import pg from 'pg';
import { applyAllForwardMigrations } from '../helpers/migrations';
import { getSafeTestDbUrl } from '../helpers/test-db-guard';
const session = vi.hoisted(() => ({ user: vi.fn() }));
vi.mock('@/server/auth/session', () => ({ requireUserId: session.user }));
import { createMeasurementSource, createEnergyMeasurement } from '@/server/services/measurement.service';

describe('ADR-015 session-bound writes with real PostgreSQL ownership', () => {
  const admin = new pg.Pool({ connectionString: getSafeTestDbUrl(), max: 1 });
  const database = `access015_${crypto.randomUUID().replaceAll('-', '')}_test`;
  const url = new URL(getSafeTestDbUrl()); url.pathname = `/${database}`;
  const pool = new pg.Pool({ connectionString: url.toString(), max: 4 });
  let sourceId: string;
  const source = { businessId: 'pilot-business', name: 'Pilot meter', sourceType: 'METER', measurementBoundary: 'WHOLE_SITE', provenanceKey: 'pilot-meter' };
  const energy = () => ({ businessId: source.businessId, measurementSourceId: sourceId,
    periodStart: '2026-01-01T00:00:00Z', periodEnd: '2026-01-02T00:00:00Z', sourceTimezone: 'UTC',
    energyKwh: '0.123', unit: 'kWh', measurementKind: 'INTERVAL_ENERGY', measurementMethod: 'MANUAL',
    consumptionBasis: 'MEASURED', qualityStatus: 'RECORDED', provenanceReference: 'synthetic access test' });
  const allow = (userId = 'pilot-user', businessId = source.businessId) => vi.stubEnv('MEASUREMENT_PILOT_ALLOWLIST', JSON.stringify([{ userId, businessId }]));
  const counts = async () => (await pool.query(`SELECT (SELECT count(*) FROM measurement_source)::int AS sources,
    (SELECT count(*) FROM energy_measurement)::int AS measurements`)).rows[0];
  async function denyBoth(code = 'MEASUREMENT_WRITE_DENIED', businessId = source.businessId) {
    const before = await counts();
    expect(await createMeasurementSource({ ...source, businessId, provenanceKey: crypto.randomUUID() })).toMatchObject({ ok: false, error: { code } });
    expect(await createEnergyMeasurement({ ...energy(), businessId })).toMatchObject({ ok: false, error: { code } });
    expect(await counts()).toEqual(before);
  }
  beforeAll(async () => {
    await admin.query(`CREATE DATABASE "${database}"`);
    globalThis.__dbPool = pool;
    await applyAllForwardMigrations(pool);
    await pool.query(`INSERT INTO "user"(id,name,email,email_verified) VALUES ('pilot-user','Pilot','access-pilot@example.test',false),('other-user','Other','access-other@example.test',false)`);
    await pool.query(`INSERT INTO business(id,user_id,name,business_type,segment,electrical_system) VALUES
      ('pilot-business','pilot-user','Pilot','OTHER','OTHER','ALL_IN'),('other-business','other-user','Other','OTHER','OTHER','ALL_IN')`);
    await pool.query(`INSERT INTO user_plan(id,user_id,plan) VALUES ('pilot-plan','pilot-user','FREE')`);
    await pool.query(`INSERT INTO electricity_bill(id,business_id,period_start,period_end,total_amount_rupiah,kwh) VALUES
      ('pilot-bill','pilot-business','2026-01-01','2026-01-31',1000,50)`);
    // Existing fixture only; all behavior under test goes through the session-bound service.
    const result = await pool.query(`INSERT INTO measurement_source(id,business_id,name,source_type,measurement_boundary,provenance_key)
      VALUES ('fixture-source','pilot-business','Fixture','METER','WHOLE_SITE','fixture') RETURNING id`);
    sourceId = result.rows[0].id;
  });
  beforeEach(() => {
    session.user.mockReset(); session.user.mockResolvedValue('pilot-user');
    vi.stubEnv('NODE_ENV', 'test');
    for (const key of ['VERCEL', 'VERCEL_ENV', 'VERCEL_TARGET_ENV']) vi.stubEnv(key, undefined);
    vi.stubEnv('MEASUREMENT_WRITE_ENABLED', 'true'); allow();
  });
  afterEach(() => vi.unstubAllEnvs());
  afterAll(async () => {
    globalThis.__dbPool = undefined; globalThis.__dbInstance = undefined;
    await pool.end(); await admin.query(`DROP DATABASE "${database}"`); await admin.end();
  });

  it.each([undefined, '', 'false', 'TRUE', 'garbage'])('denies both writes with flag %s, zero insert', async flag => {
    vi.stubEnv('MEASUREMENT_WRITE_ENABLED', flag); await denyBoth();
  });
  it.each([undefined, '', '[]', 'invalid', '[{"userId":"*","businessId":"*"}]'])('denies both writes with allowlist %s', async list => {
    vi.stubEnv('MEASUREMENT_PILOT_ALLOWLIST', list); await denyBoth();
  });
  it('denies nonallowlisted user and mismatched pair without cross-product grants', async () => {
    session.user.mockResolvedValue('other-user'); await denyBoth();
    session.user.mockResolvedValue('pilot-user'); allow('pilot-user', 'other-business'); await denyBoth();
    allow('other-user', source.businessId); await denyBoth();
  });
  it('denies unauthenticated writes even with approved pair', async () => {
    session.user.mockRejectedValue(new Error('UNAUTHENTICATED')); await denyBoth('UNAUTHENTICATED');
  });
  it('hard-denies Production even with valid pair/flag and preview-looking target', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('VERCEL', '1'); vi.stubEnv('VERCEL_ENV', 'production'); vi.stubEnv('VERCEL_TARGET_ENV', 'preview');
    await denyBoth();
    vi.stubEnv('VERCEL_ENV', 'preview'); vi.stubEnv('VERCEL_TARGET_ENV', 'production'); await denyBoth();
  });
  it('checks real ownership even if incorrect pair is configured; source/business cannot be forged', async () => {
    allow('pilot-user', 'other-business'); await denyBoth('NOT_FOUND', 'other-business');
    session.user.mockResolvedValue('other-user'); allow('other-user', source.businessId); await denyBoth('NOT_FOUND');
    allow('other-user', 'other-business');
    const before = await counts();
    expect(await createEnergyMeasurement({ ...energy(), businessId: 'other-business' })).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } });
    expect(await counts()).toEqual(before);
  });
  it('denies inactive business and source with no insert', async () => {
    await pool.query(`UPDATE business SET is_active=false WHERE id='pilot-business'`);
    try { await denyBoth('NOT_FOUND'); }
    finally { await pool.query(`UPDATE business SET is_active=true WHERE id='pilot-business'`); }
    await pool.query(`UPDATE measurement_source SET is_active=false WHERE id=$1`, [sourceId]);
    try { expect(await createEnergyMeasurement(energy())).toMatchObject({ ok: false, error: { code: 'NOT_FOUND' } }); }
    finally { await pool.query(`UPDATE measurement_source SET is_active=true WHERE id=$1`, [sourceId]); }
  });
  it('creates via authenticated session in simulated Preview; retains decimal/duplicate/overlap constraints', async () => {
    vi.stubEnv('NODE_ENV', 'production'); vi.stubEnv('VERCEL', '1'); vi.stubEnv('VERCEL_ENV', 'preview');
    const savedSource = await createMeasurementSource(source);
    expect(savedSource).toMatchObject({ ok: true, data: { businessId: source.businessId } });
    if (!savedSource.ok) throw new Error('Expected allowed source');
    sourceId = savedSource.data.id;
    const saved = await createEnergyMeasurement(energy());
    expect(saved).toMatchObject({ ok: true, data: { energyKwh: '0.123', aggregationVerified: false } });
    expect(await createMeasurementSource(source)).toMatchObject({ ok: false, error: { code: 'DUPLICATE_SOURCE' } });
    expect(await createEnergyMeasurement(energy())).toMatchObject({ ok: false, error: { code: 'DUPLICATE_INTERVAL' } });
    expect(await createEnergyMeasurement({ ...energy(), periodEnd: '2026-01-03T00:00:00Z' })).toMatchObject({ ok: false, error: { code: 'OVERLAPPING_INTERVAL' } });
    expect(await createEnergyMeasurement({ ...energy(), periodStart: '2026-01-02T00:00:00Z', periodEnd: '2026-01-03T00:00:00Z' })).toMatchObject({ ok: true });
  });
  it('revokes new writes without deleting prior records', async () => {
    vi.stubEnv('MEASUREMENT_PILOT_ALLOWLIST', '[]'); await denyBoth();
  });
  it('does not transfer pilot access automatically with business ownership', async () => {
    await pool.query(`UPDATE business SET user_id='other-user' WHERE id='pilot-business'`);
    try {
      await denyBoth('NOT_FOUND');
      session.user.mockResolvedValue('other-user'); await denyBoth();
    } finally { await pool.query(`UPDATE business SET user_id='pilot-user' WHERE id='pilot-business'`); }
  });
  it.each([
    { userId: 'other-user' }, { energyKwh: 'NaN' }, { energyKwh: '0.0001' },
    { periodStart: '2026-02-01T00:00:00' }, { periodStart: '2026-01-02T00:00:00Z' },
    { provenanceReference: '' }, { unit: 'kW' }, { consumptionBasis: 'ESTIMATED', qualityStatus: 'RECORDED' },
  ])('retains strict input validation for approved pilot %j', async change => {
    const before = await counts();
    expect(await createEnergyMeasurement({ ...energy(), ...change })).toMatchObject({ ok: false, error: { code: 'VALIDATION_ERROR' } });
    expect(await counts()).toEqual(before);
  });
  it('keeps estimates separate and billing/subscription records unchanged by pilot writes', async () => {
    const snapshot = async () => (await pool.query(`SELECT
      (SELECT coalesce(jsonb_agg(to_jsonb(b) ORDER BY b.id),'[]'::jsonb) FROM electricity_bill b) AS bills,
      (SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY s.id),'[]'::jsonb) FROM user_plan s) AS subscriptions,
      (SELECT coalesce(jsonb_agg(to_jsonb(p) ORDER BY p.code),'[]'::jsonb) FROM billing_plan p) AS prices`)).rows[0];
    const before = await snapshot();
    const estimate = await createMeasurementSource({ ...source, sourceType: 'USER_ESTIMATE', provenanceKey: 'estimate-pilot' });
    expect(estimate).toMatchObject({ ok: true });
    if (!estimate.ok) throw new Error('Expected allowed estimate source');
    const input = { ...energy(), measurementSourceId: estimate.data.id };
    expect(await createEnergyMeasurement(input)).toMatchObject({ ok: false, error: { code: 'SOURCE_BASIS_MISMATCH' } });
    expect(await createEnergyMeasurement({ ...input, consumptionBasis: 'ESTIMATED', qualityStatus: 'NEEDS_REVIEW' })).toMatchObject({ ok: true, data: { consumptionBasis: 'ESTIMATED', qualityStatus: 'NEEDS_REVIEW', aggregationVerified: false } });
    expect(await snapshot()).toEqual(before);
  });
});
