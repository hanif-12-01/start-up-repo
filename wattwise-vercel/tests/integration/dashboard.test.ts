import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { env } from '../../src/config/env';
import { getPool } from '../../src/server/db/client';
import { DASHBOARD_QUERY_COUNT } from '../../src/server/repositories/dashboard.repository';
import {
  DashboardBusinessNotFoundError,
  DashboardUnavailableError,
  getDashboardReadModel,
} from '../../src/server/services/dashboard.service';
import { applyAllForwardMigrations, readRollbackMigration } from '../helpers/migrations';

const { Pool } = pg;
const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:testpass@127.0.0.1:5439/wattwise_test';

describe('IT-DIAG-07A dashboard composition integration', () => {
  let pool: pg.Pool;

  async function seedTenant(
    suffix: string,
    businessCount = 1,
    segment: 'KOS' | 'FNB' = 'KOS'
  ) {
    const userId = `dashboard-user-${suffix}`;
    await pool.query(
      `INSERT INTO "user" (id, name, email, email_verified)
       VALUES ($1, $2, $3, false)`,
      [userId, `Dashboard ${suffix}`, `dashboard-${suffix}@example.test`]
    );
    const businessIds: string[] = [];
    for (let index = 1; index <= businessCount; index += 1) {
      const businessId = `dashboard-business-${suffix}-${index}`;
      businessIds.push(businessId);
      await pool.query(
        `INSERT INTO business (
           id, user_id, name, business_type, segment, electrical_system, created_at
         ) VALUES ($1, $2, $3, $4, $5, 'ALL_IN', $6)`,
        [
          businessId,
          userId,
          `${segment === 'KOS' ? 'Kos' : 'Usaha'} ${suffix} ${index}`,
          segment === 'KOS' ? 'KOS_PROPERTY' : 'FNB',
          segment,
          `2026-01-0${index}T00:00:00Z`,
        ]
      );
    }
    return { userId, businessIds };
  }

  async function insertBill(
    businessId: string,
    id: string,
    periodStart: string,
    periodEnd: string,
    amount: string,
    kwh: string | null = '300.000'
  ) {
    await pool.query(
      `INSERT INTO electricity_bill (
         id, business_id, period_start, period_end, total_amount_rupiah,
         kwh, tariff_rupiah_per_kwh, created_at, updated_at
       ) VALUES ($1, $2, $3::date, $4::date, $5, $6, 1500.00, $4::date, $4::date)`,
      [id, businessId, periodStart, periodEnd, amount, kwh]
    );
  }

  async function insertSession(
    suffix: string,
    businessId: string,
    currentBillId: string,
    previousBillId: string,
    status: 'DRAFT' | 'COLLECTING_CONTEXT' | 'ANALYZED' | 'INSPECTION_IN_PROGRESS' | 'CLOSED',
    createdAt = '2026-04-01T00:00:00Z'
  ) {
    const sessionId = `dashboard-session-${suffix}`;
    await pool.query(
      `INSERT INTO diagnostic_session (
         id, business_id, electricity_bill_id, comparison_bill_id,
         segment_code, status, rule_version, created_at, updated_at, closed_at
       ) VALUES ($1, $2, $3, $4, 'KOS', $5, concat('KOS_DIAG_RULE_V1-', $1::text), $6, $6,
         CASE WHEN $5 = 'CLOSED' THEN $6::timestamptz ELSE NULL END)`,
      [sessionId, businessId, currentBillId, previousBillId, status, createdAt]
    );
    return sessionId;
  }

  async function insertCandidate(
    sessionId: string,
    suffix: string,
    rank: number,
    candidateCode = 'SPECIAL_ACTIVITY'
  ) {
    const candidateId = `dashboard-candidate-${suffix}`;
    await pool.query(
      `INSERT INTO diagnostic_candidate (
         id, diagnostic_session_id, candidate_code, candidate_version,
         candidate_type, rule_version, title, rank, internal_score,
         evidence_level, explanation, supporting_factors_json,
         contradicting_factors_json
       ) VALUES (
         $1, $2, $3, 1, 'OPERATIONAL', 'DIAG_CANDIDATE_RULE_V1', $4,
         $5, 99, 'MODERATE', 'Data tersimpan menunjukkan bagian ini perlu diperiksa; ini bukan diagnosis.',
         '[]'::jsonb, '[]'::jsonb
       )`,
      [candidateId, sessionId, candidateCode, `Kandidat ${rank}`, rank]
    );
    return candidateId;
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 5000, max: 10 });
    for (const table of [
      'action_outcome_evaluation',
      'energy_action_plan',
      'inspection_item',
      'inspection_plan',
      'diagnostic_candidate',
      'diagnostic_answer',
      'diagnostic_session',
      'electricity_bill',
      'business',
      'user_plan',
      'verification',
      'account',
      'session',
      'user',
    ]) {
      await pool.query(`DROP TABLE IF EXISTS "${table}" CASCADE`);
    }
    await applyAllForwardMigrations(pool);
  });

  afterAll(async () => {
    await getPool().end();
    globalThis.__dbPool = undefined;
    globalThis.__dbInstance = undefined;
    for (const name of [
      '0007_action_outcome_evaluations_rollback.sql',
      '0006_energy_action_plans_rollback.sql',
      '0005_guided_inspections_rollback.sql',
      '0004_diagnostic_candidates_rollback.sql',
      '0003_diagnostic_questionnaire_rollback.sql',
      '0002_bill_first_rollback.sql',
      '0001_journey_business_rollback.sql',
      '0000_auth_schema_rollback.sql',
    ]) {
      await pool.query(readRollbackMigration(name));
    }
    await pool.end();
  });

  beforeEach(async () => {
    env.DASHBOARD_ENABLED = true;
    for (const table of [
      'action_outcome_evaluation',
      'energy_action_plan',
      'inspection_item',
      'inspection_plan',
      'diagnostic_candidate',
      'diagnostic_answer',
      'diagnostic_session',
      'electricity_bill',
      'business',
      'user_plan',
      'session',
      'account',
      'user',
    ]) {
      await pool.query(`DELETE FROM "${table}"`);
    }
  });

  it('moves from first bill to comparison-ready using accepted comparison output', async () => {
    const tenant = await seedTenant('bill-states');
    const businessId = tenant.businessIds[0];

    let dashboard = await getDashboardReadModel(tenant.userId, businessId);
    expect(dashboard.nextAction.label).toBe('Tambah Tagihan Pertama');
    expect(dashboard.latestBillSummary).toBeNull();

    await insertBill(
      businessId,
      'dashboard-bill-first',
      '2026-01-01',
      '2026-01-31',
      '2900000'
    );
    dashboard = await getDashboardReadModel(tenant.userId, businessId);
    expect(dashboard.nextAction.label).toBe('Tambah Tagihan Pembanding');
    expect(dashboard.billComparisonSummary).toBeNull();

    await insertBill(
      businessId,
      'dashboard-bill-current',
      '2026-02-01',
      '2026-02-28',
      '3200000',
      '320.000'
    );
    dashboard = await getDashboardReadModel(tenant.userId, businessId);
    expect(dashboard.nextAction).toMatchObject({
      kind: 'START_DIAGNOSTIC',
      label: 'Cek Kenaikan',
      electricityBillId: 'dashboard-bill-current',
    });
    expect(dashboard.billComparisonSummary?.title).toContain('tercatat naik');
    expect(dashboard.latestBillSummary?.days).toBe(28);
    expect(dashboard.latestBillSummary?.period).toContain('1 Feb 2026');
  });

  it('isolates selected businesses and rejects foreign or inactive selections', async () => {
    const owner = await seedTenant('owner', 2);
    const outsider = await seedTenant('outsider');
    await insertBill(
      owner.businessIds[0],
      'dashboard-owner-first',
      '2026-01-01',
      '2026-01-31',
      '1000000'
    );
    await insertBill(
      owner.businessIds[1],
      'dashboard-owner-second',
      '2026-01-01',
      '2026-01-31',
      '2000000'
    );
    await insertBill(
      outsider.businessIds[0],
      'dashboard-outsider-bill',
      '2026-01-01',
      '2026-01-31',
      '9000000'
    );

    const second = await getDashboardReadModel(owner.userId, owner.businessIds[1]);
    expect(second.businessSummary.name).toBe('Kos owner 2');
    expect(second.latestBillSummary?.totalCost).toContain('2.000.000');
    expect(JSON.stringify(second)).not.toContain('9.000.000');
    expect(second.businessSummary.options).toHaveLength(2);

    await expect(
      getDashboardReadModel(owner.userId, outsider.businessIds[0])
    ).rejects.toBeInstanceOf(DashboardBusinessNotFoundError);
    await pool.query(`UPDATE business SET is_active = false WHERE id = $1`, [
      owner.businessIds[1],
    ]);
    await expect(
      getDashboardReadModel(owner.userId, owner.businessIds[1])
    ).rejects.toBeInstanceOf(DashboardBusinessNotFoundError);
  });

  it('selects the active session before a newer closed session and maps at most three candidates', async () => {
    const tenant = await seedTenant('journey');
    const businessId = tenant.businessIds[0];
    await insertBill(
      businessId,
      'dashboard-journey-previous',
      '2026-01-01',
      '2026-01-31',
      '2900000'
    );
    await insertBill(
      businessId,
      'dashboard-journey-current',
      '2026-02-01',
      '2026-02-28',
      '3200000'
    );
    const activeSession = await insertSession(
      'active',
      businessId,
      'dashboard-journey-current',
      'dashboard-journey-previous',
      'ANALYZED',
      '2026-03-01T00:00:00Z'
    );
    await insertSession(
      'closed-newer',
      businessId,
      'dashboard-journey-current',
      'dashboard-journey-previous',
      'CLOSED',
      '2026-04-01T00:00:00Z'
    );
    await insertCandidate(activeSession, 'one', 1);
    await insertCandidate(activeSession, 'two', 2, 'OCCUPANCY_INCREASE');
    await insertCandidate(activeSession, 'three', 3, 'NEW_ELECTRICAL_APPLIANCE');

    const dashboard = await getDashboardReadModel(tenant.userId, businessId);
    expect(dashboard.latestDiagnosticSummary?.statusLabel).toBe(
      'Bagian yang perlu dicek tersedia'
    );
    expect(dashboard.candidateSummaries).toHaveLength(3);
    expect(dashboard.nextAction.label).toBe('Mulai Pemeriksaan');
    const presentation = JSON.stringify(dashboard);
    expect(presentation).not.toMatch(
      /internalScore|internal_score|ruleVersion|rule_version|probability|confidence|factor weight/i
    );
    expect(DASHBOARD_QUERY_COUNT).toBe(3);
  });

  it('prefers an in-progress inspection over a completed inspection that can create an action', async () => {
    const tenant = await seedTenant('precedence');
    const businessId = tenant.businessIds[0];
    await insertBill(
      businessId,
      'dashboard-precedence-previous',
      '2026-01-01',
      '2026-01-31',
      '2900000'
    );
    await insertBill(
      businessId,
      'dashboard-precedence-current',
      '2026-02-01',
      '2026-02-28',
      '3200000'
    );
    const sessionId = await insertSession(
      'precedence',
      businessId,
      'dashboard-precedence-current',
      'dashboard-precedence-previous',
      'INSPECTION_IN_PROGRESS'
    );
    const completedCandidate = await insertCandidate(sessionId, 'completed', 1);
    const activeCandidate = await insertCandidate(
      sessionId,
      'in-progress',
      2,
      'OCCUPANCY_INCREASE'
    );
    await pool.query(
      `INSERT INTO inspection_plan (
         id, business_id, diagnostic_candidate_id, inspection_code,
         inspection_version, rule_version, title, status, result_code,
         completed_at
       ) VALUES
         ('dashboard-inspection-completed', $1, $2, 'SPECIAL_ACTIVITY_REVIEW', 1,
          'INSPECTION_RULE_V1', 'Pemeriksaan selesai', 'COMPLETED', 'FOUND', now()),
         ('dashboard-inspection-active', $1, $3, 'OCCUPANCY_REVIEW', 1,
          'INSPECTION_RULE_V1', 'Pemeriksaan aktif', 'IN_PROGRESS', NULL, NULL)`,
      [businessId, completedCandidate, activeCandidate]
    );

    const dashboard = await getDashboardReadModel(tenant.userId, businessId);
    expect(dashboard.nextAction.label).toBe('Lanjutkan Pemeriksaan');
    expect(dashboard.inspectionSummaries).toHaveLength(2);
  });

  it('routes unsupported business segment with 2+ bills to analysis without offering Cek Kenaikan', async () => {
    const fnbTenant = await seedTenant('fnb-segment', 1, 'FNB');
    const businessId = fnbTenant.businessIds[0];

    await insertBill(
      businessId,
      'dashboard-fnb-bill-1',
      '2026-01-01',
      '2026-01-31',
      '1500000'
    );
    await insertBill(
      businessId,
      'dashboard-fnb-bill-2',
      '2026-02-01',
      '2026-02-28',
      '1800000',
      '350.000'
    );

    const dashboard = await getDashboardReadModel(fnbTenant.userId, businessId);
    expect(dashboard.nextAction).toEqual({
      kind: 'LINK',
      label: 'Lihat Analisis',
      href: `/analysis?businessId=${encodeURIComponent(businessId)}`,
    });
  });

  it('enforces the dashboard feature flag on the server', async () => {
    const tenant = await seedTenant('flag');
    env.DASHBOARD_ENABLED = false;
    await expect(getDashboardReadModel(tenant.userId)).rejects.toBeInstanceOf(
      DashboardUnavailableError
    );
  });
});
