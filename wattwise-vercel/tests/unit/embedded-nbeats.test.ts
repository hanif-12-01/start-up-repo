import { describe, expect, it } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { EMBEDDED_NBEATS_MODEL } from '@/lib/ai/embedded-model-manifest';
import { deriveDisplayedPrediction } from '@/lib/ai/prediction-display';
import {
  buildContinuousHistory,
  reportingPhaseForMonths,
  requestedEngineForPhase,
} from '@/server/services/phase-aware-forecast.service';
import type { UsageSample, PredictionResult } from '@/server/services/product-analysis';

const sample = (period: string, usageKwh: number): UsageSample => ({
  period,
  usageKwh,
  tariff: 1_500,
  billAmount: usageKwh * 1_500,
});

const origin = new Date('2027-12-15T00:00:00.000Z');

function months(count: number, start = 1): UsageSample[] {
  return Array.from({ length: count }, (_, index) => {
    const ordinal = 2026 * 12 + start - 1 + index;
    const year = Math.floor(ordinal / 12);
    const month = (ordinal % 12) + 1;
    return sample(`${year}-${String(month).padStart(2, '0')}`, 100 + index * 10);
  });
}

describe('EMBEDDED N-BEATS MODEL MANIFEST & SHIPPED ARTIFACT', () => {
  it('pins the exact N-BEATS ONNX model authority metadata', () => {
    expect(EMBEDDED_NBEATS_MODEL.modelVersion).toBe('nbeats-ai02-1.0.0');
    expect(EMBEDDED_NBEATS_MODEL.executionEngine).toBe('nbeats');
    expect(EMBEDDED_NBEATS_MODEL.runtime).toBe('browser_onnx_wasm');
    expect(EMBEDDED_NBEATS_MODEL.publicUrl).toBe('/models/nbeats-ai02-1.0.0.onnx');
    expect(EMBEDDED_NBEATS_MODEL.inputName).toBe('history_6m');
    expect(EMBEDDED_NBEATS_MODEL.inputShape).toEqual([1, 6]);
    expect(EMBEDDED_NBEATS_MODEL.inputDtype).toBe('float32');
    expect(EMBEDDED_NBEATS_MODEL.outputName).toBe('prediction_kwh');
    expect(EMBEDDED_NBEATS_MODEL.historyLength).toBe(6);
  });

  it('proves that the shipped public ONNX model matches the pinned SHA-256', () => {
    const publicModelPath = join(process.cwd(), 'public', 'models', 'nbeats-ai02-1.0.0.onnx');
    expect(existsSync(publicModelPath)).toBe(true);

    const modelBytes = readFileSync(publicModelPath);
    const hash = createHash('sha256').update(modelBytes).digest('hex');
    expect(hash).toBe(EMBEDDED_NBEATS_MODEL.sha256);
    expect(hash).toBe('33eef1bca1008eb06bd687772c994371b00d443d763a35de51d60e760fe21988');
    expect(modelBytes.byteLength).toBe(20643);
  });
});

describe('DERIVE DISPLAYED PREDICTION (SHARED CALCULATION)', () => {
  const dummyDeterministic: PredictionResult = {
    hasPrediction: true,
    predictedUsageKwh: 200,
    estimatedBill: 300_000,
    previousUsageKwh: 180,
    changePercent: 11.1,
    risk: 'MEDIUM',
    confidence: 'Sedang',
    method: 'Baseline pemakaian terakhir',
    historyMonths: 6,
    hasGaps: false,
    gapMonths: 0,
    highVolatility: false,
  };

  it('transforms scalar prediction into complete PredictionResult', () => {
    const result = deriveDisplayedPrediction(dummyDeterministic, 225.456, 1500, 6, 'nbeats');
    expect(result.hasPrediction).toBe(true);
    expect(result.predictedUsageKwh).toBe(225.46);
    expect(result.estimatedBill).toBe(338190);
    expect(result.previousUsageKwh).toBe(180);
    // (225.46 - 180) / 180 * 100 = 25.255% -> 25.3%
    expect(result.changePercent).toBe(25.3);
    expect(result.risk).toBe('HIGH');
    expect(result.confidence).toBe('Sedang');
    expect(result.method).toBe('Prediksi WattWise berbasis N-BEATS');
    expect(result.historyMonths).toBe(6);
  });

  it('assigns confidence Tinggi for long history (13+ months)', () => {
    const result = deriveDisplayedPrediction(dummyDeterministic, 225.456, 1500, 14, 'nbeats');
    expect(result.confidence).toBe('Tinggi');
  });

  it('assigns LOW risk when change is below 5%', () => {
    const result = deriveDisplayedPrediction(dummyDeterministic, 182.0, 1500, 6, 'nbeats');
    // (182 - 180) / 180 * 100 = 1.1%
    expect(result.risk).toBe('LOW');
  });

  it('handles null tariff gracefully', () => {
    const result = deriveDisplayedPrediction(dummyDeterministic, 200, null, 6, 'nbeats');
    expect(result.estimatedBill).toBeNull();
  });
});

describe('MVP ROUTING & CONTINUOUS HISTORY CASES', () => {
  it.each([
    [0, 'H00', 'deterministic_baseline'],
    [1, 'H01_02', 'deterministic_baseline'],
    [2, 'H01_02', 'deterministic_baseline'],
    [3, 'H03_05', 'deterministic_baseline'],
    [4, 'H03_05', 'deterministic_baseline'],
    [5, 'H03_05', 'deterministic_baseline'],
    [6, 'H06_12', 'nbeats'],
    [12, 'H06_12', 'nbeats'],
    [13, 'H13_PLUS', 'nbeats'],
    [24, 'H13_PLUS', 'nbeats'],
  ] as const)('for %i months routes to phase %s with engine %s', (monthsCount, expectedPhase, expectedEngine) => {
    const phase = reportingPhaseForMonths(monthsCount);
    expect(phase).toBe(expectedPhase);
    expect(requestedEngineForPhase(phase)).toBe(expectedEngine);
  });

  it('exactly 6 continuous months selects last 6 for N-BEATS', () => {
    const samples = months(6);
    const history = buildContinuousHistory(samples, origin);
    expect(history.continuousHistoryMonths).toBe(6);
    expect(history.reportingPhase).toBe('H06_12');
    expect(requestedEngineForPhase(history.reportingPhase)).toBe('nbeats');
    expect(history.history.slice(-6).map((h) => h.usage_kwh)).toHaveLength(6);
  });

  it('7 continuous months selects the last 6 chronological months', () => {
    const samples = months(7);
    const history = buildContinuousHistory(samples, origin);
    expect(history.continuousHistoryMonths).toBe(7);
    const history6m = history.history.slice(-6).map((h) => h.usage_kwh);
    expect(history6m).toHaveLength(6);
    expect(history6m).toEqual([110, 120, 130, 140, 150, 160]);
  });

  it('20 continuous months selects the last 6 chronological months', () => {
    const samples = months(20);
    const history = buildContinuousHistory(samples, origin);
    expect(history.continuousHistoryMonths).toBe(20);
    expect(history.reportingPhase).toBe('H13_PLUS');
    const history6m = history.history.slice(-6).map((h) => h.usage_kwh);
    expect(history6m).toHaveLength(6);
    expect(history6m[5]).toBe(290);
  });

  it('gapped history: account has 12 historical bills but latest continuous run is 4 months -> H03_05 deterministic', () => {
    // 8 months in 2025, gap, then 4 months in 2026
    const oldRun = [
      sample('2025-01', 100),
      sample('2025-02', 105),
      sample('2025-03', 110),
      sample('2025-04', 115),
      sample('2025-05', 120),
      sample('2025-06', 125),
      sample('2025-07', 130),
      sample('2025-08', 135),
    ];
    const newRun = [
      sample('2026-06', 200),
      sample('2026-07', 210),
      sample('2026-08', 220),
      sample('2026-09', 230),
    ];
    const history = buildContinuousHistory([...oldRun, ...newRun], origin);
    expect(history.continuousHistoryMonths).toBe(4);
    expect(history.reportingPhase).toBe('H03_05');
    expect(requestedEngineForPhase(history.reportingPhase)).toBe('deterministic_baseline');
    expect(history.history.map((h) => h.period_month)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09']);
  });

  it('gap before latest 6-month continuous run still qualifies as H06_12 N-BEATS', () => {
    const oldRun = [sample('2025-01', 100), sample('2025-02', 105)];
    const latest6 = months(6, 4); // 2026-04 through 2026-09
    const history = buildContinuousHistory([...oldRun, ...latest6], origin);
    expect(history.continuousHistoryMonths).toBe(6);
    expect(history.reportingPhase).toBe('H06_12');
    expect(requestedEngineForPhase(history.reportingPhase)).toBe('nbeats');
    expect(history.history.map((h) => h.period_month)).toEqual([
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
      '2026-09',
    ]);
  });
});
