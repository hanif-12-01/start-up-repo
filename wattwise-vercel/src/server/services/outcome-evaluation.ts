import { z } from 'zod';
import type {
  OutcomeDataQualityCode,
  OutcomeDirection,
  OverallOutcomeCode,
} from '@/server/db/schema/outcomes';
import type { ActionPlanBaselineSnapshot } from '@/server/services/action-plan-baseline';
import { inclusivePeriodDays } from '@/server/services/bill-comparison.service';

export const OUTCOME_EVALUATION_RULE_VERSION = 'OUTCOME_EVALUATION_RULE_V1';
export const SIMILARITY_BAND_BPS = 500n;
export const DEFAULT_EVALUATION_TIMEZONE = 'Asia/Jakarta';

const unsignedInteger = z.string().regex(/^\d+$/);
const decimal = z.string().regex(/^\d+(?:\.\d+)?$/);
const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const baselineSchema = z
  .object({
    sourceBillId: z.string().min(1),
    comparisonBillId: z.string().min(1).nullable(),
    periodStart: dateOnly,
    periodEnd: dateOnly,
    inclusiveDays: z.number().int().positive(),
    totalCostRupiah: unsignedInteger,
    costPerDayRupiah: unsignedInteger,
    totalKwhMilliKwh: unsignedInteger.nullable(),
    kwhPerDayMilliKwh: unsignedInteger.nullable(),
    tariffRupiahPerKwh: decimal.nullable(),
    comparisonPeriodStart: dateOnly.nullable(),
    comparisonPeriodEnd: dateOnly.nullable(),
    comparisonInclusiveDays: z.number().int().positive().nullable(),
    comparisonTotalCostRupiah: unsignedInteger.nullable(),
    comparisonCostPerDayRupiah: unsignedInteger.nullable(),
    comparisonTotalKwhMilliKwh: unsignedInteger.nullable(),
    comparisonKwhPerDayMilliKwh: unsignedInteger.nullable(),
    candidateCode: z.string().min(1),
    candidateVersion: z.number().int().positive(),
    inspectionCode: z.string().min(1),
    inspectionVersion: z.number().int().positive(),
    inspectionResultCode: z.string().min(1),
    capturedAt: z.string().datetime(),
  })
  .strict();

export interface OutcomeBillInput {
  id: string;
  businessId: string;
  periodStart: string;
  periodEnd: string;
  totalAmountRupiah: bigint;
  kwh: string | null;
  tariffRupiahPerKwh: string | null;
  createdAt: Date;
}

export function selectNextEligibleBill(
  candidates: OutcomeBillInput[],
  input: {
    businessId: string;
    baselineBillId: string;
    comparisonBillId: string | null;
    eligibleAfterDate: string;
  }
): OutcomeBillInput | null {
  return (
    candidates
      .filter(
        (bill) =>
          bill.businessId === input.businessId &&
          bill.id !== input.baselineBillId &&
          bill.id !== input.comparisonBillId &&
          bill.periodStart > input.eligibleAfterDate &&
          bill.periodEnd >= bill.periodStart
      )
      .sort(
        (left, right) =>
          left.periodStart.localeCompare(right.periodStart) ||
          left.periodEnd.localeCompare(right.periodEnd) ||
          left.createdAt.getTime() - right.createdAt.getTime() ||
          left.id.localeCompare(right.id)
      )[0] ?? null
  );
}

export interface NormalizedRationalSnapshot {
  numerator: string;
  denominatorDays: string;
}

export interface FollowUpBillSnapshot {
  billId: string;
  periodStart: string;
  periodEnd: string;
  inclusiveDays: number;
  totalCostRupiah: string;
  costPerDay: NormalizedRationalSnapshot;
  totalKwhMilliKwh: string | null;
  kwhPerDay: NormalizedRationalSnapshot | null;
  tariffRupiahPerKwh: string | null;
  capturedAt: string;
}

export interface OutcomeComparisonSnapshot {
  baselineNormalizedCost: NormalizedRationalSnapshot;
  followUpNormalizedCost: NormalizedRationalSnapshot;
  costDeltaBps: string;
  costDirection: Exclude<OutcomeDirection, 'UNAVAILABLE'>;
  baselineNormalizedUsage: NormalizedRationalSnapshot | null;
  followUpNormalizedUsage: NormalizedRationalSnapshot | null;
  usageDeltaBps: string | null;
  usageDirection: OutcomeDirection;
  baselineTariffRupiahPerKwh: string | null;
  followUpTariffRupiahPerKwh: string | null;
  tariffDeltaBps: string | null;
  tariffDirection: OutcomeDirection;
  dataQualityCode: OutcomeDataQualityCode;
  overallOutcomeCode: OverallOutcomeCode;
  similarityBandBps: string;
}

export interface OutcomeExplanationSnapshot {
  title: string;
  paragraphs: string[];
  disclaimer: string;
}

export interface ResolvedOutcomeEvaluation {
  baseline: ActionPlanBaselineSnapshot;
  followUp: FollowUpBillSnapshot;
  comparison: OutcomeComparisonSnapshot;
  explanation: OutcomeExplanationSnapshot;
}

function pow10(scale: number): bigint {
  return 10n ** BigInt(scale);
}

export function decimalToScaledInteger(value: string, scale: number): bigint {
  if (!/^\d+(?:\.\d+)?$/.test(value) || !Number.isInteger(scale) || scale < 0) {
    throw new Error('Invalid exact decimal');
  }
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > scale) throw new Error('Decimal exceeds accepted scale');
  return BigInt(whole) * pow10(scale) + BigInt(fraction.padEnd(scale, '0') || '0');
}

export function roundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  if (denominator <= 0n) throw new Error('Denominator must be positive');
  const sign = numerator < 0n ? -1n : 1n;
  const absolute = numerator < 0n ? -numerator : numerator;
  const quotient = absolute / denominator;
  const remainder = absolute % denominator;
  const rounded = remainder * 2n >= denominator ? quotient + 1n : quotient;
  return sign * rounded;
}

export function rationalDeltaBps(input: {
  baselineValue: bigint;
  baselineDays: bigint;
  followUpValue: bigint;
  followUpDays: bigint;
}): bigint {
  if (
    input.baselineValue <= 0n ||
    input.baselineDays <= 0n ||
    input.followUpValue < 0n ||
    input.followUpDays <= 0n
  ) {
    throw new Error('Invalid rational comparison');
  }
  const difference =
    input.followUpValue * input.baselineDays -
    input.baselineValue * input.followUpDays;
  const baselineDenominator = input.baselineValue * input.followUpDays;
  return roundHalfAwayFromZero(difference * 10_000n, baselineDenominator);
}

export function directionFromDeltaBps(
  deltaBps: bigint,
  bandBps = SIMILARITY_BAND_BPS
): Exclude<OutcomeDirection, 'UNAVAILABLE'> {
  if (deltaBps < -bandBps) return 'LOWER';
  if (deltaBps > bandBps) return 'HIGHER';
  return 'SIMILAR';
}

function rationalDirection(input: {
  baselineValue: bigint;
  baselineDays: bigint;
  followUpValue: bigint;
  followUpDays: bigint;
}): { deltaBps: bigint | null; direction: Exclude<OutcomeDirection, 'UNAVAILABLE'> } {
  if (input.baselineValue > 0n) {
    const deltaBps = rationalDeltaBps(input);
    return { deltaBps, direction: directionFromDeltaBps(deltaBps) };
  }
  const comparison =
    input.followUpValue * input.baselineDays - input.baselineValue * input.followUpDays;
  return {
    deltaBps: null,
    direction: comparison === 0n ? 'SIMILAR' : comparison > 0n ? 'HIGHER' : 'LOWER',
  };
}

export function resolveDataQuality(input: {
  baselineKwh: string | null;
  followUpKwh: string | null;
  baselineTariff: string | null;
  followUpTariff: string | null;
}): OutcomeDataQualityCode {
  if (input.baselineKwh !== null && input.followUpKwh !== null) return 'USAGE_COMPLETE';
  if (input.baselineTariff !== null && input.followUpTariff !== null) {
    return 'TARIFF_CONTEXT_ONLY';
  }
  return 'COST_ONLY';
}

export function resolveOverallOutcome(input: {
  costDirection: Exclude<OutcomeDirection, 'UNAVAILABLE'>;
  usageDirection: OutcomeDirection;
  tariffDirection: OutcomeDirection;
}): OverallOutcomeCode {
  if (input.usageDirection !== 'UNAVAILABLE') {
    if (input.usageDirection === 'LOWER' && input.costDirection !== 'HIGHER') {
      return 'POSITIVE_SIGNAL';
    }
    if (input.usageDirection === 'HIGHER' && input.costDirection !== 'LOWER') {
      return 'NEGATIVE_SIGNAL';
    }
    if (input.usageDirection === 'SIMILAR' && input.costDirection === 'SIMILAR') {
      return 'NO_CLEAR_CHANGE';
    }
    return 'MIXED_SIGNAL';
  }
  if (input.tariffDirection !== 'SIMILAR') return 'INCONCLUSIVE';
  if (input.costDirection === 'LOWER') return 'POSITIVE_SIGNAL';
  if (input.costDirection === 'HIGHER') return 'NEGATIVE_SIGNAL';
  return 'NO_CLEAR_CHANGE';
}

const EXPLANATIONS: Record<OverallOutcomeCode, Omit<OutcomeExplanationSnapshot, 'disclaimer'>> = {
  POSITIVE_SIGNAL: {
    title: 'Ada sinyal perbaikan',
    paragraphs: [
      'Data periode evaluasi menunjukkan nilai per hari yang lebih rendah dibandingkan kondisi sebelum tindakan.',
      'Perubahan ini belum membuktikan bahwa tindakan merupakan satu-satunya penyebab.',
    ],
  },
  NO_CLEAR_CHANGE: {
    title: 'Belum ada perubahan berarti',
    paragraphs: [
      'Perubahan per hari masih berada dalam rentang yang dianggap serupa untuk evaluasi awal ini.',
    ],
  },
  NEGATIVE_SIGNAL: {
    title: 'Ada sinyal kenaikan',
    paragraphs: [
      'Data periode evaluasi menunjukkan nilai per hari yang lebih tinggi dibandingkan kondisi sebelum tindakan.',
      'Hal ini tidak membuktikan bahwa tindakan menyebabkan kenaikan.',
    ],
  },
  MIXED_SIGNAL: {
    title: 'Hasil perubahan campuran',
    paragraphs: [
      'Biaya dan pemakaian menunjukkan arah perubahan yang berbeda.',
      'Perubahan tarif atau faktor operasional lain dapat memengaruhi hasil.',
    ],
  },
  INCONCLUSIVE: {
    title: 'Belum dapat disimpulkan',
    paragraphs: [
      'Data yang tersedia belum cukup untuk menyimpulkan arah hasil secara keseluruhan.',
      'Perubahan biaya tetap ditampilkan sebagai informasi, bukan bukti keberhasilan tindakan.',
    ],
  },
};

export const OUTCOME_DISCLAIMER =
  'Evaluasi ini membandingkan data sebelum dan sesudah tindakan. Perubahan yang terlihat tidak membuktikan bahwa tindakan tersebut merupakan satu-satunya penyebab.';

export function explanationForOutcome(code: OverallOutcomeCode): OutcomeExplanationSnapshot {
  return { ...EXPLANATIONS[code], disclaimer: OUTCOME_DISCLAIMER };
}

export function dateOnlyInTimeZone(date: Date, timeZone = DEFAULT_EVALUATION_TIMEZONE): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = Object.fromEntries(
    formatter
      .formatToParts(date)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function parseAcceptedBaseline(value: unknown): ActionPlanBaselineSnapshot {
  const baseline = baselineSchema.parse(value);
  if (baseline.periodEnd < baseline.periodStart) throw new Error('Invalid baseline period');
  if (inclusivePeriodDays(baseline.periodStart, baseline.periodEnd) !== baseline.inclusiveDays) {
    throw new Error('Invalid baseline duration');
  }
  if (BigInt(baseline.totalCostRupiah) <= 0n) throw new Error('Invalid baseline cost');
  return baseline;
}

function normalized(numerator: bigint, days: number): NormalizedRationalSnapshot {
  return { numerator: numerator.toString(), denominatorDays: BigInt(days).toString() };
}

export function buildOutcomeEvaluation(input: {
  baselineSnapshot: unknown;
  followUpBill: OutcomeBillInput;
  capturedAt: Date;
}): ResolvedOutcomeEvaluation {
  const baseline = parseAcceptedBaseline(input.baselineSnapshot);
  const followUpDays = inclusivePeriodDays(
    input.followUpBill.periodStart,
    input.followUpBill.periodEnd
  );
  if (followUpDays <= 0 || input.followUpBill.totalAmountRupiah < 0n) {
    throw new Error('Invalid follow-up bill');
  }
  const baselineCost = BigInt(baseline.totalCostRupiah);
  const costDeltaBps = rationalDeltaBps({
    baselineValue: baselineCost,
    baselineDays: BigInt(baseline.inclusiveDays),
    followUpValue: input.followUpBill.totalAmountRupiah,
    followUpDays: BigInt(followUpDays),
  });
  const costDirection = directionFromDeltaBps(costDeltaBps);

  const followUpMilliKwh =
    input.followUpBill.kwh === null
      ? null
      : decimalToScaledInteger(input.followUpBill.kwh, 3);
  const baselineMilliKwh =
    baseline.totalKwhMilliKwh === null ? null : BigInt(baseline.totalKwhMilliKwh);
  const usageComparison =
    baselineMilliKwh === null || followUpMilliKwh === null
      ? null
      : rationalDirection({
          baselineValue: baselineMilliKwh,
          baselineDays: BigInt(baseline.inclusiveDays),
          followUpValue: followUpMilliKwh,
          followUpDays: BigInt(followUpDays),
        });
  const usageDeltaBps = usageComparison?.deltaBps ?? null;
  const usageDirection: OutcomeDirection = usageComparison?.direction ?? 'UNAVAILABLE';

  const baselineTariff =
    baseline.tariffRupiahPerKwh === null
      ? null
      : decimalToScaledInteger(baseline.tariffRupiahPerKwh, 2);
  const followUpTariff =
    input.followUpBill.tariffRupiahPerKwh === null
      ? null
      : decimalToScaledInteger(input.followUpBill.tariffRupiahPerKwh, 2);
  const tariffComparison =
    baselineTariff === null || followUpTariff === null
      ? null
      : rationalDirection({
          baselineValue: baselineTariff,
          baselineDays: 1n,
          followUpValue: followUpTariff,
          followUpDays: 1n,
        });
  const tariffDeltaBps = tariffComparison?.deltaBps ?? null;
  const tariffDirection: OutcomeDirection = tariffComparison?.direction ?? 'UNAVAILABLE';
  const dataQualityCode = resolveDataQuality({
    baselineKwh: baseline.totalKwhMilliKwh,
    followUpKwh: followUpMilliKwh?.toString() ?? null,
    baselineTariff: baseline.tariffRupiahPerKwh,
    followUpTariff: input.followUpBill.tariffRupiahPerKwh,
  });
  const overallOutcomeCode = resolveOverallOutcome({
    costDirection,
    usageDirection,
    tariffDirection,
  });

  const followUp: FollowUpBillSnapshot = {
    billId: input.followUpBill.id,
    periodStart: input.followUpBill.periodStart,
    periodEnd: input.followUpBill.periodEnd,
    inclusiveDays: followUpDays,
    totalCostRupiah: input.followUpBill.totalAmountRupiah.toString(),
    costPerDay: normalized(input.followUpBill.totalAmountRupiah, followUpDays),
    totalKwhMilliKwh: followUpMilliKwh?.toString() ?? null,
    kwhPerDay:
      followUpMilliKwh === null ? null : normalized(followUpMilliKwh, followUpDays),
    tariffRupiahPerKwh: input.followUpBill.tariffRupiahPerKwh,
    capturedAt: input.capturedAt.toISOString(),
  };
  const comparison: OutcomeComparisonSnapshot = {
    baselineNormalizedCost: normalized(baselineCost, baseline.inclusiveDays),
    followUpNormalizedCost: followUp.costPerDay,
    costDeltaBps: costDeltaBps.toString(),
    costDirection,
    baselineNormalizedUsage:
      baselineMilliKwh === null ? null : normalized(baselineMilliKwh, baseline.inclusiveDays),
    followUpNormalizedUsage: followUp.kwhPerDay,
    usageDeltaBps: usageDeltaBps?.toString() ?? null,
    usageDirection,
    baselineTariffRupiahPerKwh: baseline.tariffRupiahPerKwh,
    followUpTariffRupiahPerKwh: input.followUpBill.tariffRupiahPerKwh,
    tariffDeltaBps: tariffDeltaBps?.toString() ?? null,
    tariffDirection,
    dataQualityCode,
    overallOutcomeCode,
    similarityBandBps: SIMILARITY_BAND_BPS.toString(),
  };
  return {
    baseline,
    followUp,
    comparison,
    explanation: explanationForOutcome(overallOutcomeCode),
  };
}
