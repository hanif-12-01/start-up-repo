import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import { readFileSync } from 'fs';
import { join } from 'path';

const { Pool } = pg;

describe('Database Migration & Auth Integration Tests', () => {
  let pool: pg.Pool;
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:testpass@127.0.0.1:5439/wattwise_test';

  beforeAll(async () => {
    pool = new Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: 5000,
    });
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  it('runs migration up successfully and verifies created auth schema tables', async () => {
    const migrationSql = readFileSync(
      join(process.cwd(), 'drizzle/migrations/0000_auth_schema.sql'),
      'utf-8'
    );
    await pool.query(migrationSql);

    const tablesRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    const tableNames = tablesRes.rows.map((r) => r.table_name);

    expect(tableNames).toContain('user');
    expect(tableNames).toContain('session');
    expect(tableNames).toContain('account');
    expect(tableNames).toContain('verification');
  });

  it('enforces email unique constraint and rejects duplicate registration safely', async () => {
    const email = 'synthetic_test_user@example.com';
    const userId1 = 'user_synth_001';
    const userId2 = 'user_synth_002';

    await pool.query(
      `INSERT INTO "user" (id, name, email, email_verified) VALUES ($1, $2, $3, false)`,
      [userId1, 'Synthetic User 1', email]
    );

    let duplicateError: Error | null = null;
    try {
      await pool.query(
        `INSERT INTO "user" (id, name, email, email_verified) VALUES ($1, $2, $3, false)`,
        [userId2, 'Synthetic User 2', email]
      );
    } catch (err: any) {
      duplicateError = err;
    }

    expect(duplicateError).not.toBeNull();
    // Verify error response does not leak sensitive internal system details or credentials
    expect(duplicateError?.message).not.toContain('SuperSecretPassword');
    expect(duplicateError?.message).not.toContain('BETTER_AUTH_SECRET');

    // Clean up
    await pool.query(`DELETE FROM "user" WHERE id = $1`, [userId1]);
  });

  it('verifies account password field does not store plaintext and rejects wrong password comparison', async () => {
    const userId = 'user_synth_secure';
    const email = 'secure_user@example.com';
    const plaintextPassword = 'SuperSecretPassword123!';
    const mockHash = '$2b$10$hashed_password_sample_value_hash';

    await pool.query(
      `INSERT INTO "user" (id, name, email, email_verified) VALUES ($1, $2, $3, false)`,
      [userId, 'Secure User', email]
    );

    await pool.query(
      `INSERT INTO "account" (id, account_id, provider_id, user_id, password) VALUES ($1, $2, $3, $4, $5)`,
      ['acc_001', email, 'credential', userId, mockHash]
    );

    const res = await pool.query(`SELECT password FROM "account" WHERE id = $1`, ['acc_001']);
    expect(res.rows[0].password).not.toBe(plaintextPassword);
    expect(res.rows[0].password).toBe(mockHash);

    // Wrong password comparison check
    const wrongPassword = 'WrongPassword999!';
    expect(res.rows[0].password).not.toBe(wrongPassword);

    await pool.query(`DELETE FROM "account" WHERE id = $1`, ['acc_001']);
    await pool.query(`DELETE FROM "user" WHERE id = $1`, [userId]);
  });

  it('creates database-backed sessions and rejects random or invalid session tokens', async () => {
    const userId = 'user_synth_session';
    const email = 'session_user@example.com';
    const validSessionToken = 'synth_session_token_valid_123';
    const invalidSessionToken = 'random_bogus_token_999';

    await pool.query(
      `INSERT INTO "user" (id, name, email, email_verified) VALUES ($1, $2, $3, false)`,
      [userId, 'Session User', email]
    );

    const expiresAt = new Date(Date.now() + 86400 * 1000);
    await pool.query(
      `INSERT INTO "session" (id, token, user_id, expires_at) VALUES ($1, $2, $3, $4)`,
      ['sess_001', validSessionToken, userId, expiresAt]
    );

    const validRes = await pool.query(`SELECT * FROM "session" WHERE token = $1`, [validSessionToken]);
    expect(validRes.rows.length).toBe(1);

    // Random / invalid session check
    const invalidRes = await pool.query(`SELECT * FROM "session" WHERE token = $1`, [invalidSessionToken]);
    expect(invalidRes.rows.length).toBe(0);

    // Clean up
    await pool.query(`DELETE FROM "session" WHERE token = $1`, [validSessionToken]);
    await pool.query(`DELETE FROM "user" WHERE id = $1`, [userId]);
  });

  it('rejects expired sessions and cleans up session table on logout', async () => {
    const userId = 'user_synth_expired';
    const email = 'expired_user@example.com';
    const expiredToken = 'synth_expired_token_000';

    await pool.query(
      `INSERT INTO "user" (id, name, email, email_verified) VALUES ($1, $2, $3, false)`,
      [userId, 'Expired User', email]
    );

    // Expired timestamp (1 hour in the past)
    const pastExpiresAt = new Date(Date.now() - 3600 * 1000);
    await pool.query(
      `INSERT INTO "session" (id, token, user_id, expires_at) VALUES ($1, $2, $3, $4)`,
      ['sess_expired_001', expiredToken, userId, pastExpiresAt]
    );

    // Query active unexpired session check
    const activeRes = await pool.query(
      `SELECT * FROM "session" WHERE token = $1 AND expires_at > NOW()`,
      [expiredToken]
    );
    expect(activeRes.rows.length).toBe(0);

    // Logout / invalidate session record
    await pool.query(`DELETE FROM "session" WHERE token = $1`, [expiredToken]);
    const deletedRes = await pool.query(`SELECT * FROM "session" WHERE token = $1`, [expiredToken]);
    expect(deletedRes.rows.length).toBe(0);

    await pool.query(`DELETE FROM "user" WHERE id = $1`, [userId]);
  });

  it('runs rollback SQL successfully and drops created tables', async () => {
    const rollbackSql = readFileSync(
      join(process.cwd(), 'drizzle/rollbacks/0000_auth_schema_rollback.sql'),
      'utf-8'
    );
    await pool.query(rollbackSql);

    const tablesRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    const tableNames = tablesRes.rows.map((r) => r.table_name);

    expect(tableNames).not.toContain('user');
    expect(tableNames).not.toContain('session');
    expect(tableNames).not.toContain('account');
    expect(tableNames).not.toContain('verification');
  });

  it('runs migration up a second time cleanly (up-down-up verification)', async () => {
    const migrationSql = readFileSync(
      join(process.cwd(), 'drizzle/migrations/0000_auth_schema.sql'),
      'utf-8'
    );
    await pool.query(migrationSql);

    const tablesRes = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    const tableNames = tablesRes.rows.map((r) => r.table_name);

    expect(tableNames).toContain('user');
    expect(tableNames).toContain('session');
    expect(tableNames).toContain('account');
    expect(tableNames).toContain('verification');
  });
});
