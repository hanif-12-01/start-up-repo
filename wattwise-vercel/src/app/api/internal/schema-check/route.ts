import { NextResponse } from 'next/server';
import { getPool } from '@/server/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pool = getPool();
    const res = await pool.query(`
      SELECT 
        (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_plan' AND column_name = 'trial_used_at' LIMIT 1) IS NOT NULL AS has_user_plan_trial_used_at,
        (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_plan' AND column_name = 'status' LIMIT 1) IS NOT NULL AS has_user_plan_status,
        (SELECT 1 FROM information_schema.columns WHERE table_name = 'electricity_bill' AND column_name = 'kwh_source' LIMIT 1) IS NOT NULL AS has_bill_kwh_source,
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') AS table_count,
        (SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name = '__drizzle_migrations')) AS has_drizzle_migrations,
        (SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema = 'drizzle' AND table_name = '__drizzle_migrations')) AS has_drizzle_schema_migrations;
    `);
    
    // Also check drizzle migrations table rows if it exists
    let drizzleMigrations: unknown[] = [];
    try {
      const migRes = await pool.query('SELECT * FROM __drizzle_migrations ORDER BY id ASC');
      drizzleMigrations = migRes.rows;
    } catch {
      try {
        const migRes2 = await pool.query('SELECT * FROM drizzle.__drizzle_migrations ORDER BY id ASC');
        drizzleMigrations = migRes2.rows;
      } catch {}
    }

    return NextResponse.json({
      status: 'ok',
      columns: res.rows[0],
      migrations: drizzleMigrations,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
