import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  resolveJourneyState,
  resolveJourneyStep,
  selectPlan,
  PlanTransitionForbiddenError,
  getUserPlan,
  TRIAL_DURATION_MS,
} from '../../src/server/services/journey.service';

const { Pool } = pg;

describe('Journey & Business Migration Integration Tests', () => {
  let pool: pg.Pool;
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:testpass@127.0.0.1:5439/wattwise_test';

  function readMigration(name: string) {
    return readFileSync(join(process.cwd(), `drizzle/migrations/${name}`), 'utf-8');
  }
  function readRollback(name: string) {
    return readFileSync(join(process.cwd(), `drizzle/rollbacks/${name}`), 'utf-8');
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 5000, max: 1 });
    await pool.query('DROP TABLE IF EXISTS "business" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "user_plan" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "verification" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "account" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "session" CASCADE');
    await pool.query('DROP TABLE IF EXISTS "user" CASCADE');
    await pool.query(readMigration('0000_auth_schema.sql'));
    await pool.query(readMigration('0001_journey_business.sql'));
  });

  afterAll(async () => {
    await pool.query(readRollback('0001_journey_business_rollback.sql'));
    await pool.query(readRollback('0000_auth_schema_rollback.sql'));
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM "business"');
    await pool.query('DELETE FROM "user_plan"');
    await pool.query('DELETE FROM "session"');
    await pool.query('DELETE FROM "account"');
    await pool.query('DELETE FROM "user"');
  });

  // --- Migration structure ---

  it('verifies user_plan and business tables exist', async () => {
    const res = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('user_plan', 'business');
    `);
    const tables = res.rows.map((r) => r.table_name);
    expect(tables).toContain('user_plan');
    expect(tables).toContain('business');
  });

  it('verifies user_plan constraints', async () => {
    const res = await pool.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'user_plan' AND constraint_type IN ('UNIQUE', 'CHECK', 'FOREIGN KEY');
    `);
    const names = res.rows.map((r) => r.constraint_name);
    expect(names).toContain('user_plan_user_id_unique');
    expect(names).toContain('user_plan_idempotency_key_unique');
    expect(names).toContain('user_plan_plan_check');
    expect(names).toContain('user_plan_free_no_trial_check');
    expect(names).toContain('user_plan_trial_dates_required_check');
    expect(names).toContain('user_plan_trial_end_after_start_check');
    expect(names).toContain('user_plan_user_id_fk');
  });

  it('verifies business constraints', async () => {
    const res = await pool.query(`
      SELECT constraint_name FROM information_schema.table_constraints
      WHERE table_name = 'business' AND constraint_type IN ('CHECK', 'FOREIGN KEY');
    `);
    const names = res.rows.map((r) => r.constraint_name);
    expect(names).toContain('business_room_count_check');
    expect(names).toContain('business_type_check');
    expect(names).toContain('business_segment_check');
    expect(names).toContain('business_electrical_system_check');
    expect(names).toContain('business_user_id_fk');
  });

  it('verifies is_active column is boolean', async () => {
    const res = await pool.query(`
      SELECT data_type, column_default FROM information_schema.columns
      WHERE table_name = 'business' AND column_name = 'is_active';
    `);
    expect(res.rows[0].data_type).toBe('boolean');
    expect(res.rows[0].column_default).toBe('true');
  });

  it('verifies business_user_id_idx index', async () => {
    const res = await pool.query(`
      SELECT indexname FROM pg_indexes WHERE tablename = 'business' AND indexname = 'business_user_id_idx';
    `);
    expect(res.rows.length).toBe(1);
  });

  // --- Rollback & re-apply ---

  it('rolls back and re-applies journey migration (up-down-up)', async () => {
    await pool.query(readRollback('0001_journey_business_rollback.sql'));

    const after = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('user_plan', 'business');
    `);
    expect(after.rows.length).toBe(0);

    // Auth tables must survive journey rollback
    const auth = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user';
    `);
    expect(auth.rows.length).toBe(1);

    await pool.query(readMigration('0001_journey_business.sql'));
    const reapplied = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('user_plan', 'business');
    `);
    expect(reapplied.rows.length).toBe(2);
  });

  // --- One plan per user ---

  it('enforces one plan per user (unique user_id)', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u1', 'User', 'u1@test.com', false)`);
    await pool.query(`INSERT INTO "user_plan" (id, user_id, plan, idempotency_key) VALUES ('p1', 'u1', 'FREE', 'k1')`);

    let err: Error | null = null;
    try {
      await pool.query(`INSERT INTO "user_plan" (id, user_id, plan, idempotency_key) VALUES ('p2', 'u1', 'FREE', 'k2')`);
    } catch (e: unknown) {
      err = e instanceof Error ? e : new Error(String(e));
    }
    expect(err).not.toBeNull();
    expect(err?.message).toContain('user_plan_user_id_unique');
  });

  it('enforces idempotency key uniqueness', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u1', 'User 1', 'u1@test.com', false)`);
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u2', 'User 2', 'u2@test.com', false)`);
    await pool.query(`INSERT INTO "user_plan" (id, user_id, plan, idempotency_key) VALUES ('p1', 'u1', 'FREE', 'same_key')`);

    let err: Error | null = null;
    try {
      await pool.query(`INSERT INTO "user_plan" (id, user_id, plan, idempotency_key) VALUES ('p2', 'u2', 'FREE', 'same_key')`);
    } catch (e: unknown) {
      err = e instanceof Error ? e : new Error(String(e));
    }
    expect(err).not.toBeNull();
  });

  it('rejects invalid plan enum value at DB level', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u1', 'User', 'u1@test.com', false)`);

    let err: Error | null = null;
    try {
      await pool.query(`INSERT INTO "user_plan" (id, user_id, plan, idempotency_key) VALUES ('p1', 'u1', 'PREMIUM', 'k1')`);
    } catch (e: unknown) {
      err = e instanceof Error ? e : new Error(String(e));
    }
    expect(err).not.toBeNull();
  });

  // --- Trial date constraints ---

  it('rejects FREE plan with trial dates set', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u1', 'User', 'u1@test.com', false)`);

    let err: Error | null = null;
    try {
      await pool.query(
        `INSERT INTO "user_plan" (id, user_id, plan, trial_starts_at, trial_ends_at, idempotency_key)
         VALUES ('p1', 'u1', 'FREE', NOW(), NOW() + INTERVAL '30 days', 'k1')`
      );
    } catch (e: unknown) {
      err = e instanceof Error ? e : new Error(String(e));
    }
    expect(err).not.toBeNull();
    expect(err?.message).toContain('user_plan_free_no_trial_check');
  });

  it('rejects PRO_TRIAL without trial dates', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u1', 'User', 'u1@test.com', false)`);

    let err: Error | null = null;
    try {
      await pool.query(`INSERT INTO "user_plan" (id, user_id, plan, idempotency_key) VALUES ('p1', 'u1', 'PRO_TRIAL', 'k1')`);
    } catch (e: unknown) {
      err = e instanceof Error ? e : new Error(String(e));
    }
    expect(err).not.toBeNull();
    expect(err?.message).toContain('user_plan_trial_dates_required_check');
  });

  it('rejects trial_ends_at <= trial_starts_at', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u1', 'User', 'u1@test.com', false)`);

    let err: Error | null = null;
    try {
      await pool.query(
        `INSERT INTO "user_plan" (id, user_id, plan, trial_starts_at, trial_ends_at, idempotency_key)
         VALUES ('p1', 'u1', 'PRO_TRIAL', '2026-08-01', '2026-07-01', 'k1')`
      );
    } catch (e: unknown) {
      err = e instanceof Error ? e : new Error(String(e));
    }
    expect(err).not.toBeNull();
    expect(err?.message).toContain('user_plan_trial_end_after_start_check');
  });

  it('accepts PRO_TRIAL with valid trial dates', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u1', 'User', 'u1@test.com', false)`);
    await pool.query(
      `INSERT INTO "user_plan" (id, user_id, plan, trial_starts_at, trial_ends_at, idempotency_key)
       VALUES ('p1', 'u1', 'PRO_TRIAL', NOW(), NOW() + INTERVAL '30 days', 'k1')`
    );

    const res = await pool.query(`SELECT plan, trial_starts_at, trial_ends_at FROM "user_plan" WHERE id = 'p1'`);
    expect(res.rows[0].plan).toBe('PRO_TRIAL');
    expect(res.rows[0].trial_starts_at).not.toBeNull();
    expect(res.rows[0].trial_ends_at).not.toBeNull();
  });

  // --- Journey Service Semantics Tests ---

  it('resolve user tanpa plan → PLAN_REQUIRED', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u_noplan', 'No Plan User', 'noplan@test.com', false)`);
    const state = await resolveJourneyState('u_noplan');
    expect(state.status).toBe('PLAN_REQUIRED');
    expect(state.step).toBe('PLAN');
    expect(state.journey).toBeNull();
  });

  it('membuka setup tanpa plan tidak menciptakan FREE record', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u_setup', 'Setup User', 'setup@test.com', false)`);
    const step = await resolveJourneyStep('u_setup');
    expect(step).toBe('PLAN');

    const planInDb = await pool.query(`SELECT * FROM "user_plan" WHERE user_id = 'u_setup'`);
    expect(planInDb.rows.length).toBe(0);
  });

  it('explicit FREE selection tersimpan', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u_free', 'Free User', 'free@test.com', false)`);
    const res = await selectPlan('u_free', 'FREE');
    expect(res.plan).toBe('FREE');
    expect(res.trialEndsAt).toBeNull();
    expect(res.alreadyExists).toBe(false);

    const dbPlan = await getUserPlan('u_free');
    expect(dbPlan?.plan).toBe('FREE');
    expect(dbPlan?.trialStartsAt).toBeNull();
    expect(dbPlan?.trialEndsAt).toBeNull();
  });

  it('explicit PRO_TRIAL selection menghasilkan tepat 30 hari', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u_trial', 'Trial User', 'trial@test.com', false)`);
    const startBefore = Date.now();
    const res = await selectPlan('u_trial', 'PRO_TRIAL');

    expect(res.plan).toBe('PRO_TRIAL');
    expect(res.trialEndsAt).not.toBeNull();

    const diff = res.trialEndsAt!.getTime() - startBefore;
    expect(diff).toBeGreaterThanOrEqual(TRIAL_DURATION_MS);
    expect(diff).toBeLessThanOrEqual(TRIAL_DURATION_MS + 2000);

    const dbPlan = await getUserPlan('u_trial');
    expect(dbPlan?.plan).toBe('PRO_TRIAL');
    expect(dbPlan?.trialStartsAt).not.toBeNull();
    expect(dbPlan?.trialEndsAt).not.toBeNull();
  });

  it('replay PRO_TRIAL tidak mengubah expiry', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u_replay', 'Replay User', 'replay@test.com', false)`);
    const res1 = await selectPlan('u_replay', 'PRO_TRIAL');
    const firstExpiry = res1.trialEndsAt!.getTime();

    const res2 = await selectPlan('u_replay', 'PRO_TRIAL');
    expect(res2.alreadyExists).toBe(true);
    expect(res2.trialEndsAt!.getTime()).toBe(firstExpiry);
  });

  it('FREE → PRO_TRIAL ditolak', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u_f2p', 'F2P User', 'f2p@test.com', false)`);
    await selectPlan('u_f2p', 'FREE');

    await expect(selectPlan('u_f2p', 'PRO_TRIAL')).rejects.toThrow(PlanTransitionForbiddenError);
  });

  it('PRO_TRIAL → FREE ditolak', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u_p2f', 'P2F User', 'p2f@test.com', false)`);
    await selectPlan('u_p2f', 'PRO_TRIAL');

    await expect(selectPlan('u_p2f', 'FREE')).rejects.toThrow(PlanTransitionForbiddenError);
  });

  it('request berbeda tidak menciptakan state ganda', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u_multi', 'Multi User', 'multi@test.com', false)`);
    await selectPlan('u_multi', 'FREE');

    try {
      await selectPlan('u_multi', 'PRO_TRIAL');
    } catch {
      // expected rejection
    }

    const rows = await pool.query(`SELECT * FROM "user_plan" WHERE user_id = 'u_multi'`);
    expect(rows.rows.length).toBe(1);
    expect(rows.rows[0].plan).toBe('FREE');
  });
});
