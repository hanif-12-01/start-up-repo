import { describe, expect, it } from 'vitest';
import { buildForecastExplanation } from '@/lib/forecast-explanation';

const basePrediction = {
  hasPrediction: true,
  predictedUsageKwh: 180,
  estimatedBill: 270000,
  previousUsageKwh: 150,
  changePercent: 20,
  method: 'Prediksi WattWise berbasis N-BEATS',
  hasGaps: false,
  gapMonths: 0,
  highVolatility: false,
};

describe('buildForecastExplanation', () => {
  it('rejects nonfinite tariffs and invalid costs but preserves zero cost', () => {
    const input = { targetPeriod: '2026-05', continuousHistoryMonths: 6, diagnosticsAvailable: false, tariff: Infinity, prediction: basePrediction };
    expect(buildForecastExplanation(input).estimatedCost).toBeNull();
    expect(buildForecastExplanation({ ...input, tariff: NaN }).estimatedCost).toBeNull();
    expect(buildForecastExplanation({ ...input, tariff: 1500, prediction: { ...basePrediction, estimatedBill: -1 } }).estimatedCost).toBeNull();
    expect(buildForecastExplanation({ ...input, tariff: 1500, prediction: { ...basePrediction, estimatedBill: 0 } }).estimatedCost).toBe(0);
  });
  it('states the exact backend method, target period and estimated cost when tariff is valid', () => {
    const result = buildForecastExplanation({
      targetPeriod: '2026-05',
      continuousHistoryMonths: 6,
      diagnosticsAvailable: true,
      tariff: 1500,
      prediction: basePrediction,
    });

    expect(result.targetPeriodLabel).toBe('Mei 2026');
    expect(result.facts.join(' ')).toContain('Prediksi WattWise berbasis N-BEATS');
    expect(result.facts.join(' ')).toContain('Histori valid berurutan: 6 bulan');
    expect(result.estimatedCost).toBe(270000);
    expect(result.direction).toBe('naik');
    expect(result.nextStep).toBe('DIAGNOSTICS');
    expect(result.nextStepNote).toContain('bukan sebagai kesimpulan penyebab');
  });

  it('hides estimated cost without a valid tariff and never claims a zero tariff is usable', () => {
    const result = buildForecastExplanation({
      targetPeriod: '2026-05',
      continuousHistoryMonths: 3,
      diagnosticsAvailable: true,
      tariff: 0,
      prediction: basePrediction,
    });

    expect(result.estimatedCost).toBeNull();
    expect(result.observations.join(' ')).toContain('Tarif belum tersedia');
    expect(result.limits.join(' ')).toContain('Bukan jaminan');

    const missing = buildForecastExplanation({
      targetPeriod: '2026-05',
      continuousHistoryMonths: 3,
      diagnosticsAvailable: true,
      tariff: null,
      prediction: basePrediction,
    });
    expect(missing.estimatedCost).toBeNull();
  });

  it('falls back to recommendations when the diagnostics capability is unavailable', () => {
    const result = buildForecastExplanation({
      targetPeriod: '2026-05',
      continuousHistoryMonths: 6,
      diagnosticsAvailable: false,
      tariff: 1500,
      prediction: basePrediction,
    });

    expect(result.nextStep).toBe('RECOMMENDATIONS');
    expect(result.nextStepNote).toContain('Cek Kenaikan tidak aktif');
  });

  it('handles missing comparison and gaps truthfully', () => {
    const result = buildForecastExplanation({
      targetPeriod: '2026-05',
      continuousHistoryMonths: 2,
      diagnosticsAvailable: true,
      tariff: 1500,
      prediction: {
        ...basePrediction,
        previousUsageKwh: null,
        changePercent: null,
        hasGaps: true,
        gapMonths: 2,
      },
    });

    expect(result.direction).toBeNull();
    expect(result.observations.join(' ')).toContain('Belum ada periode pembanding');
    expect(result.facts.join(' ')).toContain('2 bulan tanpa data');
    expect(result.nextStep).toBe('RECOMMENDATIONS');
  });

  it('never claims historyMonths is the model input window', () => {
    const result = buildForecastExplanation({
      targetPeriod: '2026-05',
      continuousHistoryMonths: 4,
      diagnosticsAvailable: true,
      tariff: 1500,
      prediction: { ...basePrediction, hasGaps: true, gapMonths: 1 },
    });

    const text = [...result.facts, ...result.observations, ...result.limits].join(' ');
    expect(text).not.toMatch(/periode data/i);
    expect(text).not.toMatch(/model memakai/i);
    expect(result.facts.join(' ')).toContain('Histori valid berurutan: 4 bulan');
  });

  it('explains observations are comparisons, not causal attribution', () => {
    const result = buildForecastExplanation({
      targetPeriod: '2026-05',
      continuousHistoryMonths: 6,
      diagnosticsAvailable: true,
      tariff: 1500,
      prediction: basePrediction,
    });
    expect(result.observations.join(' ')).toContain('bukan penjelasan atas penyebab');
  });
});
