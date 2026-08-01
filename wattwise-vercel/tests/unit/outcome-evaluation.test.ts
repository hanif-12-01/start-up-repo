import { describe, expect, it } from 'vitest';
import {
  buildOutcomeEvaluation,
  dateOnlyInTimeZone,
  decimalToScaledInteger,
  directionFromDeltaBps,
  explanationForOutcome,
  rationalDeltaBps,
  resolveDataQuality,
  resolveOverallOutcome,
  roundHalfAwayFromZero,
  selectNextEligibleBill,
  SIMILARITY_BAND_BPS,
  type OutcomeBillInput,
} from '@/server/services/outcome-evaluation';
import { resolveSessionClosureEligibility } from '@/server/services/session-closure.service';
import type { SessionClosureContext } from '@/server/repositories/outcome.repository';
import {
  closeDiagnosticSessionSchema,
  evaluateActionOutcomeSchema,
} from '@/server/validation/diagnostics';

const baseline = {
  sourceBillId: 'baseline',
  comparisonBillId: 'comparison',
  periodStart: '2026-06-01',
  periodEnd: '2026-06-30',
  inclusiveDays: 30,
  totalCostRupiah: '3000000',
  costPerDayRupiah: '100000',
  totalKwhMilliKwh: '300000',
  kwhPerDayMilliKwh: '10000',
  tariffRupiahPerKwh: '1500.00',
  comparisonPeriodStart: '2026-05-01',
  comparisonPeriodEnd: '2026-05-31',
  comparisonInclusiveDays: 31,
  comparisonTotalCostRupiah: '2900000',
  comparisonCostPerDayRupiah: '93548',
  comparisonTotalKwhMilliKwh: '290000',
  comparisonKwhPerDayMilliKwh: '9355',
  candidateCode: 'SPECIAL_ACTIVITY',
  candidateVersion: 1,
  inspectionCode: 'INSPECT_SPECIAL_ACTIVITY',
  inspectionVersion: 1,
  inspectionResultCode: 'FOUND',
  capturedAt: '2026-07-01T00:00:00.000Z',
};

function bill(overrides: Partial<OutcomeBillInput> = {}): OutcomeBillInput {
  return {
    id: 'follow-up',
    businessId: 'business-a',
    periodStart: '2026-08-02',
    periodEnd: '2026-08-31',
    totalAmountRupiah: 2_700_000n,
    kwh: '270.000',
    tariffRupiahPerKwh: '1500.00',
    createdAt: new Date('2026-09-01T00:00:00.000Z'),
    ...overrides,
  };
}

describe('outcome evaluation exact rules', () => {
  it('accepts only server-authoritative mutation identifiers', () => {
    expect(evaluateActionOutcomeSchema.parse({ actionPlanId: 'action' })).toEqual({
      actionPlanId: 'action',
    });
    expect(
      evaluateActionOutcomeSchema.safeParse({
        actionPlanId: 'action',
        followUpBillId: 'spoofed',
      }).success
    ).toBe(false);
    expect(
      closeDiagnosticSessionSchema.safeParse({
        sessionId: 'session',
        sessionStatus: 'CLOSED',
      }).success
    ).toBe(false);
  });

  it('derives date-only using Asia/Jakarta and an available business timezone', () => {
    const instant = new Date('2026-08-01T17:30:00.000Z');
    expect(dateOnlyInTimeZone(instant)).toBe('2026-08-02');
    expect(dateOnlyInTimeZone(instant, 'America/New_York')).toBe('2026-08-01');
  });

  it('selects the earliest eligible bill with deterministic tie breaks', () => {
    const sameDay = bill({ id: 'same-day', periodStart: '2026-08-01' });
    const wrongTenant = bill({ id: 'wrong-tenant', businessId: 'business-b' });
    const excludedBaseline = bill({ id: 'baseline' });
    const later = bill({ id: 'later', periodStart: '2026-09-01', periodEnd: '2026-09-30' });
    const laterCreated = bill({ id: 'b', createdAt: new Date('2026-09-02T00:00:00.000Z') });
    const selected = bill({ id: 'a', createdAt: new Date('2026-09-01T00:00:00.000Z') });
    expect(
      selectNextEligibleBill(
        [sameDay, wrongTenant, excludedBaseline, later, laterCreated, selected],
        {
          businessId: 'business-a',
          baselineBillId: 'baseline',
          comparisonBillId: 'comparison',
          eligibleAfterDate: '2026-08-01',
        }
      )?.id
    ).toBe('a');
  });

  it('returns waiting when no bill starts strictly after completion', () => {
    expect(
      selectNextEligibleBill([bill({ periodStart: '2026-08-01' })], {
        businessId: 'business-a',
        baselineBillId: 'baseline',
        comparisonBillId: 'comparison',
        eligibleAfterDate: '2026-08-01',
      })
    ).toBeNull();
  });

  it('parses exact decimals and compares normalized rational costs and usage', () => {
    expect(decimalToScaledInteger('123.450', 3)).toBe(123450n);
    expect(
      rationalDeltaBps({
        baselineValue: 3_000_000n,
        baselineDays: 30n,
        followUpValue: 2_700_000n,
        followUpDays: 30n,
      })
    ).toBe(-1000n);
    const outcome = buildOutcomeEvaluation({
      baselineSnapshot: baseline,
      followUpBill: bill(),
      capturedAt: new Date('2026-09-01T01:00:00.000Z'),
    });
    expect(outcome.comparison.costDirection).toBe('LOWER');
    expect(outcome.comparison.usageDirection).toBe('LOWER');
    expect(outcome.comparison.tariffDirection).toBe('SIMILAR');
    expect(outcome.comparison.overallOutcomeCode).toBe('POSITIVE_SIGNAL');
    expect(outcome.followUp.totalCostRupiah).toBe('2700000');
    expect(outcome.followUp.totalKwhMilliKwh).toBe('270000');
  });

  it('rounds half away from zero deterministically', () => {
    expect(roundHalfAwayFromZero(1n, 2n)).toBe(1n);
    expect(roundHalfAwayFromZero(-1n, 2n)).toBe(-1n);
    expect(roundHalfAwayFromZero(4n, 3n)).toBe(1n);
    expect(roundHalfAwayFromZero(-4n, 3n)).toBe(-1n);
  });

  it('keeps both similarity boundaries inclusive', () => {
    expect(SIMILARITY_BAND_BPS).toBe(500n);
    expect(directionFromDeltaBps(-501n)).toBe('LOWER');
    expect(directionFromDeltaBps(-500n)).toBe('SIMILAR');
    expect(directionFromDeltaBps(500n)).toBe('SIMILAR');
    expect(directionFromDeltaBps(501n)).toBe('HIGHER');
  });

  it('marks usage and tariff unavailable independently', () => {
    const outcome = buildOutcomeEvaluation({
      baselineSnapshot: { ...baseline, totalKwhMilliKwh: null, kwhPerDayMilliKwh: null },
      followUpBill: bill({ kwh: null, tariffRupiahPerKwh: null }),
      capturedAt: new Date('2026-09-01T01:00:00.000Z'),
    });
    expect(outcome.comparison.usageDirection).toBe('UNAVAILABLE');
    expect(outcome.comparison.tariffDirection).toBe('UNAVAILABLE');
    expect(outcome.comparison.dataQualityCode).toBe('COST_ONLY');
    expect(outcome.comparison.overallOutcomeCode).toBe('INCONCLUSIVE');
  });

  it.each([
    [{ baselineKwh: '1', followUpKwh: '1', baselineTariff: null, followUpTariff: null }, 'USAGE_COMPLETE'],
    [{ baselineKwh: null, followUpKwh: null, baselineTariff: '1', followUpTariff: '1' }, 'TARIFF_CONTEXT_ONLY'],
    [{ baselineKwh: null, followUpKwh: null, baselineTariff: null, followUpTariff: '1' }, 'COST_ONLY'],
  ] as const)('resolves data quality %#', (input, expected) => {
    expect(resolveDataQuality(input)).toBe(expected);
  });

  it.each([
    [{ costDirection: 'LOWER', usageDirection: 'LOWER', tariffDirection: 'SIMILAR' }, 'POSITIVE_SIGNAL'],
    [{ costDirection: 'SIMILAR', usageDirection: 'SIMILAR', tariffDirection: 'SIMILAR' }, 'NO_CLEAR_CHANGE'],
    [{ costDirection: 'HIGHER', usageDirection: 'HIGHER', tariffDirection: 'SIMILAR' }, 'NEGATIVE_SIGNAL'],
    [{ costDirection: 'LOWER', usageDirection: 'HIGHER', tariffDirection: 'SIMILAR' }, 'MIXED_SIGNAL'],
    [{ costDirection: 'HIGHER', usageDirection: 'LOWER', tariffDirection: 'SIMILAR' }, 'MIXED_SIGNAL'],
    [{ costDirection: 'LOWER', usageDirection: 'UNAVAILABLE', tariffDirection: 'UNAVAILABLE' }, 'INCONCLUSIVE'],
    [{ costDirection: 'LOWER', usageDirection: 'UNAVAILABLE', tariffDirection: 'SIMILAR' }, 'POSITIVE_SIGNAL'],
  ] as const)('resolves overall outcome %#', (input, expected) => {
    expect(resolveOverallOutcome(input)).toBe(expected);
  });

  it('keeps every explanation non-causal and free of success, failure, saving, and prediction claims', () => {
    const text = [
      'POSITIVE_SIGNAL',
      'NO_CLEAR_CHANGE',
      'NEGATIVE_SIGNAL',
      'MIXED_SIGNAL',
      'INCONCLUSIVE',
    ]
      .map((code) => JSON.stringify(explanationForOutcome(code as Parameters<typeof explanationForOutcome>[0])))
      .join(' ')
      .toLowerCase();
    expect(text).not.toMatch(/rencana hemat berhasil|tindakan ini menghemat|pompa terbukti|terbukti hemat|prediksi|perkiraan tagihan berikutnya|\bgagal\b/);
    expect(text).toContain('tidak membuktikan');
  });
});

function closure(plans: SessionClosureContext['plans']): SessionClosureContext {
  return { id: 'session', status: 'INSPECTION_IN_PROGRESS', closedAt: null, plans };
}

describe('diagnostic session closure eligibility', () => {
  it('requires at least one outcome and rejects all-cancelled sessions', () => {
    expect(resolveSessionClosureEligibility(closure([])).eligible).toBe(false);
    expect(
      resolveSessionClosureEligibility(
        closure([{ id: 'cancelled', status: 'CANCELLED', hasOutcome: false }])
      ).eligible
    ).toBe(false);
  });

  it.each(['PLANNED', 'IN_PROGRESS'] as const)('rejects an active %s action', (status) => {
    expect(
      resolveSessionClosureEligibility(
        closure([
          { id: 'done', status: 'COMPLETED', hasOutcome: true },
          { id: 'active', status, hasOutcome: false },
        ])
      ).eligible
    ).toBe(false);
  });

  it('rejects a completed action without outcome and ignores cancelled actions', () => {
    expect(
      resolveSessionClosureEligibility(
        closure([{ id: 'missing', status: 'COMPLETED', hasOutcome: false }])
      ).eligible
    ).toBe(false);
    expect(
      resolveSessionClosureEligibility(
        closure([
          { id: 'done', status: 'COMPLETED', hasOutcome: true },
          { id: 'cancelled', status: 'CANCELLED', hasOutcome: false },
        ])
      ).eligible
    ).toBe(true);
  });

  it('treats CLOSED as terminal and idempotently eligible', () => {
    expect(
      resolveSessionClosureEligibility({
        id: 'session',
        status: 'CLOSED',
        closedAt: new Date('2026-09-01T00:00:00.000Z'),
        plans: [],
      }).eligible
    ).toBe(true);
  });
});
