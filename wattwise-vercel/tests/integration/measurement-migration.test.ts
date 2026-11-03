import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { listForwardMigrationNames, readForwardMigration, readRollbackMigration } from '../helpers/migrations';
import { getSafeTestDbUrl } from '../helpers/test-db-guard';

describe('Phase01 additive migration', () => {
  const admin = new pg.Pool({ connectionString: getSafeTestDbUrl(), max: 1 });
  const database = `measurement_${crypto.randomUUID().replaceAll('-', '')}_test`;
  const url = new URL(getSafeTestDbUrl());
  url.pathname = `/${database}`;
  const pool = new pg.Pool({ connectionString: url.toString(), max: 4 });
  let client: pg.PoolClient;
  beforeAll(async () => {
    await admin.query(`CREATE DATABASE "${database}"`);
    client = await pool.connect();
  });
  afterAll(async () => {
    client?.release();
    await pool.end();
    await admin.query(`DROP DATABASE "${database}"`);
    await admin.end();
  });

  it('upgrades old schema preserving billing; rejects cross-business, nonfinite and excess precision', async () => {
    for (const name of listForwardMigrationNames().filter(n => n < '0012')) await client.query(readForwardMigration(name));
    await client.query(`INSERT INTO "user" (id,name,email,email_verified) VALUES ('u','Synthetic','migration@example.test',false)`);
    await client.query(`INSERT INTO business(id,user_id,name,business_type,segment,electrical_system) VALUES ('b','u','Synthetic','OTHER','OTHER','ALL_IN'),('b2','u','Synthetic2','OTHER','OTHER','ALL_IN')`);
    await client.query(`INSERT INTO electricity_bill(id,business_id,period_start,period_end,total_amount_rupiah,kwh) VALUES ('bill','b','2026-01-01','2026-01-31',1000,1.001)`);
    await client.query(readForwardMigration('0012_measurement_foundation.sql'));
    expect((await client.query(`SELECT kwh::text FROM electricity_bill WHERE id='bill'`)).rows[0].kwh).toBe('1.001');
    await client.query(`INSERT INTO measurement_source(id,business_id,name,source_type,measurement_boundary,provenance_key) VALUES ('s','b','Meter','METER','WHOLE_SITE','meter-1')`);
    const insert = `INSERT INTO energy_measurement(id,business_id,measurement_source_id,period_start,period_end,source_timezone,energy_kwh,measurement_method,consumption_basis,quality_status,provenance_reference) VALUES ($1,$2,'s',$3,$4,'UTC',$5,'MANUAL','MEASURED','RECORDED','synthetic log')`;
    const values = ['m','b','2026-01-01T00:00:00Z','2026-01-02T00:00:00Z','0'];
    for (const energy of ['-1','NaN','Infinity','-Infinity','1.0001','1000000000000']) {
      await expect(client.query(insert, [...values.slice(0,4),energy])).rejects.toMatchObject({ code: '23514' });
    }
    await expect(client.query(insert, ['m','b2',...values.slice(2)])).rejects.toMatchObject({ code: '23503' });
    for (const [start,end] of [['infinity','infinity'],['2026-01-01','2026-01-01'],['2026-01-02','2026-01-01'],['2026-01-01T00:00:00.000001Z','2026-01-02']]) {
      await expect(client.query(insert,['m','b',start,end,'1'])).rejects.toBeDefined();
    }
    await client.query(insert, values);
    await expect(client.query(insert, ['dup',...values.slice(1)])).rejects.toMatchObject({ code: '23505' });
    await expect(client.query(insert, ['overlap','b','2026-01-01T12:00:00Z','2026-01-03T00:00:00Z','1'])).rejects.toMatchObject({ code: '23P01' });
    await client.query(insert,['adjacent','b','2026-01-02T00:00:00Z','2026-01-03T00:00:00Z','1']);
    await expect(client.query(readRollbackMigration('0012_measurement_foundation_rollback.sql'))).rejects.toThrow('preserve/export');
    expect((await client.query('SELECT count(*) FROM energy_measurement')).rows[0].count).toBe('2');
    await client.query('DELETE FROM energy_measurement');
    await client.query('DELETE FROM measurement_source');
    await client.query(readRollbackMigration('0012_measurement_foundation_rollback.sql'));
    expect((await client.query(`SELECT count(*) FROM electricity_bill WHERE id='bill'`)).rows[0].count).toBe('1');
    await client.query(readForwardMigration('0012_measurement_foundation.sql'));
    const indexes=await client.query(`SELECT indexname FROM pg_indexes WHERE schemaname='public'`);
    expect(indexes.rows.map(r=>r.indexname)).toContain('energy_measurement_no_overlap');
  });

  it('enforces overlap under concurrent direct SQL without application locks', async () => {
    await client.query(`INSERT INTO measurement_source(id,business_id,name,source_type,measurement_boundary,provenance_key) VALUES ('direct','b','Direct','METER','SUBMETER','direct-meter')`);
    const sql = `INSERT INTO energy_measurement(id,business_id,measurement_source_id,period_start,period_end,source_timezone,energy_kwh,measurement_method,consumption_basis,quality_status,provenance_reference)
      VALUES ($1,'b','direct',$2,$3,'UTC','1','MANUAL','MEASURED','RECORDED','synthetic')`;
    const results = await Promise.allSettled([
      pool.query(sql,['direct1','2026-06-01','2026-06-03']),
      pool.query(sql,['direct2','2026-06-02','2026-06-04']),
    ]);
    expect(results.filter(result=>result.status==='fulfilled')).toHaveLength(1);
    const rejected=results.find(result=>result.status==='rejected');
    expect(rejected?.status).toBe('rejected');
    // GiST concurrent inserts can deadlock; PostgreSQL aborts one, preserving exclusion.
    if (rejected?.status==='rejected') expect(['23P01','40P01']).toContain(rejected.reason.code);
    expect((await client.query(`SELECT count(*) FROM energy_measurement WHERE measurement_source_id='direct'`)).rows[0].count).toBe('1');
    const winner=(await client.query(`SELECT id FROM energy_measurement WHERE measurement_source_id='direct'`)).rows[0].id;
    for (const changes of ["unit='kW'", "measurement_kind='CUMULATIVE'", "quality_status='VERIFIED'", "consumption_basis='ESTIMATED'", "provenance_reference=''", "notes=repeat('x',1001)", "source_timezone='Invalid/Zone'", "measurement_method='UNKNOWN'"]) {
      await expect(client.query(`UPDATE energy_measurement SET ${changes} WHERE id=$1`,[winner])).rejects.toMatchObject({code:'23514'});
    }
    await client.query(`DELETE FROM measurement_source WHERE id='direct'`);
    expect((await client.query(`SELECT count(*) FROM energy_measurement WHERE measurement_source_id='direct'`)).rows[0].count).toBe('0');
  });
});
