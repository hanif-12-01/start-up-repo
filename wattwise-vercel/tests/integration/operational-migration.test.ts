import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import pg from 'pg';
import { listForwardMigrationNames, readForwardMigration, readRollbackMigration } from '../helpers/migrations';
import { getSafeTestDbUrl } from '../helpers/test-db-guard';

describe('Operational 0013 Additive Migration', () => {
  const admin = new pg.Pool({ connectionString: getSafeTestDbUrl(), max: 1 });
  const database = `operational_${crypto.randomUUID().replaceAll('-', '')}_test`;
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

  it('applies 0000-0013; verifies constraints, cross-business isolation, GiST exclusion and rollback', async () => {
    // Apply all forward migrations up to 0012
    for (const name of listForwardMigrationNames().filter((n) => n < '0013')) {
      await client.query(readForwardMigration(name));
    }

    // Seed baseline user and businesses
    await client.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u1', 'Operator', 'operator@example.test', true)`);
    await client.query(`INSERT INTO business (id, user_id, name, business_type, segment, electrical_system) VALUES
      ('b1', 'u1', 'Laundry Usaha', 'LAUNDRY', 'LAUNDRY', 'ALL_IN'),
      ('b2', 'u1', 'Bakery Usaha', 'FNB', 'FNB', 'ALL_IN')`);

    // Now apply 0013
    await client.query(readForwardMigration('0013_operational_normalization.sql'));

    // Check table creation
    const tables = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('operational_process', 'production_record')`);
    expect(tables.rows.map((r) => r.table_name)).toEqual(expect.arrayContaining(['operational_process', 'production_record']));

    // Insert valid process
    await client.query(`INSERT INTO operational_process (id, business_id, name, output_unit, description) VALUES ('p1', 'b1', 'Cuci Kering', 'kg', 'Layanan cuci harian')`);

    // Unique process name per business
    await expect(
      client.query(`INSERT INTO operational_process (id, business_id, name, output_unit) VALUES ('p2', 'b1', 'Cuci Kering', 'kg')`)
    ).rejects.toMatchObject({ code: '23505' });

    // Same process name allowed across different businesses
    await client.query(`INSERT INTO operational_process (id, business_id, name, output_unit) VALUES ('p2', 'b2', 'Cuci Kering', 'kg')`);

    // Insert valid production record
    const insertRecord = `INSERT INTO production_record (id, business_id, operational_process_id, period_start, period_end, output_quantity, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7)`;
    const validValues = ['r1', 'b1', 'p1', '2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z', '150.500', 'Minggu 1'];
    await client.query(insertRecord, validValues);

    // Reject cross-business mismatch (process p1 belongs to b1, but insert attempts to assign it to b2)
    await expect(
      client.query(insertRecord, ['r2', 'b2', 'p1', '2026-11-08T00:00:00Z', '2026-11-15T00:00:00Z', '100', null])
    ).rejects.toMatchObject({ code: '23503' });

    // Reject negative output quantity
    await expect(
      client.query(insertRecord, ['r-neg', 'b1', 'p1', '2026-11-08T00:00:00Z', '2026-11-15T00:00:00Z', '-10', null])
    ).rejects.toMatchObject({ code: '23514' });

    // Reject excess decimal scale (>3 digits)
    await expect(
      client.query(insertRecord, ['r-scale', 'b1', 'p1', '2026-11-08T00:00:00Z', '2026-11-15T00:00:00Z', '10.5555', null])
    ).rejects.toMatchObject({ code: '23514' });

    // Reject invalid period (end <= start)
    await expect(
      client.query(insertRecord, ['r-time', 'b1', 'p1', '2026-11-15T00:00:00Z', '2026-11-08T00:00:00Z', '100', null])
    ).rejects.toMatchObject({ code: '23514' });

    // Reject overlapping period on the same operational process (GiST exclusion code 23P01)
    await expect(
      client.query(insertRecord, ['r-overlap', 'b1', 'p1', '2026-11-04T00:00:00Z', '2026-11-10T00:00:00Z', '80', null])
    ).rejects.toMatchObject({ code: '23P01' });

    // Allow contiguous non-overlapping period
    await client.query(insertRecord, ['r2', 'b1', 'p1', '2026-11-08T00:00:00Z', '2026-11-15T00:00:00Z', '200', 'Minggu 2']);

    // Test rollback safety: refuses to drop populated tables
    await expect(client.query(readRollbackMigration('0013_operational_normalization_rollback.sql'))).rejects.toThrow(
      'Operational rollback refused: preserve/export operational data before rollback'
    );

    // Empty records and retry rollback
    await client.query('DELETE FROM production_record');
    await client.query('DELETE FROM operational_process');
    await client.query(readRollbackMigration('0013_operational_normalization_rollback.sql'));

    // Verify tables are dropped
    const tablesAfterRollback = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('operational_process', 'production_record')`);
    expect(tablesAfterRollback.rows).toHaveLength(0);

    // Re-apply 0013 cleanly
    await client.query(readForwardMigration('0013_operational_normalization.sql'));
    const tablesReapplied = await client.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('operational_process', 'production_record')`);
    expect(tablesReapplied.rows).toHaveLength(2);
  });
});
