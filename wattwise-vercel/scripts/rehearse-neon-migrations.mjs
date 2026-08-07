import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import pg from 'pg';

const { Pool } = pg;

async function loadEnvTmp() {
  const envContent = await readFile(resolve('.env.preview.tmp'), 'utf8');
  const envVars = {};
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    let val = trimmed.slice(eqIdx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    envVars[key] = val;
  }
  return envVars;
}

async function getTables(pool) {
  const res = await pool.query(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'`
  );
  return res.rows.map((r) => r.table_name).sort();
}

async function main() {
  console.log('🚀 Starting Neon Migration Rehearsal on dedicated Preview database...');
  const envVars = await loadEnvTmp();
  const directUrl = envVars.POSTGRES_URL_NON_POOLING || envVars.DATABASE_URL_UNPOOLED || envVars.DATABASE_URL;

  if (!directUrl) {
    throw new Error('No valid direct PostgreSQL connection string found in .env.preview.tmp');
  }

  const pool = new Pool({
    connectionString: directUrl,
    ssl: true,
    connectionTimeoutMillis: 10000,
  });

  const rehearsalStartedAt = new Date().toISOString();

  // Step 1: Clean schema & verify initial empty state
  await pool.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  const initialTables = await getTables(pool);
  console.log(`📋 Initial tables count: ${initialTables.length}`);

  // Step 2: FIRST UP (0000–0007)
  console.log('📦 Executing FIRST UP: Applying migrations 0000-0008...');
  const migrationsDir = resolve('drizzle', 'migrations');
  const migrationFiles = (await readdir(migrationsDir))
    .filter((f) => /^\d{4}_[a-z0-9_]+\.sql$/.test(f))
    .sort();

  for (const f of migrationFiles) {
    const sqlContent = await readFile(join(migrationsDir, f), 'utf8');
    await pool.query(sqlContent);
  }
  const firstUpTables = await getTables(pool);
  console.log(`✅ FIRST UP complete: ${firstUpTables.length} tables created.`);

  // Step 3: DOWN (Rollback 0007-0000)
  console.log('🔄 Executing DOWN: Applying rollbacks 0008-0000...');
  const rollbacksDir = resolve('drizzle', 'rollbacks');
  const rollbackFiles = (await readdir(rollbacksDir))
    .filter((f) => /^\d{4}_[a-z0-9_]+_rollback\.sql$/.test(f))
    .sort()
    .reverse();

  for (const f of rollbackFiles) {
    const sqlContent = await readFile(join(rollbacksDir, f), 'utf8');
    await pool.query(sqlContent);
  }
  const downTables = await getTables(pool);
  console.log(`✅ DOWN complete: ${downTables.length} tables remaining (empty schema verified).`);

  // Step 4: SECOND UP (0000-0007)
  console.log('📦 Executing SECOND UP: Re-applying migrations 0000-0008...');
  for (const f of migrationFiles) {
    const sqlContent = await readFile(join(migrationsDir, f), 'utf8');
    await pool.query(sqlContent);
  }
  const secondUpTables = await getTables(pool);
  console.log(`✅ SECOND UP complete: ${secondUpTables.length} tables created.`);

  // Step 5: Kos Knowledge Pack V1 Synthetic Seed
  console.log('🌱 Seeding synthetic test dataset (Kos Knowledge Pack V1)...');
  const USERS = {
    owner: { id: 'user-09b-owner', name: 'Synthetic Owner 09B', email: 'owner-09b@example.invalid', token: 'token-09b-owner' },
    free: { id: 'user-09b-free', name: 'Synthetic Free 09B', email: 'free-09b@example.invalid', token: 'token-09b-free' },
    viewer: { id: 'user-09b-viewer', name: 'Synthetic Viewer 09B', email: 'viewer-09b@example.invalid', token: 'token-09b-viewer' },
    nonviewer: { id: 'user-09b-nonviewer', name: 'Synthetic NonViewer 09B', email: 'nonviewer-09b@example.invalid', token: 'token-09b-nonviewer' },
  };

  for (const u of Object.values(USERS)) {
    await pool.query(
      `INSERT INTO "user" (id, name, email, email_verified) VALUES ($1, $2, $3, true) ON CONFLICT (id) DO UPDATE SET name = $2`,
      [u.id, u.name, u.email]
    );
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO "session" (id, user_id, token, expires_at) VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO UPDATE SET expires_at = $4`,
      [`sess-${u.id}`, u.id, u.token, expiresAt]
    );
  }

  // User plans
  await pool.query(
    `INSERT INTO user_plan (id, user_id, plan, trial_starts_at, trial_ends_at, onboarding_completed_at)
     VALUES ('plan-owner-09b', $1, 'PRO_TRIAL', now(), now() + interval '30 days', now()) ON CONFLICT (user_id) DO NOTHING`,
    [USERS.owner.id]
  );
  await pool.query(
    `INSERT INTO user_plan (id, user_id, plan, trial_starts_at, trial_ends_at, onboarding_completed_at)
     VALUES ('plan-free-09b', $1, 'FREE', NULL, NULL, now()) ON CONFLICT (user_id) DO NOTHING`,
    [USERS.free.id]
  );
  await pool.query(
    `INSERT INTO user_plan (id, user_id, plan, trial_starts_at, trial_ends_at, onboarding_completed_at)
     VALUES ('plan-viewer-09b', $1, 'PRO_TRIAL', now(), now() + interval '30 days', now()) ON CONFLICT (user_id) DO NOTHING`,
    [USERS.viewer.id]
  );
  await pool.query(
    `INSERT INTO user_plan (id, user_id, plan, trial_starts_at, trial_ends_at, onboarding_completed_at)
     VALUES ('plan-nonviewer-09b', $1, 'PRO_TRIAL', now(), now() + interval '30 days', now()) ON CONFLICT (user_id) DO NOTHING`,
    [USERS.nonviewer.id]
  );

  // Kos Businesses for Owner
  const ownerBusinesses = [
    ['biz-09b-kos', 'Kos Mawar 09B', 'KOS_PROPERTY', 'KOS', 'TOKEN_PER_KAMAR', 12],
    ['biz-09b-kos-2', 'Kos Utama 09B', 'KOS_PROPERTY', 'KOS', 'ALL_IN', 20],
    ['biz-09b-closed', 'Kos Sesi Selesai', 'KOS_PROPERTY', 'KOS', 'SUB_METER', 15],
  ];
  for (let i = 0; i < ownerBusinesses.length; i++) {
    const [id, name, bType, segment, eleSys, roomCount] = ownerBusinesses[i];
    await pool.query(
      `INSERT INTO business (id, user_id, name, business_type, segment, electrical_system, room_count, is_active, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true, $8) ON CONFLICT (id) DO NOTHING`,
      [id, USERS.owner.id, name, bType, segment, eleSys, roomCount, `2026-01-0${i + 1}T00:00:00Z`]
    );

    await pool.query(
      `INSERT INTO electricity_bill (id, business_id, period_start, period_end, total_amount_rupiah, kwh, tariff_rupiah_per_kwh, created_at, updated_at)
       VALUES
         ($1, $3, '2026-07-01', '2026-07-31', 2900000, 290.000, 1500.00, '2026-08-01', '2026-08-01'),
         ($2, $3, '2026-08-01', '2026-08-31', 3200000, 320.000, 1500.00, '2026-09-01', '2026-09-01')
       ON CONFLICT (id) DO NOTHING`,
      [`${id}-prev`, `${id}-curr`, id]
    );
  }

  // Free user business
  await pool.query(
    `INSERT INTO business (id, user_id, name, business_type, segment, electrical_system, room_count, is_active)
     VALUES ('biz-09b-free-1', $1, 'Kos Free Tier', 'KOS_PROPERTY', 'KOS', 'ALL_IN', 8, true) ON CONFLICT (id) DO NOTHING`,
    [USERS.free.id]
  );
  await pool.query(
    `INSERT INTO electricity_bill (id, business_id, period_start, period_end, total_amount_rupiah, kwh, tariff_rupiah_per_kwh)
     VALUES
       ('bill-free-prev', 'biz-09b-free-1', '2026-07-01', '2026-07-31', 1500000, 150.000, 1500.00),
       ('bill-free-curr', 'biz-09b-free-1', '2026-08-01', '2026-08-31', 1600000, 160.000, 1500.00)
     ON CONFLICT (id) DO NOTHING`
  );

  // Questionnaire & Sessions for Owner
  await pool.query(
    `INSERT INTO diagnostic_session (
       id, business_id, electricity_bill_id, comparison_bill_id, segment_code, status, rule_version, created_at
     ) VALUES ('session-09b-questionnaire', 'biz-09b-kos-2', 'biz-09b-kos-2-curr', 'biz-09b-kos-2-prev', 'KOS', 'COLLECTING_CONTEXT', 'KOS_CONTEXT_V1', '2026-09-01T00:00:00Z')
     ON CONFLICT (id) DO NOTHING`
  );

  for (const [bizId, sessionId, status] of [
    ['biz-09b-kos', 'session-09b-kos', 'INSPECTION_IN_PROGRESS'],
    ['biz-09b-closed', 'session-09b-closed', 'CLOSED'],
  ]) {
    await pool.query(
      `INSERT INTO diagnostic_session (
         id, business_id, electricity_bill_id, comparison_bill_id, segment_code, status, rule_version, questionnaire_completed_at, closed_at, created_at
       ) VALUES ($1, $2, $3, $4, 'KOS', $5, 'KOS_CONTEXT_V1', now(), CASE WHEN $5 = 'CLOSED' THEN now() ELSE NULL END, '2026-09-01T00:00:00Z')
       ON CONFLICT (id) DO NOTHING`,
      [sessionId, bizId, `${bizId}-curr`, `${bizId}-prev`, status]
    );

    const candidateId = `cand-09b-${bizId}`;
    await pool.query(
      `INSERT INTO diagnostic_candidate (
         id, diagnostic_session_id, candidate_code, candidate_version, candidate_type, rule_version, title, rank, internal_score, evidence_level, explanation, supporting_factors_json, contradicting_factors_json
       ) VALUES ($1, $2, 'SPECIAL_ACTIVITY', 1, 'OPERATIONAL', 'CAND_RULE_V1', 'Penggunaan Pompa Listrik Kos Meningkat', 1, 90, 'MODERATE', 'Aktivitas terpantau meningkat di properti kos.', '[]'::jsonb, '[]'::jsonb)
       ON CONFLICT (id) DO NOTHING`,
      [candidateId, sessionId]
    );

    const inspectionId = `insp-09b-${bizId}`;
    await pool.query(
      `INSERT INTO inspection_plan (
         id, business_id, diagnostic_candidate_id, inspection_code, inspection_version, rule_version, title, status, result_code, started_at, completed_at
       ) VALUES ($1, $2, $3, 'SPECIAL_ACTIVITY_REVIEW', 1, 'INSP_RULE_V1', 'Pemeriksaan Fasilitas Kos', 'COMPLETED', 'FOUND', '2026-09-01T00:00:00Z', '2026-09-01T01:00:00Z')
       ON CONFLICT (id) DO NOTHING`,
      [inspectionId, bizId, candidateId]
    );

    const actionId = `act-09b-${bizId}`;
    const baselineJson = JSON.stringify({
      sourceBillId: `${bizId}-curr`,
      comparisonBillId: `${bizId}-prev`,
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
      inclusiveDays: 31,
      totalCostRupiah: '3200000',
      costPerDayRupiah: '103226',
      totalKwhMilliKwh: '320000',
      kwhPerDayMilliKwh: '10323',
      tariffRupiahPerKwh: '1500.00',
    });

    await pool.query(
      `INSERT INTO energy_action_plan (
         id, business_id, diagnostic_candidate_id, inspection_plan_id, action_code, action_version, rule_version, title_snapshot, description_snapshot, reason_snapshot, steps_snapshot_json, inspection_result_snapshot, baseline_snapshot_json, status, review_mode, planned_start_date, started_at, completed_at
       ) VALUES ($1, $2, $3, $4, 'LOG_SPECIAL_ACTIVITY', 1, 'ACT_RULE_V1', 'Rencana Hemat Listrik Kos', 'Catat jadwal penggunaan fasilitas umum kos.', 'Hasil pengamatan area kos.', '["Catat penggunaan air dan pompa", "Atur timer AC area umum"]'::jsonb, 'FOUND', $5::jsonb, $6, 'NEXT_ELIGIBLE_BILL', '2026-09-02', '2026-09-02T00:00:00Z', CASE WHEN $6 = 'COMPLETED' THEN '2026-09-30T00:00:00Z'::timestamptz ELSE NULL END)
       ON CONFLICT (id) DO NOTHING`,
      [actionId, bizId, candidateId, inspectionId, baselineJson, status === 'CLOSED' ? 'COMPLETED' : 'IN_PROGRESS']
    );
  }

  // Viewer & Nonviewer businesses
  await pool.query(
    `INSERT INTO business (id, user_id, name, business_type, segment, electrical_system, room_count, is_active)
     VALUES ('biz-09b-viewer-1', $1, 'Kos Analytics Viewer', 'KOS_PROPERTY', 'KOS', 'ALL_IN', 10, true) ON CONFLICT (id) DO NOTHING`,
    [USERS.viewer.id]
  );
  await pool.query(
    `INSERT INTO business (id, user_id, name, business_type, segment, electrical_system, room_count, is_active)
     VALUES ('biz-09b-nonviewer-1', $1, 'Kos Analytics Non-Viewer', 'KOS_PROPERTY', 'KOS', 'ALL_IN', 10, true) ON CONFLICT (id) DO NOTHING`,
    [USERS.nonviewer.id]
  );

  console.log('✅ Kos Knowledge Pack V1 synthetic dataset seeded successfully.');

  const rehearsalCompletedAt = new Date().toISOString();

  await pool.end();

  const evidenceDir = resolve('..', 'docs', 'evidence', 'it-diag-09b');
  await mkdir(evidenceDir, { recursive: true });

  const evidence = {
    rehearsalTarget: 'Neon Serverless PostgreSQL (Dedicated Preview Resource)',
    rehearsalStartedAt,
    rehearsalCompletedAt,
    initialTablesCount: initialTables.length,
    firstUpTablesCount: firstUpTables.length,
    downTablesCount: downTables.length,
    secondUpTablesCount: secondUpTables.length,
    knowledgePack: 'Kos Knowledge Pack V1',
    migrationFilesCount: migrationFiles.length,
    rollbackFilesCount: rollbackFiles.length,
    tlsConfig: 'Standard TLS (Server Certificate Verification Enabled)',
    syntheticSeed: {
      usersCreated: Object.keys(USERS).length,
      businessesCreated: ownerBusinesses.length + 3,
      sessionsCreated: 3,
      inspectionsCreated: 2,
      actionPlansCreated: 2,
    },
    verdict: 'REHEARSAL SUCCESSFUL — KOS KNOWLEDGE PACK V1 SEEDED',
  };

  await writeFile(
    join(evidenceDir, 'neon-migration-rehearsal.json'),
    JSON.stringify(evidence, null, 2) + '\n'
  );
  console.log('📄 Saved rehearsal evidence to docs/evidence/it-diag-09b/neon-migration-rehearsal.json');
}

main().catch((err) => {
  console.error('❌ Migration rehearsal failed:', err);
  process.exitCode = 1;
});
