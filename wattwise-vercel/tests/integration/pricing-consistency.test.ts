import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import { applyAllForwardMigrations } from '../helpers/migrations';
import { getPlanCenter, createSandboxCheckout, startProTrial } from '@/server/services/plan.service';

const { Pool } = pg;

describe('PRICING-CONSISTENCY-01 — Pricing Integration Tests', () => {
  let pool: pg.Pool;
  const dbUrl = process.env.DATABASE_URL || 'postgresql://wattwise_test_user:synthetic_test_password_01b@127.0.0.1:5439/wattwise_test';

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

  beforeEach(async () => {
    await pool.query(`
      DO $$ BEGIN
        DELETE FROM sandbox_payment;
        DELETE FROM sandbox_invoice;
        DELETE FROM user_plan;
        DELETE FROM "user";
      END $$;
    `);
  });

  async function seedTestUser(id = 'user-pricing-test-1'): Promise<string> {
    await pool.query(
      `INSERT INTO "user" (id, name, email, email_verified) VALUES ($1, $2, $3, true)`,
      [id, 'Pricing Test User', `${id}@example.test`]
    );
    return id;
  }

  it('CASE 1: Fresh database applying all migrations results in FREE=0, PRO=49000, BUSINESS=149000', async () => {
    const res = await pool.query(`SELECT code, name, price_amount, currency, interval, active FROM billing_plan ORDER BY code;`);
    const planMap = Object.fromEntries(res.rows.map((r) => [r.code, { ...r, price_amount: Number(r.price_amount) }]));

    expect(planMap.FREE.price_amount).toBe(0);
    expect(planMap.FREE.currency).toBe('IDR');
    expect(planMap.FREE.interval).toBe('monthly');
    expect(planMap.FREE.active).toBe(true);

    expect(planMap.PRO.price_amount).toBe(49000);
    expect(planMap.PRO.currency).toBe('IDR');
    expect(planMap.PRO.interval).toBe('monthly');
    expect(planMap.PRO.active).toBe(true);

    expect(planMap.BUSINESS.price_amount).toBe(149000);
    expect(planMap.BUSINESS.currency).toBe('IDR');
    expect(planMap.BUSINESS.interval).toBe('monthly');
    expect(planMap.BUSINESS.active).toBe(true);
  });

  it('CASE 2: getPlanCenter returns canonical plans matching 0 / 49000 / 149000 and sandboxOnly=true', async () => {
    const userId = await seedTestUser();
    const planCenter = await getPlanCenter(userId);

    expect(planCenter.sandboxOnly).toBe(true);
    expect(planCenter.plans.length).toBe(3);

    const freePlan = planCenter.plans.find((p) => p.code === 'FREE');
    const proPlan = planCenter.plans.find((p) => p.code === 'PRO');
    const bizPlan = planCenter.plans.find((p) => p.code === 'BUSINESS');

    expect(freePlan?.priceAmount).toBe(0n);
    expect(proPlan?.priceAmount).toBe(49000n);
    expect(bizPlan?.priceAmount).toBe(149000n);
  });

  it('CASE 3: createSandboxCheckout for PRO produces invoice amount = 49000', async () => {
    const userId = await seedTestUser();
    const invoiceId = await createSandboxCheckout(userId, 'PRO', 'checkout-key-pro-1');

    const invoiceRes = await pool.query(`SELECT amount, currency, status, plan_code FROM sandbox_invoice WHERE id = $1`, [invoiceId]);
    expect(invoiceRes.rows.length).toBe(1);
    expect(Number(invoiceRes.rows[0].amount)).toBe(49000);
    expect(invoiceRes.rows[0].currency).toBe('IDR');
    expect(invoiceRes.rows[0].status).toBe('OPEN');
    expect(invoiceRes.rows[0].plan_code).toBe('PRO');
  });

  it('CASE 4: createSandboxCheckout for BUSINESS produces invoice amount = 149000', async () => {
    const userId = await seedTestUser();
    const invoiceId = await createSandboxCheckout(userId, 'BUSINESS', 'checkout-key-biz-1');

    const invoiceRes = await pool.query(`SELECT amount, currency, status, plan_code FROM sandbox_invoice WHERE id = $1`, [invoiceId]);
    expect(invoiceRes.rows.length).toBe(1);
    expect(Number(invoiceRes.rows[0].amount)).toBe(149000);
    expect(invoiceRes.rows[0].currency).toBe('IDR');
    expect(invoiceRes.rows[0].status).toBe('OPEN');
    expect(invoiceRes.rows[0].plan_code).toBe('BUSINESS');
  });

  it('CASE 5: Historical sandbox invoices are NOT rewritten by plan center or checkout services', async () => {
    const userId = await seedTestUser();
    const oldInvoiceId = 'inv-historical-old-price-99k';
    await pool.query(
      `INSERT INTO sandbox_invoice (id, user_id, plan_code, invoice_number, idempotency_key, amount, currency, status, simulated, issued_at)
       VALUES ($1, $2, 'PRO', 'SBX-HISTORICAL-001', 'key-old-1', 99000, 'IDR', 'PAID', true, now() - interval '60 days')`,
      [oldInvoiceId, userId]
    );

    const planCenter = await getPlanCenter(userId);
    const historical = planCenter.invoices.find((inv) => inv.id === oldInvoiceId);
    expect(historical).toBeDefined();
    expect(Number(historical?.amount)).toBe(99000); // Historical amount preserved exactly!
  });

  it('CASE 6: startProTrial grants 30 days trial without payment requirement', async () => {
    const userId = await seedTestUser();
    await startProTrial(userId);

    const planRes = await pool.query(`SELECT plan, status, trial_starts_at, trial_ends_at FROM user_plan WHERE user_id = $1`, [userId]);
    expect(planRes.rows.length).toBe(1);
    expect(planRes.rows[0].plan).toBe('PRO_TRIAL');
    expect(planRes.rows[0].status).toBe('ACTIVE');

    const startsAt = new Date(planRes.rows[0].trial_starts_at).getTime();
    const endsAt = new Date(planRes.rows[0].trial_ends_at).getTime();
    const diffDays = Math.round((endsAt - startsAt) / (1000 * 60 * 60 * 24));
    expect(diffDays).toBe(30);
  });

  it('CASE 7: PLAN_CENTER_NO_SELF_HEAL — getPlanCenter is purely READ-ONLY and does NOT mutate billing_plan', async () => {
    const userId = await seedTestUser('user-no-heal-1');
    try {
      // Temporarily set PRO price to 99000 in test DB
      await pool.query(`UPDATE billing_plan SET price_amount = 99000 WHERE code = 'PRO';`);

      // Call getPlanCenter
      const planCenter = await getPlanCenter(userId);
      const proPlan = planCenter.plans.find((p) => p.code === 'PRO');
      expect(proPlan?.priceAmount).toBe(99000n);

      // Re-query database: it MUST NOT have been self-healed back to 49000
      const dbRes = await pool.query(`SELECT price_amount FROM billing_plan WHERE code = 'PRO';`);
      expect(Number(dbRes.rows[0].price_amount)).toBe(99000);
    } finally {
      // Restore canonical pricing
      await pool.query(`UPDATE billing_plan SET price_amount = 49000 WHERE code = 'PRO';`);
    }
  });

  it('CASE 8: CHECKOUT_NO_SELF_HEAL — createSandboxCheckout is purely READ-ONLY and does NOT mutate billing_plan', async () => {
    const userId = await seedTestUser('user-no-heal-2');
    try {
      // Temporarily set PRO price to 99000 in test DB
      await pool.query(`UPDATE billing_plan SET price_amount = 99000 WHERE code = 'PRO';`);

      // Call createSandboxCheckout
      const invoiceId = await createSandboxCheckout(userId, 'PRO', 'checkout-no-heal-pro');
      const invoiceRes = await pool.query(`SELECT amount FROM sandbox_invoice WHERE id = $1;`, [invoiceId]);
      expect(Number(invoiceRes.rows[0].amount)).toBe(99000);

      // Re-query database: it MUST NOT have been self-healed back to 49000
      const dbRes = await pool.query(`SELECT price_amount FROM billing_plan WHERE code = 'PRO';`);
      expect(Number(dbRes.rows[0].price_amount)).toBe(99000);
    } finally {
      // Restore canonical pricing
      await pool.query(`UPDATE billing_plan SET price_amount = 49000 WHERE code = 'PRO';`);
    }
  });
});
