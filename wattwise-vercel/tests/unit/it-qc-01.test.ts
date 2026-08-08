import { describe, it, expect } from 'vitest';
import { buildUsageSamplesFromBills, analyzeLatestAnomaly } from '../../src/server/services/product-analysis';
import { parseEnv, validateProductionEnv } from '../../src/config/env';
import { ReferencedBillLockedError } from '../../src/server/repositories/bill.repository';

describe('IT-QC-01 Hardening & Model Readiness Unit Tests', () => {
  describe('Workstream M: Electricity Provenance & buildUsageSamplesFromBills', () => {
    it('correctly maps USER_ENTERED, METER_DERIVED, LEGACY_UNKNOWN, and BILL_TARIFF_DERIVED', () => {
      const samples = buildUsageSamplesFromBills([
        {
          periodEnd: '2026-01-31',
          kwh: '350.000',
          totalAmountRupiah: 500000n,
          tariffRupiahPerKwh: '1444.70',
          kwhSource: 'METER_DERIVED',
        },
        {
          periodEnd: '2026-02-28',
          kwh: '380.000',
          totalAmountRupiah: 550000n,
          tariffRupiahPerKwh: '1444.70',
          kwhSource: 'USER_ENTERED',
        },
        {
          periodEnd: '2026-03-31',
          kwh: null,
          totalAmountRupiah: 600000n,
          tariffRupiahPerKwh: '1500.00',
          kwhSource: null,
        },
        {
          periodEnd: '2026-04-30',
          kwh: '400.000',
          totalAmountRupiah: 600000n,
          tariffRupiahPerKwh: null,
          kwhSource: 'LEGACY_UNKNOWN',
        },
      ]);

      expect(samples).toHaveLength(4);
      expect(samples[0]).toEqual({
        period: '2026-01',
        usageKwh: 350,
        billAmount: 500000,
        tariff: 1444.7,
        usageSource: 'METER_DERIVED',
        isEstimated: false,
      });
      expect(samples[1]).toEqual({
        period: '2026-02',
        usageKwh: 380,
        billAmount: 550000,
        tariff: 1444.7,
        usageSource: 'USER_ENTERED',
        isEstimated: false,
      });
      expect(samples[2]).toEqual({
        period: '2026-03',
        usageKwh: null,
        billAmount: 600000,
        tariff: 1500,
        usageSource: 'BILL_TARIFF_DERIVED',
        isEstimated: true,
      });
      expect(samples[3]).toEqual({
        period: '2026-04',
        usageKwh: 400,
        billAmount: 600000,
        tariff: null,
        usageSource: 'LEGACY_UNKNOWN',
        isEstimated: false,
      });
    });
  });

  describe('Workstream C: Production Environment Fail-Closed', () => {
    it('allows startup without secrets in development mode', () => {
      const env = parseEnv({ NODE_ENV: 'development' });
      expect(() => validateProductionEnv(env)).not.toThrow();
    });

    it('allows startup without secrets in test mode', () => {
      const env = parseEnv({ NODE_ENV: 'test' });
      expect(() => validateProductionEnv(env)).not.toThrow();
    });

    it('rejects production runtime without DATABASE_URL', () => {
      const env = parseEnv({
        NODE_ENV: 'production',
        BETTER_AUTH_SECRET: 'this-is-a-valid-32-character-secret-key-12345',
      });
      expect(() => validateProductionEnv(env)).toThrow('DATABASE_URL: required in production');
    });

    it('rejects production runtime with short BETTER_AUTH_SECRET', () => {
      const env = parseEnv({
        NODE_ENV: 'production',
        DATABASE_URL: 'postgresql://postgres:pass@127.0.0.1:5432/wattwise',
        BETTER_AUTH_SECRET: 'too-short',
      });
      expect(() => validateProductionEnv(env)).toThrow('BETTER_AUTH_SECRET');
    });
  });

  describe('Workstream F: ReferencedBillLockedError', () => {
    it('instantiates ReferencedBillLockedError with clear, safe Indonesian message', () => {
      const err = new ReferencedBillLockedError();
      expect(err.message).toContain('sudah digunakan dalam riwayat pemeriksaan');
      expect(err.name).toBe('ReferencedBillLockedError');
    });
  });

  describe('Workstream H: Consolidated Deterministic Analysis & Anomaly Thresholds', () => {
    it('classifies anomaly severity thresholds strictly (10% Perlu Dicek, 20% Boros)', () => {
      const samplesLow = [
        { period: '2026-01', usageKwh: 100, billAmount: 100000, tariff: 1000 },
        { period: '2026-02', usageKwh: 105, billAmount: 105000, tariff: 1000 },
      ];
      expect(analyzeLatestAnomaly(samplesLow).status).toBe('Normal');

      const samplesMed = [
        { period: '2026-01', usageKwh: 100, billAmount: 100000, tariff: 1000 },
        { period: '2026-02', usageKwh: 112, billAmount: 112000, tariff: 1000 },
      ];
      expect(analyzeLatestAnomaly(samplesMed).status).toBe('Perlu Dicek');

      const samplesHigh = [
        { period: '2026-01', usageKwh: 100, billAmount: 100000, tariff: 1000 },
        { period: '2026-02', usageKwh: 125, billAmount: 125000, tariff: 1000 },
      ];
      expect(analyzeLatestAnomaly(samplesHigh).status).toBe('Boros');
    });
  });
});
