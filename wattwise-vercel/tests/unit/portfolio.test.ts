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
  isValidYearMonth,
  type BusinessDataLike,
  type BillDataLike,
  type ProcessedLocationData,
} from '@/server/services/portfolio-intelligence.service';
import { resolvePortfolioRouteDecision } from '@/app/(product)/portfolio/page';

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
      expect(coverage.businessesWithBillRecord).toBe(1);
      expect(coverage.electricityCoveragePercent).toBe(50);
      expect(summary.totalUsageKwh).toBe(1000);
      expect(summary.totalElectricityCostIdr).toBe(1500000);
    });

    it('distinguishes businesses with bill records from businesses with usable electricity data', () => {
      // 1 location with valid kWh, 1 location with bill record but null/unusable kWh
      const mockProcessed: ProcessedLocationData[] = [
        {
          business: { id: 'b1', name: 'Biz 1', businessType: 'FNB', city: 'A' },
          status: 'Aman',
          statusDescription: 'Ok',
          trend: 'Stabil',
          currentUsageKwh: 1000,
          previousUsageKwh: 1000,
          usageChangePercent: 0,
          anomalyDifferencePercent: 0,
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
          statusDescription: 'Data listrik bulan ini belum tersedia/lengkap.',
          trend: null,
          currentUsageKwh: null, // Bill exists but kWh is unresolvable!
          previousUsageKwh: 800,
          usageChangePercent: null,
          anomalyDifferencePercent: null,
          currentCostIdr: 1200000,
          previousCostIdr: 1200000,
          costChangePercent: 0,
          costImpactIdr: 0,
          diagnosticHint: null,
          hasSelectedMonthData: true, // Bill record exists
          hasPreviousMonthData: true,
        },
      ];

      const { coverage, summary } = calculateSummary(2, mockProcessed);
      expect(coverage.activeBusinessCount).toBe(2);
      // businessesWithBillRecord counts the bill existence (2)
      expect(coverage.businessesWithBillRecord).toBe(2);
      // businessesWithElectricityData STRICTLY counts locations where currentUsageKwh !== null (1)
      expect(coverage.businessesWithElectricityData).toBe(1);
      expect(coverage.electricityCoveragePercent).toBe(50);
      expect(summary.totalUsageKwh).toBe(1000);
      expect(summary.totalElectricityCostIdr).toBe(2700000);
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
    it('aggregates counts and produces neutral mixed narrative when no category has a majority', () => {
      const mockProcessed: ProcessedLocationData[] = [
        { business: { id: 'b1', name: 'B1', businessType: 'FNB', city: null }, status: 'Aman', statusDescription: '', trend: 'Stabil', currentUsageKwh: 100, previousUsageKwh: 100, usageChangePercent: 0, anomalyDifferencePercent: 0, currentCostIdr: 100, previousCostIdr: 100, costChangePercent: 0, costImpactIdr: 0, diagnosticHint: null, hasSelectedMonthData: true, hasPreviousMonthData: true },
        { business: { id: 'b2', name: 'B2', businessType: 'FNB', city: null }, status: 'Aman', statusDescription: '', trend: 'Stabil', currentUsageKwh: 100, previousUsageKwh: 100, usageChangePercent: 0, anomalyDifferencePercent: 0, currentCostIdr: 100, previousCostIdr: 100, costChangePercent: 0, costImpactIdr: 0, diagnosticHint: null, hasSelectedMonthData: true, hasPreviousMonthData: true },
        { business: { id: 'b3', name: 'B3', businessType: 'FNB', city: null }, status: 'Perlu Dicek', statusDescription: '', trend: 'Naik', currentUsageKwh: 115, previousUsageKwh: 100, usageChangePercent: 15, anomalyDifferencePercent: 15, currentCostIdr: 115, previousCostIdr: 100, costChangePercent: 15, costImpactIdr: 15, diagnosticHint: null, hasSelectedMonthData: true, hasPreviousMonthData: true },
        { business: { id: 'b4', name: 'B4', businessType: 'FNB', city: null }, status: 'Perlu Perhatian', statusDescription: '', trend: 'Naik', currentUsageKwh: 130, previousUsageKwh: 100, usageChangePercent: 30, anomalyDifferencePercent: 30, currentCostIdr: 130, previousCostIdr: 100, costChangePercent: 30, costImpactIdr: 30, diagnosticHint: null, hasSelectedMonthData: true, hasPreviousMonthData: true },
        { business: { id: 'b5', name: 'B5', businessType: 'FNB', city: null }, status: 'Data Belum Lengkap', statusDescription: '', trend: null, currentUsageKwh: null, previousUsageKwh: null, usageChangePercent: null, anomalyDifferencePercent: null, currentCostIdr: null, previousCostIdr: null, costChangePercent: null, costImpactIdr: null, diagnosticHint: null, hasSelectedMonthData: false, hasPreviousMonthData: false },
      ];

      const health = calculateHealth(mockProcessed);
      expect(health.safeCount).toBe(2);
      expect(health.checkCount).toBe(1);
      expect(health.attentionCount).toBe(1);
      expect(health.incompleteCount).toBe(1);
      expect(health.summaryText).toContain('Kondisi pemakaian beragam. Ada 2 lokasi yang disarankan untuk ditinjau.');
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

  describe('Regression: Selected-Month Health Must Strictly Use Selected-Month Usage (Issue 1 & 2)', () => {
    it('does NOT silently classify an earlier usable month when selected-month bill has unusable kWh/tariff', () => {
      // Historical bills have valid data in June and July
      // Selected bill (August) exists, but kwh is null and tariff is null (unresolvable usage)
      const bills: BillDataLike[] = [
        { id: 'b1', businessId: 'biz-1', periodStart: '2026-06-01', periodEnd: '2026-06-30', totalAmountRupiah: 1444700, kwh: 1000, tariffRupiahPerKwh: 1444.7 },
        { id: 'b2', businessId: 'biz-1', periodStart: '2026-07-01', periodEnd: '2026-07-31', totalAmountRupiah: 1444700, kwh: 1000, tariffRupiahPerKwh: 1444.7 },
        { id: 'b3', businessId: 'biz-1', periodStart: '2026-08-01', periodEnd: '2026-08-31', totalAmountRupiah: 1500000, kwh: null, tariffRupiahPerKwh: null },
      ];

      const res = processSingleLocation(dummyBusiness, bills, '2026-08', '2026-07');
      // Must NOT produce Aman, Perlu Dicek, or Perlu Perhatian based on July
      expect(res.status).toBe('Data Belum Lengkap');
      expect(res.statusDescription).toBe('Data listrik bulan ini belum tersedia/lengkap.');
      expect(res.currentUsageKwh).toBeNull();
      expect(res.trend).toBeNull();
    });

    it('distinguishes Condition A (selected data missing/unusable) vs Condition B (insufficient history)', () => {
      // Condition A: Selected month has no bill at all
      const billsA: BillDataLike[] = [
        { id: 'b1', businessId: 'biz-1', periodStart: '2026-06-01', periodEnd: '2026-06-30', totalAmountRupiah: 1444700, kwh: 1000, tariffRupiahPerKwh: 1444.7 },
        { id: 'b2', businessId: 'biz-1', periodStart: '2026-07-01', periodEnd: '2026-07-31', totalAmountRupiah: 1444700, kwh: 1000, tariffRupiahPerKwh: 1444.7 },
      ];
      const resA = processSingleLocation(dummyBusiness, billsA, '2026-08', '2026-07');
      expect(resA.status).toBe('Data Belum Lengkap');
      expect(resA.statusDescription).toBe('Data listrik bulan ini belum tersedia/lengkap.');

      // Attention item preserves reason A
      const itemsA = buildAttentionItems([resA]);
      expect(itemsA.length).toBe(1);
      expect(itemsA[0].primaryReason).toBe('Data listrik bulan ini belum tersedia/lengkap.');

      // Condition B: Selected month has valid bill & resolvable usage, but only 1 month total (no historical baseline)
      const billsB: BillDataLike[] = [
        { id: 'b3', businessId: 'biz-1', periodStart: '2026-08-01', periodEnd: '2026-08-31', totalAmountRupiah: 1444700, kwh: 1000, tariffRupiahPerKwh: 1444.7 },
      ];
      const resB = processSingleLocation(dummyBusiness, billsB, '2026-08', '2026-07');
      expect(resB.status).toBe('Data Belum Lengkap');
      expect(resB.statusDescription).toBe('Histori penggunaan belum cukup untuk menentukan pola.');
      expect(resB.currentUsageKwh).toBe(1000);

      // Attention item preserves reason B without overwriting
      const itemsB = buildAttentionItems([resB]);
      expect(itemsB.length).toBe(1);
      expect(itemsB[0].primaryReason).toBe('Histori penggunaan belum cukup untuk menentukan pola.');
    });
  });

  describe('Regression: Comparable-Population Semantics (Issue 3 & 4)', () => {
    it('excludes businesses with unusable kWh from usage comparability even when bills exist', () => {
      // Biz 1: both months have valid kWh
      // Biz 2: both months have bills, but August has null kWh & null tariff
      const p1: ProcessedLocationData = {
        business: { id: 'b1', name: 'Biz 1', businessType: 'FNB', city: null },
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
      };

      const p2: ProcessedLocationData = {
        business: { id: 'b2', name: 'Biz 2', businessType: 'LAUNDRY', city: null },
        status: 'Data Belum Lengkap',
        statusDescription: 'Data listrik bulan ini belum tersedia/lengkap.',
        trend: null,
        currentUsageKwh: null, // Unusable kWh!
        previousUsageKwh: 800,
        usageChangePercent: null,
        currentCostIdr: 1300000, // Valid cost exists
        previousCostIdr: 1200000, // Valid cost exists
        costChangePercent: 8.3,
        costImpactIdr: 100000,
        diagnosticHint: null,
        hasSelectedMonthData: true,
        hasPreviousMonthData: true,
      };

      const comp = calculateComparison([p1, p2]);
      // Usage comparable must only include p1
      expect(comp.usageComparableBusinessCount).toBe(1);
      expect(comp.comparableBusinessCount).toBe(1);
      expect(comp.currentComparableUsageKwh).toBe(1000);
      expect(comp.previousComparableUsageKwh).toBe(1000);
      expect(comp.usageDifferenceKwh).toBe(0);

      // Cost comparable includes both p1 and p2
      expect(comp.costComparableBusinessCount).toBe(2);
      expect(comp.currentComparableCostIdr).toBe(2800000);
      expect(comp.previousComparableCostIdr).toBe(2700000);
      expect(comp.costDifferenceIdr).toBe(100000);
    });

    it('ensures tariff/cost increase does NOT derive usage Naik trend', () => {
      // kWh stays identical (1000 kWh both months), but cost increases by 40% due to tariff hike
      const bills: BillDataLike[] = [
        { id: 'b1', businessId: 'biz-1', periodStart: '2026-07-01', periodEnd: '2026-07-31', totalAmountRupiah: 1000000, kwh: 1000, tariffRupiahPerKwh: 1000 },
        { id: 'b2', businessId: 'biz-1', periodStart: '2026-08-01', periodEnd: '2026-08-31', totalAmountRupiah: 1400000, kwh: 1000, tariffRupiahPerKwh: 1400 },
      ];

      const res = processSingleLocation(dummyBusiness, bills, '2026-08', '2026-07');
      expect(res.usageChangePercent).toBe(0);
      expect(res.costChangePercent).toBe(40);
      // Trend must reflect usage (Stabil), NOT cost (Naik)
      expect(res.trend).toBe('Stabil');
    });

    it('ensures null usageChangePercent results in null trend even if cost changed', () => {
      const bills: BillDataLike[] = [
        { id: 'b1', businessId: 'biz-1', periodStart: '2026-07-01', periodEnd: '2026-07-31', totalAmountRupiah: 1000000, kwh: null, tariffRupiahPerKwh: null },
        { id: 'b2', businessId: 'biz-1', periodStart: '2026-08-01', periodEnd: '2026-08-31', totalAmountRupiah: 1500000, kwh: null, tariffRupiahPerKwh: null },
      ];

      const res = processSingleLocation(dummyBusiness, bills, '2026-08', '2026-07');
      expect(res.usageChangePercent).toBeNull();
      expect(res.trend).toBeNull();
    });
  });

  describe('Regression: Health Summary Narrative (Issue 5 & Issue 3 Polish)', () => {
    it('produces majority-safe wording when safeCount > total / 2', () => {
      // 7 Aman / 2 review (1 check, 1 attention) / 1 incomplete (total 10)
      const list: ProcessedLocationData[] = [
        ...Array(7).fill(null).map((_, i) => ({
          business: { id: `safe-${i}`, name: `Safe ${i}`, businessType: 'FNB', city: null },
          status: 'Aman' as const,
          statusDescription: 'Ok',
          trend: 'Stabil' as const,
          currentUsageKwh: 100,
          previousUsageKwh: 100,
          usageChangePercent: 0,
          anomalyDifferencePercent: 0,
          currentCostIdr: 100,
          previousCostIdr: 100,
          costChangePercent: 0,
          costImpactIdr: 0,
          diagnosticHint: null,
          hasSelectedMonthData: true,
          hasPreviousMonthData: true,
        })),
        {
          business: { id: 'check-1', name: 'Check 1', businessType: 'FNB', city: null },
          status: 'Perlu Dicek' as const,
          statusDescription: 'Check',
          trend: 'Naik' as const,
          currentUsageKwh: 115,
          previousUsageKwh: 100,
          usageChangePercent: 15,
          anomalyDifferencePercent: 15,
          currentCostIdr: 115,
          previousCostIdr: 100,
          costChangePercent: 15,
          costImpactIdr: 15,
          diagnosticHint: null,
          hasSelectedMonthData: true,
          hasPreviousMonthData: true,
        },
        {
          business: { id: 'att-1', name: 'Att 1', businessType: 'FNB', city: null },
          status: 'Perlu Perhatian' as const,
          statusDescription: 'Attention',
          trend: 'Naik' as const,
          currentUsageKwh: 130,
          previousUsageKwh: 100,
          usageChangePercent: 30,
          anomalyDifferencePercent: 30,
          currentCostIdr: 130,
          previousCostIdr: 100,
          costChangePercent: 30,
          costImpactIdr: 30,
          diagnosticHint: null,
          hasSelectedMonthData: true,
          hasPreviousMonthData: true,
        },
        {
          business: { id: 'inc-1', name: 'Inc 1', businessType: 'FNB', city: null },
          status: 'Data Belum Lengkap' as const,
          statusDescription: 'Incomplete',
          trend: null,
          currentUsageKwh: null,
          previousUsageKwh: null,
          usageChangePercent: null,
          anomalyDifferencePercent: null,
          currentCostIdr: null,
          previousCostIdr: null,
          costChangePercent: null,
          costImpactIdr: null,
          diagnosticHint: null,
          hasSelectedMonthData: false,
          hasPreviousMonthData: false,
        },
      ];

      const health = calculateHealth(list);
      expect(health.safeCount).toBe(7);
      expect(health.checkCount).toBe(1);
      expect(health.attentionCount).toBe(1);
      expect(health.incompleteCount).toBe(1);
      expect(health.summaryText).toContain('Sebagian besar lokasi masih berada dalam pola penggunaan yang wajar.');
      expect(health.summaryText).toContain('Ada 2 lokasi yang sebaiknya Anda tinjau.');
    });

    it('produces majority-needs-review wording when needsReview > total / 2', () => {
      // 1 Aman / 8 review (5 attention, 3 check) / 1 incomplete (total 10)
      const list: ProcessedLocationData[] = [
        {
          business: { id: 'safe-1', name: 'Safe 1', businessType: 'FNB', city: null },
          status: 'Aman' as const,
          statusDescription: 'Ok',
          trend: 'Stabil' as const,
          currentUsageKwh: 100,
          previousUsageKwh: 100,
          usageChangePercent: 0,
          anomalyDifferencePercent: 0,
          currentCostIdr: 100,
          previousCostIdr: 100,
          costChangePercent: 0,
          costImpactIdr: 0,
          diagnosticHint: null,
          hasSelectedMonthData: true,
          hasPreviousMonthData: true,
        },
        ...Array(5).fill(null).map((_, i) => ({
          business: { id: `att-${i}`, name: `Att ${i}`, businessType: 'FNB', city: null },
          status: 'Perlu Perhatian' as const,
          statusDescription: 'Attention',
          trend: 'Naik' as const,
          currentUsageKwh: 130,
          previousUsageKwh: 100,
          usageChangePercent: 30,
          anomalyDifferencePercent: 30,
          currentCostIdr: 130,
          previousCostIdr: 100,
          costChangePercent: 30,
          costImpactIdr: 30,
          diagnosticHint: null,
          hasSelectedMonthData: true,
          hasPreviousMonthData: true,
        })),
        ...Array(3).fill(null).map((_, i) => ({
          business: { id: `check-${i}`, name: `Check ${i}`, businessType: 'FNB', city: null },
          status: 'Perlu Dicek' as const,
          statusDescription: 'Check',
          trend: 'Naik' as const,
          currentUsageKwh: 115,
          previousUsageKwh: 100,
          usageChangePercent: 15,
          anomalyDifferencePercent: 15,
          currentCostIdr: 115,
          previousCostIdr: 100,
          costChangePercent: 15,
          costImpactIdr: 15,
          diagnosticHint: null,
          hasSelectedMonthData: true,
          hasPreviousMonthData: true,
        })),
        {
          business: { id: 'inc-1', name: 'Inc 1', businessType: 'FNB', city: null },
          status: 'Data Belum Lengkap' as const,
          statusDescription: 'Incomplete',
          trend: null,
          currentUsageKwh: null,
          previousUsageKwh: null,
          usageChangePercent: null,
          anomalyDifferencePercent: null,
          currentCostIdr: null,
          previousCostIdr: null,
          costChangePercent: null,
          costImpactIdr: null,
          diagnosticHint: null,
          hasSelectedMonthData: false,
          hasPreviousMonthData: false,
        },
      ];

      const health = calculateHealth(list);
      expect(health.safeCount).toBe(1);
      expect(health.checkCount).toBe(3);
      expect(health.attentionCount).toBe(5);
      expect(health.incompleteCount).toBe(1);
      // Must NOT state "Sebagian besar lokasi masih berada dalam pola penggunaan yang wajar."
      expect(health.summaryText).not.toContain('pola penggunaan yang wajar');
      expect(health.summaryText).toContain('Sebagian besar lokasi memerlukan peninjauan pemakaian listrik (8 dari 10 lokasi).');
    });

    it('produces majority-incomplete wording when incompleteCount > total / 2 (e.g. 7 incomplete, 2 safe, 1 check out of 10)', () => {
      // 2 Aman, 1 Perlu Dicek, 0 Perlu Perhatian, 7 Data Belum Lengkap out of 10
      const list: ProcessedLocationData[] = [
        ...Array(2).fill(null).map((_, i) => ({
          business: { id: `safe-${i}`, name: `Safe ${i}`, businessType: 'FNB', city: null },
          status: 'Aman' as const,
          statusDescription: 'Ok',
          trend: 'Stabil' as const,
          currentUsageKwh: 100,
          previousUsageKwh: 100,
          usageChangePercent: 0,
          anomalyDifferencePercent: 0,
          currentCostIdr: 100,
          previousCostIdr: 100,
          costChangePercent: 0,
          costImpactIdr: 0,
          diagnosticHint: null,
          hasSelectedMonthData: true,
          hasPreviousMonthData: true,
        })),
        {
          business: { id: 'check-1', name: 'Check 1', businessType: 'FNB', city: null },
          status: 'Perlu Dicek' as const,
          statusDescription: 'Check',
          trend: 'Naik' as const,
          currentUsageKwh: 115,
          previousUsageKwh: 100,
          usageChangePercent: 15,
          anomalyDifferencePercent: 15,
          currentCostIdr: 115,
          previousCostIdr: 100,
          costChangePercent: 15,
          costImpactIdr: 15,
          diagnosticHint: null,
          hasSelectedMonthData: true,
          hasPreviousMonthData: true,
        },
        ...Array(7).fill(null).map((_, i) => ({
          business: { id: `inc-${i}`, name: `Inc ${i}`, businessType: 'FNB', city: null },
          status: 'Data Belum Lengkap' as const,
          statusDescription: 'Incomplete',
          trend: null,
          currentUsageKwh: null,
          previousUsageKwh: null,
          usageChangePercent: null,
          anomalyDifferencePercent: null,
          currentCostIdr: null,
          previousCostIdr: null,
          costChangePercent: null,
          costImpactIdr: null,
          diagnosticHint: null,
          hasSelectedMonthData: false,
          hasPreviousMonthData: false,
        })),
      ];

      const health = calculateHealth(list);
      expect(health.safeCount).toBe(2);
      expect(health.checkCount).toBe(1);
      expect(health.attentionCount).toBe(0);
      expect(health.incompleteCount).toBe(7);
      // MUST NOT state "Sebagian besar lokasi masih berada dalam pola penggunaan yang wajar."
      expect(health.summaryText).not.toContain('pola penggunaan yang wajar');
      expect(health.summaryText).toBe('Sebagian besar lokasi belum memiliki data listrik yang lengkap (7 dari 10 lokasi).');
    });
  });

  describe('Regression: Authoritative Anomaly Deviation in Attention Items (Issue 2 Polish)', () => {
    it('uses anomalyDifferencePercent and NEVER costChangePercent for attention wording when previous-month usage is missing', () => {
      // June: 1000 kWh, 1.000.000 IDR (tariff 1000)
      // July (previous month): no bill / unusable usage, but cost record exists (e.g. 1.000.000 IDR)
      // August (selected month): 1150 kWh, cost 2.500.000 IDR (+150% cost change)
      // Anomaly evaluated against June baseline: difference is +15% (1150 vs 1000) -> Perlu Dicek
      const location: ProcessedLocationData = {
        business: { id: 'biz-anomaly-test', name: 'Warung Kopi', businessType: 'FNB', city: 'Surabaya' },
        status: 'Perlu Dicek',
        statusDescription: 'Pemakaian listrik 15% lebih tinggi dari pola sebelumnya.',
        trend: null, // July usage unavailable -> trend is null
        currentUsageKwh: 1150,
        previousUsageKwh: null, // July usage missing
        usageChangePercent: null, // No MoM usage comparison possible
        anomalyDifferencePercent: 15.0, // Authoritative deviation from historical anomaly engine
        currentCostIdr: 2500000,
        previousCostIdr: 1000000,
        costChangePercent: 150.0, // Cost jumped 150%
        costImpactIdr: 1500000,
        diagnosticHint: 'Ada bagian yang disarankan untuk diperiksa.',
        hasSelectedMonthData: true,
        hasPreviousMonthData: true,
      };

      const items = buildAttentionItems([location]);
      expect(items.length).toBe(1);
      expect(items[0].status).toBe('Perlu Dicek');
      // Explanatory wording MUST use anomaly deviation (15%), NOT cost change (150%)
      expect(items[0].primaryReason).toBe('Pemakaian listrik 15% lebih tinggi dari pola sebelumnya.');
      expect(items[0].primaryReason).not.toContain('150%');
      expect(items[0].usageChangePercent).toBeNull();
      expect(items[0].anomalyDifferencePercent).toBe(15.0);
    });

    it('ranks attention items by anomalyDifferencePercent and NEVER falls back to costChangePercent within equal severity', () => {
      // Two 'Perlu Dicek' locations:
      // Location A: Anomaly deviation = +12%, Cost change = +95%
      // Location B: Anomaly deviation = +18%, Cost change = +5%
      // Correct ranking by electricity anomaly deviation: Location B (18%) must rank BEFORE Location A (12%)
      const locA: ProcessedLocationData = {
        business: { id: 'loc-a', name: 'Toko A', businessType: 'RETAIL', city: null },
        status: 'Perlu Dicek',
        statusDescription: 'Pemakaian listrik 12% lebih tinggi dari pola sebelumnya.',
        trend: null,
        currentUsageKwh: 1120,
        previousUsageKwh: null,
        usageChangePercent: null,
        anomalyDifferencePercent: 12.0,
        currentCostIdr: 1950000,
        previousCostIdr: 1000000,
        costChangePercent: 95.0, // huge cost increase
        costImpactIdr: 950000,
        diagnosticHint: null,
        hasSelectedMonthData: true,
        hasPreviousMonthData: true,
      };

      const locB: ProcessedLocationData = {
        business: { id: 'loc-b', name: 'Toko B', businessType: 'RETAIL', city: null },
        status: 'Perlu Dicek',
        statusDescription: 'Pemakaian listrik 18% lebih tinggi dari pola sebelumnya.',
        trend: null,
        currentUsageKwh: 1180,
        previousUsageKwh: null,
        usageChangePercent: null,
        anomalyDifferencePercent: 18.0,
        currentCostIdr: 1050000,
        previousCostIdr: 1000000,
        costChangePercent: 5.0, // minimal cost increase
        costImpactIdr: 50000,
        diagnosticHint: null,
        hasSelectedMonthData: true,
        hasPreviousMonthData: true,
      };

      const items = buildAttentionItems([locA, locB]);
      expect(items.length).toBe(2);
      // Location B must rank 1st because 18% anomaly deviation > 12% anomaly deviation
      expect(items[0].businessId).toBe('loc-b');
      expect(items[0].anomalyDifferencePercent).toBe(18.0);
      expect(items[1].businessId).toBe('loc-a');
      expect(items[1].anomalyDifferencePercent).toBe(12.0);
    });

    it('end-to-end processSingleLocation: preserves anomalyDifferencePercent when July usage is missing and cost jumped', () => {
      // Historical: June bill has 1000 kWh, 1444700 IDR
      // July: bill missing / no usage
      // August (selected): 1150 kWh, 2889400 IDR (doubled cost)
      const bills: BillDataLike[] = [
        { id: 'b1', businessId: 'biz-1', periodStart: '2026-06-01', periodEnd: '2026-06-30', totalAmountRupiah: 1444700, kwh: 1000, tariffRupiahPerKwh: 1444.7 },
        { id: 'b3', businessId: 'biz-1', periodStart: '2026-08-01', periodEnd: '2026-08-31', totalAmountRupiah: 2889400, kwh: 1150, tariffRupiahPerKwh: 1444.7 },
      ];

      const res = processSingleLocation(dummyBusiness, bills, '2026-08', '2026-07');
      expect(res.status).toBe('Perlu Dicek');
      expect(res.currentUsageKwh).toBe(1150);
      expect(res.previousUsageKwh).toBeNull();
      expect(res.usageChangePercent).toBeNull();
      expect(res.anomalyDifferencePercent).toBe(15);

      const items = buildAttentionItems([res]);
      expect(items[0].primaryReason).toBe('Pemakaian listrik 15% lebih tinggi dari pola sebelumnya.');
      expect(items[0].usageChangePercent).toBeNull();
      expect(items[0].anomalyDifferencePercent).toBe(15);
    });
  });

  describe('Regression: Strict Calendar Month Validation (Issue 6)', () => {
    it('validates genuine YYYY-MM months strictly and rejects invalid values', () => {
      // Valid months
      expect(isValidYearMonth('2026-01')).toBe(true);
      expect(isValidYearMonth('2026-08')).toBe(true);
      expect(isValidYearMonth('2026-12')).toBe(true);
      expect(isValidYearMonth('  2026-05  ')).toBe(true);

      // Invalid months (out of bounds, malformed, non-calendar)
      expect(isValidYearMonth('2026-00')).toBe(false);
      expect(isValidYearMonth('2026-13')).toBe(false);
      expect(isValidYearMonth('2026-99')).toBe(false);
      expect(isValidYearMonth('abcd-12')).toBe(false);
      expect(isValidYearMonth('2026-8')).toBe(false);
      expect(isValidYearMonth('2026/08')).toBe(false);
      expect(isValidYearMonth('')).toBe(false);
      expect(isValidYearMonth(null)).toBe(false);
      expect(isValidYearMonth(undefined)).toBe(false);
      expect(isValidYearMonth(202608)).toBe(false);
      expect(isValidYearMonth('1800-05')).toBe(false);
    });
  });

  describe('Portfolio Route Redirection and Decision Logic (Issue 9)', () => {
    it('redirects unauthenticated user to /login', () => {
      const decision = resolvePortfolioRouteDecision(null, 'COMPLETE', []);
      expect(decision).toEqual({ action: 'redirect', destination: '/login' });
    });

    it('redirects incomplete journey user to corresponding journey step', () => {
      const decision = resolvePortfolioRouteDecision({ id: 'u1' }, 'ONBOARDING', []);
      expect(decision).toEqual({ action: 'redirect', destination: '/onboarding' });
    });

    it('redirects user with 0 active businesses to /onboarding', () => {
      const decision = resolvePortfolioRouteDecision({ id: 'u1' }, 'COMPLETE', []);
      expect(decision).toEqual({ action: 'redirect', destination: '/onboarding' });
    });

    it('redirects user with exactly 1 active business to single-business dashboard', () => {
      const decision = resolvePortfolioRouteDecision(
        { id: 'u1' },
        'COMPLETE',
        [{ id: 'biz-single-1', name: 'Toko Satu' }]
      );
      expect(decision).toEqual({
        action: 'redirect',
        destination: '/dashboard?businessId=biz-single-1',
      });
    });

    it('renders portfolio page for user with 2 or more active businesses', () => {
      const decision = resolvePortfolioRouteDecision(
        { id: 'u1' },
        'COMPLETE',
        [
          { id: 'biz-1', name: 'Toko Satu' },
          { id: 'biz-2', name: 'Toko Dua' },
        ]
      );
      expect(decision).toEqual({ action: 'render' });
    });
  });
});
