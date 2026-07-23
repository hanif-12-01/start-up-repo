import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:testpass@127.0.0.1:5440/wattwise_smoke' });

function read(dir, name) {
  return readFileSync(join(process.cwd(), `drizzle/${dir}/${name}`), 'utf-8');
}

async function main() {
  // Apply both migrations
  await pool.query(read('migrations', '0000_auth_schema.sql'));
  console.log('Auth schema applied');
  await pool.query(read('migrations', '0001_journey_business.sql'));
  console.log('Journey schema applied');

  // Verify tables
  const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`);
  console.log('Tables:', tables.rows.map(r => r.table_name).sort().join(', '));

  // Rollback journey then re-apply (up-down-up)
  await pool.query(read('rollbacks', '0001_journey_business_rollback.sql'));
  console.log('Journey rollback OK');
  await pool.query(read('migrations', '0001_journey_business.sql'));
  console.log('Journey re-apply OK (up-down-up verified)');

  // --- Simulate full user journey ---
  await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('smoke1', 'Smoke User', 'smoke@test.com', false)`);
  console.log('Step 1: User registered');

  // Select plan (PRO_TRIAL)
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 30 * 86400000);
  await pool.query(`INSERT INTO "user_plan" (id, user_id, plan, trial_starts_at, trial_ends_at, idempotency_key) VALUES ('sp1', 'smoke1', 'PRO_TRIAL', $1, $2, 'idem1')`, [now, trialEnd]);
  console.log(`Step 2: Plan selected PRO_TRIAL, trial ends ${trialEnd.toISOString().split('T')[0]}`);

  // Idempotency check — inserting same user_id should fail
  let idempotencyOk = false;
  try {
    await pool.query(`INSERT INTO "user_plan" (id, user_id, plan, idempotency_key) VALUES ('sp2', 'smoke1', 'FREE', 'idem2')`);
  } catch {
    idempotencyOk = true;
  }
  console.log(`Step 2b: Idempotency guard ${idempotencyOk ? 'PASS' : 'FAIL'}`);

  // Complete onboarding
  await pool.query(`UPDATE "user_plan" SET onboarding_completed_at = NOW() WHERE user_id = 'smoke1'`);
  console.log('Step 3: Onboarding completed');

  // Create business
  await pool.query(`INSERT INTO "business" (id, user_id, name, business_type, segment, electrical_system, room_count) VALUES ('bz1', 'smoke1', 'Kos Smoke Test', 'KOS_PROPERTY', 'KOS', 'ALL_IN', 20)`);
  console.log('Step 4: Business created');

  // Verify complete journey
  const plan = await pool.query(`SELECT plan, onboarding_completed_at FROM "user_plan" WHERE user_id = 'smoke1'`);
  const biz = await pool.query(`SELECT name, business_type, room_count FROM "business" WHERE user_id = 'smoke1'`);
  console.log('Journey state:', JSON.stringify({
    plan: plan.rows[0].plan,
    onboarded: !!plan.rows[0].onboarding_completed_at,
    business: biz.rows[0].name,
    rooms: biz.rows[0].room_count,
  }));

  // Cascade delete
  await pool.query(`DELETE FROM "user" WHERE id = 'smoke1'`);
  const remaining = await pool.query(`SELECT count(*)::int as c FROM "user_plan" WHERE user_id = 'smoke1'`);
  const bizRemaining = await pool.query(`SELECT count(*)::int as c FROM "business" WHERE user_id = 'smoke1'`);
  console.log(`Cascade delete: plan=${remaining.rows[0].c}, business=${bizRemaining.rows[0].c} (both should be 0)`);

  if (remaining.rows[0].c !== 0 || bizRemaining.rows[0].c !== 0) {
    throw new Error('CASCADE delete failed');
  }

  console.log('\nSMOKE TEST PASSED');
  await pool.end();
}

main().catch(e => {
  console.error('SMOKE TEST FAILED:', e.message);
  process.exit(1);
});
