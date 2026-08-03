import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import pg from 'pg';
import { env } from '../../src/config/env';
import { getPool } from '../../src/server/db/client';
import {
  MONTHLY_REPORT_QUERY_COUNT,
} from '../../src/server/repositories/monthly-report.repository';
import {
  MonthlyReportBillLimitError,
  MonthlyReportBusinessNotFoundError,
  MonthlyReportMonthError,
  MonthlyReportsUnavailableError,
  getMonthlyReportReadModel,
} from '../../src/server/services/monthly-report.service';
import { applyAllForwardMigrations, readRollbackMigration } from '../helpers/migrations';

const { Pool } = pg;
const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:testpass@127.0.0.1:5439/wattwise_test';
const NOW = new Date('2026-08-03T05:00:00.000Z');

describe('IT-DIAG-07B monthly report integration', () => {
  let pool: pg.Pool;

  async function seedUser(suffix: string) {
    const userId = `report-user-${suffix}`;
    await pool.query(
      `INSERT INTO "user" (id, name, email, email_verified)
       VALUES ($1, $2, $3, false)`,
      [userId, `Report ${suffix}`, `report-${suffix}@example.test`]
    );
    return userId;
  }

  async function seedBusiness(
    userId: string,
    suffix: string,
    options: { active?: boolean; segment?: string } = {}
  ) {
    const businessId = `report-business-${suffix}`;
    const segment = options.segment ?? 'KOS';
    await pool.query(
      `INSERT INTO business (
         id, user_id, name, business_type, segment, electrical_system, is_active
       ) VALUES (
         $1, $2, $3,
         CASE WHEN $4 = 'KOS' THEN 'KOS_PROPERTY' ELSE 'OTHER' END,
         $4, 'ALL_IN', $5
       )`,
      [businessId, userId, `Usaha ${suffix}`, segment, options.active ?? true]
    );
    return businessId;
  }

  async function insertBill(input: {
    businessId: string;
    id: string;
    start: string;
    end: string;
    amount: string;
    kwh?: string | null;
    tariff?: string | null;
    createdAt?: string;
  }) {
    await pool.query(
      `INSERT INTO electricity_bill (
         id, business_id, period_start, period_end, total_amount_rupiah,
         kwh, tariff_rupiah_per_kwh, created_at, updated_at
       ) VALUES ($1, $2, $3::date, $4::date, $5, $6, $7, $8::timestamptz, $8::timestamptz)`,
      [
        input.id,
        input.businessId,
        input.start,
        input.end,
        input.amount,
        input.kwh === undefined ? '100.000' : input.kwh,
        input.tariff === undefined ? '1500.00' : input.tariff,
        input.createdAt ?? `${input.end}T00:00:00Z`,
      ]
    );
  }

  async function insertSession(input: {
    id: string;
    businessId: string;
    currentBillId: string;
    previousBillId: string;
    status?: string;
    segment?: string;
    createdAt?: string;
  }) {
    await pool.query(
      `INSERT INTO diagnostic_session (
         id, business_id, electricity_bill_id, comparison_bill_id,
         segment_code, status, rule_version, created_at, updated_at, closed_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, concat('REPORT_SESSION_RULE-', $1::text),
         $7::timestamptz, $7::timestamptz,
         CASE WHEN $6 = 'CLOSED' THEN $7::timestamptz ELSE NULL END
       )`,
      [
        input.id,
        input.businessId,
        input.currentBillId,
        input.previousBillId,
        input.segment ?? 'KOS',
        input.status ?? 'ANALYZED',
        input.createdAt ?? '2026-08-31T12:00:00Z',
      ]
    );
  }

  async function insertCandidate(input: {
    id: string;
    sessionId: string;
    rank: number;
    title?: string;
  }) {
    await pool.query(
      `INSERT INTO diagnostic_candidate (
         id, diagnostic_session_id, candidate_code, candidate_version,
         candidate_type, rule_version, title, rank, internal_score,
         evidence_level, explanation, supporting_factors_json,
         contradicting_factors_json
       ) VALUES (
         $1, $2, concat('REPORT_CANDIDATE_', $3::text), 1,
         'OPERATIONAL', 'REPORT_CANDIDATE_RULE_V1', $4, $3::integer, 99,
         'MODERATE', 'Data tercatat menunjukkan bagian ini layak diperiksa; ini bukan diagnosis.',
         '["internal support"]'::jsonb, '["internal contradiction"]'::jsonb
       )`,
      [input.id, input.sessionId, input.rank, input.title ?? `Kandidat ${input.rank}`]
    );
  }

  async function insertCompletedJourney(input: {
    businessId: string;
    sessionId: string;
    candidateId: string;
    baselineBillId: string;
    followUpBillId: string;
    closed?: boolean;
  }) {
    const inspectionId = `inspection-${input.candidateId}`;
    const actionId = `action-${input.candidateId}`;
    await pool.query(
      `INSERT INTO inspection_plan (
         id, business_id, diagnostic_candidate_id, inspection_code,
         inspection_version, rule_version, title, status, result_code,
         started_at, completed_at
       ) VALUES (
         $1, $2, $3, 'REPORT_SAFE_OBSERVATION', 1, 'INSPECTION_RULE_V1',
         'Pemeriksaan operasional', 'COMPLETED', 'FOUND',
         '2026-08-31T13:00:00Z', '2026-08-31T14:00:00Z'
       )`,
      [inspectionId, input.businessId, input.candidateId]
    );
    await pool.query(
      `INSERT INTO energy_action_plan (
         id, business_id, diagnostic_candidate_id, inspection_plan_id,
         action_code, action_version, rule_version, title_snapshot,
         description_snapshot, reason_snapshot, steps_snapshot_json,
         inspection_result_snapshot, baseline_snapshot_json, status,
         review_mode, planned_start_date, started_at, completed_at
       ) VALUES (
         $1, $2, $3, $4, 'REPORT_ACTION', 1, 'ACTION_RULE_V1',
         'Atur jadwal operasional', 'Tinjau jadwal secara aman.',
         'Hasil pengamatan telah dicatat.', '["Catat jadwal"]'::jsonb,
         'FOUND', $5::jsonb, 'COMPLETED', 'NEXT_ELIGIBLE_BILL',
         '2026-09-01', '2026-09-01T00:00:00Z', '2026-09-15T00:00:00Z'
       )`,
      [
        actionId,
        input.businessId,
        input.candidateId,
        inspectionId,
        JSON.stringify({
          sourceBillId: input.baselineBillId,
          periodStart: '2026-08-01',
          periodEnd: '2026-08-31',
        }),
      ]
    );
    await pool.query(
      `INSERT INTO action_outcome_evaluation (
         id, business_id, diagnostic_session_id, action_plan_id,
         baseline_bill_id, follow_up_bill_id, rule_version,
         similarity_band_bps, evaluation_eligible_after_date,
         baseline_snapshot_json, follow_up_snapshot_json,
         comparison_snapshot_json, cost_direction, usage_direction,
         tariff_direction, data_quality_code, overall_outcome_code,
         explanation_snapshot_json, evaluated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6, 'OUTCOME_EVALUATION_RULE_V1', 500,
         '2026-09-15', $7::jsonb, $8::jsonb, $9::jsonb,
         'LOWER', 'LOWER', 'SIMILAR', 'USAGE_COMPLETE', 'POSITIVE_SIGNAL',
         $10::jsonb, '2026-10-31T00:00:00Z'
       )`,
      [
        `outcome-${input.candidateId}`,
        input.businessId,
        input.sessionId,
        actionId,
        input.baselineBillId,
        input.followUpBillId,
        JSON.stringify({ periodStart: '2026-08-01', periodEnd: '2026-08-31' }),
        JSON.stringify({ periodStart: '2026-10-01', periodEnd: '2026-10-31' }),
        JSON.stringify({ accepted: true }),
        JSON.stringify({
          title: 'Ada sinyal perbaikan',
          paragraphs: ['Data tercatat lebih rendah.'],
          disclaimer: 'Tidak membuktikan sebab.',
        }),
      ]
    );
    if (input.closed) {
      await pool.query(
        `UPDATE diagnostic_session
            SET status = 'CLOSED', closed_at = '2026-11-01T00:00:00Z'
          WHERE id = $1`,
        [input.sessionId]
      );
    }
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
    env.MONTHLY_REPORTS_ENABLED = true;
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

  it('returns NO_BILL, defaults to current month, and enforces the server flag', async () => {
    const userId = await seedUser('empty');
    const businessId = await seedBusiness(userId, 'empty');
    const report = await getMonthlyReportReadModel(userId, businessId, undefined, NOW);

    expect(report.reportMonth).toBe('2026-08');
    expect(report.reportCompleteness.code).toBe('NO_BILL');
    expect(report.billSummaries).toEqual([]);
    expect(report.diagnosticSummary).toBeNull();
    expect(MONTHLY_REPORT_QUERY_COUNT).toBe(4);

    env.MONTHLY_REPORTS_ENABLED = false;
    await expect(
      getMonthlyReportReadModel(userId, businessId, '2026-08', NOW)
    ).rejects.toBeInstanceOf(MonthlyReportsUnavailableError);
  });

  it('includes bills only by period_end, reuses accepted comparison, and avoids proration', async () => {
    const userId = await seedUser('inclusion');
    const businessId = await seedBusiness(userId, 'inclusion');
    await insertBill({
      businessId,
      id: 'report-inclusion-previous',
      start: '2026-06-20',
      end: '2026-07-19',
      amount: '900000',
      kwh: '90.000',
    });
    await insertBill({
      businessId,
      id: 'report-inclusion-primary',
      start: '2026-07-20',
      end: '2026-08-20',
      amount: '1200000',
      kwh: '120.000',
    });

    const august = await getMonthlyReportReadModel(
      userId,
      businessId,
      '2026-08',
      NOW
    );
    const july = await getMonthlyReportReadModel(userId, businessId, '2026-07', NOW);

    expect(august.billSummaries).toHaveLength(1);
    expect(august.billSummaries[0].inclusiveDays).toBe(32);
    expect(august.billSummaries[0].isPrimary).toBe(true);
    expect(august.billComparisonSummary?.title).toContain('tercatat naik');
    expect(august.safeCaveats.join(' ')).toContain('tidak membagi pemakaian');
    expect(july.billSummaries).toHaveLength(1);
    expect(july.billSummaries[0].totalCost).toContain('900.000');
  });

  it('selects primary and previous bills deterministically and aggregates exact values', async () => {
    const userId = await seedUser('aggregate');
    const businessId = await seedBusiness(userId, 'aggregate');
    await insertBill({
      businessId,
      id: 'report-aggregate-one',
      start: '2026-08-01',
      end: '2026-08-10',
      amount: '9007199254740993',
      kwh: '10.125',
      createdAt: '2026-08-10T00:00:00Z',
    });
    await insertBill({
      businessId,
      id: 'report-aggregate-two',
      start: '2026-08-11',
      end: '2026-08-20',
      amount: '7',
      kwh: '20.875',
      createdAt: '2026-08-20T00:00:00Z',
    });
    const report = await getMonthlyReportReadModel(userId, businessId, '2026-08', NOW);

    expect(report.monthSummary.billCount).toBe(2);
    expect(report.monthSummary.totalCost).toContain('9.007.199.254.741.000');
    expect(report.monthSummary.totalKwh).toBe('31 kWh');
    expect(report.primaryBillSummary?.period).toContain('20 Agu 2026');
    expect(report.previousBillSummary?.period).toContain('10 Agu 2026');
  });

  it('does not present partial kWh as a complete aggregate', async () => {
    const userId = await seedUser('partial-kwh');
    const businessId = await seedBusiness(userId, 'partial-kwh');
    await insertBill({
      businessId,
      id: 'report-partial-one',
      start: '2026-08-01',
      end: '2026-08-10',
      amount: '100000',
      kwh: '10.000',
    });
    await insertBill({
      businessId,
      id: 'report-partial-two',
      start: '2026-08-11',
      end: '2026-08-20',
      amount: '200000',
      kwh: null,
    });
    const report = await getMonthlyReportReadModel(userId, businessId, '2026-08', NOW);

    expect(report.monthSummary.totalKwh).toBeNull();
    expect(report.monthSummary.dataCompletenessNote).toContain('belum lengkap');
    expect(report.safeCaveats.join(' ')).toContain('data kWh belum lengkap');
  });

  it('uses only the journey linked to the primary bill and reuses accepted presentation fields', async () => {
    const userId = await seedUser('journey');
    const businessId = await seedBusiness(userId, 'journey', { segment: 'LAUNDRY' });
    await insertBill({
      businessId,
      id: 'report-journey-previous',
      start: '2026-07-01',
      end: '2026-07-31',
      amount: '1000000',
    });
    await insertBill({
      businessId,
      id: 'report-journey-primary',
      start: '2026-08-01',
      end: '2026-08-31',
      amount: '1200000',
    });
    await insertBill({
      businessId,
      id: 'report-journey-follow-up',
      start: '2026-10-01',
      end: '2026-10-31',
      amount: '900000',
    });
    await insertSession({
      id: 'report-session-old-bill',
      businessId,
      currentBillId: 'report-journey-previous',
      previousBillId: 'report-journey-primary',
      segment: 'LAUNDRY',
      createdAt: '2026-09-02T00:00:00Z',
    });
    await insertSession({
      id: 'report-session-primary',
      businessId,
      currentBillId: 'report-journey-primary',
      previousBillId: 'report-journey-previous',
      status: 'INSPECTION_IN_PROGRESS',
      segment: 'LAUNDRY',
      createdAt: '2026-09-01T00:00:00Z',
    });
    const candidateId = 'report-candidate-primary';
    await insertCandidate({
      id: candidateId,
      sessionId: 'report-session-primary',
      rank: 1,
      title: 'Jadwal operasional berubah',
    });
    await insertCompletedJourney({
      businessId,
      sessionId: 'report-session-primary',
      candidateId,
      baselineBillId: 'report-journey-primary',
      followUpBillId: 'report-journey-follow-up',
      closed: true,
    });

    const report = await getMonthlyReportReadModel(
      userId,
      businessId,
      '2026-08',
      new Date('2026-11-02T00:00:00Z')
    );
    const serialized = JSON.stringify(report);

    expect(report.reportCompleteness.code).toBe('SESSION_CLOSED');
    expect(report.candidateSummaries).toHaveLength(1);
    expect(report.inspectionSummaries[0].resultLabel).toBe('Ditemukan Masalah');
    expect(report.actionPlanSummaries[0].statusLabel).toBe('Tindakan Selesai');
    expect(report.outcomeSummaries[0]).toMatchObject({
      overallOutcomeLabel: 'Ada sinyal perbaikan',
      costDirection: 'Lebih rendah',
      safeExplanation: 'Ada sinyal perbaikan',
    });
    expect(report.businessSummary.segment).toBe('Laundry');
    expect(serialized).not.toMatch(
      /internalScore|internal_score|ruleVersion|rule_version|supportingFactors|raw JSON|probability|confidence/i
    );
    expect(serialized).not.toMatch(/pemilik kos|penghuni kos|kamar kos|pompa kos/i);
    expect(serialized).not.toMatch(/prediksi tagihan|potensi hemat|pasti menghemat|penyebab pasti/i);
  });

  it('isolates tenants, businesses, inactive records, and valid empty months', async () => {
    const ownerId = await seedUser('owner');
    const outsiderId = await seedUser('outsider');
    const firstBusiness = await seedBusiness(ownerId, 'owner-first');
    const secondBusiness = await seedBusiness(ownerId, 'owner-second');
    const inactiveBusiness = await seedBusiness(ownerId, 'owner-inactive', { active: false });
    const foreignBusiness = await seedBusiness(outsiderId, 'outsider');
    await insertBill({ businessId: firstBusiness, id: 'report-owner-first-bill', start: '2026-08-01', end: '2026-08-31', amount: '111000' });
    await insertBill({ businessId: secondBusiness, id: 'report-owner-second-bill', start: '2026-08-01', end: '2026-08-31', amount: '222000' });
    await insertBill({ businessId: foreignBusiness, id: 'report-foreign-bill', start: '2026-08-01', end: '2026-08-31', amount: '999000' });

    const second = await getMonthlyReportReadModel(ownerId, secondBusiness, '2026-08', NOW);
    const empty = await getMonthlyReportReadModel(ownerId, secondBusiness, '2026-06', NOW);
    expect(second.monthSummary.totalCost).toContain('222.000');
    expect(JSON.stringify(second)).not.toContain('999.000');
    expect(empty.reportCompleteness.code).toBe('NO_BILL');

    await expect(getMonthlyReportReadModel(ownerId, foreignBusiness, '2026-08', NOW)).rejects.toBeInstanceOf(MonthlyReportBusinessNotFoundError);
    await expect(getMonthlyReportReadModel(ownerId, inactiveBusiness, '2026-08', NOW)).rejects.toBeInstanceOf(MonthlyReportBusinessNotFoundError);
    await expect(getMonthlyReportReadModel(ownerId, firstBusiness, '2026-13', NOW)).rejects.toBeInstanceOf(MonthlyReportMonthError);
    await expect(getMonthlyReportReadModel(ownerId, firstBusiness, '2026-09', NOW)).rejects.toBeInstanceOf(MonthlyReportMonthError);
  });

  it('returns at most 24 distinct available months in descending order', async () => {
    const userId = await seedUser('months');
    const businessId = await seedBusiness(userId, 'months');
    for (let index = 0; index < 25; index += 1) {
      const date = new Date(Date.UTC(2026, 7 - index, 1));
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const end = new Date(Date.UTC(year, date.getUTCMonth() + 1, 0));
      const endDate = `${end.getUTCFullYear()}-${String(end.getUTCMonth() + 1).padStart(2, '0')}-${String(end.getUTCDate()).padStart(2, '0')}`;
      await insertBill({
        businessId,
        id: `report-month-${index}`,
        start: `${year}-${month}-01`,
        end: endDate,
        amount: String(100000 + index),
      });
    }
    const report = await getMonthlyReportReadModel(userId, businessId, '2026-08', NOW);
    expect(report.availableMonths).toHaveLength(24);
    expect(report.availableMonths[0].value).toBe('2026-08');
    expect(report.availableMonths.at(-1)?.value).toBe('2024-09');
  });

  it('hard-stops when more than twelve bills end in one report month', async () => {
    const userId = await seedUser('bill-limit');
    const businessId = await seedBusiness(userId, 'bill-limit');
    for (let day = 1; day <= 13; day += 1) {
      const value = String(day).padStart(2, '0');
      await insertBill({
        businessId,
        id: `report-limit-${value}`,
        start: `2026-08-${value}`,
        end: `2026-08-${value}`,
        amount: '1000',
      });
    }
    await expect(
      getMonthlyReportReadModel(userId, businessId, '2026-08', NOW)
    ).rejects.toBeInstanceOf(MonthlyReportBillLimitError);
  });
});
