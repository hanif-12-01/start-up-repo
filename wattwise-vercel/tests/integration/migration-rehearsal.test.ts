import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import {
  listForwardMigrationNames,
  readForwardMigration,
  readRollbackMigration,
} from '../helpers/migrations';

const { Pool } = pg;

describe('Full Database Migration Up/Down/Up Rehearsal (0000–0007)', () => {
  let pool: pg.Pool;
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:testpass@127.0.0.1:5439/wattwise_test';

  beforeAll(async () => {
    pool = new Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: 5000,
      max: 1,
    });

    // Ensure completely clean database state before starting rehearsal
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
  });

  afterAll(async () => {
    if (pool) {
      await pool.end();
    }
  });

  const EXPECTED_TABLES = [
    'user',
    'session',
    'account',
    'verification',
    'user_plan',
    'business',
    'electricity_bill',
    'diagnostic_session',
    'diagnostic_answer',
    'diagnostic_candidate',
    'inspection_plan',
    'inspection_item',
    'energy_action_plan',
    'action_outcome_evaluation',
  ];

  async function getPublicTableNames(): Promise<string[]> {
    const res = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
    `);
    return res.rows.map((r) => r.table_name);
  }

  async function assertFullSchemaDetails() {
    const tables = await getPublicTableNames();
    for (const expectedTable of EXPECTED_TABLES) {
      expect(tables).toContain(expectedTable);
    }

    // Validate user_plan fields (trial & onboarding)
    const userPlanCols = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'user_plan';
    `);
    const colNames = userPlanCols.rows.map((r) => r.column_name);
    expect(colNames).toContain('trial_starts_at');
    expect(colNames).toContain('trial_ends_at');
    expect(colNames).toContain('onboarding_completed_at');

    // Validate foreign key constraints
    const fkRes = await pool.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE constraint_type = 'FOREIGN KEY' AND table_schema = 'public';
    `);
    expect(fkRes.rows.length).toBeGreaterThanOrEqual(10);

    // Validate unique constraints (e.g., user.email)
    const uniqueRes = await pool.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE constraint_type = 'UNIQUE' AND table_schema = 'public';
    `);
    expect(uniqueRes.rows.length).toBeGreaterThanOrEqual(3);

    // Validate check constraints (e.g., status check, non-empty JSON check)
    const checkRes = await pool.query(`
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE constraint_type = 'CHECK' AND table_schema = 'public';
    `);
    expect(checkRes.rows.length).toBeGreaterThanOrEqual(2);

    // Validate indexes
    const idxRes = await pool.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE schemaname = 'public';
    `);
    const indexNames = idxRes.rows.map((r) => r.indexname);
    expect(indexNames).toContain('business_user_id_idx');
    expect(indexNames).toContain('diagnostic_session_business_created_idx');
  }

  it('STEP 1: Apply all forward migrations 0000–0007 (FIRST UP)', async () => {
    const forwardNames = listForwardMigrationNames();
    expect(forwardNames.length).toBe(8); // 0000 to 0007

    for (const name of forwardNames) {
      const sql = readForwardMigration(name);
      await pool.query(sql);
    }

    await assertFullSchemaDetails();
  });

  it('STEP 2: Apply all rollback migrations 0007–0000 in reverse order (DOWN)', async () => {
    const rollbackFiles = [
      '0007_action_outcome_evaluations_rollback.sql',
      '0006_energy_action_plans_rollback.sql',
      '0005_guided_inspections_rollback.sql',
      '0004_diagnostic_candidates_rollback.sql',
      '0003_diagnostic_questionnaire_rollback.sql',
      '0002_bill_first_rollback.sql',
      '0001_journey_business_rollback.sql',
      '0000_auth_schema_rollback.sql',
    ];

    for (const file of rollbackFiles) {
      const sql = readRollbackMigration(file);
      await pool.query(sql);
    }

    const remainingTables = await getPublicTableNames();
    expect(remainingTables.length).toBe(0);
  });

  it('STEP 3: Apply all forward migrations 0000–0007 a second time (SECOND UP)', async () => {
    const forwardNames = listForwardMigrationNames();

    for (const name of forwardNames) {
      const sql = readForwardMigration(name);
      await pool.query(sql);
    }

    await assertFullSchemaDetails();
  });
});
