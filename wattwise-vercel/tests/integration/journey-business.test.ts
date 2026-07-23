import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

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

  // --- Business constraints ---

  it('rejects negative room_count', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u1', 'User', 'u1@test.com', false)`);

    let err: Error | null = null;
    try {
      await pool.query(
        `INSERT INTO "business" (id, user_id, name, business_type, segment, electrical_system, room_count) VALUES ('b1', 'u1', 'Kos', 'KOS_PROPERTY', 'KOS', 'ALL_IN', -5)`
      );
    } catch (e: unknown) {
      err = e instanceof Error ? e : new Error(String(e));
    }
    expect(err).not.toBeNull();
  });

  it('rejects invalid business_type enum', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u1', 'User', 'u1@test.com', false)`);

    let err: Error | null = null;
    try {
      await pool.query(
        `INSERT INTO "business" (id, user_id, name, business_type, segment, electrical_system) VALUES ('b1', 'u1', 'Bad', 'HOTEL', 'KOS', 'ALL_IN')`
      );
    } catch (e: unknown) {
      err = e instanceof Error ? e : new Error(String(e));
    }
    expect(err).not.toBeNull();
  });

  it('rejects invalid electrical_system enum', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u1', 'User', 'u1@test.com', false)`);

    let err: Error | null = null;
    try {
      await pool.query(
        `INSERT INTO "business" (id, user_id, name, business_type, segment, electrical_system) VALUES ('b1', 'u1', 'Bad', 'KOS_PROPERTY', 'KOS', 'SOLAR')`
      );
    } catch (e: unknown) {
      err = e instanceof Error ? e : new Error(String(e));
    }
    expect(err).not.toBeNull();
  });

  it('FK to user works — business references valid user', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u1', 'User', 'u1@test.com', false)`);
    await pool.query(
      `INSERT INTO "business" (id, user_id, name, business_type, segment, electrical_system, room_count) VALUES ('b1', 'u1', 'Valid Kos', 'KOS_PROPERTY', 'KOS', 'ALL_IN', 10)`
    );

    const res = await pool.query(`SELECT * FROM "business" WHERE id = 'b1'`);
    expect(res.rows.length).toBe(1);
    expect(res.rows[0].user_id).toBe('u1');
    expect(res.rows[0].room_count).toBe(10);
    expect(res.rows[0].is_active).toBe(true);
  });

  it('FK to user rejects orphan business', async () => {
    let err: Error | null = null;
    try {
      await pool.query(
        `INSERT INTO "business" (id, user_id, name, business_type, segment, electrical_system) VALUES ('b1', 'nonexistent', 'Orphan', 'KOS_PROPERTY', 'KOS', 'ALL_IN')`
      );
    } catch (e: unknown) {
      err = e instanceof Error ? e : new Error(String(e));
    }
    expect(err).not.toBeNull();
  });

  it('cascade deletes business and plan when user is deleted', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u1', 'User', 'u1@test.com', false)`);
    await pool.query(`INSERT INTO "user_plan" (id, user_id, plan, idempotency_key) VALUES ('p1', 'u1', 'FREE', 'k1')`);
    await pool.query(
      `INSERT INTO "business" (id, user_id, name, business_type, segment, electrical_system) VALUES ('b1', 'u1', 'Kos', 'KOS_PROPERTY', 'KOS', 'ALL_IN')`
    );

    await pool.query(`DELETE FROM "user" WHERE id = 'u1'`);

    const biz = await pool.query(`SELECT * FROM "business" WHERE id = 'b1'`);
    expect(biz.rows.length).toBe(0);
    const plan = await pool.query(`SELECT * FROM "user_plan" WHERE id = 'p1'`);
    expect(plan.rows.length).toBe(0);
  });

  it('allows NULL room_count', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u1', 'User', 'u1@test.com', false)`);
    await pool.query(
      `INSERT INTO "business" (id, user_id, name, business_type, segment, electrical_system) VALUES ('b1', 'u1', 'FnB Place', 'FNB', 'FNB', 'ALL_IN')`
    );

    const res = await pool.query(`SELECT room_count FROM "business" WHERE id = 'b1'`);
    expect(res.rows[0].room_count).toBeNull();
  });

  it('allows non-KOS business with any electrical system', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('u1', 'User', 'u1@test.com', false)`);
    await pool.query(
      `INSERT INTO "business" (id, user_id, name, business_type, segment, electrical_system) VALUES ('b1', 'u1', 'Laundry', 'LAUNDRY', 'LAUNDRY', 'SUB_METER')`
    );

    const res = await pool.query(`SELECT business_type, segment, electrical_system FROM "business" WHERE id = 'b1'`);
    expect(res.rows[0].business_type).toBe('LAUNDRY');
    expect(res.rows[0].electrical_system).toBe('SUB_METER');
  });
});
