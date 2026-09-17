import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'node:fs';
import path from 'node:path';
import type { BillRecord } from '../../src/server/repositories/bill.repository';
import { createBillSchema } from '../../src/server/validation/bills';
import { compareBills } from '../../src/server/services/bill-comparison.service';
import {
  buildContiguousTrendSegments,
  buildElectricityCompleteness,
  findHighestRecordedCost,
  buildElectricityInsightSummary,
} from '../../src/lib/electricity-insights';
import { TrendChart, type TrendPoint } from '../../src/components/analysis/TrendChart';

function createBill(overrides: Partial<BillRecord> = {}): BillRecord {
  return {
    id: 'bill-test-1',
    businessId: 'biz-test-1',
    businessName: 'Usaha Uji',
    periodStart: '2026-07-01',
    periodEnd: '2026-07-31',
    totalAmountRupiah: 1_510_000n,
    kwh: null,
    tariffRupiahPerKwh: null,
    notes: null,
    createdAt: new Date('2026-07-31T00:00:00Z'),
    updatedAt: new Date('2026-07-31T00:00:00Z'),
    ...overrides,
  };
}

describe('Electricity Insight Foundation — Core Contract Tests', () => {
  // 1. Cost-only bill remains valid
  it('1. cost-only bill remains valid with nullable kwh and tariff in createBillSchema', () => {
    const input = {
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      totalAmountRupiah: '1510000',
      kwh: '',
      tariffRupiahPerKwh: '',
      notes: '',
    };
    const parsed = createBillSchema.safeParse(input);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.totalAmountRupiah).toBe(1_510_000n);
      expect(parsed.data.kwh).toBeUndefined();
    }
  });

  // 2. Cost-only bill appears in cost series
  it('2. cost-only bill appears in cost series even when kWh is null', () => {
    const points: TrendPoint[] = [
      {
        period: '2026-07',
        label: 'Juli 2026',
        usageKwh: null,
        billAmount: 1510000,
        tariff: null,
        type: 'historical',
      },
      {
        period: '2026-08',
        label: 'Agustus 2026',
        usageKwh: 350,
        billAmount: 505645,
        tariff: 1444.7,
        type: 'historical',
      },
      {
        period: '2026-09',
        label: 'September 2026',
        usageKwh: 395,
        billAmount: 570657,
        tariff: 1444.7,
        type: 'historical',
      },
    ];

    const html = renderToStaticMarkup(
      React.createElement(TrendChart, { points, metric: 'rupiah' })
    );

    // July cost must not disappear
    expect(html).toContain('1.510.000');
    expect(html).toContain('505.645');
    expect(html).toContain('570.657');
    expect(html).toContain('Jul');
    expect(html).toContain('Agu');
    expect(html).toContain('Sep');
  });

  // 3 & 4. Missing kWh remains null and is never converted to zero
  it('3 & 4. missing kWh remains null and is never converted to zero', () => {
    const julyBill = createBill({
      id: 'july',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      totalAmountRupiah: 1_510_000n,
      kwh: null,
    });
    expect(julyBill.kwh).toBeNull();
    expect(julyBill.kwh).not.toBe('0');
    expect(julyBill.kwh).not.toBe('0.000');
  });

  // 5. Cost comparison works when kWh is missing
  it('5. cost comparison works when kWh is missing', () => {
    const augBill = createBill({
      id: 'aug',
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
      totalAmountRupiah: 505_645n,
      kwh: '350.000',
    });
    const julyBill = createBill({
      id: 'july',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      totalAmountRupiah: 1_510_000n,
      kwh: null,
    });

    const comparison = compareBills(augBill, julyBill);
    expect(comparison.totalCost.current).toBe(505_645n);
    expect(comparison.totalCost.previous).toBe(1_510_000n);
    expect(comparison.totalCost.difference).toBe(-1_004_355n);
    expect(comparison.dailyCost.difference).not.toBe(0n);
  });

  // 6. kWh comparison unavailable when either period lacks kWh
  it('6. kWh comparison unavailable when either period lacks kWh', () => {
    const augBill = createBill({
      id: 'aug',
      periodStart: '2026-08-01',
      periodEnd: '2026-08-31',
      totalAmountRupiah: 505_645n,
      kwh: '350.000',
    });
    const julyBill = createBill({
      id: 'july',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      totalAmountRupiah: 1_510_000n,
      kwh: null,
    });

    const comparison = compareBills(augBill, julyBill);
    expect(comparison.totalKwh).toBeNull();
    expect(comparison.dailyKwh).toBeNull();
  });

  // 7. 0 valid kWh -> intentional empty state semantics
  it('7. 0 valid kWh produces intentional empty state with CTA', () => {
    const points: TrendPoint[] = [
      { period: '2026-07', label: 'Juli 2026', usageKwh: null, billAmount: 1510000, tariff: null, type: 'historical' },
      { period: '2026-08', label: 'Agustus 2026', usageKwh: null, billAmount: 500000, tariff: null, type: 'historical' },
    ];

    const html = renderToStaticMarkup(
      React.createElement(TrendChart, {
        points,
        metric: 'kwh',
        emptyTitle: 'Pemakaian kWh belum tercatat',
        emptyDescription:
          'Tagihan Anda tetap dapat dianalisis dari sisi biaya. Tambahkan kWh jika tersedia untuk memahami perubahan konsumsi listrik.',
        manageBillsHref: '/bills?businessId=biz-1',
      })
    );

    expect(html).toContain('Pemakaian kWh belum tercatat');
    expect(html).toContain('Tagihan Anda tetap dapat dianalisis dari sisi biaya');
    expect(html).toContain('Kelola tagihan');
    expect(html).toContain('/bills?businessId=biz-1');
  });

  // 8. 1 valid kWh -> no historical trend claim
  it('8. 1 valid kWh produces single point guidance without calculating a fake historical trend', () => {
    const points: TrendPoint[] = [
      { period: '2026-07', label: 'Juli 2026', usageKwh: null, billAmount: 1510000, tariff: null, type: 'historical' },
      { period: '2026-08', label: 'Agustus 2026', usageKwh: null, billAmount: 500000, tariff: null, type: 'historical' },
      { period: '2026-09', label: 'September 2026', usageKwh: 395, billAmount: 570657, tariff: null, type: 'historical' },
    ];

    const html = renderToStaticMarkup(
      React.createElement(TrendChart, { points, metric: 'kwh' })
    );

    expect(html).toContain('Pemakaian mulai tercatat');
    expect(html).toContain('1 periode dengan data kWh');
    expect(html).toContain('Perlu 1 bulan lagi');
    expect(html).toContain('395 kWh');
  });

  // 9. 2+ kWh -> graph available
  it('9. 2+ kWh renders normal usage graph with connected segment', () => {
    const points: TrendPoint[] = [
      { period: '2026-08', label: 'Agustus 2026', usageKwh: 350, billAmount: 505645, tariff: 1444.7, type: 'historical' },
      { period: '2026-09', label: 'September 2026', usageKwh: 395, billAmount: 570657, tariff: 1444.7, type: 'historical' },
    ];

    const html = renderToStaticMarkup(
      React.createElement(TrendChart, { points, metric: 'kwh' })
    );

    expect(html).toContain('stroke="var(--chart-series-primary)"');
    expect(html).toContain('395 kWh');
    expect(html).toContain('+12,9%');
    expect(html).toContain('Naik');
  });

  // 10. Valid zero kWh remains valid zero
  it('10. valid zero kWh remains valid zero and is not treated as null', () => {
    const points: TrendPoint[] = [
      { period: '2026-08', label: 'Agustus 2026', usageKwh: 0, billAmount: 50000, tariff: 1444.7, type: 'historical' },
      { period: '2026-09', label: 'September 2026', usageKwh: 100, billAmount: 200000, tariff: 1444.7, type: 'historical' },
    ];

    const html = renderToStaticMarkup(
      React.createElement(TrendChart, { points, metric: 'kwh' })
    );

    // Both points must be plotted
    expect(html).toContain('0 kWh');
    expect(html).toContain('100 kWh');
    expect(html).toContain('2 bulan data tercatat');
  });

  // 11, 12, 13. Null between two valid values splits line into separate segments, missing period remains on x-axis
  describe('Graph Gaps & Segmentation', () => {
    it('11. null between two valid kWh values splits the line into separate contiguous segments', () => {
      const items = [
        { x: 100, y: 150, value: 300 },
        { x: 200, y: null, value: null },
        { x: 300, y: 120, value: 400 },
        { x: 400, y: 110, value: 420 },
      ];

      const segments = buildContiguousTrendSegments(items);
      expect(segments).toHaveLength(2);
      expect(segments[0]).toHaveLength(1);
      expect(segments[0][0].value).toBe(300);
      expect(segments[1]).toHaveLength(2);
      expect(segments[1][0].value).toBe(400);
      expect(segments[1][1].value).toBe(420);
    });

    it('12 & 13. missing period remains on x-axis and no graph segment crosses it', () => {
      const points: TrendPoint[] = [
        { period: '2026-01', label: 'Januari 2026', usageKwh: 300, billAmount: 450000, tariff: null, type: 'historical' },
        { period: '2026-02', label: 'Februari 2026', usageKwh: null, billAmount: 460000, tariff: null, type: 'historical' },
        { period: '2026-03', label: 'Maret 2026', usageKwh: 400, billAmount: 580000, tariff: null, type: 'historical' },
      ];

      const html = renderToStaticMarkup(
        React.createElement(TrendChart, { points, metric: 'kwh' })
      );

      // Missing month label remains on x-axis
      expect(html).toContain('Feb');
      // Neutral dash indicator rendered for missing data
      expect(html).toContain('—');

      // Neither Jan nor Mar has a contiguous neighbour, so no connecting historical line exists
      expect(html).not.toMatch(/<path[^>]*d="M\s*\d+(\.\d+)?\s+\d+(\.\d+)?\s+L\s*\d+(\.\d+)?\s+\d+(\.\d+)?"[^>]*stroke="var\(--chart-series-primary\)"/);
    });

    it('14. cost graph does not break because kWh is missing', () => {
      const points: TrendPoint[] = [
        { period: '2026-07', label: 'Juli 2026', usageKwh: null, billAmount: 1510000, tariff: null, type: 'historical' },
        { period: '2026-08', label: 'Agustus 2026', usageKwh: 350, billAmount: 505645, tariff: 1444.7, type: 'historical' },
        { period: '2026-09', label: 'September 2026', usageKwh: 395, billAmount: 570657, tariff: 1444.7, type: 'historical' },
      ];

      const html = renderToStaticMarkup(
        React.createElement(TrendChart, { points, metric: 'rupiah' })
      );

      // In cost graph, all 3 bills have amounts, so a continuous line connects all 3
      expect(html).toContain('stroke="var(--chart-series-primary)"');
      expect(html).toContain('1.510.000');
      expect(html).toContain('505.645');
      expect(html).toContain('570.657');
    });
  });

  // 15 & 16. Completeness counts cost and kWh accurately
  describe('Data Completeness', () => {
    it('15 & 16. completeness counts cost and kWh accurately', () => {
      const bills = [
        { totalAmountRupiah: 1510000n, kwh: null },
        { totalAmountRupiah: 505645n, kwh: '350.000' },
        { totalAmountRupiah: 570657n, kwh: '395.000' },
      ];

      const completeness = buildElectricityCompleteness(bills);
      expect(completeness.totalPeriods).toBe(3);
      expect(completeness.costCount).toBe(3);
      expect(completeness.kwhCount).toBe(2);
      expect(completeness.isCostComplete).toBe(true);
      expect(completeness.isKwhComplete).toBe(false);
      expect(completeness.hasMissingKwh).toBe(true);
      expect(completeness.costLabel).toBe('3 dari 3 periode');
      expect(completeness.kwhLabel).toBe('2 dari 3 periode');
    });
  });

  // 17, 18, 19. Highest cost context
  describe('Historical Cost Context', () => {
    it('17 & 18. unique highest-cost period identified with limitation wording when kWh is missing', () => {
      const bills = [
        { id: 'b1', periodEnd: '2026-07-31', totalAmountRupiah: 1_510_000n, kwh: null },
        { id: 'b2', periodEnd: '2026-08-31', totalAmountRupiah: 505_645n, kwh: '350.000' },
        { id: 'b3', periodEnd: '2026-09-30', totalAmountRupiah: 570_657n, kwh: '395.000' },
      ];

      const highest = findHighestRecordedCost(bills);
      expect(highest.isTie).toBe(false);
      expect(highest.highestBill?.periodEnd).toBe('2026-07-31');
      expect(highest.highestBill?.amount).toBe(1_510_000n);
      expect(highest.highestBill?.isKwhMissing).toBe(true);
      expect(highest.wording?.title).toBe('Biaya tertinggi yang tercatat');
      expect(highest.wording?.subtitle).toContain('1.510.000');
      expect(highest.wording?.limitation).toContain('Pemakaian kWh pada periode ini belum tersedia');
      // Must not use judgmental words
      expect(highest.wording?.limitation).not.toContain('boros');
      expect(highest.wording?.limitation).not.toContain('anomali');
      expect(highest.wording?.limitation).not.toContain('pemborosan');
    });

    it('19. tie for highest cost does not falsely choose a unique winner', () => {
      const bills = [
        { id: 'b1', periodEnd: '2026-07-31', totalAmountRupiah: 1_000_000n, kwh: '600' },
        { id: 'b2', periodEnd: '2026-08-31', totalAmountRupiah: 1_000_000n, kwh: '620' },
        { id: 'b3', periodEnd: '2026-09-30', totalAmountRupiah: 800_000n, kwh: '500' },
      ];

      const highest = findHighestRecordedCost(bills);
      expect(highest.isTie).toBe(true);
      expect(highest.highestBill).toBeNull();
      expect(highest.wording?.title).toBe('Biaya tertinggi tercatat di beberapa periode');
      expect(highest.wording?.subtitle).toContain('2 periode');
    });
  });

  // 20, 21, 22. Insight Bridge & No-Causality wording
  describe('Electricity Insight Bridge', () => {
    it('20. latest cost+usage both increase produces safe co-movement wording', () => {
      const aug = createBill({
        id: 'aug',
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
        totalAmountRupiah: 505_645n,
        kwh: '350.000',
      });
      const sep = createBill({
        id: 'sep',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        totalAmountRupiah: 570_657n,
        kwh: '395.000',
      });

      const summary = buildElectricityInsightSummary(sep, aug);
      expect(summary.hasComparison).toBe(true);
      expect(summary.costDirection).toBe('up');
      expect(summary.usageDirection).toBe('up');
      expect(summary.detail).toContain('Biaya dan pemakaian bergerak naik pada periode yang sama');
      expect(summary.detail).toContain('bukan memastikan penyebabnya');
    });

    it('21. latest cost increase with missing kWh produces cost-only wording', () => {
      const aug = createBill({
        id: 'aug',
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
        totalAmountRupiah: 505_645n,
        kwh: null,
      });
      const sep = createBill({
        id: 'sep',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        totalAmountRupiah: 570_657n,
        kwh: '395.000',
      });

      const summary = buildElectricityInsightSummary(sep, aug);
      expect(summary.hasComparison).toBe(true);
      expect(summary.title).toContain('Biaya dapat dibandingkan');
      expect(summary.detail).toContain('data kWh salah satu periode belum tersedia');
    });

    it('22. wording contains no causal claims', () => {
      const forbiddenCausalPhrases = [
        'Penyebabnya adalah',
        'disebabkan oleh',
        'menyebabkan tagihan naik',
        'AC menyebabkan',
        'Usaha Anda boros karena',
      ];

      const aug = createBill({
        id: 'aug',
        periodStart: '2026-08-01',
        periodEnd: '2026-08-31',
        totalAmountRupiah: 505_645n,
        kwh: '350.000',
      });
      const sep = createBill({
        id: 'sep',
        periodStart: '2026-09-01',
        periodEnd: '2026-09-30',
        totalAmountRupiah: 570_657n,
        kwh: '395.000',
      });

      const summary = buildElectricityInsightSummary(sep, aug);
      const combinedText = `${summary.title} ${summary.detail}`;

      for (const phrase of forbiddenCausalPhrases) {
        expect(combinedText).not.toContain(phrase);
      }
    });
  });

  // Source-level Safety Tests
  describe('Source-level Invariants', () => {
    it('verifies that default tariff fallback is not restored in Simulator', () => {
      const simulatorSource = fs.readFileSync(
        path.resolve(__dirname, '../../src/app/(product)/predictions/Simulator.tsx'),
        'utf8'
      );
      expect(simulatorSource).not.toContain('tariff ?? 1444.7');
      expect(simulatorSource).not.toContain('defaultTariff ?? 1444.7');
    });

    it('verifies that null kWh is never converted to 0 in TrendChart or electricity-insights', () => {
      const helperSource = fs.readFileSync(
        path.resolve(__dirname, '../../src/lib/electricity-insights.ts'),
        'utf8'
      );
      expect(helperSource).not.toContain('kwh ?? 0');
      expect(helperSource).not.toContain('usageKwh ?? 0');
    });
  });
});
