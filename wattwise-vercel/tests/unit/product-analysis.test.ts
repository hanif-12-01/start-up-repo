import { describe, expect, it } from 'vitest';
import { analyzeLatestAnomaly, calculateEfficiencyScore, predictUsage, type UsageSample } from '@/server/services/product-analysis';

const sample = (period: string, usageKwh: number, tariff = 1500): UsageSample => ({ period, usageKwh, tariff, billAmount: usageKwh * tariff });

describe('deterministic product analysis', () => {
  it('returns no prediction for zero usable months', () => {
    expect(predictUsage([], 1500).hasPrediction).toBe(false);
  });

  it('uses carry-forward baseline for one month', () => {
    const result = predictUsage([sample('2026-01', 100)], 1500);
    expect(result.predictedUsageKwh).toBe(100);
    expect(result.confidence).toBe('Rendah');
  });

  it('uses the exact two-point trend for two months', () => {
    const result = predictUsage([sample('2026-01', 100), sample('2026-02', 120)], 1500);
    expect(result.predictedUsageKwh).toBe(140);
    expect(result.risk).toBe('HIGH');
  });

  it('is deterministic for 3+ months and reports gaps/volatility', () => {
    const history = [sample('2026-01', 100), sample('2026-03', 140), sample('2026-04', 110), sample('2026-05', 160)];
    const first = predictUsage(history, 1500);
    expect(predictUsage(history, 1500)).toEqual(first);
    expect(first.hasGaps).toBe(true);
    expect(first.gapMonths).toBe(1);
  });

  it('uses 10% and 20% anomaly thresholds', () => {
    expect(analyzeLatestAnomaly([sample('2026-01', 100), sample('2026-02', 110)]).status).toBe('Perlu Dicek');
    expect(analyzeLatestAnomaly([sample('2026-01', 100), sample('2026-02', 120)]).status).toBe('Boros');
  });

  it('applies efficiency penalties and clamps the score', () => {
    expect(calculateEfficiencyScore({ bill: 250, revenue: 1000, hasTariff: false, applianceShares: [] })).toEqual({ score: 55, label: 'Perlu Dicek', confidence: 'Sedang' });
  });
});
