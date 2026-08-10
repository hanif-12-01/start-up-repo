import { NextResponse } from 'next/server';
import { getPool } from '@/server/db/client';
import { hashPassword } from 'better-auth/crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const secretHeader = request.headers.get('x-migration-key');
  if (secretHeader !== 'wattwise-prod-stabilization-01-key') {
    return NextResponse.json({ error: 'Unauthorized request' }, { status: 401 });
  }

  try {
    const pool = getPool();
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const accountsToSeed = [
      { email: 'qa-demo@wattwise.test', pass: 'SecretTestPassword123!', name: 'WattWise QA Demo' },
      { email: 'demo@wattwise.ai', pass: 'Password123!', name: 'Demosiswa WattWise' },
    ];

    for (let idx = 0; idx < accountsToSeed.length; idx++) {
      const { email, pass, name } = accountsToSeed[idx];
      const hashedPassword = await hashPassword(pass);
      const userId = `user-prod-demo-0${idx + 1}`;

      // User
      const userRes = await pool.query(`SELECT id FROM "user" WHERE email = $1`, [email]);
      let actualUserId = userId;
      if (userRes.rows.length > 0) {
        actualUserId = userRes.rows[0].id;
        await pool.query(
          `UPDATE "user" SET name = $2, email_verified = true, updated_at = $3 WHERE id = $1`,
          [actualUserId, name, now]
        );
      } else {
        await pool.query(
          `INSERT INTO "user" (id, name, email, email_verified, created_at, updated_at)
           VALUES ($1, $2, $3, true, $4, $4)`,
          [actualUserId, name, email, now]
        );
      }

      // Account
      const accRes = await pool.query(
        `SELECT id FROM "account" WHERE user_id = $1 AND provider_id = 'credential'`,
        [actualUserId]
      );
      if (accRes.rows.length > 0) {
        await pool.query(
          `UPDATE "account" SET password = $2, updated_at = $3 WHERE id = $1`,
          [accRes.rows[0].id, hashedPassword, now]
        );
      } else {
        await pool.query(
          `INSERT INTO "account" (id, user_id, account_id, provider_id, password, created_at, updated_at)
           VALUES ($1, $2, $3, 'credential', $4, $5, $5)`,
          [`acc-prod-demo-0${idx + 1}`, actualUserId, email, hashedPassword, now]
        );
      }

      // User Plan
      await pool.query(
        `INSERT INTO user_plan (id, user_id, plan, status, trial_starts_at, trial_ends_at, onboarding_completed_at, created_at, updated_at)
         VALUES ($1, $2, 'PRO_TRIAL', 'ACTIVE', $3, $4, $3, $3, $3)
         ON CONFLICT (user_id) DO UPDATE SET plan = 'PRO_TRIAL', status = 'ACTIVE', trial_ends_at = $4, onboarding_completed_at = $3, updated_at = $3`,
        [`plan-prod-demo-0${idx + 1}`, actualUserId, now, thirtyDays]
      );

      // Business
      const bizId = `biz-prod-demo-kos-0${idx + 1}`;
      await pool.query(
        `INSERT INTO business (
           id, user_id, name, business_type, segment, electrical_system, city, province, address,
           room_count, occupied_room_count, employee_count, operating_days_per_month, customer_type,
           power_va, tariff_rupiah_per_kwh, payment_method, is_active, created_at, updated_at
         ) VALUES (
           $1, $2, 'Kos Melati QA Demo', 'KOS_PROPERTY', 'KOS', 'ALL_IN', 'Jakarta Selatan', 'DKI Jakarta', 'Jl. Melati QA No. 12',
           20, 16, 2, 30, 'Bisnis/Rumah Tangga',
           2200, 1444.70, 'Pascabayar', true, $3, $3
         ) ON CONFLICT (id) DO UPDATE SET is_active = true, updated_at = $3`,
        [bizId, actualUserId, now]
      );

      // Bills & Revenue
      for (let i = 0; i < 6; i++) {
        const year = 2026;
        const m = i + 1;
        const monthStr = `${year}-${String(m).padStart(2, '0')}`;
        const periodStart = `${monthStr}-01`;
        const lastDay = new Date(year, m, 0).getDate();
        const periodEnd = `${monthStr}-${String(lastDay).padStart(2, '0')}`;

        const usageKwh = 480 + (i % 4) * 20;
        const amount = BigInt(Math.round(usageKwh * 1444.70));
        const billId = `bill-prod-demo-${idx + 1}-${i + 1}`;

        await pool.query(
          `INSERT INTO electricity_bill (
             id, business_id, period_start, period_end, total_amount_rupiah, kwh, tariff_rupiah_per_kwh, kwh_source, payment_method, notes, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, 1444.70, 'USER_ENTERED', 'Pascabayar', 'Data QA Demo WattWise AI', $7, $7)
           ON CONFLICT (id) DO UPDATE SET total_amount_rupiah = $5, kwh = $6, updated_at = $7`,
          [billId, bizId, periodStart, periodEnd, amount, usageKwh.toFixed(3), now]
        );
      }
    }

    return NextResponse.json({
      status: 'success',
      message: 'Demo accounts seeded successfully.',
      accounts: [
        { email: 'qa-demo@wattwise.test', pass: 'SecretTestPassword123!' },
        { email: 'demo@wattwise.ai', pass: 'Password123!' },
      ],
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
