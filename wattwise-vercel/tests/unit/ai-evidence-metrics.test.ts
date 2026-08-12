import { describe, expect, it } from 'vitest';
import {
  calculateEvidenceMetrics,
  evidenceTier,
  pairedBootstrapCi,
  segmentEvidence,
  type EvidencePair,
} from '@/server/services/ai-evidence-metrics.service';

function pair(actualKwh: number, nbeatsKwh: number, deterministicKwh: number, index = 0): EvidencePair {
  return {
    actualKwh, nbeatsKwh, deterministicKwh,
    historyPhase: index % 2 ? 'H13_PLUS' : 'H06_12',
    timingBucket: index % 3 === 0 ? 'DAY_0_1' : index % 3 === 1 ? 'DAY_2_7' : 'DAY_8_PLUS',
    actualSource: index % 2 ? 'METER_DERIVED' : 'USER_ENTERED',
    modelVersion: 'nbeats-ai02-1.0.0', artifactSha256: 'a'.repeat(64),
    featureSchemaSha256: 'b'.repeat(64), fingerprintKey: `fixture-${index}`,
  };
}

describe('AI-06 evidence metrics', () => {
  it('calculates hand-verifiable paired metrics and wins', () => {
    const result = calculateEvidenceMetrics([
      pair(100, 110, 120, 0), pair(200, 180, 190, 1), pair(300, 300, 300, 2),
    ]);
    expect(result.pairedCount).toBe(3);
    expect(result.nbeats.mae).toBe(10);
    expect(result.deterministic.mae).toBe(10);
    expect(result.nbeats.rmse).toBeCloseTo(12.909944, 5);
    expect(result.nbeats.wmape).toBe(0.05);
    expect(result.nbeats.medianAbsoluteError).toBe(10);
    expect(result.nbeats.p90AbsoluteError).toBe(20);
    expect(result.nbeats.signedBias).toBeCloseTo(-3.333333, 5);
    expect(result.nbeats.winRate).toBeCloseTo(1 / 3);
    expect(result.deterministic.winRate).toBeCloseTo(1 / 3);
    expect(result.ties).toBe(1);
    expect(result.pairedDelta.mean).toBe(0);
  });

  it('handles zero actual denominator and empty data without NaN', () => {
    const zero = calculateEvidenceMetrics([pair(0, 0, 1)]);
    expect(zero.nbeats.wmape).toBeNull();
    expect(zero.nbeats.wmapeReason).toBe('INSUFFICIENT_DENOMINATOR');
    expect(JSON.stringify(calculateEvidenceMetrics([]))).not.toMatch(/NaN|Infinity/);
    expect(calculateEvidenceMetrics([]).evidenceTier).toBe('NO_REAL_ACCURACY_EVIDENCE');
  });

  it('uses frozen evidence tiers', () => {
    expect(evidenceTier(0)).toBe('NO_REAL_ACCURACY_EVIDENCE');
    expect(evidenceTier(1)).toBe('PRELIMINARY_ONLY');
    expect(evidenceTier(29)).toBe('PRELIMINARY_ONLY');
    expect(evidenceTier(30)).toBe('EVALUABLE_BUT_NOT_PROMOTION_GRADE');
    expect(evidenceTier(99)).toBe('EVALUABLE_BUT_NOT_PROMOTION_GRADE');
    expect(evidenceTier(100)).toBe('PROMOTION_GRADE_ELIGIBLE');
  });

  it('produces deterministic paired bootstrap confidence intervals', () => {
    const deltas = Array.from({ length: 30 }, (_, index) => index % 3 - 1);
    expect(pairedBootstrapCi(deltas)).toEqual(pairedBootstrapCi(deltas));
    expect(pairedBootstrapCi(deltas)?.resamples).toBe(1000);
    expect(pairedBootstrapCi(deltas.slice(0, 29))).toBeNull();
  });

  it('segments by phase, timing, and accepted actual source', () => {
    const segments = segmentEvidence([pair(100, 90, 110, 0), pair(100, 110, 90, 1), pair(100, 100, 100, 2)]);
    expect(segments.historyPhase.H06_12.pairedCount).toBe(2);
    expect(segments.historyPhase.H13_PLUS.pairedCount).toBe(1);
    expect(segments.timingBucket.DAY_0_1.pairedCount).toBe(1);
    expect(segments.timingBucket.DAY_2_7.pairedCount).toBe(1);
    expect(segments.timingBucket.DAY_8_PLUS.pairedCount).toBe(1);
    expect(segments.actualSource.USER_ENTERED.pairedCount).toBe(2);
    expect(segments.actualSource.METER_DERIVED.pairedCount).toBe(1);
  });
});
