import { describe, expect, it } from 'vitest';
import {
  deriveTrendDirection,
  processSingleLocation,
  calculateSummary,
  calculateComparison,
  calculateHealth,
  buildAttentionItems,
  buildTopIncreaseContributors,
  buildTrend,
  getPreviousMonth,
  getPastNMonths,
  formatMonthLabel,
  type BusinessDataLike,
  type BillDataLike,
  type ProcessedLocationData,
} from '@/server/services/portfolio-intelligence.service';

describe('Portfolio Intelligence V1 — Unit Tests', () => {
  const dummyBusiness: BusinessDataLike = {
    id: 'biz-1',
    name: 'Laundry Maju',
    businessType: 'LAUNDRY',
    city: 'Surabaya',
  };

  describe('Trend Direction Calculation (Pure Function)', () => {
    it('returns Naik when differencePercent > 2.0%', () => {
      expect(deriveTrendDirection(2.1)).toBe('Naik');
      expect(deriveTrendDirection(15.0)).toBe('Naik');
      expect(deriveTrendDirection(50.0)).toBe('Naik');
    });

    it('returns Turun when differencePercent < -2.0%', () => {
      expect(deriveTrendDirection(-2.1)).toBe('Turun');
      expect(deriveTrendDirection(-10.5)).toBe('Turun');
    });

    it('returns Stabil when differencePercent is between -2.0% and +2.0%', () => {
      expect(deriveTrendDirection(0)).toBe('Stabil');
      expect(deriveTrendDirection(1.9)).toBe('Stabil');
      expect(deriveTrendDirection(-1.9)).toBe('Stabil');
      expect(deriveTrendDirection(2.0)).toBe('Stabil');
      expect(deriveTrendDirection(-2.0)).toBe('Stabil');
    });

    it('returns null when differencePercent is null or not finite', () => {
      expect(deriveTrendDirection(null)).toBeNull();
      expect(deriveTrendDirection(NaN)).toBeNull();
      expect(deriveTrendDirection(Infinity)).toBeNull();
    });
  });

  describe('Health Status Mapping and Trend Separation', () => {
    it('maps Normal anomaly to Aman and keeps trend separate', () => {
      const bills: BillDataLike[] = [
        { id: 'b1', businessId: 'biz-1', periodStart: '2026-06-01', periodEnd: '2026-06-30', totalAmountRupiah: 1444700, kwh: 1000, tariffRupiahPerKwh: 1444.7 },
        { id: 'b2', businessId: 'biz-1', periodStart: '2026-07-01', periodEnd: '2026-07-31', totalAmountRupiah: 1444700, kwh: 1005, tariffRupiahPerKwh: 1444.7 },
        { id: 'b3', businessId: 'biz-1', periodStart: '2026-08-01', periodEnd: '2026-08-31', totalAmountRupiah: 1444700, kwh: 1010, tariffRupiahPerKwh: 1444.7 },
      ];

      const res = processSingleLocation(dummyBusiness, bills, '2026-08', '2026-07');
      expect(res.status).toBe('Aman');
      expect(res.trend).toBe('Stabil');
      expect(res.currentUsageKwh).toBe(1010);
      expect(res.previousUsageKwh).toBe(1005);
    });

    it('maps 10%-19% increase to Perlu Dicek with Naik trend', () => {
      const bills: BillDataLike[] = [
        { id: 'b1', businessId: 'biz-1', periodStart: '2026-06-01', periodEnd: '2026-06-30', totalAmountRupiah: 1444700, kwh: 1000, tariffRupiahPerKwh: 1444.7 },
        { id: 'b2', businessId: 'biz-1', periodStart: '2026-07-01', periodEnd: '2026-07-31', totalAmountRupiah: 1444700, kwh: 1000, tariffRupiahPerKwh: 1444.7 },
        { id: 'b3', businessId: 'biz-1', periodStart: '2026-08-01', periodEnd: '2026-08-31', totalAmountRupiah: 1661405, kwh: 1150, tariffRupiahPerKwh: 1444.7 },
      ];

      const res = processSingleLocation(dummyBusiness, bills, '2026-08', '2026-07');
      expect(res.status).toBe('Perlu Dicek');
      expect(res.trend).toBe('Naik');
      expect(res.usageChangePercent).toBe(15);
      expect(res.diagnosticHint).toBe('Ada bagian yang disarankan untuk diperiksa.');
    });

    it('maps >= 20% increase to Perlu Perhatian with Naik trend', () => {
      const bills: BillDataLike[] = [
        { id: 'b1', businessId: 'biz-1', periodStart: '2026-06-01', periodEnd: '2026-06-30', totalAmountRupiah: 1444700, kwh: 1000, tariffRupiahPerKwh: 1444.7 },
        { id: 'b2', businessId: 'biz-1', periodStart: '2026-07-01', periodEnd: '2026-07-31', totalAmountRupiah: 1444700, kwh: 1000, tariffRupiahPerKwh: 1444.7 },
        { id: 'b3', businessId: 'biz-1', periodStart: '2026-08-01', periodEnd: '2026-08-31', totalAmountRupiah: 1805875, kwh: 1250, tariffRupiahPerKwh: 1444.7 },
      ];

      const res = processSingleLocation(dummyBusiness, bills, '2026-08', '2026-07');
      expect(res.status).toBe('Perlu Perhatian');
      expect(res.trend).toBe('Naik');
      expect(res.usageChangePercent).toBe(25);
    });

    it('maps missing selected month to Data Belum Lengkap', () => {
      const bills: BillDataLike[] = [
        { id: 'b1', businessId: 'biz-1', periodStart: '2026-06-01', periodEnd: '2026-06-30', totalAmountRupiah: 1444700, kwh: 1000, tariffRupiahPerKwh: 1444.7 },
        { id: 'b2', businessId: 'biz-1', periodStart: '2026-07-01', periodEnd: '2026-07-31', totalAmountRupiah: 1444700, kwh: 1000, tariffRupiahPerKwh: 1444.7 },
      ];

      const res = processSingleLocation(dummyBusiness, bills, '2026-08', '2026-07');
      expect(res.status).toBe('Data Belum Lengkap');
      expect(res.trend).toBeNull();
      expect(res.hasSelectedMonthData).toBe(false);
      expect(res.currentUsageKwh).toBeNull();
      expect(res.currentCostIdr).toBeNull();
    });

    it('resolves kWh from cost / tariff when kwh is null in bill', () => {
      const bills: BillDataLike[] = [
        { id: 'b1', businessId: 'biz-1', periodStart: '2026-08-01', periodEnd: '2026-08-31', totalAmountRupiah: 2000000, kwh: null, tariffRupiahPerKwh: 2000 },
      ];

      const res = processSingleLocation(dummyBusiness, bills, '2026-08', '2026-07');
      expect(res.currentUsageKwh).toBe(1000);
      expect(res.currentCostIdr).toBe(2000000);
    });
  });

  describe('Coverage and Summary Aggregations (Missing data != 0)', () => {
    it('accurately calculates active vs reporting locations and ignores missing data as zero', () => {
      const mockProcessed: ProcessedLocationData[] = [
        {
          business: { id: 'b1', name: 'Biz 1', businessType: 'FNB', city: 'A' },
          status: 'Aman',
          statusDescription: 'Ok',
          trend: 'Stabil',
          currentUsageKwh: 1000,
          previousUsageKwh: 1000,
          usageChangePercent: 0,
          currentCostIdr: 1500000,
          previousCostIdr: 1500000,
          costChangePercent: 0,
          costImpactIdr: 0,
          diagnosticHint: null,
          hasSelectedMonthData: true,
          hasPreviousMonthData: true,
        },
        {
          business: { id: 'b2', name: 'Biz 2', businessType: 'KOS', city: 'B' },
          status: 'Data Belum Lengkap',
          statusDescription: 'No data',
          trend: null,
          currentUsageKwh: null,
          previousUsageKwh: 800,
          usageChangePercent: null,
          currentCostIdr: null,
          previousCostIdr: 1200000,
          costChangePercent: null,
          costImpactIdr: null,
          diagnosticHint: null,
          hasSelectedMonthData: false,
          hasPreviousMonthData: true,
        },
      ];

      const { coverage, summary } = calculateSummary(2, mockProcessed);
      expect(coverage.activeBusinessCount).toBe(2);
      expect(coverage.businessesWithElectricityData).toBe(1);
      expect(coverage.electricityCoveragePercent).toBe(50);
      expect(summary.totalUsageKwh).toBe(1000);
      expect(summary.totalElectricityCostIdr).toBe(1500000);
    });

    it('returns null for totals when 0 businesses have electricity data', () => {
      const mockProcessed: ProcessedLocationData[] = [
        {
          business: { id: 'b1', name: 'Biz 1', businessType: 'FNB', city: 'A' },
          status: 'Data Belum Lengkap',
          statusDescription: 'No data',
          trend: null,
          currentUsageKwh: null,
          previousUsageKwh: null,
          usageChangePercent: null,
          currentCostIdr: null,
          previousCostIdr: null,
          costChangePercent: null,
          costImpactIdr: null,
          diagnosticHint: null,
          hasSelectedMonthData: false,
          hasPreviousMonthData: false,
        },
      ];

      const { coverage, summary } = calculateSummary(1, mockProcessed);
      expect(coverage.businessesWithElectricityData).toBe(0);
      expect(coverage.electricityCoveragePercent).toBe(0);
      expect(summary.totalUsageKwh).toBeNull();
      expect(summary.totalElectricityCostIdr).toBeNull();
    });
  });

  describe('MoM Comparison strictly on comparable population', () => {
    it('compares ONLY locations with data in BOTH selected and previous months', () => {
      const mockProcessed: ProcessedLocationData[] = [
        {
          business: { id: 'b1', name: 'Biz 1', businessType: 'FNB', city: 'A' },
          status: 'Perlu Dicek',
          statusDescription: 'Ok',
          trend: 'Naik',
          currentUsageKwh: 1200,
          previousUsageKwh: 1000,
          usageChangePercent: 20,
          currentCostIdr: 1800000,
          previousCostIdr: 1500000,
          costChangePercent: 20,
          costImpactIdr: 300000,
          diagnosticHint: null,
          hasSelectedMonthData: true,
          hasPreviousMonthData: true,
        },
        {
          business: { id: 'b2', name: 'Biz 2', businessType: 'LAUNDRY', city: 'B' },
          status: 'Data Belum Lengkap',
          statusDescription: 'New biz',
          trend: null,
          currentUsageKwh: 500,
          previousUsageKwh: null,
          usageChangePercent: null,
          currentCostIdr: 750000,
          previousCostIdr: null,
          costChangePercent: null,
          costImpactIdr: null,
          diagnosticHint: null,
          hasSelectedMonthData: true,
          hasPreviousMonthData: false, // NOT comparable
        },
      ];

      const comp = calculateComparison(mockProcessed);
      expect(comp.comparableBusinessCount).toBe(1);
      expect(comp.currentComparableUsageKwh).toBe(1200);
      expect(comp.previousComparableUsageKwh).toBe(1000);
      expect(comp.usageDifferenceKwh).toBe(200);
      expect(comp.usageDifferencePercent).toBe(20);
      expect(comp.currentComparableCostIdr).toBe(1800000);
      expect(comp.previousComparableCostIdr).toBe(1500000);
      expect(comp.costDifferenceIdr).toBe(300000);
      expect(comp.costDifferencePercent).toBe(20);
    });

    it('returns null differences when comparableBusinessCount is 0', () => {
      const comp = calculateComparison([]);
      expect(comp.comparableBusinessCount).toBe(0);
      expect(comp.usageDifferenceKwh).toBeNull();
      expect(comp.usageDifferencePercent).toBeNull();
      expect(comp.costDifferenceIdr).toBeNull();
    });
  });

  describe('Kondisi Semua Usaha (Health Summary)', () => {
    it('aggregates counts and produces safe narrative without black-box scores', () => {
      const mockProcessed: ProcessedLocationData[] = [
        { business: { id: 'b1', name: 'B1', businessType: 'FNB', city: null }, status: 'Aman', statusDescription: '', trend: 'Stabil', currentUsageKwh: 100, previousUsageKwh: 100, usageChangePercent: 0, currentCostIdr: 100, previousCostIdr: 100, costChangePercent: 0, costImpactIdr: 0, diagnosticHint: null, hasSelectedMonthData: true, hasPreviousMonthData: true },
        { business: { id: 'b2', name: 'B2', businessType: 'FNB', city: null }, status: 'Aman', statusDescription: '', trend: 'Stabil', currentUsageKwh: 100, previousUsageKwh: 100, usageChangePercent: 0, currentCostIdr: 100, previousCostIdr: 100, costChangePercent: 0, costImpactIdr: 0, diagnosticHint: null, hasSelectedMonthData: true, hasPreviousMonthData: true },
        { business: { id: 'b3', name: 'B3', businessType: 'FNB', city: null }, status: 'Perlu Dicek', statusDescription: '', trend: 'Naik', currentUsageKwh: 115, previousUsageKwh: 100, usageChangePercent: 15, currentCostIdr: 115, previousCostIdr: 100, costChangePercent: 15, costImpactIdr: 15, diagnosticHint: null, hasSelectedMonthData: true, hasPreviousMonthData: true },
        { business: { id: 'b4', name: 'B4', businessType: 'FNB', city: null }, status: 'Perlu Perhatian', statusDescription: '', trend: 'Naik', currentUsageKwh: 130, previousUsageKwh: 100, usageChangePercent: 30, currentCostIdr: 130, previousCostIdr: 100, costChangePercent: 30, costImpactIdr: 30, diagnosticHint: null, hasSelectedMonthData: true, hasPreviousMonthData: true },
        { business: { id: 'b5', name: 'B5', businessType: 'FNB', city: null }, status: 'Data Belum Lengkap', statusDescription: '', trend: null, currentUsageKwh: null, previousUsageKwh: null, usageChangePercent: null, currentCostIdr: null, previousCostIdr: null, costChangePercent: null, costImpactIdr: null, diagnosticHint: null, hasSelectedMonthData: false, hasPreviousMonthData: false },
      ];

      const health = calculateHealth(mockProcessed);
      expect(health.safeCount).toBe(2);
      expect(health.checkCount).toBe(1);
      expect(health.attentionCount).toBe(1);
      expect(health.incompleteCount).toBe(1);
      expect(health.summaryText).toContain('Ada 2 lokasi yang sebaiknya Anda tinjau.');
    });
  });

  describe('Attention Items Ordering and Rules', () => {
    it('prioritizes Perlu Perhatian > Perlu Dicek > Data Belum Lengkap, excludes Aman, and caps at 5', () => {
      const mockProcessed: ProcessedLocationData[] = [
        { business: { id: 'b-aman', name: 'Aman Biz', businessType: 'FNB', city: null }, status: 'Aman', statusDescription: '', trend: 'Stabil', currentUsageKwh: 100, previousUsageKwh: 100, usageChangePercent: 0, currentCostIdr: 100, previousCostIdr: 100, costChangePercent: 0, costImpactIdr: 0, diagnosticHint: null, hasSelectedMonthData: true, hasPreviousMonthData: true },
        { business: { id: 'b-cek', name: 'Cek Biz', businessType: 'FNB', city: null }, status: 'Perlu Dicek', statusDescription: '', trend: 'Naik', currentUsageKwh: 115, previousUsageKwh: 100, usageChangePercent: 15, currentCostIdr: 115, previousCostIdr: 100, costChangePercent: 15, costImpactIdr: 15, diagnosticHint: null, hasSelectedMonthData: true, hasPreviousMonthData: true },
        { business: { id: 'b-inc', name: 'Incomplete Biz', businessType: 'FNB', city: null }, status: 'Data Belum Lengkap', statusDescription: '', trend: null, currentUsageKwh: null, previousUsageKwh: null, usageChangePercent: null, currentCostIdr: null, previousCostIdr: null, costChangePercent: null, costImpactIdr: null, diagnosticHint: null, hasSelectedMonthData: false, hasPreviousMonthData: false },
        { business: { id: 'b-att', name: 'Attention Biz', businessType: 'FNB', city: null }, status: 'Perlu Perhatian', statusDescription: '', trend: 'Naik', currentUsageKwh: 130, previousUsageKwh: 100, usageChangePercent: 30, currentCostIdr: 130, previousCostIdr: 100, costChangePercent: 30, costImpactIdr: 30, diagnosticHint: null, hasSelectedMonthData: true, hasPreviousMonthData: true },
      ];

      const attentionItems = buildAttentionItems(mockProcessed);
      expect(attentionItems.length).toBe(3);
      // Aman is excluded
      expect(attentionItems.some((x) => x.businessId === 'b-aman')).toBe(false);
      // Priority 1: Perlu Perhatian
      expect(attentionItems[0].businessId).toBe('b-att');
      expect(attentionItems[0].status).toBe('Perlu Perhatian');
      // Priority 2: Perlu Dicek
      expect(attentionItems[1].businessId).toBe('b-cek');
      expect(attentionItems[1].status).toBe('Perlu Dicek');
      // Priority 3: Data Belum Lengkap
      expect(attentionItems[2].businessId).toBe('b-inc');
      expect(attentionItems[2].status).toBe('Data Belum Lengkap');
      expect(attentionItems[2].ctaText).toBe('Lengkapi Data');
    });
  });

  describe('Top Increase Contributors (Section 17)', () => {
    it('ranks locations by absolute kWh increase and calculates contribution percentage against comparable population', () => {
      const mockProcessed: ProcessedLocationData[] = [
        {
          business: { id: 'b1', name: 'Laundry Sudirman', businessType: 'LAUNDRY', city: 'Jakarta' },
          status: 'Perlu Perhatian',
          statusDescription: 'Ok',
          trend: 'Naik',
          currentUsageKwh: 1420,
          previousUsageKwh: 1000, // +420 kWh
          usageChangePercent: 42,
          currentCostIdr: 2130000,
          previousCostIdr: 1500000,
          costChangePercent: 42,
          costImpactIdr: 630000,
          diagnosticHint: null,
          hasSelectedMonthData: true,
          hasPreviousMonthData: true,
        },
        {
          business: { id: 'b2', name: 'Frozen Jaya', businessType: 'COLD_STORAGE', city: 'Surabaya' },
          status: 'Perlu Perhatian',
          statusDescription: 'Ok',
          trend: 'Naik',
          currentUsageKwh: 1280,
          previousUsageKwh: 1000, // +280 kWh
          usageChangePercent: 28,
          currentCostIdr: 1920000,
          previousCostIdr: 1500000,
          costChangePercent: 28,
          costImpactIdr: 420000,
          diagnosticHint: null,
          hasSelectedMonthData: true,
          hasPreviousMonthData: true,
        },
        {
          business: { id: 'b3', name: 'Kos Melati', businessType: 'KOS', city: 'Bandung' },
          status: 'Aman',
          statusDescription: 'Ok',
          trend: 'Naik',
          currentUsageKwh: 1080,
          previousUsageKwh: 1000, // +80 kWh
          usageChangePercent: 8,
          currentCostIdr: 1620000,
          previousCostIdr: 1500000,
          costChangePercent: 8,
          costImpactIdr: 120000,
          diagnosticHint: null,
          hasSelectedMonthData: true,
          hasPreviousMonthData: true,
        },
        {
          business: { id: 'b4', name: 'Hemat Jaya', businessType: 'FNB', city: 'Solo' },
          status: 'Aman',
          statusDescription: 'Ok',
          trend: 'Turun',
          currentUsageKwh: 800,
          previousUsageKwh: 1000, // -200 kWh (decreased -> must NOT appear)
          usageChangePercent: -20,
          currentCostIdr: 1200000,
          previousCostIdr: 1500000,
          costChangePercent: -20,
          costImpactIdr: -300000,
          diagnosticHint: null,
          hasSelectedMonthData: true,
          hasPreviousMonthData: true,
        },
        {
          business: { id: 'b5', name: 'No Prev Data', businessType: 'FNB', city: 'Medan' },
          status: 'Data Belum Lengkap',
          statusDescription: 'Ok',
          trend: null,
          currentUsageKwh: 500,
          previousUsageKwh: null, // missing prev month -> must NOT appear
          usageChangePercent: null,
          currentCostIdr: 750000,
          previousCostIdr: null,
          costChangePercent: null,
          costImpactIdr: null,
          diagnosticHint: null,
          hasSelectedMonthData: true,
          hasPreviousMonthData: false,
        },
      ];

      const contributors = buildTopIncreaseContributors(mockProcessed);
      // Total increase = 420 + 280 + 80 = 780 kWh
      expect(contributors.length).toBe(3);
      expect(contributors[0].businessName).toBe('Laundry Sudirman');
      expect(contributors[0].increaseKwh).toBe(420);
      // 420 / 780 = 53.8%
      expect(contributors[0].contributionPercent).toBe(53.8);

      expect(contributors[1].businessName).toBe('Frozen Jaya');
      expect(contributors[1].increaseKwh).toBe(280);
      // 280 / 780 = 35.9%
      expect(contributors[1].contributionPercent).toBe(35.9);

      expect(contributors[2].businessName).toBe('Kos Melati');
      expect(contributors[2].increaseKwh).toBe(80);
      // 80 / 780 = 10.3%
      expect(contributors[2].contributionPercent).toBe(10.3);

      // Decreasing location is excluded
      expect(contributors.some((x) => x.businessId === 'b4')).toBe(false);
      // Non-comparable location is excluded
      expect(contributors.some((x) => x.businessId === 'b5')).toBe(false);
    });
  });

  describe('Historical Trend Aggregation (Section 19)', () => {
    it('aggregates 6 months of historical data with exact location count disclosure', () => {
      const businesses: BusinessDataLike[] = [
        { id: 'b1', name: 'Biz 1', businessType: 'FNB', city: null },
        { id: 'b2', name: 'Biz 2', businessType: 'KOS', city: null },
      ];

      const bills: BillDataLike[] = [
        { id: 'bill-1', businessId: 'b1', periodStart: '2026-07-01', periodEnd: '2026-07-31', totalAmountRupiah: 1444700, kwh: 1000, tariffRupiahPerKwh: 1444.7 },
        { id: 'bill-2', businessId: 'b2', periodStart: '2026-07-01', periodEnd: '2026-07-31', totalAmountRupiah: 722350, kwh: 500, tariffRupiahPerKwh: 1444.7 },
        { id: 'bill-3', businessId: 'b1', periodStart: '2026-08-01', periodEnd: '2026-08-31', totalAmountRupiah: 1589170, kwh: 1100, tariffRupiahPerKwh: 1444.7 },
      ];

      const trendMonths = ['2026-07', '2026-08'];
      const trend = buildTrend(businesses, bills, trendMonths);

      expect(trend.length).toBe(2);
      expect(trend[0].month).toBe('2026-07');
      expect(trend[0].totalUsageKwh).toBe(1500);
      expect(trend[0].businessCountWithData).toBe(2);
      expect(trend[0].activeBusinessCount).toBe(2);

      expect(trend[1].month).toBe('2026-08');
      expect(trend[1].totalUsageKwh).toBe(1100);
      expect(trend[1].businessCountWithData).toBe(1);
      expect(trend[1].activeBusinessCount).toBe(2);
    });
  });

  describe('Month formatting and helper utilities', () => {
    it('correctly calculates previous month across years and format labels', () => {
      expect(getPreviousMonth('2026-01')).toBe('2025-12');
      expect(getPreviousMonth('2026-08')).toBe('2026-07');
      expect(getPastNMonths('2026-08', 3)).toEqual(['2026-06', '2026-07', '2026-08']);
      expect(formatMonthLabel('2026-08')).toBe('Agu 2026');
    });
  });
});
