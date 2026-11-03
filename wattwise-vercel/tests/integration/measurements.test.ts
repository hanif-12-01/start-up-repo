import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { applyAllForwardMigrations } from '../helpers/migrations';
import { getSafeTestDbUrl } from '../helpers/test-db-guard';
import { createEnergyMeasurementForUser, createMeasurementSourceForUser, findEnergyMeasurementForUser, listEnergyMeasurementsForUser, listMeasurementSourcesForUser } from '../../src/server/repositories/measurement.repository';
import { createEnergyMeasurementSchema } from '../../src/server/validation/measurements';

describe('Phase01 tenant-safe repository', () => {
  const admin = new pg.Pool({ connectionString: getSafeTestDbUrl(), max: 1 });
  const database = `measurement_repo_${crypto.randomUUID().replaceAll('-','')}_test`;
  const url = new URL(getSafeTestDbUrl()); url.pathname=`/${database}`;
  const pool = new pg.Pool({ connectionString: url.toString(), max: 4 });
  const suffix=crypto.randomUUID();
  const userId=`u-${suffix}`, otherUserId=`v-${suffix}`, businessId=`b-${suffix}`, otherBusinessId=`c-${suffix}`;
  let sourceId: string;
  const input = (start='2026-01-01',end='2026-01-02') => createEnergyMeasurementSchema.parse({
    businessId,measurementSourceId:sourceId,periodStart:`${start}T00:00:00Z`,periodEnd:`${end}T00:00:00Z`,
    sourceTimezone:'UTC',energyKwh:'0.123',unit:'kWh',measurementKind:'INTERVAL_ENERGY',measurementMethod:'MANUAL',
    consumptionBasis:'MEASURED',qualityStatus:'RECORDED',provenanceReference:'synthetic log',
  });
  beforeAll(async () => {
    await admin.query(`CREATE DATABASE "${database}"`);
    globalThis.__dbPool=pool;
    await applyAllForwardMigrations(pool);
    await pool.query(`INSERT INTO "user"(id,name,email,email_verified) VALUES ($1,'A',$2,false),($3,'B',$4,false)`,[userId,`${userId}@example.test`,otherUserId,`${otherUserId}@example.test`]);
    await pool.query(`INSERT INTO business(id,user_id,name,business_type,segment,electrical_system) VALUES ($1,$2,'A','OTHER','OTHER','ALL_IN'),($3,$4,'B','OTHER','OTHER','ALL_IN')`,[businessId,userId,otherBusinessId,otherUserId]);
  });
  afterAll(async () => {
    await pool.query(`DELETE FROM "user" WHERE id=ANY($1::text[])`,[[userId,otherUserId]]);
    globalThis.__dbPool=undefined; globalThis.__dbInstance=undefined;
    await pool.end();
    await admin.query(`DROP DATABASE "${database}"`);await admin.end();
  });
  it('creates source, lists only owner; rejects duplicate identity and cross-tenant writes', async () => {
    const source = {businessId,name:'Main meter',sourceType:'METER' as const,measurementBoundary:'WHOLE_SITE' as const,provenanceKey:'meter-1'};
    const saved = await createMeasurementSourceForUser(userId,source); sourceId=saved.id;
    expect((await listMeasurementSourcesForUser(userId,businessId)).map(s=>s.id)).toContain(sourceId);
    expect(await listMeasurementSourcesForUser(otherUserId,businessId)).toEqual([]);
    await expect(createMeasurementSourceForUser(userId,source)).rejects.toMatchObject({code:'DUPLICATE_SOURCE'});
    await expect(createMeasurementSourceForUser(otherUserId,source)).rejects.toMatchObject({code:'NOT_FOUND'});
  });
  it('creates/reads exact decimal; tenant-filtered list and half-open time range', async () => {
    const saved=await createEnergyMeasurementForUser(userId,input());
    expect(saved.energyKwh).toBe('0.123'); expect(saved.aggregationVerified).toBe(false);
    expect((await findEnergyMeasurementForUser(userId,saved.id))?.id).toBe(saved.id);
    expect(await findEnergyMeasurementForUser(otherUserId,saved.id)).toBeNull();
    expect((await listEnergyMeasurementsForUser(userId,{businessId,limit:100,offset:0}))).toHaveLength(1);
    expect(await listEnergyMeasurementsForUser(otherUserId,{businessId,limit:100,offset:0})).toEqual([]);
    expect(await listEnergyMeasurementsForUser(userId,{businessId,periodStart:'2026-01-02T00:00:00Z',limit:100,offset:0})).toEqual([]);
    expect(await listEnergyMeasurementsForUser(userId,{businessId,periodEnd:'2026-01-01T00:00:00Z',limit:100,offset:0})).toEqual([]);
  });
  it('rejects duplicate/value conflict/overlap, permits adjacent', async () => {
    await expect(createEnergyMeasurementForUser(userId,input())).rejects.toMatchObject({code:'DUPLICATE_INTERVAL'});
    await expect(createEnergyMeasurementForUser(userId,{...input(),energyKwh:'2'})).rejects.toMatchObject({code:'DUPLICATE_INTERVAL'});
    await expect(createEnergyMeasurementForUser(userId,input('2026-01-01','2026-01-03'))).rejects.toMatchObject({code:'OVERLAPPING_INTERVAL'});
    await expect(createEnergyMeasurementForUser(userId,input('2026-01-02','2026-01-03'))).resolves.toBeDefined();
  });
  it('rejects forged business/source pairs, inactive sources/businesses', async () => {
    await expect(createEnergyMeasurementForUser(otherUserId,input('2026-02-01','2026-02-02'))).rejects.toMatchObject({code:'NOT_FOUND'});
    await expect(createEnergyMeasurementForUser(otherUserId,{...input(),businessId:otherBusinessId})).rejects.toMatchObject({code:'NOT_FOUND'});
    await pool.query('UPDATE measurement_source SET is_active=false WHERE id=$1',[sourceId]);
    await expect(createEnergyMeasurementForUser(userId,input())).rejects.toMatchObject({code:'NOT_FOUND'});
    await pool.query('UPDATE measurement_source SET is_active=true WHERE id=$1',[sourceId]);
    await pool.query('UPDATE business SET is_active=false WHERE id=$1',[businessId]);
    expect(await listEnergyMeasurementsForUser(userId,{businessId,limit:100,offset:0})).toEqual([]);
    await pool.query('UPDATE business SET is_active=true WHERE id=$1',[businessId]);
  });
  it('serializes concurrent duplicates and overlaps, never loses successful write', async () => {
    const duplicate=await Promise.allSettled([createEnergyMeasurementForUser(userId,input('2026-03-01','2026-03-02')),createEnergyMeasurementForUser(userId,input('2026-03-01','2026-03-02'))]);
    expect(duplicate.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(duplicate.find(r=>r.status==='rejected')).toMatchObject({reason:{code:'DUPLICATE_INTERVAL'}});
    const overlap=await Promise.allSettled([createEnergyMeasurementForUser(userId,input('2026-04-01','2026-04-03')),createEnergyMeasurementForUser(userId,input('2026-04-02','2026-04-04'))]);
    expect(overlap.filter(r=>r.status==='fulfilled')).toHaveLength(1);
    expect(overlap.find(r=>r.status==='rejected')).toMatchObject({reason:{code:'OVERLAPPING_INTERVAL'}});
  });
  it('does not claim user estimates as measured or aggregate separate streams', async () => {
    const source=await createMeasurementSourceForUser(userId,{businessId,name:'Estimate',sourceType:'USER_ESTIMATE',measurementBoundary:'UNKNOWN',provenanceKey:'estimate-1'});
    await expect(createEnergyMeasurementForUser(userId,{...input(),measurementSourceId:source.id})).rejects.toMatchObject({code:'SOURCE_BASIS_MISMATCH'});
    const saved=await createEnergyMeasurementForUser(userId,{...input(),measurementSourceId:source.id,consumptionBasis:'ESTIMATED',qualityStatus:'NEEDS_REVIEW'});
    expect(saved.aggregationVerified).toBe(false);
    expect(saved.measurementBoundary).toBe('UNKNOWN');
  });
  it('retains whole-site/submeter observations separately, never merges CSV duplicates or bills', async () => {
    const source=await createMeasurementSourceForUser(userId,{businessId,name:'Submeter',sourceType:'METER',measurementBoundary:'SUBMETER',provenanceKey:'submeter-1'});
    const submeter=await createEnergyMeasurementForUser(userId,{...input(),measurementSourceId:source.id});
    expect(submeter.measurementBoundary).toBe('SUBMETER');expect(submeter.aggregationVerified).toBe(false);
    await expect(createEnergyMeasurementForUser(userId,{...input(),measurementMethod:'CSV_IMPORT'})).rejects.toMatchObject({code:'DUPLICATE_INTERVAL'});
    await pool.query(`INSERT INTO electricity_bill(id,business_id,period_start,period_end,total_amount_rupiah,kwh) VALUES ($1,$2,'2026-01-01','2026-01-31',1000,50)`,[`bill-${suffix}`,businessId]);
    const rows=await listEnergyMeasurementsForUser(userId,{businessId,periodStart:'2026-01-01T00:00:00Z',periodEnd:'2026-01-02T00:00:00Z',limit:100,offset:0});
    expect(rows).toHaveLength(3); // Main meter, unknown estimate, submeter. Bill is not an energy stream.
    expect(rows.every(row=>row.aggregationVerified===false)).toBe(true);
  });
});
