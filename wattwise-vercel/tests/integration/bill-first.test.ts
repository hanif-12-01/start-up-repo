import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { getPool } from '../../src/server/db/client';
import {
  DuplicateBillPeriodError,
  OverlappingBillPeriodError,
  findPreviousBillForUser,
  listBillsForUser,
} from '../../src/server/repositories/bill.repository';
import { createBill, getBillOverview } from '../../src/server/services/bill.service';
import { createBillSchema } from '../../src/server/validation/bills';
import {
  applyAllForwardMigrations,
  listForwardMigrationNames,
  readForwardMigration,
  readRollbackMigration,
} from '../helpers/migrations';

const { Pool } = pg;

const dbUrl =
  process.env.DATABASE_URL || 'postgresql://postgres:testpass@127.0.0.1:5439/wattwise_test';

function input(
  periodStart: string,
  periodEnd: string,
  totalAmountRupiah: bigint,
  overrides: Partial<{
    kwh: string;
    tariffRupiahPerKwh: string;
    notes: string;
  }> = {}
) {
  return { periodStart, periodEnd, totalAmountRupiah, ...overrides };
}

describe('IT-DIAG-01B PostgreSQL integration', () => {
  let pool: pg.Pool;

  async function seedTenant(suffix: string) {
    const userId = `user-${suffix}`;
    const businessId = `business-${suffix}`;
    await pool.query(
      `INSERT INTO "user" (id, name, email, email_verified)
       VALUES ($1, $2, $3, false)`,
      [userId, `User ${suffix}`, `${suffix}@example.test`]
    );
    await pool.query(
      `INSERT INTO business (
         id, user_id, name, business_type, segment, electrical_system
       ) VALUES ($1, $2, $3, 'OTHER', 'OTHER', 'ALL_IN')`,
      [businessId, userId, `Usaha ${suffix}`]
    );
    return { userId, businessId };
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 5000, max: 4 });
    await pool.query('DROP TABLE IF EXISTS "inspection_item" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "inspection_plan" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "diagnostic_candidate" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "diagnostic_answer" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "diagnostic_session" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "electricity_bill" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "business" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "user_plan" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "verification" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "account" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "session" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "user" CASCADE');
    await applyAllForwardMigrations(pool);
  });

  afterAll(async () => {
    await pool.query(readRollbackMigration('0007_action_outcome_evaluations_rollback.sql'));
    await pool.query(readRollbackMigration('0006_energy_action_plans_rollback.sql'));
    await pool.query(readRollbackMigration('0005_guided_inspections_rollback.sql'));
    await pool.query(readRollbackMigration('0004_diagnostic_candidates_rollback.sql'));
    await pool.query(readRollbackMigration('0003_diagnostic_questionnaire_rollback.sql'));
    await pool.query(readRollbackMigration('0002_bill_first_rollback.sql'));
    await pool.query(readRollbackMigration('0001_journey_business_rollback.sql'));
    await pool.query(readRollbackMigration('0000_auth_schema_rollback.sql'));
    await getPool().end();
    globalThis.__dbPool = undefined;
    globalThis.__dbInstance = undefined;
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM diagnostic_candidate');
    await pool.query('DELETE FROM diagnostic_answer');
    await pool.query('DELETE FROM diagnostic_session');
    await pool.query('DELETE FROM electricity_bill');
    await pool.query('DELETE FROM business');
    await pool.query('DELETE FROM user_plan');
    await pool.query('DELETE FROM session');
    await pool.query('DELETE FROM account');
    await pool.query('DELETE FROM "user"');
  });

  it('discovers through 0009 and preserves the accepted outcome migration up-down-up', async () => {
    const discovered = listForwardMigrationNames();
    expect(discovered).toEqual([
      '0000_auth_schema.sql',
      '0001_journey_business.sql',
      '0002_bill_first.sql',
      '0003_diagnostic_questionnaire.sql',
      '0004_diagnostic_candidates.sql',
      '0005_guided_inspections.sql',
      '0006_energy_action_plans.sql',
      '0007_action_outcome_evaluations.sql',
      '0008_workspace_feature_parity.sql',
      '0009_product_parity.sql',
      '0010_kwh_provenance.sql',
    ]);

    const firstUp = await pool.query(`SELECT to_regclass('public.action_outcome_evaluation') AS table_name`);
    expect(firstUp.rows[0].table_name).toBe('action_outcome_evaluation');

    await pool.query(readRollbackMigration('0007_action_outcome_evaluations_rollback.sql'));
    const down = await pool.query(`SELECT to_regclass('public.action_outcome_evaluation') AS table_name`);
    expect(down.rows[0].table_name).toBeNull();

    await pool.query(readForwardMigration('0007_action_outcome_evaluations.sql'));
    const secondUp = await pool.query(`SELECT to_regclass('public.action_outcome_evaluation') AS table_name`);
    expect(secondUp.rows[0].table_name).toBe('action_outcome_evaluation');
  });

  it('verifies bigint/numeric columns, constraints, foreign key, and index', async () => {
    const columns = await pool.query(
      `SELECT column_name, data_type, numeric_precision, numeric_scale
         FROM information_schema.columns
        WHERE table_name = 'electricity_bill'`
    );
    const byName = Object.fromEntries(columns.rows.map((row) => [row.column_name, row]));
    expect(byName.total_amount_rupiah.data_type).toBe('bigint');
    expect(byName.kwh.numeric_precision).toBe(15);
    expect(byName.kwh.numeric_scale).toBe(3);
    expect(byName.tariff_rupiah_per_kwh.numeric_precision).toBe(15);
    expect(byName.tariff_rupiah_per_kwh.numeric_scale).toBe(2);

    const constraints = await pool.query(
      `SELECT constraint_name
         FROM information_schema.table_constraints
        WHERE table_name = 'electricity_bill'`
    );
    const names = constraints.rows.map((row) => row.constraint_name);
    expect(names).toContain('electricity_bill_business_period_unique');
    expect(names).toContain('electricity_bill_period_check');
    expect(names).toContain('electricity_bill_amount_check');
    expect(names).toContain('electricity_bill_kwh_check');
    expect(names).toContain('electricity_bill_tariff_check');
    expect(names).toContain('electricity_bill_business_id_fk');

    const indexes = await pool.query(
      `SELECT indexname FROM pg_indexes
        WHERE tablename = 'electricity_bill'
          AND indexname = 'electricity_bill_business_period_idx'`
    );
    expect(indexes.rowCount).toBe(1);
  });

  it('inserts a bill with nullable kWh and tariff without precision loss', async () => {
    const tenant = await seedTenant('nullable');
    const saved = await createBill(
      tenant.userId,
      input('2026-01-01', '2026-01-31', 9_223_372_036_854_775_807n)
    );
    expect(saved.totalAmountRupiah).toBe(9_223_372_036_854_775_807n);
    expect(saved.kwh).toBeNull();
    expect(saved.tariffRupiahPerKwh).toBeNull();

    const raw = await pool.query(
      'SELECT total_amount_rupiah::text, kwh, tariff_rupiah_per_kwh FROM electricity_bill'
    );
    expect(raw.rows[0].total_amount_rupiah).toBe('9223372036854775807');
    expect(raw.rows[0].kwh).toBeNull();
    expect(raw.rows[0].tariff_rupiah_per_kwh).toBeNull();
  });

  it.each([
    ['invalid period', '2026-02-02', '2026-02-01', '100', null, null],
    ['negative amount', '2026-02-01', '2026-02-02', '-1', null, null],
    ['negative kWh', '2026-02-01', '2026-02-02', '100', '-0.001', null],
    ['negative tariff', '2026-02-01', '2026-02-02', '100', null, '-0.01'],
  ])('rejects %s at database level', async (_label, start, end, amount, kwh, tariff) => {
    const tenant = await seedTenant(`invalid-${start}-${amount}-${kwh}-${tariff}`.replaceAll('.', 'x'));
    await expect(
      pool.query(
        `INSERT INTO electricity_bill (
           id, business_id, period_start, period_end, total_amount_rupiah, kwh, tariff_rupiah_per_kwh
         ) VALUES ($1, $2, $3::date, $4::date, $5, $6, $7)`,
        [crypto.randomUUID(), tenant.businessId, start, end, amount, kwh, tariff]
      )
    ).rejects.toThrow();
  });

  it('rejects exact duplicates', async () => {
    const tenant = await seedTenant('duplicate');
    await createBill(tenant.userId, input('2026-01-01', '2026-01-31', 100n));
    await expect(
      createBill(tenant.userId, input('2026-01-01', '2026-01-31', 200n))
    ).rejects.toBeInstanceOf(DuplicateBillPeriodError);
  });

  it.each([
    ['boundary', '2026-01-31', '2026-02-15'],
    ['partial', '2026-01-20', '2026-02-15'],
    ['contained', '2026-01-10', '2026-01-20'],
    ['containing', '2025-12-20', '2026-02-10'],
  ])('rejects %s overlap', async (_label, start, end) => {
    const tenant = await seedTenant(`overlap-${_label}`);
    await createBill(tenant.userId, input('2026-01-01', '2026-01-31', 100n));
    await expect(createBill(tenant.userId, input(start, end, 200n))).rejects.toBeInstanceOf(
      OverlappingBillPeriodError
    );
  });

  it('accepts an adjacent period', async () => {
    const tenant = await seedTenant('adjacent');
    await createBill(tenant.userId, input('2026-01-01', '2026-01-31', 100n));
    await createBill(tenant.userId, input('2026-02-01', '2026-02-28', 200n));
    expect((await listBillsForUser(tenant.userId)).length).toBe(2);
  });

  it('selects the deterministic previous period and supports different lengths', async () => {
    const tenant = await seedTenant('previous');
    await createBill(tenant.userId, input('2026-01-01', '2026-01-30', 3_000n));
    await createBill(tenant.userId, input('2026-03-01', '2026-03-31', 3_100n));

    const overview = await getBillOverview(tenant.userId);
    expect(overview.current?.periodStart).toBe('2026-03-01');
    expect(overview.previous?.periodStart).toBe('2026-01-01');
    expect(overview.comparison?.currentDays).toBe(31);
    expect(overview.comparison?.previousDays).toBe(30);
    expect(overview.comparison?.dailyCost.difference).toBe(0n);
  });

  it('returns no comparison for one bill and a comparison for two bills', async () => {
    const tenant = await seedTenant('overview');
    await createBill(tenant.userId, input('2026-01-01', '2026-01-31', 100n));
    expect((await getBillOverview(tenant.userId)).comparison).toBeNull();
    await createBill(tenant.userId, input('2026-02-01', '2026-02-28', 200n));
    expect((await getBillOverview(tenant.userId)).comparison).not.toBeNull();
  });

  it('enforces tenant-scoped create, list, and previous selection', async () => {
    const tenantA = await seedTenant('tenant-a');
    const tenantB = await seedTenant('tenant-b');

    const spoofed = createBillSchema.safeParse({
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      totalAmountRupiah: '100',
      kwh: '',
      tariffRupiahPerKwh: '',
      notes: '',
      businessId: tenantA.businessId,
    });
    expect(spoofed.success).toBe(false);

    const billA = await createBill(tenantA.userId, input('2026-01-01', '2026-01-31', 100n));
    await createBill(tenantB.userId, input('2026-01-01', '2026-01-31', 200n));

    const rowsA = await listBillsForUser(tenantA.userId);
    const rowsB = await listBillsForUser(tenantB.userId);
    expect(rowsA).toHaveLength(1);
    expect(rowsB).toHaveLength(1);
    expect(rowsA[0].businessId).toBe(tenantA.businessId);
    expect(rowsB[0].businessId).toBe(tenantB.businessId);
    expect(await findPreviousBillForUser(tenantB.userId, billA)).toBeNull();
  });

  it('serializes concurrent overlaps, inserts exactly one row, and releases the lock', async () => {
    const tenant = await seedTenant('concurrent');
    const results = await Promise.allSettled([
      createBill(tenant.userId, input('2026-07-01', '2026-07-31', 100n)),
      createBill(tenant.userId, input('2026-07-15', '2026-08-15', 200n)),
    ]);

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    const afterConcurrent = await pool.query(
      'SELECT count(*)::int AS count FROM electricity_bill WHERE business_id = $1',
      [tenant.businessId]
    );
    expect(afterConcurrent.rows[0].count).toBe(1);

    await createBill(tenant.userId, input('2026-09-01', '2026-09-30', 300n));
    const afterNextTransaction = await pool.query(
      'SELECT count(*)::int AS count FROM electricity_bill WHERE business_id = $1',
      [tenant.businessId]
    );
    expect(afterNextTransaction.rows[0].count).toBe(2);
  });
});
