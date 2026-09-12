import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { applyAllForwardMigrations } from '../helpers/migrations';
import { getPortfolioOverview } from '@/server/services/portfolio-intelligence.service';

const { Pool } = pg;

describe('Portfolio Intelligence V1 Integration Tests — Tenant Isolation & Overview', () => {
  let pool: pg.Pool;
  const dbUrl =
    process.env.DATABASE_URL ||
    'postgresql://wattwise_test_user:synthetic_test_password_01b@127.0.0.1:5439/wattwise_test';

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

  async function createTestUser(id: string, email: string) {
    await pool.query(
      `INSERT INTO "user" (id, name, email, email_verified)
       VALUES ($1, $2, $3, true)
       ON CONFLICT (id) DO NOTHING`,
      [id, `User ${id}`, email]
    );
  }

  async function createTestBusiness(id: string, userId: string, name: string) {
    await pool.query(
      `INSERT INTO business (id, user_id, name, business_type, segment, electrical_system, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, 'FNB', 'FNB', 'ALL_IN', true, NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [id, userId, name]
    );
  }

  async function insertBill(id: string, businessId: string, periodStart: string, periodEnd: string, kwh: string, amount: bigint) {
    await pool.query(
      `INSERT INTO electricity_bill (id, business_id, period_start, period_end, kwh, total_amount_rupiah, tariff_rupiah_per_kwh, kwh_source, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, '1444.70', 'USER_ENTERED', NOW(), NOW())
       ON CONFLICT (id) DO NOTHING`,
      [id, businessId, periodStart, periodEnd, kwh, amount]
    );
  }

  it('returns empty overview when tenant has 0 businesses', async () => {
    const emptyUserId = 'user-zero-biz';
    await createTestUser(emptyUserId, 'empty@test.local');

    const overview = await getPortfolioOverview(emptyUserId);
    expect(overview.coverage.activeBusinessCount).toBe(0);
    expect(overview.coverage.businessesWithElectricityData).toBe(0);
    expect(overview.summary.totalUsageKwh).toBeNull();
    expect(overview.comparison.comparableBusinessCount).toBe(0);
    expect(overview.health.summaryText).toContain('Belum ada lokasi usaha aktif');
    expect(overview.locations.length).toBe(0);
  });

  it('strictly isolates tenant data: user A never sees user B businesses or electricity metrics', async () => {
    const userA = 'user-tenant-a';
    const userB = 'user-tenant-b';

    await createTestUser(userA, 'usera@test.local');
    await createTestUser(userB, 'userb@test.local');

    // User A has 2 businesses
    await createTestBusiness('biz-a1', userA, 'Alpha Coffee');
    await createTestBusiness('biz-a2', userA, 'Alpha Bakery');

    // User B has 2 businesses
    await createTestBusiness('biz-b1', userB, 'Beta Laundry');
    await createTestBusiness('biz-b2', userB, 'Beta Gym');

    // Bills for User A: 1000 kWh + 500 kWh in 2026-08
    await insertBill('bill-a1-1', 'biz-a1', '2026-07-01', '2026-07-31', '1000.000', 1444700n);
    await insertBill('bill-a1-2', 'biz-a1', '2026-08-01', '2026-08-31', '1000.000', 1444700n);
    await insertBill('bill-a2-1', 'biz-a2', '2026-07-01', '2026-07-31', '500.000', 722350n);
    await insertBill('bill-a2-2', 'biz-a2', '2026-08-01', '2026-08-31', '500.000', 722350n);

    // Bills for User B: 3000 kWh + 4000 kWh in 2026-08
    await insertBill('bill-b1-1', 'biz-b1', '2026-07-01', '2026-07-31', '3000.000', 4334100n);
    await insertBill('bill-b1-2', 'biz-b1', '2026-08-01', '2026-08-31', '3000.000', 4334100n);
    await insertBill('bill-b2-1', 'biz-b2', '2026-07-01', '2026-07-31', '4000.000', 5778800n);
    await insertBill('bill-b2-2', 'biz-b2', '2026-08-01', '2026-08-31', '4000.000', 5778800n);

    // Query User A
    const overviewA = await getPortfolioOverview(userA, '2026-08');
    expect(overviewA.coverage.activeBusinessCount).toBe(2);
    expect(overviewA.locations.length).toBe(2);
    const locationNamesA = overviewA.locations.map((l) => l.name);
    expect(locationNamesA).toContain('Alpha Coffee');
    expect(locationNamesA).toContain('Alpha Bakery');
    expect(locationNamesA).not.toContain('Beta Laundry');
    expect(locationNamesA).not.toContain('Beta Gym');

    // Total usage for User A: 1000 + 500 = 1500 kWh (never includes User B's 7000 kWh)
    expect(overviewA.summary.totalUsageKwh).toBe(1500);

    // Query User B
    const overviewB = await getPortfolioOverview(userB, '2026-08');
    expect(overviewB.coverage.activeBusinessCount).toBe(2);
    expect(overviewB.locations.length).toBe(2);
    const locationNamesB = overviewB.locations.map((l) => l.name);
    expect(locationNamesB).toContain('Beta Laundry');
    expect(locationNamesB).toContain('Beta Gym');
    expect(locationNamesB).not.toContain('Alpha Coffee');
    expect(locationNamesB).not.toContain('Alpha Bakery');

    // Total usage for User B: 3000 + 4000 = 7000 kWh (never includes User A's 1500 kWh)
    expect(overviewB.summary.totalUsageKwh).toBe(7000);
  });
});
