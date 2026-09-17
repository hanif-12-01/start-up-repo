import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { applyAllForwardMigrations } from '../helpers/migrations';
import { getSafeTestDbUrl } from '../helpers/test-db-guard';
import {
  ensurePublicDemoAccount,
  PUBLIC_DEMO_EMAIL,
  PUBLIC_DEMO_PASSWORD,
} from '@/server/services/public-demo-provisioning.service';
import { getProductAnalysisReadModel } from '@/server/services/product-analysis';
import { auth } from '@/server/auth';

const { Pool } = pg;

describe('Public Demo Provisioning Integration Tests', () => {
  let pool: pg.Pool;
  const dbUrl = getSafeTestDbUrl();

  beforeAll(async () => {
    pool = new Pool({ connectionString: dbUrl, max: 2 });
    await pool.query(`
      DO $$ DECLARE r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
        FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON n.nspname = 'public' AND t.typtype = 'e') LOOP
          EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    await applyAllForwardMigrations(pool);
  });

  afterAll(async () => {
    if (pool) await pool.end();
  });

  it('provisions public demo account and verifies login and 4 demo businesses', async () => {
    const res = await ensurePublicDemoAccount();
    expect(res.email).toBe(PUBLIC_DEMO_EMAIL);
    expect(res.businessIds.demo01).toBeDefined();
    expect(res.businessIds.demo02).toBeDefined();
    expect(res.businessIds.demo03).toBeDefined();
    expect(res.businessIds.demo04).toBeDefined();

    // Verify Better Auth sign in works with demo credentials
    const signInRes = await auth.api.signInEmail({
      body: {
        email: PUBLIC_DEMO_EMAIL,
        password: PUBLIC_DEMO_PASSWORD,
      },
      headers: new Headers(),
    });

    expect(signInRes).toBeDefined();
    expect(signInRes.user).toBeDefined();
    expect(signInRes.user.email).toBe(PUBLIC_DEMO_EMAIL);

    // Verify DEMO 03 continuous history triggers N-BEATS AI prediction
    const analysis03 = await getProductAnalysisReadModel(res.userId, res.businessIds.demo03);
    expect(analysis03).toBeDefined();
    expect(analysis03.forecastPlan.requestedEngine).toBe('nbeats');
    expect(analysis03.forecastPlan.eligible).toBe(true);
    expect(analysis03.forecastPlan.continuousHistoryMonths).toBe(6);
  });

  it('is idempotent when called multiple times', async () => {
    const res1 = await ensurePublicDemoAccount();
    const res2 = await ensurePublicDemoAccount();
    expect(res1.userId).toBe(res2.userId);
  });

  // TEST A: Demo starts with synthetic Aug + Sep. Run ensurePublicDemoAccount(). Expected: Aug + Sep remain. No duplicates.
  it('TEST A: Demo starts with synthetic Aug + Sep; ensurePublicDemoAccount preserves them without duplicates', async () => {
    const res = await ensurePublicDemoAccount();
    const initialBills = await pool.query(
      `SELECT id, period_start, period_end, total_amount_rupiah::text, kwh, notes
       FROM electricity_bill WHERE business_id = $1 ORDER BY period_end ASC`,
      [res.businessIds.demo01]
    );
    expect(initialBills.rows.length).toBe(2);

    // Re-run provisioning
    await ensurePublicDemoAccount();

    const afterBills = await pool.query(
      `SELECT id, period_start, period_end, total_amount_rupiah::text, kwh, notes
       FROM electricity_bill WHERE business_id = $1 ORDER BY period_end ASC`,
      [res.businessIds.demo01]
    );
    expect(afterBills.rows.length).toBe(2);
    expect(afterBills.rows[0].id).toBe(initialBills.rows[0].id);
    expect(afterBills.rows[1].id).toBe(initialBills.rows[1].id);
  });

  // TEST B: Demo contains July manual bill + August synthetic + September synthetic. Run ensurePublicDemoAccount(). Expected: July manual remains, August remains, September remains. Total remains 3.
  it('TEST B: Demo contains July manual bill + Aug synth + Sep synth; ensurePublicDemoAccount preserves all 3', async () => {
    const res = await ensurePublicDemoAccount();
    const demo01Id = res.businessIds.demo01;

    // Insert manually entered July 2026 bill (USER_ENTERED, notes !== SYNTHETIC_DEMO_NOTES)
    const manualJulyId = `bill-manual-july-${Date.now()}`;
    await pool.query(
      `INSERT INTO electricity_bill (
         id, business_id, period_start, period_end, total_amount_rupiah, kwh, tariff_rupiah_per_kwh, kwh_source, notes
       ) VALUES ($1, $2, '2026-07-01', '2026-07-31', 1510000, NULL, NULL, 'USER_ENTERED', 'Tagihan manual Juli')`,
      [manualJulyId, demo01Id]
    );

    // Verify 3 bills exist before re-provisioning
    const countBefore = await pool.query(
      `SELECT COUNT(*)::int as count FROM electricity_bill WHERE business_id = $1`,
      [demo01Id]
    );
    expect(countBefore.rows[0].count).toBe(3);

    // Re-run provisioning (simulating login)
    await ensurePublicDemoAccount();

    // Verify July manual bill STILL exists and total remains 3!
    const billsAfter = await pool.query(
      `SELECT id, period_start, period_end, total_amount_rupiah::text, kwh, notes
       FROM electricity_bill WHERE business_id = $1 ORDER BY period_end ASC`,
      [demo01Id]
    );
    expect(billsAfter.rows.length).toBe(3);

    const julyBill = billsAfter.rows.find((b) => b.id === manualJulyId);
    expect(julyBill).toBeDefined();
    expect(julyBill?.total_amount_rupiah).toBe('1510000');
    expect(julyBill?.notes).toBe('Tagihan manual Juli');

    // Clean up the manual July bill so it doesn't leak into subsequent tests
    await pool.query(`DELETE FROM electricity_bill WHERE id = $1`, [manualJulyId]);
  });

  // TEST C: Demo contains an extra manually entered historical bill. Run ensurePublicDemoAccount() repeatedly. Expected: Manual bill is never deleted.
  it('TEST C: Demo contains extra manually entered historical bill; repeated ensurePublicDemoAccount never deletes it', async () => {
    const res = await ensurePublicDemoAccount();
    const demo01Id = res.businessIds.demo01;

    const manualJuneId = `bill-manual-june-${Date.now()}`;
    await pool.query(
      `INSERT INTO electricity_bill (
         id, business_id, period_start, period_end, total_amount_rupiah, kwh, tariff_rupiah_per_kwh, kwh_source, notes
       ) VALUES ($1, $2, '2026-06-01', '2026-06-30', 1420000, '310.500', '1444.70', 'USER_ENTERED', 'Tagihan manual Juni')`,
      [manualJuneId, demo01Id]
    );

    // Call repeatedly 3 times
    await ensurePublicDemoAccount();
    await ensurePublicDemoAccount();
    await ensurePublicDemoAccount();

    const juneCheck = await pool.query(
      `SELECT id, total_amount_rupiah::text, notes FROM electricity_bill WHERE id = $1`,
      [manualJuneId]
    );
    expect(juneCheck.rows.length).toBe(1);
    expect(juneCheck.rows[0].notes).toBe('Tagihan manual Juni');

    await pool.query(`DELETE FROM electricity_bill WHERE id = $1`, [manualJuneId]);
  });

  // TEST D: Manual bill occupies a period expected by the seeder. Expected: Manual bill wins. Seeder must not delete/overwrite it.
  it('TEST D: Manual bill occupies period expected by seeder; manual bill wins and is not overwritten', async () => {
    const res = await ensurePublicDemoAccount();
    const demo01Id = res.businessIds.demo01;

    // Find the current second bill (September 2026) and delete only that synthetic bill
    const existingBills = await pool.query(
      `SELECT id, period_start, period_end FROM electricity_bill WHERE business_id = $1 ORDER BY period_end DESC LIMIT 1`,
      [demo01Id]
    );
    const targetPeriod = existingBills.rows[0];
    await pool.query(`DELETE FROM electricity_bill WHERE id = $1`, [targetPeriod.id]);

    // Insert a custom user bill on the exact same period
    const customUserBillId = `bill-custom-user-sep-${Date.now()}`;
    await pool.query(
      `INSERT INTO electricity_bill (
         id, business_id, period_start, period_end, total_amount_rupiah, kwh, tariff_rupiah_per_kwh, kwh_source, notes
       ) VALUES ($1, $2, $3, $4, 9999999, '888.888', '1444.70', 'USER_ENTERED', 'User manual custom bill')`,
      [customUserBillId, demo01Id, targetPeriod.period_start, targetPeriod.period_end]
    );

    // Run provisioning: seeder must NOT overwrite the manual bill
    await ensurePublicDemoAccount();

    const checkRes = await pool.query(
      `SELECT id, total_amount_rupiah::text, kwh, notes FROM electricity_bill WHERE id = $1`,
      [customUserBillId]
    );
    expect(checkRes.rows.length).toBe(1);
    expect(checkRes.rows[0].total_amount_rupiah).toBe('9999999');
    expect(Number(checkRes.rows[0].kwh)).toBe(888.888);
    expect(checkRes.rows[0].notes).toBe('User manual custom bill');

    // Clean up
    await pool.query(`DELETE FROM electricity_bill WHERE id = $1`, [customUserBillId]);
  });

  // TEST E: Run demo provisioning twice. Expected: Idempotent state. No duplicate synthetic records. No manual data lost.
  it('TEST E: Run demo provisioning twice; idempotent state with no duplicate synthetic records', async () => {
    await ensurePublicDemoAccount();
    const count1 = await pool.query(`SELECT COUNT(*)::int as count FROM electricity_bill`);

    await ensurePublicDemoAccount();
    const count2 = await pool.query(`SELECT COUNT(*)::int as count FROM electricity_bill`);

    expect(count1.rows[0].count).toBe(count2.rows[0].count);
  });
});
