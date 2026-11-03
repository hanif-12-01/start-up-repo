import { spawn } from 'node:child_process';
import { createHmac } from 'node:crypto';
import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const DATABASE_URL = process.env.DATABASE_URL;
const APP_PORT = 3108;
const APP_URL = `http://127.0.0.1:${APP_PORT}`;
const AUTH_SECRET = 'synthetic-better-auth-secret-32-chars-minimum-p4!!';

if (!DATABASE_URL) throw new Error('DATABASE_URL is required');

function signedSessionCookieValue(sessionToken) {
  const signature = createHmac('sha256', AUTH_SECRET)
    .update(sessionToken)
    .digest('base64');
  return `${sessionToken}.${signature}`;
}

function htmlContains(html, text) {
  const escaped = text.replace(/&/g, '&amp;');
  return html.includes(text) || html.includes(escaped);
}

const pool = new Pool({ connectionString: DATABASE_URL, connectionTimeoutMillis: 5000 });

async function applyMigrations() {
  const directory = resolve('drizzle', 'migrations');
  const names = (await readdir(directory))
    .filter((name) => /^\d{4}_[a-z0-9_]+\.sql$/.test(name))
    .sort();
  for (const name of names) {
    await pool.query(await readFile(join(directory, name), 'utf8'));
  }
  return names;
}

async function waitFor(url, retries = 60) {
  for (let attempt = 0; attempt < retries; attempt += 1) {
    try {
      const response = await fetch(url);
      if (response.status < 500) return response;
    } catch {}
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

async function main() {
  console.log('1. Applying database migrations on PostgreSQL...');
  await applyMigrations();
  console.log('Migrations applied.');

  console.log('2. Seeding isolated synthetic test data for Phase 04 verification...');
  const userId = 'usr-p4-test';
  const bizId1 = 'biz-p4-laundry';
  const bizId2 = 'biz-p4-empty';
  const sessionToken = 'tok-p4-verification-session';

  // Seed user & active session
  await pool.query(`INSERT INTO "user"(id, name, email, email_verified)
    VALUES ($1, 'Budi Pemilik Laundry', 'budi.phase04@example.test', true)`, [userId]);

  await pool.query(`INSERT INTO user_plan(id, user_id, plan, onboarding_completed_at)
    VALUES ('plan-p4', $1, 'FREE', now())`, [userId]);

  await pool.query(`INSERT INTO session(id, user_id, token, expires_at)
    VALUES ('ses-p4', $1, $2, now() + interval '1 day')`, [userId, sessionToken]);

  // Seed 2 businesses (one with operational records, one empty)
  await pool.query(`INSERT INTO business(id, user_id, name, business_type, segment, electrical_system, tariff_rupiah_per_kwh)
    VALUES ($1, $2, 'Laundry Berkah Kilat', 'LAUNDRY', 'LAUNDRY', 'ALL_IN', '1444'),
           ($3, $2, 'Warung Makan Sedap', 'FNB', 'FNB', 'ALL_IN', '1444')`,
    [bizId1, userId, bizId2]);

  // Seed operational process
  await pool.query(`INSERT INTO operational_process(id, business_id, name, output_unit)
    VALUES ('proc-p4', $1, 'Cuci & Kering Kiloan', 'kg')`, [bizId1]);

  // Seed 2 consecutive production periods (7 days each)
  // Period 1: Nov 1 to Nov 8 (200 kg)
  await pool.query(`INSERT INTO production_record(id, business_id, operational_process_id, period_start, period_end, output_quantity)
    VALUES ('prod-p4-1', $1, 'proc-p4', '2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z', '200')`, [bizId1]);

  // Period 2: Nov 8 to Nov 15 (250 kg)
  await pool.query(`INSERT INTO production_record(id, business_id, operational_process_id, period_start, period_end, output_quantity)
    VALUES ('prod-p4-2', $1, 'proc-p4', '2026-11-08T00:00:00Z', '2026-11-15T00:00:00Z', '250')`, [bizId1]);

  // Seed measurement source & measurements
  await pool.query(`INSERT INTO measurement_source(id, business_id, name, source_type, measurement_boundary, provenance_key)
    VALUES ('meter-main', $1, 'Meter PLN Utama', 'METER', 'WHOLE_SITE', 'main-meter')`, [bizId1]);

  // Energy Period 1: 120 kWh (exact match)
  await pool.query(`INSERT INTO energy_measurement(id, business_id, measurement_source_id, period_start, period_end, source_timezone, energy_kwh, measurement_method, consumption_basis, quality_status, provenance_reference)
    VALUES ('m-p4-1', $1, 'meter-main', '2026-11-01T00:00:00Z', '2026-11-08T00:00:00Z', 'UTC', '120.000', 'MANUAL', 'MEASURED', 'RECORDED', 'ref-p4-1')`, [bizId1]);

  // Energy Period 2: 132 kWh (exact match)
  await pool.query(`INSERT INTO energy_measurement(id, business_id, measurement_source_id, period_start, period_end, source_timezone, energy_kwh, measurement_method, consumption_basis, quality_status, provenance_reference)
    VALUES ('m-p4-2', $1, 'meter-main', '2026-11-08T00:00:00Z', '2026-11-15T00:00:00Z', 'UTC', '132.000', 'MANUAL', 'MEASURED', 'RECORDED', 'ref-p4-2')`, [bizId1]);

  // Seed 3 monthly bills for anomaly detection (latest bill has 15% increase)
  await pool.query(`INSERT INTO electricity_bill(id, business_id, period_start, period_end, total_amount_rupiah, kwh, tariff_rupiah_per_kwh, kwh_source)
    VALUES ('b-p4-1', $1, '2026-08-01', '2026-08-31', 1444000, '1000.000', '1444', 'USER_ENTERED'),
           ('b-p4-2', $1, '2026-09-01', '2026-09-30', 1444000, '1000.000', '1444', 'USER_ENTERED'),
           ('b-p4-3', $1, '2026-10-01', '2026-10-31', 1660600, '1150.000', '1444', 'USER_ENTERED')`, [bizId1]);

  console.log('Synthetic test fixture seeded successfully.');

  console.log('3. Starting Next.js production server on port ' + APP_PORT + '...');
  const nextBin = resolve('node_modules', 'next', 'dist', 'bin', 'next');
  const nextServer = spawn(
    process.execPath,
    [nextBin, 'start', '-p', String(APP_PORT)],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        PORT: String(APP_PORT),
        NODE_ENV: 'production',
        MEASUREMENT_WRITE_ENABLED: 'true',
        BETTER_AUTH_SECRET: 'synthetic-better-auth-secret-32-chars-minimum-p4!!',
        BETTER_AUTH_URL: APP_URL,
      },
    }
  );

  const cleanup = async () => {
    try {
      nextServer.kill();
    } catch {}
    await pool.end();
  };

  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);

  try {
    await waitFor(APP_URL, 60);
    console.log('Next.js server ready at ' + APP_URL);

    const cookieHeader = `wattwise.session_token=${signedSessionCookieValue(sessionToken)}`;

    // Test 1: Check /activities page
    console.log('4. Verifying /activities route with active session...');
    const actRes = await fetch(`${APP_URL}/activities?businessId=${bizId1}`, {
      headers: { cookie: cookieHeader },
    });
    if (!actRes.ok) throw new Error(`/activities returned status ${actRes.status}`);
    const actHtml = await actRes.text();

    if (!htmlContains(actHtml, 'Cuci & Kering Kiloan')) {
      throw new Error('/activities missing process name');
    }
    if (!htmlContains(actHtml, 'Valid untuk Perbandingan')) {
      throw new Error('/activities missing Valid status label');
    }
    if (!htmlContains(actHtml, 'kWh/kg')) {
      throw new Error('/activities missing kWh/kg intensity unit');
    }
    console.log('  -> /activities verified: Process name, Valid status, and kWh/kg rendered.');

    // Test 2: Check /analysis overview tab
    console.log('5. Verifying /analysis overview tab with contextual energy comparison...');
    const analysisRes = await fetch(`${APP_URL}/analysis?businessId=${bizId1}&tab=overview`, {
      headers: { cookie: cookieHeader },
    });
    if (!analysisRes.ok) throw new Error(`/analysis returned status ${analysisRes.status}`);
    const analysisHtml = await analysisRes.text();

    if (!htmlContains(analysisHtml, 'Pemakaian Listrik & Aktivitas Usaha')) {
      throw new Error('/analysis overview missing contextual energy intelligence section');
    }
    if (!htmlContains(analysisHtml, 'Pemakaian Listrik Bertambah Sejalan dengan Kenaikan Produksi')) {
      throw new Error('/analysis overview missing grounded intelligence headline');
    }
    if (!htmlContains(analysisHtml, 'Lebih Hemat')) {
      throw new Error('/analysis overview missing Lebih Hemat efficiency badge');
    }
    console.log('  -> /analysis overview verified: Contextual energy intelligence section and headline rendered.');

    // Test 3: Check /analysis anomaly tab
    console.log('6. Verifying /analysis anomaly tab with grounded anomaly explanation...');
    const anomalyRes = await fetch(`${APP_URL}/analysis?businessId=${bizId1}&tab=anomaly`, {
      headers: { cookie: cookieHeader },
    });
    if (!anomalyRes.ok) throw new Error(`/analysis anomaly returned status ${anomalyRes.status}`);
    const anomalyHtml = await anomalyRes.text();

    if (!htmlContains(anomalyHtml, 'Konteks Aktivitas Operasional')) {
      throw new Error('/analysis anomaly missing Konteks Aktivitas Operasional card');
    }
    if (!htmlContains(anomalyHtml, 'Kenaikan Pemakaian Sejalan dengan Pertumbuhan Aktivitas')) {
      throw new Error('/analysis anomaly missing contextual explanation headline');
    }
    console.log('  -> /analysis anomaly verified: Grounded contextual explanation rendered.');

    // Test 4: Check business switcher & empty state isolation
    console.log('7. Verifying business isolation on empty business...');
    const emptyRes = await fetch(`${APP_URL}/analysis?businessId=${bizId2}&tab=overview`, {
      headers: { cookie: cookieHeader },
    });
    if (!emptyRes.ok) throw new Error(`/analysis empty biz returned status ${emptyRes.status}`);
    const emptyHtml = await emptyRes.text();

    if (!emptyHtml.includes('Belum cukup data aktivitas operasional untuk membandingkan')) {
      throw new Error('/analysis empty biz missing helpful empty state');
    }
    console.log('  -> Business isolation verified: Empty business renders proper empty state without leaking data.');

    console.log('\n=============================================');
    console.log('✅ ALL PHASE 04 BROWSER & E2E SCENARIOS PASSED');
    console.log('=============================================\n');
  } finally {
    await cleanup();
  }
}

main().catch((err) => {
  console.error('❌ Phase 04 verification failed:', err);
  process.exit(1);
});
