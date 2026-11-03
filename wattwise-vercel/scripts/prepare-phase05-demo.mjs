import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { createHmac } from 'node:crypto';
import pg from 'pg';
import { hashPassword } from 'better-auth/crypto';

const { Pool } = pg;

// 1. Strict Production Guard
function assertSafeTestEnvironment(url) {
  if (!url) throw new Error('[FATAL] DATABASE_URL is missing. Refusing to run.');
  const parsed = new URL(url);
  const host = parsed.hostname.toLowerCase();
  const db = parsed.pathname.replace(/^\//, '').toLowerCase();

  const isLocal = host === '127.0.0.1' || host === 'localhost' || host === 'postgres';
  if (!isLocal) {
    throw new Error(`[FATAL GUARD] Database host "${host}" is not local loopback. Refusing to seed demo data into non-local database!`);
  }
  if (!db.endsWith('_test') && db !== 'wattwise_test') {
    throw new Error(`[FATAL GUARD] Database "${db}" is not a designated test database. Must end with "_test". Refusing execution!`);
  }
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV === 'production' || process.env.VERCEL_TARGET_ENV === 'production') {
    throw new Error('[FATAL GUARD] Detected Vercel deployed environment. Execution in deployed environment is strictly forbidden!');
  }
}

const DATABASE_URL = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || 'postgresql://wattwise_test_user:synthetic_test_password_01b@127.0.0.1:5439/wattwise_test';
assertSafeTestEnvironment(DATABASE_URL);

const AUTH_SECRET = process.env.BETTER_AUTH_SECRET || 'synthetic-better-auth-secret-32-chars-minimum-p4!!';
const pool = new Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5000 });

export function signedSessionCookieValue(sessionToken) {
  const signature = createHmac('sha256', AUTH_SECRET)
    .update(sessionToken)
    .digest('base64');
  return `${sessionToken}.${signature}`;
}

async function applyMigrations() {
  const check = await pool.query(`
    SELECT to_regclass('public.production_record') AS p, to_regclass('public.user_plan') AS u;
  `);
  if (check.rows[0]?.p && check.rows[0]?.u) {
    console.log('[Demo Setup] Database schema already migrated. Skipping migration step.');
    return;
  }
  console.log('[Demo Setup] Recreating clean schema and applying migrations...');
  await pool.query(`DROP SCHEMA public CASCADE; CREATE SCHEMA public;`);
  const directory = resolve('drizzle', 'migrations');
  const names = (await readdir(directory))
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
  console.log(`[Demo Setup] Applying ${names.length} migrations...`);
  for (const name of names) {
    const sql = await readFile(join(directory, name), 'utf8');
    await pool.query(sql);
  }
  console.log('[Demo Setup] All migrations applied successfully.');
}

export async function seedDemoData() {
  console.log('[Demo Setup] Seeding deterministic Indonesian UMKM laundry dataset (Berkah Laundry Kiloan)...');

  // Clear existing demo records to ensure idempotency
  await pool.query(`DELETE FROM "user" WHERE email IN ('demo.laundry@wattwise.test', 'nonpilot@wattwise.test')`);

  const hashedPassword = await hashPassword('Password123!');

  // 1. Primary Pilot User (Siti Rahmawati - Berkah Laundry Kiloan)
  const userId = 'usr-demo-laundry-01';
  const bizId1 = 'biz-demo-laundry-01';
  const bizId2 = 'biz-demo-fnb-02';
  const sessionToken = 'tok-demo-laundry-session-2026';

  await pool.query(`
    INSERT INTO "user"(id, name, email, email_verified, created_at, updated_at)
    VALUES ($1, 'Siti Rahmawati (Pemilik Laundry)', 'demo.laundry@wattwise.test', true, now(), now())
  `, [userId]);

  await pool.query(`
    INSERT INTO account(id, account_id, provider_id, user_id, password, created_at, updated_at)
    VALUES ('acc-demo-laundry-01', $1, 'credential', $1, $2, now(), now())
  `, [userId, hashedPassword]);

  await pool.query(`
    INSERT INTO user_plan(id, user_id, plan, status, trial_starts_at, trial_ends_at, onboarding_completed_at, created_at, updated_at)
    VALUES ('plan-demo-01', $1, 'PRO_TRIAL', 'ACTIVE', '2026-09-01T00:00:00Z', '2026-12-31T00:00:00Z', now(), now(), now())
  `, [userId]);

  await pool.query(`
    INSERT INTO session(id, user_id, token, expires_at, created_at, updated_at)
    VALUES ('ses-demo-laundry-01', $1, $2, now() + interval '30 days', now(), now())
  `, [userId, sessionToken]);

  // Primary Business: Berkah Laundry Kiloan
  await pool.query(`
    INSERT INTO business(id, user_id, name, business_type, segment, electrical_system, tariff_rupiah_per_kwh, power_va, city, province, address, is_active, created_at, updated_at)
    VALUES ($1, $2, 'Berkah Laundry Kiloan', 'LAUNDRY', 'LAUNDRY', 'SUB_METER', 1444.70, 4400, 'Surakarta', 'Jawa Tengah', 'Jl. Slamet Riyadi No. 142, Surakarta', true, now(), now())
  `, [bizId1, userId]);

  // Secondary Business: Warung Kopi Berkah (for multi-business switcher demonstration)
  await pool.query(`
    INSERT INTO business(id, user_id, name, business_type, segment, electrical_system, tariff_rupiah_per_kwh, power_va, city, province, address, is_active, created_at, updated_at)
    VALUES ($1, $2, 'Warung Kopi Berkah', 'FNB', 'FNB', 'ALL_IN', 1444.70, 1300, 'Surakarta', 'Jawa Tengah', 'Jl. Kebangkitan No. 12, Surakarta', true, now(), now())
  `, [bizId2, userId]);

  // 2. Non-Pilot User (Joko Widodo - Toko Kelontong Berkah)
  const nonPilotUserId = 'usr-demo-nonpilot-01';
  const nonPilotBizId = 'biz-demo-nonpilot-01';
  const nonPilotSessionToken = 'tok-demo-nonpilot-session-2026';

  await pool.query(`
    INSERT INTO "user"(id, name, email, email_verified, created_at, updated_at)
    VALUES ($1, 'Joko Widodo (Toko Kelontong)', 'nonpilot@wattwise.test', true, now(), now())
  `, [nonPilotUserId]);

  await pool.query(`
    INSERT INTO account(id, account_id, provider_id, user_id, password, created_at, updated_at)
    VALUES ('acc-demo-nonpilot-01', $1, 'credential', $1, $2, now(), now())
  `, [nonPilotUserId, hashedPassword]);

  await pool.query(`
    INSERT INTO user_plan(id, user_id, plan, status, onboarding_completed_at, created_at, updated_at)
    VALUES ('plan-demo-nonpilot', $1, 'FREE', 'ACTIVE', now(), now(), now())
  `, [nonPilotUserId]);

  await pool.query(`
    INSERT INTO session(id, user_id, token, expires_at, created_at, updated_at)
    VALUES ('ses-demo-nonpilot-01', $1, $2, now() + interval '30 days', now(), now())
  `, [nonPilotUserId, nonPilotSessionToken]);

  await pool.query(`
    INSERT INTO business(id, user_id, name, business_type, segment, electrical_system, tariff_rupiah_per_kwh, power_va, is_active, created_at, updated_at)
    VALUES ($1, $2, 'Toko Kelontong Berkah', 'RETAIL', 'RETAIL', 'ALL_IN', 1444.70, 1300, true, now(), now())
  `, [nonPilotBizId, nonPilotUserId]);

  // 3. Measurement Source for Berkah Laundry
  const sourceId = 'src-demo-meter-01';
  await pool.query(`
    INSERT INTO measurement_source(id, business_id, name, source_type, measurement_boundary, provenance_key, description, is_active, created_at, updated_at)
    VALUES ($1, $2, 'Kwh Meter Mesin Cuci & Dryer', 'METER', 'WHOLE_SITE', 'submeter-laundry-01', 'Meter digital kWh khusus operasional laundry kiloan', true, now(), now())
  `, [sourceId, bizId1]);

  // 4. Operational Process for Berkah Laundry
  const processId = 'proc-demo-cuci-01';
  await pool.query(`
    INSERT INTO operational_process(id, business_id, name, output_unit, description, is_active, created_at, updated_at)
    VALUES ($1, $2, 'Pencucian & Pengeringan Kiloan', 'kg', 'Siklus lengkap cuci bersih, bilas, dan pengeringan mesin', true, now(), now())
  `, [processId, bizId1]);

  // 5. Three Operational Periods (ordered so the 2 most recent are valid comparable pair):
  // Period 3: Incomplete Coverage Scenario (2026-09-01 to 2026-09-08: Energy only 3 days = 60 kWh; Production full 7 days = 300 kg => INSUFFICIENT_DATA)
  await pool.query(`
    INSERT INTO energy_measurement(id, business_id, measurement_source_id, period_start, period_end, source_timezone, energy_kwh, unit, measurement_kind, measurement_method, consumption_basis, quality_status, provenance_reference, notes, created_at, updated_at)
    VALUES ('meas-demo-p3-partial', $1, $2, '2026-09-01T08:00:00+07:00', '2026-09-04T08:00:00+07:00', 'Asia/Jakarta', 60.000, 'kWh', 'INTERVAL_ENERGY', 'MANUAL', 'MEASURED', 'RECORDED', 'log-meter-0901-0904', 'Pencatatan meter terhenti hari ke-3 karena operator sakit', now(), now())
  `, [bizId1, sourceId]);

  await pool.query(`
    INSERT INTO production_record(id, business_id, operational_process_id, period_start, period_end, output_quantity, notes, created_at, updated_at)
    VALUES ('rec-demo-p3', $1, $2, '2026-09-01T08:00:00+07:00', '2026-09-08T08:00:00+07:00', 300.000, 'Cucian minggu ke-1 tercatat lengkap', now(), now())
  `, [bizId1, processId]);

  // Period 1: Baseline Valid Period (2026-09-08 to 2026-09-15, 140 kWh, 280 kg => 0.500 kWh/kg)
  await pool.query(`
    INSERT INTO energy_measurement(id, business_id, measurement_source_id, period_start, period_end, source_timezone, energy_kwh, unit, measurement_kind, measurement_method, consumption_basis, quality_status, provenance_reference, notes, created_at, updated_at)
    VALUES ('meas-demo-p1', $1, $2, '2026-09-08T08:00:00+07:00', '2026-09-15T08:00:00+07:00', 'Asia/Jakarta', 140.000, 'kWh', 'INTERVAL_ENERGY', 'MANUAL', 'MEASURED', 'RECORDED', 'log-meter-0908-0915', 'Minggu ke-2 September: baseline normal', now(), now())
  `, [bizId1, sourceId]);

  await pool.query(`
    INSERT INTO production_record(id, business_id, operational_process_id, period_start, period_end, output_quantity, notes, created_at, updated_at)
    VALUES ('rec-demo-p1', $1, $2, '2026-09-08T08:00:00+07:00', '2026-09-15T08:00:00+07:00', 280.000, 'Hasil cucian minggu ke-2 September', now(), now())
  `, [bizId1, processId]);

  // Period 2: Valid Comparable Period - Latest (2026-09-15 to 2026-09-22, 168 kWh (+20%), 350 kg (+25%) => 0.480 kWh/kg (-4% intensity improvement))
  await pool.query(`
    INSERT INTO energy_measurement(id, business_id, measurement_source_id, period_start, period_end, source_timezone, energy_kwh, unit, measurement_kind, measurement_method, consumption_basis, quality_status, provenance_reference, notes, created_at, updated_at)
    VALUES ('meas-demo-p2', $1, $2, '2026-09-15T08:00:00+07:00', '2026-09-22T08:00:00+07:00', 'Asia/Jakarta', 168.000, 'kWh', 'INTERVAL_ENERGY', 'MANUAL', 'MEASURED', 'RECORDED', 'log-meter-0915-0922', 'Minggu ke-3 September: peningkatan pesanan', now(), now())
  `, [bizId1, sourceId]);

  await pool.query(`
    INSERT INTO production_record(id, business_id, operational_process_id, period_start, period_end, output_quantity, notes, created_at, updated_at)
    VALUES ('rec-demo-p2', $1, $2, '2026-09-15T08:00:00+07:00', '2026-09-22T08:00:00+07:00', 350.000, 'Hasil cucian minggu ke-3 September (pesanan hotel bertambah)', now(), now())
  `, [bizId1, processId]);

  // 6. Electricity Bills (6 months continuous history for AI forecast & dashboard)
  const bills = [
    { start: '2026-04-01', end: '2026-04-30', kwh: 480.000, amount: 720000 },
    { start: '2026-05-01', end: '2026-05-31', kwh: 495.000, amount: 742500 },
    { start: '2026-06-01', end: '2026-06-30', kwh: 510.000, amount: 765000 },
    { start: '2026-07-01', end: '2026-07-31', kwh: 520.000, amount: 780000 },
    { start: '2026-08-01', end: '2026-08-31', kwh: 515.000, amount: 772500 },
    { start: '2026-09-01', end: '2026-09-30', kwh: 530.000, amount: 795000 },
  ];

  for (let i = 0; i < bills.length; i++) {
    const b = bills[i];
    await pool.query(`
      INSERT INTO electricity_bill(id, business_id, period_start, period_end, total_amount_rupiah, kwh, tariff_rupiah_per_kwh, kwh_source, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, 1444.70, 'USER_ENTERED', now(), now())
    `, [`bill-demo-0${i + 1}`, bizId1, b.start, b.end, b.amount, b.kwh]);
  }

  console.log('[Demo Setup] Demo dataset seeded successfully.');
  console.log('--- DEMO CREDENTIALS ---');
  console.log('Pilot User (Berkah Laundry Kiloan):');
  console.log('  Email: demo.laundry@wattwise.test');
  console.log('  Password: Password123!');
  console.log('  Business ID: biz-demo-laundry-01');
  console.log('  Session Token: tok-demo-laundry-session-2026');
  console.log('Non-Pilot User (Toko Kelontong Berkah):');
  console.log('  Email: nonpilot@wattwise.test');
  console.log('  Password: Password123!');
  console.log('Sample CSV for upload testing: public/demo/sample-laundry-energy.csv');
  console.log('------------------------');
}

async function main() {
  try {
    await applyMigrations();
    await seedDemoData();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.error('[Demo Setup] Error:', err);
    await pool.end();
    process.exit(1);
  }
}

if (process.argv[1]?.endsWith('prepare-phase05-demo.mjs')) {
  main();
}
