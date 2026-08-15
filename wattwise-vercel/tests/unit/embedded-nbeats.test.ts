import { describe, expect, it, vi } from 'vitest';
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
    [20, 'H13_PLUS', 'nbeats'],
  ] as const)('for %i months routes to phase %s with engine %s', (monthsCount, expectedPhase, expectedEngine) => {
    const phase = reportingPhaseForMonths(monthsCount);
    expect(phase).toBe(expectedPhase);
    expect(requestedEngineForPhase(phase)).toBe(expectedEngine);
  });

  it('proves LightGBM product call count is always 0 across all phases', () => {
    const phases = ['H00', 'H01_02', 'H03_05', 'H06_12', 'H13_PLUS'] as const;
    const engines = phases.map((p) => requestedEngineForPhase(p));
    expect(engines.filter((e) => e === 'lightgbm')).toHaveLength(0);
  });

  it('CASE A: 12 historical months exist, but latest continuous run = 4 months -> H03_05 deterministic', () => {
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

  it('CASE B: 10 total historical months, latest 6 are continuous with older gap -> H06_12 N-BEATS eligible', () => {
    const oldRun = [sample('2025-01', 100), sample('2025-02', 105), sample('2025-03', 110), sample('2025-04', 115)];
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

  it('CASE C: Latest continuous sequence has 5 months because month t-3 is missing -> H03_05 deterministic', () => {
    const samples = [
      sample('2026-01', 100),
      sample('2026-02', 110),
      // 2026-03 missing!
      sample('2026-04', 130),
      sample('2026-05', 140),
      sample('2026-06', 150),
      sample('2026-07', 160),
      sample('2026-08', 170),
    ];
    const history = buildContinuousHistory(samples, origin);
    expect(history.continuousHistoryMonths).toBe(5);
    expect(history.reportingPhase).toBe('H03_05');
    expect(requestedEngineForPhase(history.reportingPhase)).toBe('deterministic_baseline');
  });

  it('CASE D: Duplicate month is rejected and does not fabricate missing data', () => {
    const samples = [
      sample('2026-04', 100),
      sample('2026-05', 110),
      sample('2026-06', 120),
      sample('2026-06', 125), // Duplicate
      sample('2026-07', 130),
      sample('2026-08', 140),
    ];
    const history = buildContinuousHistory(samples, origin);
    expect(history.duplicateMonthsRejected).toEqual(['2026-06']);
    // Continuous run ends before duplicate: only 2026-07 and 2026-08 are continuous up to latest
    expect(history.history.map((h) => h.period_month)).toEqual(['2026-07', '2026-08']);
    expect(history.continuousHistoryMonths).toBe(2);
    expect(history.reportingPhase).toBe('H01_02');
  });
});

describe('SERVER-SIDE ZERO REMOTE ML INVOCATION & SERVICE URL IRRELEVANCE', () => {
  it('proves that building continuous history and forecast plan performs 0 server HTTP/fetch calls', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const oldUrl = process.env.WATTWISE_AI_SERVICE_URL;
    const oldToken = process.env.WATTWISE_AI_SERVICE_TOKEN;

    try {
      process.env.WATTWISE_AI_SERVICE_URL = 'https://invalid.example.invalid';
      process.env.WATTWISE_AI_SERVICE_TOKEN = 'unauthorized-token';

      // Test all phases: H03_05, H06_12, H13_PLUS
      for (const count of [4, 6, 14]) {
        const samples = months(count);
        const history = buildContinuousHistory(samples, origin);
        const requestedEngine = requestedEngineForPhase(history.reportingPhase);
        const history6m = history.continuousHistoryMonths >= 6
          ? history.history.slice(-6).map((h) => h.usage_kwh)
          : null;

        expect(history.continuousHistoryMonths).toBe(count);
        if (count < 6) {
          expect(requestedEngine).toBe('deterministic_baseline');
          expect(history6m).toBeNull();
        } else {
          expect(requestedEngine).toBe('nbeats');
          expect(history6m).toHaveLength(6);
        }
      }

      // Assert global fetch was called ZERO times on the server
      expect(fetchSpy).not.toHaveBeenCalled();
    } finally {
      if (oldUrl === undefined) delete process.env.WATTWISE_AI_SERVICE_URL;
      else process.env.WATTWISE_AI_SERVICE_URL = oldUrl;

      if (oldToken === undefined) delete process.env.WATTWISE_AI_SERVICE_TOKEN;
      else process.env.WATTWISE_AI_SERVICE_TOKEN = oldToken;

      fetchSpy.mockRestore();
    }
  });
});

describe('DATA READINESS BOUNDARIES & USER-FACING PRESENTATION (MVP-CORE-01)', () => {
  it('maps continuous history months to user-friendly readiness states without technical phase codes', async () => {
    const { getDataReadinessStatus } = await import('@/lib/ai/prediction-display');

    // H00 (0 months)
    const h00 = getDataReadinessStatus(0);
    expect(h00.phaseKey).toBe('H00');
    expect(h00.label).toBe('Belum ada histori konsumsi');
    expect(h00.isAiReady).toBe(false);
    expect(h00.label).not.toMatch(/H00|H01|H03|H06|H13/);

    // H01_02 (1-2 months)
    const h01 = getDataReadinessStatus(1);
    expect(h01.phaseKey).toBe('H01_02');
    expect(h01.label).toBe('Histori awal');
    expect(h01.isAiReady).toBe(false);
    expect(h01.milestoneMessage).toContain('5 bulan berurutan lagi');

    const h02 = getDataReadinessStatus(2);
    expect(h02.phaseKey).toBe('H01_02');
    expect(h02.label).toBe('Histori awal');
    expect(h02.isAiReady).toBe(false);

    // H03_05 (3-5 months)
    const h03 = getDataReadinessStatus(3);
    expect(h03.phaseKey).toBe('H03_05');
    expect(h03.label).toBe('Histori berkembang');
    expect(h03.isAiReady).toBe(false);
    expect(h03.milestoneMessage).toContain('3 bulan berurutan lagi');

    const h05 = getDataReadinessStatus(5);
    expect(h05.phaseKey).toBe('H03_05');
    expect(h05.label).toBe('Histori berkembang');
    expect(h05.isAiReady).toBe(false);
    expect(h05.milestoneMessage).toContain('1 bulan berurutan lagi');

    // H06_12 (6-12 months)
    const h06 = getDataReadinessStatus(6);
    expect(h06.phaseKey).toBe('H06_12');
    expect(h06.label).toBe('Siap untuk Prediksi AI');
    expect(h06.isAiReady).toBe(true);

    const h12 = getDataReadinessStatus(12);
    expect(h12.phaseKey).toBe('H06_12');
    expect(h12.label).toBe('Siap untuk Prediksi AI');
    expect(h12.isAiReady).toBe(true);

    // H13_PLUS (13+ months)
    const h13 = getDataReadinessStatus(13);
    expect(h13.phaseKey).toBe('H13_PLUS');
    expect(h13.label).toBe('Histori panjang');
    expect(h13.isAiReady).toBe(true);
    // H13_PLUS description must explicitly clarify that N-BEATS uses 6 months
    expect(h13.description).toMatch(/6 bulan/i);
    expect(h13.milestoneMessage).toMatch(/6 bulan/i);
  });
});

describe('PRODUCT SAFE-WORDING & CLAIM INTEGRITY', () => {
  it('confirms recommendation generators produce safe decision support wording', async () => {
    const { generateAnalysisRecommendations } = await import('@/server/services/product-analysis');

    const recs = generateAnalysisRecommendations({
      anomalyStatus: 'Boros',
      differencePercent: 25.4,
      ratioPercent: 18.2,
      predictionRisk: 'HIGH',
      hasApplianceEstimates: false,
      highestApplianceShare: 35,
    });

    for (const rec of recs) {
      const combined = `${rec.title} ${rec.reason} ${rec.limitation} ${rec.nextAction}`;
      expect(combined).not.toMatch(/pasti menghemat|jaminan|akurasi 100%|penyebab pasti|kerusakan peralatan terbukti/i);
      expect(combined).toMatch(/indikasi|estimasi|perlu|tinjau|periksa|operasional/i);
    }
  });
});
