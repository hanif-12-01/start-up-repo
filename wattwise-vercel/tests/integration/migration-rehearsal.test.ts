import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import pg from 'pg';
import {
  listForwardMigrationNames,
  readForwardMigration,
  readRollbackMigration,
} from '../helpers/migrations';

const { Pool } = pg;

describe('Full Database Migration Up/Down/Up Rehearsal (0000–0009)', () => {
  let pool: pg.Pool;
  const dbUrl = process.env.DATABASE_URL || 'postgresql://postgres:testpass@127.0.0.1:5439/wattwise_test';

  beforeAll(async () => {
    pool = new Pool({
      connectionString: dbUrl,
      connectionTimeoutMillis: 5000,
      max: 1,
    });

    // Ensure completely clean database state (tables and custom types) before starting rehearsal
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
        FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
          EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
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
    'revenue_entry',
    'appliance',
    'user_preference',
    'billing_plan',
    'sandbox_invoice',
    'sandbox_payment',
    'ai_shadow_forecast',
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

    // Validate electricity_bill kwh_source field
    const billCols = await pool.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'electricity_bill';
    `);
    const billColNames = billCols.rows.map((r) => r.column_name);
    expect(billColNames).toContain('kwh_source');

    const businessCols = await pool.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'business';
    `);
    expect(businessCols.rows.map((row) => row.column_name)).toContain('data_provenance');

    const shadowCols = await pool.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'ai_shadow_forecast';
    `);
    const shadowColumnNames = shadowCols.rows.map((row) => row.column_name);
    expect(shadowColumnNames).toContain('history_latest_period_end');
    expect(shadowColumnNames).toContain('history_temporal_integrity');
    expect(shadowColumnNames).toContain('target_outcome_unknown_at_forecast');
    expect(shadowColumnNames).toContain('forecast_days_into_target');

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
    expect(indexNames).toContain('revenue_entry_business_month_idx');
    expect(indexNames).toContain('appliance_business_active_idx');
    expect(indexNames).toContain('ai_shadow_forecast_claim_idx');
    expect(indexNames).toContain('ai_shadow_forecast_real_evidence_idx');
    expect(indexNames).toContain('ai_shadow_enrollment_enabled_idx');
  }

  it('STEP 1: Apply all forward migrations (FIRST UP)', async () => {
    const forwardNames = listForwardMigrationNames();
    expect(forwardNames.length).toBeGreaterThanOrEqual(15);

    for (const name of forwardNames) {
      const sql = readForwardMigration(name);
      await pool.query(sql);
    }

    await assertFullSchemaDetails();
  });

  it('STEP 1B: enforces workspace ownership and monthly uniqueness', async () => {
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('workspace-u1', 'Owner One', 'workspace-u1@example.test', true)`);
    await pool.query(`INSERT INTO "user" (id, name, email, email_verified) VALUES ('workspace-u2', 'Owner Two', 'workspace-u2@example.test', true)`);
    await pool.query(`INSERT INTO "business" (id, user_id, name, business_type, segment, electrical_system) VALUES ('workspace-b1', 'workspace-u1', 'Usaha Satu', 'LAUNDRY', 'LAUNDRY', 'ALL_IN')`);
    await pool.query(`INSERT INTO "business" (id, user_id, name, business_type, segment, electrical_system) VALUES ('workspace-b2', 'workspace-u2', 'Usaha Dua', 'RETAIL', 'RETAIL', 'ALL_IN')`);
    await pool.query(`INSERT INTO "revenue_entry" (id, business_id, period_month, amount_rupiah, input_mode) VALUES ('workspace-r1', 'workspace-b1', '2026-08-01', 25000000, 'EXACT')`);
    await pool.query(`INSERT INTO "appliance" (id, business_id, name, category, power_watts, daily_hours, quantity, operating_days) VALUES ('workspace-a1', 'workspace-b1', 'Mesin Cuci', 'Mesin produksi', 500, 8, 2, 26)`);

    const scoped = await pool.query(`SELECT re.id FROM revenue_entry re JOIN business b ON b.id = re.business_id WHERE b.user_id = $1`, ['workspace-u1']);
    const isolated = await pool.query(`SELECT re.id FROM revenue_entry re JOIN business b ON b.id = re.business_id WHERE b.user_id = $1`, ['workspace-u2']);
    expect(scoped.rows.map((row) => row.id)).toEqual(['workspace-r1']);
    expect(isolated.rows).toHaveLength(0);

    await expect(pool.query(`INSERT INTO "revenue_entry" (id, business_id, period_month, amount_rupiah, input_mode) VALUES ('workspace-r2', 'workspace-b1', '2026-08-01', 26000000, 'EXACT')`)).rejects.toThrow();
    await expect(pool.query(`INSERT INTO "appliance" (id, business_id, name, category, quantity, operating_days) VALUES ('workspace-a2', 'workspace-b1', 'mesin cuci', 'Mesin produksi', 1, 30)`)).rejects.toThrow();
  });

  it('rehearses migration 0012 rollback and reapply without reinterpreting provenance', async () => {
    await pool.query(`
      INSERT INTO "user" (id, name, email, email_verified)
      VALUES ('integrity-user', 'Integrity', 'integrity@example.test', true)
      ON CONFLICT (id) DO NOTHING
    `);
    await pool.query(`
      INSERT INTO business (id, user_id, name, business_type, segment, electrical_system)
      VALUES ('integrity-business', 'integrity-user', 'Integrity', 'OTHER', 'OTHER', 'ALL_IN')
      ON CONFLICT (id) DO NOTHING
    `);
    await pool.query(`
      INSERT INTO ai_shadow_forecast (
        id, business_id, request_id, forecast_origin, target_period, data_provenance,
        prospective_forecast, history_phase, history_fingerprint, mode, status,
        feature_schema_sha256
      ) VALUES (
        'integrity-shadow', 'integrity-business', 'integrity-request', NOW(), '2026-08',
        'UNCLASSIFIED', false, 'H06_12', repeat('f', 64), 'SHADOW', 'NOT_ELIGIBLE',
        repeat('a', 64)
      ) ON CONFLICT (id) DO NOTHING
    `);
    await pool.query(readRollbackMigration('0012_ai_shadow_evidence_integrity_rollback.sql'));
    expect((await pool.query(
      `SELECT data_provenance FROM ai_shadow_forecast WHERE id = 'integrity-shadow'`
    )).rows[0].data_provenance).toBe('UNCLASSIFIED');
    await pool.query(readForwardMigration('0012_ai_shadow_evidence_integrity.sql'));
    const integrity = await pool.query(
      `SELECT history_temporal_integrity FROM ai_shadow_forecast WHERE id = 'integrity-shadow'`
    );
    expect(integrity.rows[0].history_temporal_integrity).toBe(false);
  });

  it('rehearses migration 0013 rollback and conservative reapply', async () => {
    await pool.query(readRollbackMigration('0013_ai_shadow_prospective_reachability_rollback.sql'));
    const removed = await pool.query(`
      SELECT column_name FROM information_schema.columns
       WHERE table_name = 'ai_shadow_forecast'
         AND column_name IN ('target_outcome_unknown_at_forecast', 'forecast_days_into_target')
    `);
    expect(removed.rows).toHaveLength(0);
    await pool.query(readForwardMigration('0013_ai_shadow_prospective_reachability.sql'));
    const conservative = await pool.query(`
      SELECT target_outcome_unknown_at_forecast, forecast_days_into_target
        FROM ai_shadow_forecast WHERE id = 'integrity-shadow'
    `);
    expect(conservative.rows[0]).toEqual({
      target_outcome_unknown_at_forecast: false,
      forecast_days_into_target: null,
    });
  });

  it('rehearses migration 0014 rollback and empty reapply', async () => {
    expect((await pool.query(`SELECT count(*)::int AS count FROM ai_shadow_enrollment`)).rows[0].count).toBe(0);
    await pool.query(readRollbackMigration('0014_ai_shadow_enrollment_rollback.sql'));
    expect((await pool.query(`SELECT to_regclass('public.ai_shadow_enrollment') AS table_name`)).rows[0].table_name).toBeNull();
    await pool.query(readForwardMigration('0014_ai_shadow_enrollment.sql'));
    expect((await pool.query(`SELECT count(*)::int AS count FROM ai_shadow_enrollment`)).rows[0].count).toBe(0);
  });

  it('STEP 2: Apply all rollback migrations in reverse order (DOWN)', async () => {
    const rollbackFiles = [
      '0014_ai_shadow_enrollment_rollback.sql',
      '0013_ai_shadow_prospective_reachability_rollback.sql',
      '0012_ai_shadow_evidence_integrity_rollback.sql',
      '0011_ai_shadow_integration_rollback.sql',
      '0010_kwh_provenance_rollback.sql',
      '0009_product_parity_rollback.sql',
      '0008_workspace_feature_parity_rollback.sql',
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

  it('STEP 3: Apply all forward migrations a second time (SECOND UP)', async () => {
    const forwardNames = listForwardMigrationNames();

    for (const name of forwardNames) {
      const sql = readForwardMigration(name);
      await pool.query(sql);
    }

    await assertFullSchemaDetails();
  });
});
