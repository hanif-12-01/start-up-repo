import { describe, expect, it } from 'vitest';
import {
  resolveUsageAndCost,
  calculateAnomalyStatus,
  calculateSummary,
  calculateComparison,
  calculateHealth,
  buildAttentionItems,
  buildTrend,
  processLocations,
  formatMonthLabel,
  getPreviousMonth,
  getPastNMonths,
  THRES_BOROS,
  THRES_DICEK,
  type BusinessDataLike,
  type BillDataLike,
  type RevenueDataLike,
  type ProcessedLocationData,
} from '../../src/server/services/portfolio.service';

describe('Portfolio Command Center — Domain Logic & Rules (IT-P0-09)', () => {
  describe('Calendar & Month Utilities', () => {
    it('calculates previous month correctly across year boundary', () => {
      expect(getPreviousMonth('2026-07')).toBe('2026-06');
      expect(getPreviousMonth('2026-01')).toBe('2025-12');
    });

    it('formats month labels in Indonesian', () => {
      expect(formatMonthLabel('2026-07')).toBe('Jul 2026');
      expect(formatMonthLabel('2026-01')).toBe('Jan 2026');
      expect(formatMonthLabel('2026-12')).toBe('Des 2026');
    });

    it('generates 6 consecutive past months ending at selected month', () => {
      const months = getPastNMonths('2026-07', 6);
      expect(months).toEqual([
        '2026-02',
        '2026-03',
        '2026-04',
        '2026-05',
        '2026-06',
        '2026-07',
      ]);
    });
  });

  describe('Electricity Usage & Cost Resolution', () => {
    it('returns nulls when bill is missing', () => {
      const res = resolveUsageAndCost(undefined);
      expect(res.usage).toBeNull();
      expect(res.cost).toBeNull();
    });

    it('prefers direct kwh when available', () => {
      const bill: BillDataLike = {
        businessId: 'biz-1',
        periodEnd: '2026-07-31',
        totalAmountRupiah: 1_500_000n,
        kwh: '1000.500',
        tariffRupiahPerKwh: '1444.70',
      };
      const res = resolveUsageAndCost(bill);
      expect(res.cost).toBe(1_500_000);
      expect(res.usage).toBe(1000.5);
    });

    it('falls back to totalAmount / tariff when kwh is null', () => {
      const bill: BillDataLike = {
        businessId: 'biz-2',
        periodEnd: '2026-07-31',
        totalAmountRupiah: 1_444_700n,
        kwh: null,
        tariffRupiahPerKwh: '1444.70',
      };
      const res = resolveUsageAndCost(bill);
      expect(res.cost).toBe(1_444_700);
      expect(res.usage).toBeCloseTo(1000, 1);
    });
  });

  describe('Health Status Mapping & Authoritative Thresholds', () => {
    it('maps missing current usage to Data Belum Lengkap', () => {
      const res = calculateAnomalyStatus(null, [500, 520], 520);
      expect(res.status).toBe('Data Belum Lengkap');
      expect(res.statusDescription).toContain('Data bulan ini belum cukup');
    });

    it('maps increase >= 20% to Perlu Perhatian (THRES_BOROS parity)', () => {
      expect(THRES_BOROS).toBe(20.0);
      // baseline = 500, current = 610 (+22%)
      const res = calculateAnomalyStatus(610, [500, 500], 500);
      expect(res.status).toBe('Perlu Perhatian');
      expect(res.differencePercent).toBeCloseTo(22, 1);
      expect(res.statusDescription).toContain('meningkat cukup besar');
    });

    it('maps increase 10% - 19.9% to Perlu Dicek (THRES_DICEK parity)', () => {
      expect(THRES_DICEK).toBe(10.0);
      // baseline = 500, current = 570 (+14%)
      const res = calculateAnomalyStatus(570, [500, 500], 500);
      expect(res.status).toBe('Perlu Dicek');
      expect(res.differencePercent).toBeCloseTo(14, 1);
      expect(res.statusDescription).toContain('Ada baiknya lokasi ini diperiksa');
    });

    it('maps normal/stable usage (<10% increase or decrease) to Aman', () => {
      // baseline = 500, current = 515 (+3%)
      const res = calculateAnomalyStatus(515, [500, 500], 500);
      expect(res.status).toBe('Aman');
      expect(res.statusDescription).toContain('masih berada dalam pola yang wajar');
    });
  });

  describe('Summary Aggregation & Visible Data Coverage', () => {
    it('does NOT fabricate missing data as zero and discloses coverage', () => {
      const mockLocations: ProcessedLocationData[] = [
        {
          business: { id: 'b1', name: 'Kos Melati', businessType: 'KOS', city: 'Jakarta' },
          currentUsage: 500,
          previousUsage: 480,
          currentCost: 750_000,
          previousCost: 720_000,
          currentRev: 10_000_000,
          previousRev: 9_500_000,
          status: 'Aman',
          statusDescription: 'Normal',
          costChangePercent: 4.1,
          usageChangePercent: 4.1,
          revenueChangePercent: 5.2,
          costImpactIdr: 30_000,
          costVsRevenueContext: null,
        },
        {
          business: { id: 'b2', name: 'Laundry Berkah', businessType: 'LAUNDRY', city: 'Bandung' },
          currentUsage: 1200,
          previousUsage: 1000,
          currentCost: 1_800_000,
          previousCost: 1_500_000,
          currentRev: 15_000_000,
          previousRev: 14_000_000,
          status: 'Perlu Perhatian',
          statusDescription: 'Spike',
          costChangePercent: 20.0,
          usageChangePercent: 20.0,
          revenueChangePercent: 7.1,
          costImpactIdr: 300_000,
          costVsRevenueContext: 'Biaya listrik naik lebih cepat daripada pendapatan.',
        },
        {
          // Missing electricity, has revenue
          business: { id: 'b3', name: 'Frozen Jaya', businessType: 'COLD_STORAGE', city: 'Semarang' },
          currentUsage: null,
          previousUsage: 800,
          currentCost: null,
          previousCost: 1_200_000,
          currentRev: 20_000_000,
          previousRev: 19_000_000,
          status: 'Data Belum Lengkap',
          statusDescription: 'Belum ada data',
          costChangePercent: null,
          usageChangePercent: null,
          revenueChangePercent: 5.2,
          costImpactIdr: null,
          costVsRevenueContext: null,
        },
        {
          // Missing both
          business: { id: 'b4', name: 'Kedai Kopi', businessType: 'FNB', city: 'Surabaya' },
          currentUsage: null,
          previousUsage: null,
          currentCost: null,
          previousCost: null,
          currentRev: null,
          previousRev: null,
          status: 'Data Belum Lengkap',
          statusDescription: 'Belum ada data',
          costChangePercent: null,
          usageChangePercent: null,
          revenueChangePercent: null,
          costImpactIdr: null,
          costVsRevenueContext: null,
        },
      ];

      const summary = calculateSummary(4, mockLocations);

      expect(summary.activeLocations).toBe(4);
      expect(summary.locationsWithElectricity).toBe(2);
      expect(summary.locationsWithRevenue).toBe(3);
      expect(summary.electricityCoveragePercent).toBe(50);
      expect(summary.revenueCoveragePercent).toBe(75);

      // Total usage & cost sum only the 2 locations with data, not treating missing as 0
      expect(summary.totalUsageKwh).toBe(1700);
      expect(summary.totalElectricityCostIdr).toBe(2_550_000);
      expect(summary.totalRevenueIdr).toBe(45_000_000);

      // Ratio = 2.55jt / 45jt = ~5.66%
      expect(summary.electricityRevenueRatioPercent).toBeCloseTo(5.66, 1);
    });
  });

  describe('Month-over-Month Comparison (Comparable Population Only)', () => {
    it('compares strictly locations with complete data in BOTH months', () => {
      const mockLocations: ProcessedLocationData[] = [
        {
          business: { id: 'b1', name: 'Kos Melati', businessType: 'KOS', city: 'Jakarta' },
          currentUsage: 500,
          previousUsage: 500,
          currentCost: 750_000,
          previousCost: 750_000,
          currentRev: 10_000_000,
          previousRev: 10_000_000,
          status: 'Aman',
          statusDescription: 'Normal',
          costChangePercent: 0,
          usageChangePercent: 0,
          revenueChangePercent: 0,
          costImpactIdr: 0,
          costVsRevenueContext: null,
        },
        {
          business: { id: 'b2', name: 'Laundry Berkah', businessType: 'LAUNDRY', city: 'Bandung' },
          currentUsage: 600,
          previousUsage: 500,
          currentCost: 900_000,
          previousCost: 750_000,
          currentRev: 15_000_000,
          previousRev: 15_000_000,
          status: 'Perlu Perhatian',
          statusDescription: 'Spike',
          costChangePercent: 20,
          usageChangePercent: 20,
          revenueChangePercent: 0,
          costImpactIdr: 150_000,
          costVsRevenueContext: null,
        },
        {
          // Present in current month, missing in previous month
          business: { id: 'b3', name: 'New Outlet', businessType: 'RETAIL', city: 'Jakarta' },
          currentUsage: 300,
          previousUsage: null,
          currentCost: 450_000,
          previousCost: null,
          currentRev: 5_000_000,
          previousRev: null,
          status: 'Aman',
          statusDescription: 'New',
          costChangePercent: null,
          usageChangePercent: null,
          revenueChangePercent: null,
          costImpactIdr: null,
          costVsRevenueContext: null,
        },
      ];

      const comp = calculateComparison(mockLocations);

      // Only b1 and b2 are comparable (count = 2)
      expect(comp.comparableLocationCount).toBe(2);
      expect(comp.currentCostTotal).toBe(1_650_000); // 750k + 900k (excludes b3's 450k)
      expect(comp.previousCostTotal).toBe(1_500_000); // 750k + 750k
      expect(comp.costDifferenceAbsolute).toBe(150_000);
      expect(comp.electricityCostChangePercent).toBeCloseTo(10.0, 1);
    });
  });

  describe('Attention Items Ordering & Capping', () => {
    it('prioritizes Perlu Perhatian > Perlu Dicek > Data Belum Lengkap and excludes Aman', () => {
      const mockLocations: ProcessedLocationData[] = [
        {
          business: { id: 'b1', name: 'Aman 1', businessType: 'KOS', city: null },
          currentUsage: 100,
          previousUsage: 100,
          currentCost: 150_000,
          previousCost: 150_000,
          currentRev: null,
          previousRev: null,
          status: 'Aman',
          statusDescription: 'Aman',
          costChangePercent: 0,
          usageChangePercent: 0,
          revenueChangePercent: null,
          costImpactIdr: 0,
          costVsRevenueContext: null,
        },
        {
          business: { id: 'b2', name: 'Check Small', businessType: 'FNB', city: null },
          currentUsage: 220,
          previousUsage: 200,
          currentCost: 330_000,
          previousCost: 300_000,
          currentRev: null,
          previousRev: null,
          status: 'Perlu Dicek',
          statusDescription: 'Naik 10%',
          costChangePercent: 10,
          usageChangePercent: 10,
          revenueChangePercent: null,
          costImpactIdr: 30_000,
          costVsRevenueContext: null,
        },
        {
          business: { id: 'b3', name: 'Attention High', businessType: 'LAUNDRY', city: null },
          currentUsage: 360,
          previousUsage: 200,
          currentCost: 540_000,
          previousCost: 300_000,
          currentRev: null,
          previousRev: null,
          status: 'Perlu Perhatian',
          statusDescription: 'Spike 80%',
          costChangePercent: 80,
          usageChangePercent: 80,
          revenueChangePercent: null,
          costImpactIdr: 240_000,
          costVsRevenueContext: null,
        },
        {
          business: { id: 'b4', name: 'Incomplete', businessType: 'COLD_STORAGE', city: null },
          currentUsage: null,
          previousUsage: 400,
          currentCost: null,
          previousCost: 600_000,
          currentRev: null,
          previousRev: null,
          status: 'Data Belum Lengkap',
          statusDescription: 'Belum dicatat',
          costChangePercent: null,
          usageChangePercent: null,
          revenueChangePercent: null,
          costImpactIdr: null,
          costVsRevenueContext: null,
        },
      ];

      const items = buildAttentionItems(mockLocations);

      // Aman 1 must be excluded
      expect(items.length).toBe(3);
      expect(items[0].businessName).toBe('Attention High'); // Priority 1
      expect(items[0].status).toBe('Perlu Perhatian');
      expect(items[0].ctaHref).toBe('/dashboard?businessId=b3');

      expect(items[1].businessName).toBe('Check Small'); // Priority 2
      expect(items[1].status).toBe('Perlu Dicek');

      expect(items[2].businessName).toBe('Incomplete'); // Priority 3
      expect(items[2].status).toBe('Data Belum Lengkap');
      expect(items[2].ctaText).toBe('Lengkapi Data');
    });

    it('caps attention items at maximum 5', () => {
      const mockLocations: ProcessedLocationData[] = Array.from({ length: 10 }, (_, i) => ({
        business: { id: `b-${i}`, name: `Location ${i}`, businessType: 'KOS', city: null },
        currentUsage: 500,
        previousUsage: 300,
        currentCost: 750_000,
        previousCost: 450_000,
        currentRev: null,
        previousRev: null,
        status: 'Perlu Perhatian' as const,
        statusDescription: 'Spike',
        costChangePercent: 66,
        usageChangePercent: 66,
        revenueChangePercent: null,
        costImpactIdr: 300_000 + i * 10_000,
        costVsRevenueContext: null,
      }));

      const items = buildAttentionItems(mockLocations);
      expect(items.length).toBe(5);
    });
  });

  describe('Historical 6-Month Trend', () => {
    it('preserves coverage count and avoids zero-filling missing locations', () => {
      const businesses: BusinessDataLike[] = [
        { id: 'b1', name: 'Kos 1', businessType: 'KOS', city: null },
        { id: 'b2', name: 'Kos 2', businessType: 'KOS', city: null },
      ];

      const bills: BillDataLike[] = [
        { businessId: 'b1', periodEnd: '2026-06-30', totalAmountRupiah: 500_000n, kwh: '300', tariffRupiahPerKwh: '1444.70' },
        { businessId: 'b2', periodEnd: '2026-06-30', totalAmountRupiah: 600_000n, kwh: '400', tariffRupiahPerKwh: '1444.70' },
        // in 2026-07 only b1 recorded
        { businessId: 'b1', periodEnd: '2026-07-31', totalAmountRupiah: 550_000n, kwh: '350', tariffRupiahPerKwh: '1444.70' },
      ];

      const trend = buildTrend(businesses, bills, [], ['2026-06', '2026-07']);
      expect(trend.length).toBe(2);

      expect(trend[0].periodMonth).toBe('2026-06');
      expect(trend[0].totalCostIdr).toBe(1_100_000);
      expect(trend[0].businessCountWithData).toBe(2);
      expect(trend[0].totalActiveBusinesses).toBe(2);

      expect(trend[1].periodMonth).toBe('2026-07');
      expect(trend[1].totalCostIdr).toBe(550_000);
      expect(trend[1].businessCountWithData).toBe(1);
      expect(trend[1].totalActiveBusinesses).toBe(2);
    });
  });

  describe('Health Summary Counts', () => {
    it('summarizes health breakdown and generates appropriate narrative', () => {
      const mockLocations: ProcessedLocationData[] = [
        { business: { id: '1', name: 'B1', businessType: 'KOS', city: null }, status: 'Aman' } as ProcessedLocationData,
        { business: { id: '2', name: 'B2', businessType: 'KOS', city: null }, status: 'Aman' } as ProcessedLocationData,
        { business: { id: '3', name: 'B3', businessType: 'KOS', city: null }, status: 'Perlu Dicek' } as ProcessedLocationData,
        { business: { id: '4', name: 'B4', businessType: 'KOS', city: null }, status: 'Perlu Perhatian' } as ProcessedLocationData,
      ];

      const health = calculateHealth(mockLocations);
      expect(health.safeCount).toBe(2);
      expect(health.checkCount).toBe(1);
      expect(health.attentionCount).toBe(1);
      expect(health.incompleteCount).toBe(0);
      expect(health.summaryText).toContain('Ada 2 lokasi yang sebaiknya Anda periksa.');
    });
  });

  describe('Full Location Processing Pipeline (processLocations)', () => {
    it('processes businesses with bills and revenues into ProcessedLocationData', () => {
      const businesses: BusinessDataLike[] = [
        { id: 'b1', name: 'Kos Melati', businessType: 'KOS', city: 'Jakarta' },
      ];
      const bills: BillDataLike[] = [
        { businessId: 'b1', periodEnd: '2026-06-30', totalAmountRupiah: 500_000n, kwh: '300', tariffRupiahPerKwh: '1444.70' },
        { businessId: 'b1', periodEnd: '2026-07-31', totalAmountRupiah: 650_000n, kwh: '400', tariffRupiahPerKwh: '1444.70' },
      ];
      const revenues: RevenueDataLike[] = [
        { businessId: 'b1', periodMonth: '2026-06-01', amountRupiah: 10_000_000n },
        { businessId: 'b1', periodMonth: '2026-07-01', amountRupiah: 10_500_000n },
      ];

      const result = processLocations(businesses, bills, revenues, '2026-07', '2026-06');
      expect(result.length).toBe(1);
      expect(result[0].currentUsage).toBe(400);
      expect(result[0].previousUsage).toBe(300);
      expect(result[0].currentCost).toBe(650_000);
      expect(result[0].previousCost).toBe(500_000);
      expect(result[0].currentRev).toBe(10_500_000);
      expect(result[0].status).toBe('Perlu Perhatian'); // 400 vs 300 = +33.3% spike
      expect(result[0].costVsRevenueContext).toBe('Biaya listrik naik lebih cepat daripada pendapatan.');
    });
  });
});
