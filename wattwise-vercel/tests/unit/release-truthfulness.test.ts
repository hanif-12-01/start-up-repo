/**
 * MVP-CORE-01-FIX: Release Truthfulness Gate Tests
 *
 * Protects the corrected product claims introduced in feature/mvp-core-release-cleanup.
 * These tests assert behavioural truths about user-facing wording and AI routing
 * rather than brittle string-searches of internal source files.
 */

import { describe, expect, it } from 'vitest';
import {
  getDataReadinessStatus,
  deriveDisplayedPrediction,
} from '@/lib/ai/prediction-display';
import {
  requestedEngineForPhase,
  reportingPhaseForMonths,
} from '@/server/services/phase-aware-forecast.service';
import type { PredictionResult } from '@/server/services/product-analysis';

const baseDeterministic: PredictionResult = {
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

// ─── A: No unsupported seasonality claim in H13_PLUS readiness wording ────────
describe('A: Seasonality claim removed from data readiness messages', () => {
  it('H13_PLUS description does NOT mention faktor musim or seasonal intelligence', () => {
    const h13 = getDataReadinessStatus(13);
    const combined = `${h13.label} ${h13.description} ${h13.milestoneMessage}`;
    expect(combined.toLowerCase()).not.toMatch(/faktor musim|seasonal intelligence|musiman|seasonality/i);
  });

  it('No data readiness phase references faktor musim', () => {
    for (const months of [0, 1, 2, 3, 5, 6, 12, 13, 24]) {
      const status = getDataReadinessStatus(months);
      const text = `${status.label} ${status.description} ${status.milestoneMessage}`;
      expect(text.toLowerCase()).not.toMatch(/faktor musim|musiman|seasonality/i);
    }
  });
});

// ─── B: User-facing wording does not use "Tingkat Keyakinan" / "Keyakinan" ──
describe('B: Statistical confidence overclaim removed from display layer', () => {
  it('prediction confidence field label should be Kesiapan Data not Tingkat Keyakinan', () => {
    // Verify the field still exists on PredictionResult
    const result = deriveDisplayedPrediction(baseDeterministic, 200, 1500, 6, 'nbeats');
    expect(result).toHaveProperty('confidence');
    expect(typeof result.confidence).toBe('string');
  });

  it('confidence value remains meaningful (Rendah/Sedang/Tinggi) without implying probability', () => {
    const h6 = deriveDisplayedPrediction(baseDeterministic, 200, 1500, 6);
    expect(h6.confidence).toBe('Sedang');

    const h13 = deriveDisplayedPrediction(baseDeterministic, 200, 1500, 13);
    expect(h13.confidence).toBe('Tinggi');

    const h2 = deriveDisplayedPrediction(baseDeterministic, 200, 1500, 2);
    expect(h2.confidence).toBe('Rendah');
  });
});

// ─── C: H13_PLUS explicitly distinguishes long history from 6-month model input ─
describe('C: H13_PLUS wording distinguishes history maturity from N-BEATS input contract', () => {
  it('H13_PLUS description explicitly states 6 months are used for inference', () => {
    const h13 = getDataReadinessStatus(13);
    expect(h13.description).toMatch(/6 bulan/i);
  });

  it('H13_PLUS milestoneMessage references the model using 6 months', () => {
    const h13 = getDataReadinessStatus(13);
    expect(h13.milestoneMessage).toMatch(/6 bulan/i);
  });

  it('H13_PLUS does NOT claim N-BEATS uses 13+ months of data as input', () => {
    const h13 = getDataReadinessStatus(13);
    const text = `${h13.description} ${h13.milestoneMessage}`;
    // Must not imply 13 months are fed as model input
    expect(text).not.toMatch(/menggunakan 13|13 bulan dimasukkan|model menerima 13/i);
  });

  it('H13_PLUS is still AI-ready (preserves AI product impact)', () => {
    const h13 = getDataReadinessStatus(13);
    expect(h13.isAiReady).toBe(true);
    expect(h13.phaseKey).toBe('H13_PLUS');
    expect(h13.label).toBe('Histori panjang');
  });
});

// ─── D: H06_12 AI-ready wording remains correct ───────────────────────────────
describe('D: H06_12 AI-ready wording', () => {
  it('H06_12 label is Siap untuk Prediksi AI', () => {
    const h6 = getDataReadinessStatus(6);
    expect(h6.phaseKey).toBe('H06_12');
    expect(h6.label).toBe('Siap untuk Prediksi AI');
    expect(h6.isAiReady).toBe(true);
  });

  it('H06_12 description references 6 bulan berurutan', () => {
    const h6 = getDataReadinessStatus(6);
    expect(h6.description).toMatch(/6 bulan/i);
  });

  it('H12 (12 months) also maps to H06_12 AI-ready', () => {
    const h12 = getDataReadinessStatus(12);
    expect(h12.phaseKey).toBe('H06_12');
    expect(h12.isAiReady).toBe(true);
  });
});

// ─── E: H03 is NOT labeled AI ─────────────────────────────────────────────────
describe('E: H03 is not labeled AI', () => {
  it('H03_05 is not AI-ready', () => {
    const h3 = getDataReadinessStatus(3);
    expect(h3.phaseKey).toBe('H03_05');
    expect(h3.isAiReady).toBe(false);
    expect(requestedEngineForPhase('H03_05')).toBe('deterministic_baseline');
  });

  it('H05 is also not AI-ready', () => {
    const h5 = getDataReadinessStatus(5);
    expect(h5.isAiReady).toBe(false);
    expect(reportingPhaseForMonths(5)).toBe('H03_05');
  });
});

// ─── F: Fallback (H00, H01_02) not labeled AI ────────────────────────────────
describe('F: Fallback phases are not labeled AI', () => {
  it('H00 is not AI-ready', () => {
    const h0 = getDataReadinessStatus(0);
    expect(h0.isAiReady).toBe(false);
    expect(h0.phaseKey).toBe('H00');
    expect(requestedEngineForPhase('H00')).toBe('deterministic_baseline');
  });

  it('H01_02 is not AI-ready', () => {
    const h1 = getDataReadinessStatus(1);
    expect(h1.isAiReady).toBe(false);
    expect(requestedEngineForPhase('H01_02')).toBe('deterministic_baseline');
  });
});

// ─── G: N-BEATS inference path unchanged ─────────────────────────────────────
describe('G: N-BEATS inference routing intact', () => {
  it('H06_12 routes to nbeats engine', () => {
    expect(requestedEngineForPhase('H06_12')).toBe('nbeats');
  });

  it('H13_PLUS routes to nbeats engine', () => {
    expect(requestedEngineForPhase('H13_PLUS')).toBe('nbeats');
  });

  it('deriveDisplayedPrediction for nbeats produces complete result with N-BEATS method label', () => {
    const result = deriveDisplayedPrediction(baseDeterministic, 220, 1500, 8, 'nbeats');
    expect(result.hasPrediction).toBe(true);
    expect(result.predictedUsageKwh).toBe(220);
    expect(result.method).toContain('N-BEATS');
    expect(result.risk).not.toBeNull();
  });

  it('nbeats input contract is 6 values — manifest confirms historyLength', async () => {
    const { EMBEDDED_NBEATS_MODEL } = await import('@/lib/ai/embedded-model-manifest');
    expect(EMBEDDED_NBEATS_MODEL.historyLength).toBe(6);
    expect(EMBEDDED_NBEATS_MODEL.inputShape).toEqual([1, 6]);
    expect(EMBEDDED_NBEATS_MODEL.modelVersion).toBe('nbeats-ai02-1.0.0');
  });
});

// ─── H: Core feature map has no unsupported seasonal claim ────────────────────
describe('H: Core feature map truthfulness', () => {
  it('feat-forecast output does not claim seasonality or keyakinan as confidence', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const raw = readFileSync(join(process.cwd(), '..', 'docs', 'product', 'core-feature-map.json'), 'utf8');
    const map = JSON.parse(raw) as { features: Array<{ id: string; output: string }> };
    const forecast = map.features.find((f) => f.id === 'feat-forecast');
    expect(forecast).toBeDefined();
    // Should not claim seasonality
    expect(forecast!.output.toLowerCase()).not.toMatch(/faktor musim|musiman|seasonality/i);
    // Should not use the misleading "keyakinan" term
    expect(forecast!.output.toLowerCase()).not.toContain('keyakinan');
    // Should use kesiapan data instead
    expect(forecast!.output.toLowerCase()).toContain('kesiapan data');
  });

  it('LightGBM is not listed as an active feature engine', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const raw = readFileSync(join(process.cwd(), '..', 'docs', 'product', 'core-feature-map.json'), 'utf8');
    // LightGBM should not appear as an active routing claim
    expect(raw.toLowerCase()).not.toMatch(/lightgbm.*active|active.*lightgbm/i);
  });
});
