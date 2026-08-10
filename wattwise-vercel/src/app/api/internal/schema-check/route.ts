import { NextResponse } from 'next/server';
import { getPool } from '@/server/db/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const pool = getPool();
    const tablesRes = await pool.query(`
      SELECT table_name 
        FROM information_schema.tables 
       WHERE table_schema = 'public' 
       ORDER BY table_name
    `);
    
    const columnsRes = await pool.query(`
      SELECT table_name, column_name 
        FROM information_schema.columns 
       WHERE table_schema = 'public'
       ORDER BY table_name, column_name
    `);

    const colsByTable: Record<string, string[]> = {};
    for (const row of columnsRes.rows) {
      if (!colsByTable[row.table_name]) colsByTable[row.table_name] = [];
      colsByTable[row.table_name].push(row.column_name);
    }

    const checks = {
      user_plan_status: colsByTable['user_plan']?.includes('status') ?? false,
      user_plan_trial_used_at: colsByTable['user_plan']?.includes('trial_used_at') ?? false,
      user_plan_current_period_starts_at: colsByTable['user_plan']?.includes('current_period_starts_at') ?? false,
      user_plan_current_period_ends_at: colsByTable['user_plan']?.includes('current_period_ends_at') ?? false,
      user_plan_cancelled_at: colsByTable['user_plan']?.includes('cancelled_at') ?? false,
      electricity_bill_kwh_source: colsByTable['electricity_bill']?.includes('kwh_source') ?? false,
      electricity_bill_meter_start: colsByTable['electricity_bill']?.includes('meter_start') ?? false,
      electricity_bill_meter_end: colsByTable['electricity_bill']?.includes('meter_end') ?? false,
      business_power_va: colsByTable['business']?.includes('power_va') ?? false,
      billing_plan_exists: Boolean(colsByTable['billing_plan']),
      sandbox_invoice_exists: Boolean(colsByTable['sandbox_invoice']),
      sandbox_payment_exists: Boolean(colsByTable['sandbox_payment']),
      drizzle_migrations_exists: Boolean(colsByTable['__drizzle_migrations']),
    };

    return NextResponse.json({
      status: 'ok',
      checks,
      tables: tablesRes.rows.map((r: { table_name: string }) => r.table_name),
      columns: colsByTable,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ status: 'error', error: message }, { status: 500 });
  }
}
