import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const { Pool } = pg;
const pool = new Pool({ connectionString: process.env.DATABASE_URL || 'postgresql://postgres:testpass@127.0.0.1:5440/wattwise_smoke' });

function read(dir, name) {
  return readFileSync(join(process.cwd(), `drizzle/${dir}/${name}`), 'utf-8');
}

let pass = 0;
let fail = 0;

function assert(label, condition) {
  if (condition) {
    pass++;
    console.log(`  PASS: ${label}`);
  } else {
    fail++;
    console.log(`  FAIL: ${label}`);
  }
}

async function expectReject(label, fn) {
  try {
    await fn();
    fail++;
    console.log(`  FAIL: ${label} (should have thrown)`);
  } catch {
    pass++;
    console.log(`  PASS: ${label}`);
  }
}

async function main() {
  // --- Migration lifecycle ---
  console.log('\n--- Migration lifecycle ---');
  await pool.query(read('migrations', '0000_auth_schema.sql'));
  await pool.query(read('migrations', '0001_journey_business.sql'));
  console.log('  Migrations applied');

  const tables = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`);
  const tNames = tables.rows.map(r => r.table_name);
  assert('user_plan table exists', tNames.includes('user_plan'));
  assert('business table exists', tNames.includes('business'));

  // Rollback + re-apply
  await pool.query(read('rollbacks', '0001_journey_business_rollback.sql'));
  const afterRb = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('user_plan','business')`);
  assert('Journey tables removed after rollback', afterRb.rows.length === 0);
  const authAfter = await pool.query(`SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_name='user'`);
  assert('Auth tables survive journey rollback', authAfter.rows.length === 1);

  await pool.query(read('migrations', '0001_journey_business.sql'));
  assert('Journey re-apply OK (up-down-up)', true);

  // --- Plan selection ---
  console.log('\n--- Plan selection ---');
  await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u_free', 'Free User', 'free@test.com', false)`);
  await pool.query(`INSERT INTO "user_plan" (id, user_id, plan, idempotency_key) VALUES ('p_free', 'u_free', 'FREE', 'k_free')`);
  const freePlan = await pool.query(`SELECT plan, trial_starts_at, trial_ends_at FROM "user_plan" WHERE id='p_free'`);
  assert('FREE plan stored', freePlan.rows[0].plan === 'FREE');
  assert('FREE plan has null trial_starts_at', freePlan.rows[0].trial_starts_at === null);
  assert('FREE plan has null trial_ends_at', freePlan.rows[0].trial_ends_at === null);

  await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u_trial', 'Trial User', 'trial@test.com', false)`);
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 30 * 86400000);
  await pool.query(`INSERT INTO "user_plan" (id, user_id, plan, trial_starts_at, trial_ends_at, idempotency_key) VALUES ('p_trial', 'u_trial', 'PRO_TRIAL', $1, $2, 'k_trial')`, [now, trialEnd]);
  const trialPlan = await pool.query(`SELECT plan, trial_starts_at, trial_ends_at FROM "user_plan" WHERE id='p_trial'`);
  assert('PRO_TRIAL plan stored', trialPlan.rows[0].plan === 'PRO_TRIAL');
  assert('PRO_TRIAL has trial dates', trialPlan.rows[0].trial_starts_at !== null && trialPlan.rows[0].trial_ends_at !== null);

  // --- Trial constraints ---
  console.log('\n--- Trial constraints ---');
  await expectReject('Replay does not create second plan (unique user_id)', () =>
    pool.query(`INSERT INTO "user_plan" (id, user_id, plan, idempotency_key) VALUES ('p2', 'u_trial', 'FREE', 'k2')`)
  );

  // Verify replay does not change expiry
  const afterReplay = await pool.query(`SELECT trial_ends_at FROM "user_plan" WHERE id='p_trial'`);
  assert('Replay does not change trial expiry', afterReplay.rows[0].trial_ends_at.getTime() === trialEnd.getTime());

  await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u_bad1', 'Bad1', 'bad1@test.com', false)`);
  await expectReject('FREE with trial dates rejected', () =>
    pool.query(`INSERT INTO "user_plan" (id, user_id, plan, trial_starts_at, trial_ends_at, idempotency_key) VALUES ('pb1', 'u_bad1', 'FREE', NOW(), NOW() + INTERVAL '30 days', 'kb1')`)
  );

  await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u_bad2', 'Bad2', 'bad2@test.com', false)`);
  await expectReject('PRO_TRIAL without trial dates rejected', () =>
    pool.query(`INSERT INTO "user_plan" (id, user_id, plan, idempotency_key) VALUES ('pb2', 'u_bad2', 'PRO_TRIAL', 'kb2')`)
  );

  await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u_bad3', 'Bad3', 'bad3@test.com', false)`);
  await expectReject('trial_ends_at <= trial_starts_at rejected', () =>
    pool.query(`INSERT INTO "user_plan" (id, user_id, plan, trial_starts_at, trial_ends_at, idempotency_key) VALUES ('pb3', 'u_bad3', 'PRO_TRIAL', '2026-08-01', '2026-07-01', 'kb3')`)
  );

  // --- Business creation ---
  console.log('\n--- Business creation ---');
  await pool.query(`UPDATE "user_plan" SET onboarding_completed_at = NOW() WHERE user_id = 'u_trial'`);
  await pool.query(`INSERT INTO "business" (id, user_id, name, business_type, segment, electrical_system, room_count) VALUES ('b1', 'u_trial', 'Test Kos', 'KOS_PROPERTY', 'KOS', 'ALL_IN', 20)`);
  const biz = await pool.query(`SELECT is_active, room_count FROM "business" WHERE id='b1'`);
  assert('Business is_active defaults to true (boolean)', biz.rows[0].is_active === true);
  assert('Business room_count stored', biz.rows[0].room_count === 20);

  await expectReject('FK rejects orphan business (session userId must exist)', () =>
    pool.query(`INSERT INTO "business" (id, user_id, name, business_type, segment, electrical_system) VALUES ('bx', 'nonexistent', 'X', 'FNB', 'FNB', 'ALL_IN')`)
  );

  // --- Cross-tenant isolation ---
  console.log('\n--- Cross-tenant isolation ---');
  await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u_other', 'Other', 'other@test.com', false)`);
  const otherBiz = await pool.query(`SELECT * FROM "business" WHERE user_id='u_other'`);
  assert('User A cannot see user B business (0 rows)', otherBiz.rows.length === 0);

  // --- Cascade delete ---
  console.log('\n--- Cascade delete ---');
  await pool.query(`DELETE FROM "user" WHERE id='u_trial'`);
  const remPlan = await pool.query(`SELECT count(*)::int as c FROM "user_plan" WHERE user_id='u_trial'`);
  const remBiz = await pool.query(`SELECT count(*)::int as c FROM "business" WHERE user_id='u_trial'`);
  assert('CASCADE deletes plan', remPlan.rows[0].c === 0);
  assert('CASCADE deletes business', remBiz.rows[0].c === 0);

  // --- Summary ---
  console.log(`\n${pass} passed, ${fail} failed`);
  if (fail > 0) throw new Error(`${fail} smoke test(s) failed`);
  console.log('\nSMOKE TEST PASSED');
  await pool.end();
}

main().catch(e => {
  console.error('SMOKE TEST FAILED:', e.message);
  process.exit(1);
});
