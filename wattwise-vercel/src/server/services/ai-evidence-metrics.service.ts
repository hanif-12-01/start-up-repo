import { createHash } from 'node:crypto';

export type EvidenceTier =
  | 'NO_REAL_ACCURACY_EVIDENCE'
  | 'PRELIMINARY_ONLY'
  | 'EVALUABLE_BUT_NOT_PROMOTION_GRADE'
  | 'PROMOTION_GRADE_ELIGIBLE';

export interface EvidencePair {
  actualKwh: number;
  nbeatsKwh: number;
  deterministicKwh: number;
  historyPhase: 'H06_12' | 'H13_PLUS';
  timingBucket: 'DAY_0_1' | 'DAY_2_7' | 'DAY_8_PLUS';
  actualSource: 'USER_ENTERED' | 'METER_DERIVED';
  modelVersion: string;
  artifactSha256: string;
  featureSchemaSha256: string;
  fingerprintKey: string;
}

function average(values: number[]): number | null {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

function percentile(values: number[], percentileValue: number): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil(percentileValue * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function round(value: number | null): number | null {
  return value === null || !Number.isFinite(value) ? null : Number(value.toFixed(6));
}

export function evidenceTier(count: number): EvidenceTier {
  if (count <= 0) return 'NO_REAL_ACCURACY_EVIDENCE';
  if (count < 30) return 'PRELIMINARY_ONLY';
  if (count < 100) return 'EVALUABLE_BUT_NOT_PROMOTION_GRADE';
  return 'PROMOTION_GRADE_ELIGIBLE';
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

export function pairedBootstrapCi(
  deltas: number[],
  resamples = 1000,
  seed = 202606
): { lower: number; upper: number; resamples: number; seed: number } | null {
  if (deltas.length < 30 || resamples < 1000) return null;
  const random = seededRandom(seed);
  const means: number[] = [];
  for (let sample = 0; sample < resamples; sample += 1) {
    let total = 0;
    for (let index = 0; index < deltas.length; index += 1) {
      total += deltas[Math.floor(random() * deltas.length)];
    }
    means.push(total / deltas.length);
  }
  return {
    lower: round(percentile(means, 0.025))!,
    upper: round(percentile(means, 0.975))!,
    resamples,
    seed,
  };
}

export function calculateEvidenceMetrics(pairs: EvidencePair[]) {
  const nbeatsErrors = pairs.map((pair) => Math.abs(pair.nbeatsKwh - pair.actualKwh));
  const deterministicErrors = pairs.map((pair) => Math.abs(pair.deterministicKwh - pair.actualKwh));
  const nbeatsSigned = pairs.map((pair) => pair.nbeatsKwh - pair.actualKwh);
  const deterministicSigned = pairs.map((pair) => pair.deterministicKwh - pair.actualKwh);
  const deltas = nbeatsErrors.map((value, index) => value - deterministicErrors[index]);
  const actualTotal = pairs.reduce((sum, pair) => sum + Math.abs(pair.actualKwh), 0);
  const smape = (predictionKey: 'nbeatsKwh' | 'deterministicKwh') => average(pairs.map((pair) => {
    const denominator = Math.abs(pair[predictionKey]) + Math.abs(pair.actualKwh);
    return denominator === 0 ? 0 : (2 * Math.abs(pair[predictionKey] - pair.actualKwh)) / denominator;
  }));
  const nbeatsMae = average(nbeatsErrors);
  const deterministicMae = average(deterministicErrors);
  const nbeatsWins = deltas.filter((value) => value < 0).length;
  const deterministicWins = deltas.filter((value) => value > 0).length;
  const ties = deltas.length - nbeatsWins - deterministicWins;
  const comparison = pairs.length < 30 ? 'INSUFFICIENT_EVIDENCE'
    : (average(deltas) ?? 0) < 0 ? 'NBEATS_BETTER'
      : (average(deltas) ?? 0) > 0 ? 'DETERMINISTIC_BETTER' : 'INCONCLUSIVE';
  const fingerprint = createHash('sha256')
    .update(pairs.map((pair) => pair.fingerprintKey).sort().join('|'))
    .digest('hex');
  return {
    pairedCount: pairs.length,
    evidenceTier: evidenceTier(pairs.length),
    comparison,
    promotionReviewEligible: false,
    nbeats: {
      mae: round(nbeatsMae),
      rmse: round(pairs.length ? Math.sqrt(average(nbeatsSigned.map((value) => value ** 2))!) : null),
      wmape: actualTotal === 0 ? null : round(nbeatsErrors.reduce((a, b) => a + b, 0) / actualTotal),
      wmapeReason: actualTotal === 0 ? 'INSUFFICIENT_DENOMINATOR' : null,
      smape: round(smape('nbeatsKwh')),
      medianAbsoluteError: round(percentile(nbeatsErrors, 0.5)),
      p90AbsoluteError: round(percentile(nbeatsErrors, 0.9)),
      signedBias: round(average(nbeatsSigned)),
      winRate: round(pairs.length ? nbeatsWins / pairs.length : null),
    },
    deterministic: {
      mae: round(deterministicMae),
      rmse: round(pairs.length ? Math.sqrt(average(deterministicSigned.map((value) => value ** 2))!) : null),
      wmape: actualTotal === 0 ? null : round(deterministicErrors.reduce((a, b) => a + b, 0) / actualTotal),
      wmapeReason: actualTotal === 0 ? 'INSUFFICIENT_DENOMINATOR' : null,
      smape: round(smape('deterministicKwh')),
      medianAbsoluteError: round(percentile(deterministicErrors, 0.5)),
      p90AbsoluteError: round(percentile(deterministicErrors, 0.9)),
      signedBias: round(average(deterministicSigned)),
      winRate: round(pairs.length ? deterministicWins / pairs.length : null),
    },
    ties,
    pairedDelta: {
      mean: round(average(deltas)),
      median: round(percentile(deltas, 0.5)),
      relativeMaeImprovement: deterministicMae === null || deterministicMae === 0
        ? null : round((deterministicMae - (nbeatsMae ?? 0)) / deterministicMae),
      bootstrap95: pairedBootstrapCi(deltas),
    },
    evidenceFingerprint: fingerprint,
  };
}

export function segmentEvidence(pairs: EvidencePair[]) {
  const dimensions = {
    historyPhase: ['H06_12', 'H13_PLUS'],
    timingBucket: ['DAY_0_1', 'DAY_2_7', 'DAY_8_PLUS'],
    actualSource: ['USER_ENTERED', 'METER_DERIVED'],
  } as const;
  return Object.fromEntries(Object.entries(dimensions).map(([dimension, values]) => [
    dimension,
    Object.fromEntries(values.map((value) => [
      value,
      calculateEvidenceMetrics(pairs.filter((pair) => pair[dimension as keyof EvidencePair] === value)),
    ])),
  ]));
}
