import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import pg from 'pg';
import { applyAllForwardMigrations } from '../helpers/migrations';
import { createBillForOwnedBusiness, updateBillForOwnedBusiness, deleteBillForOwnedBusiness, ReferencedBillLockedError } from '../../src/server/repositories/bill.repository';
import { deleteRevenueEntry, applyApplianceTemplate } from '../../src/server/services/workspace.service';
import { getMonthlyReportReadModel } from '../../src/server/services/monthly-report.service';
import { getProductAnalysisReadModel } from '../../src/server/services/product-analysis';
import { GET as csvRouteGET } from '../../src/app/api/reports/monthly.csv/route';
import * as sessionModule from '../../src/server/auth/session';

const { Pool } = pg;
const dbUrl =
  process.env.DATABASE_URL ||
  'postgresql://postgres:testpass@127.0.0.1:5439/wattwise_test';

describe('IT-QC-01B MVP Corrective Hardening Integration Tests', () => {
  let pool: pg.Pool;

  beforeAll(async () => {
    process.env.MONTHLY_REPORTS_ENABLED = 'true';
    pool = new Pool({ connectionString: dbUrl, connectionTimeoutMillis: 5000 });
    await pool.query(`
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `);
    await applyAllForwardMigrations(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM action_outcome_evaluation');
    await pool.query('DELETE FROM energy_action_plan');
    await pool.query('DELETE FROM inspection_item');
    await pool.query('DELETE FROM inspection_plan');
    await pool.query('DELETE FROM diagnostic_candidate');
    await pool.query('DELETE FROM diagnostic_session');
    await pool.query('DELETE FROM appliance');
    await pool.query('DELETE FROM revenue_entry');
    await pool.query('DELETE FROM electricity_bill');
    await pool.query('DELETE FROM business');
    await pool.query('DELETE FROM user_plan');
    await pool.query('DELETE FROM session');
    await pool.query('DELETE FROM account');
    await pool.query('DELETE FROM "user"');
  });

  async function seedUser(id: string, email: string) {
    await pool.query(
      `INSERT INTO "user" (id, name, email, email_verified) VALUES ($1, $2, $3, true)`,
      [id, `User ${id}`, email]
    );
  }

  async function seedBusiness(id: string, userId: string, name: string, segment = 'KOS') {
    await pool.query(
      `INSERT INTO business (id, user_id, name, business_type, segment, electrical_system, is_active)
       VALUES ($1, $2, $3, 'KOS_PROPERTY', $4, 'ALL_IN', true)`,
      [id, userId, name, segment]
    );
  }

  describe('GAP 1 & 11: CSV Route Integration & Security', () => {
    it('rejects unauthenticated CSV request with 401', async () => {
      vi.spyOn(sessionModule, 'getOptionalSession').mockResolvedValueOnce(null);
      const request = new Request('http://localhost:3000/api/reports/monthly.csv?businessId=b1&month=2026-08');
      const response = await csvRouteGET(request);
      expect(response.status).toBe(401);
      vi.restoreAllMocks();
    });

    it('processes authenticated owned business CSV export with complete headers, body & formula safety', async () => {
      await seedUser('u1', 'u1@example.test');
      await seedUser('u2', 'u2@example.test');
      await seedBusiness('b1', 'u1', '=SUM(1,1) Usaha');
      await seedBusiness('b2', 'u2', 'Usaha Dua (Rahasia)');

      await createBillForOwnedBusiness('u1', {
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        totalAmountRupiah: BigInt(1200000),
        kwh: '500.000',
      }, 'b1');

      vi.spyOn(sessionModule, 'getOptionalSession').mockResolvedValue({
        session: { id: 's1', userId: 'u1', expiresAt: new Date(Date.now() + 86400000), token: 't1', createdAt: new Date(), updatedAt: new Date(), ipAddress: null, userAgent: null },
        user: { id: 'u1', email: 'u1@example.test', name: 'User One', emailVerified: true, createdAt: new Date(), updatedAt: new Date(), image: null },
      });

      const reqOk = new Request('http://localhost:3000/api/reports/monthly.csv?businessId=b1&month=2026-01');
      const resOk = await csvRouteGET(reqOk);
      expect(resOk.status).toBe(200);
      expect(resOk.headers.get('content-type')).toContain('text/csv');
      expect(resOk.headers.get('content-disposition')).toContain('attachment; filename="wattwise-laporan-sum-1-1-usaha-2026-01.csv"');
      expect(resOk.headers.get('cache-control')).toBe('private, no-store');
      expect(resOk.headers.get('x-content-type-options')).toBe('nosniff');

      const bodyText = await resOk.text();
      expect(bodyText).toContain('WattWise AI - Laporan Listrik Usaha');
      expect(bodyText).toContain('2026-01');
      expect(bodyText).not.toContain('Usaha Dua (Rahasia)');
      expect(bodyText).toContain("'=SUM(1,1) Usaha");

      // Foreign businessId -> 404
      const reqForeign = new Request('http://localhost:3000/api/reports/monthly.csv?businessId=b2&month=2026-01');
      const resForeign = await csvRouteGET(reqForeign);
      expect(resForeign.status).toBe(404);

      // Invalid month -> 404
      const reqInvalidMonth = new Request('http://localhost:3000/api/reports/monthly.csv?businessId=b1&month=invalid-month');
      const resInvalidMonth = await csvRouteGET(reqInvalidMonth);
      expect(resInvalidMonth.status).toBe(404);

      vi.restoreAllMocks();
    });

    it('rejects historical report outside user entitlement with 403', async () => {
      process.env.ENTITLEMENTS_ENABLED = 'true';
      await seedUser('u1', 'u1@example.test');
      await seedBusiness('b1', 'u1', 'Usaha Satu');

      await pool.query(
        `INSERT INTO electricity_bill (id, business_id, period_start, period_end, total_amount_rupiah, kwh_source)
         VALUES ('old-bill', 'b1', '2025-01-01', '2025-01-31', 1000000, 'USER_ENTERED')`
      );

      vi.spyOn(sessionModule, 'getOptionalSession').mockResolvedValue({
        session: { id: 's1', userId: 'u1', expiresAt: new Date(Date.now() + 86400000), token: 't1', createdAt: new Date(), updatedAt: new Date(), ipAddress: null, userAgent: null },
        user: { id: 'u1', email: 'u1@example.test', name: 'User One', emailVerified: true, createdAt: new Date(), updatedAt: new Date(), image: null },
      });

      const reqOutside = new Request('http://localhost:3000/api/reports/monthly.csv?businessId=b1&month=2025-01');
      const resOutside = await csvRouteGET(reqOutside);
      expect(resOutside.status).toBe(403);

      vi.restoreAllMocks();
    });
  });

  describe('GAP 4: Bill Edit, Delete & Referenced Lock UX', () => {
    it('allows owner to update and delete unreferenced bills', async () => {
      await seedUser('u1', 'u1@example.test');
      await seedBusiness('b1', 'u1', 'Usaha Satu');

      const created = await createBillForOwnedBusiness('u1', {
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        totalAmountRupiah: BigInt(1000000),
        kwh: '500.000',
      }, 'b1');

      const updated = await updateBillForOwnedBusiness('u1', created.id, {
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        totalAmountRupiah: BigInt(1200000),
        kwh: '600.000',
      });
      expect(updated.totalAmountRupiah).toBe(1200000n);
      expect(updated.kwh).toBe('600.000');

      await deleteBillForOwnedBusiness('u1', created.id);
      const bills = await pool.query(`SELECT id FROM electricity_bill WHERE id = $1`, [created.id]);
      expect(bills.rows).toHaveLength(0);
    });

    it('blocks foreign user from updating or deleting bills', async () => {
      await seedUser('u1', 'u1@example.test');
      await seedUser('u2', 'u2@example.test');
      await seedBusiness('b1', 'u1', 'Usaha Satu');

      const created = await createBillForOwnedBusiness('u1', {
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        totalAmountRupiah: BigInt(1000000),
      }, 'b1');

      await expect(
        updateBillForOwnedBusiness('u2', created.id, {
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          totalAmountRupiah: BigInt(2000000),
        })
      ).rejects.toThrow();

      await expect(deleteBillForOwnedBusiness('u2', created.id)).rejects.toThrow();
    });

    it('blocks update and delete on bills referenced in diagnostic sessions', async () => {
      await seedUser('u1', 'u1@example.test');
      await seedBusiness('b1', 'u1', 'Usaha Satu');

      const b1 = await createBillForOwnedBusiness('u1', {
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        totalAmountRupiah: BigInt(1000000),
      }, 'b1');

      const b2 = await createBillForOwnedBusiness('u1', {
        periodStart: '2026-02-01',
        periodEnd: '2026-02-28',
        totalAmountRupiah: BigInt(1500000),
      }, 'b1');

      await pool.query(
        `INSERT INTO diagnostic_session (id, business_id, electricity_bill_id, comparison_bill_id, segment_code, status, rule_version)
         VALUES ('diag-s1', 'b1', $1, $2, 'KOS', 'ANALYZED', 'V1')`,
        [b2.id, b1.id]
      );

      await expect(
        updateBillForOwnedBusiness('u1', b2.id, {
          periodStart: '2026-02-01',
          periodEnd: '2026-02-28',
          totalAmountRupiah: BigInt(1600000),
        })
      ).rejects.toThrow(ReferencedBillLockedError);

      await expect(deleteBillForOwnedBusiness('u1', b2.id)).rejects.toThrow(ReferencedBillLockedError);

      await expect(
        updateBillForOwnedBusiness('u1', b1.id, {
          periodStart: '2026-01-01',
          periodEnd: '2026-01-31',
          totalAmountRupiah: BigInt(1100000),
        })
      ).rejects.toThrow(ReferencedBillLockedError);

      await expect(deleteBillForOwnedBusiness('u1', b1.id)).rejects.toThrow(ReferencedBillLockedError);
    });
  });

  describe('GAP 5: Appliance Template Concurrency & Idempotency', () => {
    it('guarantees sequential and concurrent idempotency without creating duplicate appliances', async () => {
      await seedUser('u1', 'u1@example.test');
      await seedBusiness('b1', 'u1', 'Usaha Laundry', 'LAUNDRY');

      await pool.query(
        `INSERT INTO user_plan (id, user_id, plan, trial_starts_at, trial_ends_at, updated_at) VALUES ('p1', 'u1', 'PRO_TRIAL', NOW(), NOW() + INTERVAL '30 days', NOW())`
      );

      await applyApplianceTemplate('u1', 'b1');
      const count1 = await pool.query(`SELECT count(*)::int FROM appliance WHERE business_id = 'b1' AND data_source = 'TEMPLATE'`);
      expect(count1.rows[0].count).toBeGreaterThan(0);
      const initialCount = count1.rows[0].count;

      await applyApplianceTemplate('u1', 'b1');
      const count2 = await pool.query(`SELECT count(*)::int FROM appliance WHERE business_id = 'b1' AND data_source = 'TEMPLATE'`);
      expect(count2.rows[0].count).toBe(initialCount);

      await Promise.all([
        applyApplianceTemplate('u1', 'b1'),
        applyApplianceTemplate('u1', 'b1'),
        applyApplianceTemplate('u1', 'b1'),
      ]);
      const count3 = await pool.query(`SELECT count(*)::int FROM appliance WHERE business_id = 'b1' AND data_source = 'TEMPLATE'`);
      expect(count3.rows[0].count).toBe(initialCount);
    });
  });

  describe('GAP 3: Historical Report >12 Months Cash-Flow Context', () => {
    it('preserves revenue ratio and remaining revenue context for reports older than 12 months', async () => {
      await seedUser('u1', 'u1@example.test');
      await seedBusiness('b1', 'u1', 'Usaha Kos', 'KOS');

      await pool.query(
        `INSERT INTO user_plan (id, user_id, plan, updated_at) VALUES ('p1', 'u1', 'BUSINESS', NOW())`
      );

      const targetMonth = '2025-05';
      await pool.query(
        `INSERT INTO revenue_entry (id, business_id, period_month, amount_rupiah, input_mode)
         VALUES ('rev-2025-05', 'b1', '2025-05-01', 20000000, 'EXACT')`
      );

      await pool.query(
        `INSERT INTO electricity_bill (id, business_id, period_start, period_end, total_amount_rupiah, kwh_source)
         VALUES ('bill-2025-05', 'b1', '2025-05-01', '2025-05-31', 2000000, 'USER_ENTERED')`
      );

      const testMonths = [
        '2025-06', '2025-07', '2025-08', '2025-09', '2025-10', '2025-11', '2025-12',
        '2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07',
      ];
      for (const monthStr of testMonths) {
        await pool.query(
          `INSERT INTO electricity_bill (id, business_id, period_start, period_end, total_amount_rupiah, kwh_source)
           VALUES ($1, 'b1', $2::date, $3::date, 2500000, 'USER_ENTERED')`,
          [`bill-${monthStr}`, `${monthStr}-01`, `${monthStr}-28`]
        );
      }

      const report = await getMonthlyReportReadModel('u1', 'b1', targetMonth);
      expect(report.reportMonth).toBe('2025-05');
      expect(report.revenueSummary).not.toBeNull();
      expect(report.revenueSummary?.rawAmountRupiah).toBe(20000000n);
      expect(report.revenueSummary?.ratioPercent).toBe(10.0);
      expect(report.revenueSummary?.remainingRupiah).toBe(18000000n);
    });
  });

  describe('GAP 7: kWh Provenance Precedence Persistence', () => {
    it('persists USER_ENTERED when direct kWh is provided regardless of meters', async () => {
      await seedUser('u1', 'u1@example.test');
      await seedBusiness('b1', 'u1', 'Usaha Satu');

      const billWithBoth = await createBillForOwnedBusiness('u1', {
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        totalAmountRupiah: BigInt(1000000),
        kwh: '450.000',
        meterStart: '1000.000',
        meterEnd: '1450.000',
      }, 'b1');

      expect(billWithBoth.kwhSource).toBe('USER_ENTERED');

      const billWithMetersOnly = await createBillForOwnedBusiness('u1', {
        periodStart: '2026-02-01',
        periodEnd: '2026-02-28',
        totalAmountRupiah: BigInt(1000000),
        meterStart: '1450.000',
        meterEnd: '1900.000',
      }, 'b1');

      expect(billWithMetersOnly.kwhSource).toBe('METER_DERIVED');

      const billWithNeither = await createBillForOwnedBusiness('u1', {
        periodStart: '2026-03-01',
        periodEnd: '2026-03-31',
        totalAmountRupiah: BigInt(1000000),
      }, 'b1');

      expect(billWithNeither.kwhSource).toBe('LEGACY_UNKNOWN');
    });
  });

  describe('GAP 8: Revenue Delete Lifecycle & Isolation', () => {
    it('allows owner to delete revenue entry and blocks foreign user', async () => {
      await seedUser('u1', 'u1@example.test');
      await seedUser('u2', 'u2@example.test');
      await seedBusiness('b1', 'u1', 'Usaha Satu');

      await pool.query(
        `INSERT INTO revenue_entry (id, business_id, period_month, amount_rupiah, input_mode)
         VALUES ('rev-del-1', 'b1', '2026-07-01', 15000000, 'EXACT')`
      );

      await expect(deleteRevenueEntry('u2', 'rev-del-1')).rejects.toThrow();

      const deletedBusinessId = await deleteRevenueEntry('u1', 'rev-del-1');
      expect(deletedBusinessId).toBe('b1');

      const check = await pool.query(`SELECT count(*)::int FROM revenue_entry WHERE id = 'rev-del-1'`);
      expect(check.rows[0].count).toBe(0);
    });
  });

  describe('Phase-aware forecast database integration and tenant isolation', () => {
    it('classifies all five phases from owned monthly bills while AI OFF stays deterministic', async () => {
      await seedUser('phase-user', 'phase-user@example.test');
      const fixtures = [
        ['phase-h00', 0, 'H00', 'deterministic_baseline'],
        ['phase-h02', 2, 'H01_02', 'deterministic_baseline'],
        ['phase-h04', 4, 'H03_05', 'deterministic_baseline'],
        ['phase-h08', 8, 'H06_12', 'nbeats'],
        ['phase-h13', 13, 'H13_PLUS', 'nbeats'],
      ] as const;
      const previousMode = process.env.WATTWISE_AI_MODE;
      process.env.WATTWISE_AI_MODE = 'OFF';
      try {
        for (const [businessId, count, phase, engine] of fixtures) {
          await seedBusiness(businessId, 'phase-user', `AI Validation ${phase}`);
          for (let index = 0; index < count; index += 1) {
            const date = new Date(Date.UTC(2025, index, 1));
            const year = date.getUTCFullYear();
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const lastDay = new Date(Date.UTC(year, date.getUTCMonth() + 1, 0)).getUTCDate();
            await pool.query(
              `INSERT INTO electricity_bill (
                 id, business_id, period_start, period_end, total_amount_rupiah,
                 kwh, tariff_rupiah_per_kwh, kwh_source
               ) VALUES ($1, $2, $3::date, $4::date, $5, $6, 1500, 'USER_ENTERED')`,
              [
                `${businessId}-bill-${index}`,
                businessId,
                `${year}-${month}-01`,
                `${year}-${month}-${lastDay}`,
                150_000 + index * 15_000,
                100 + index * 10,
              ]
            );
          }
          const result = await getProductAnalysisReadModel('phase-user', businessId, {
            phaseAware: true,
            forecastOrigin: new Date('2026-12-15T00:00:00.000Z'),
          });
          expect(result.phaseAwarePrediction?.reportingPhase).toBe(phase);
          expect(result.phaseAwarePrediction?.requestedEngine).toBe(engine);
          if (engine === 'deterministic_baseline') {
            expect(result.phaseAwarePrediction?.fallbackUsed).toBe(false);
          } else {
            expect(result.phaseAwarePrediction?.fallbackReason).toBe('MODEL_DISABLED');
          }
        }
      } finally {
        if (previousMode === undefined) delete process.env.WATTWISE_AI_MODE;
        else process.env.WATTWISE_AI_MODE = previousMode;
      }
    });

    it('rejects a foreign business before prediction orchestration can run', async () => {
      await seedUser('phase-owner-a', 'phase-owner-a@example.test');
      await seedUser('phase-owner-b', 'phase-owner-b@example.test');
      await seedBusiness('phase-private-business', 'phase-owner-b', 'Private Business');
      await expect(
        getProductAnalysisReadModel('phase-owner-a', 'phase-private-business', { phaseAware: true })
      ).rejects.toThrow();
    });
  });
});
