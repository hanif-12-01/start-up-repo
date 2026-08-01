import { describe, expect, it } from 'vitest';
import {
  ACTION_PLAN_CATALOG,
  ACTION_PLAN_RULE_VERSION,
} from '@/server/services/action-plan-catalog';
import { buildActionPlanBaseline } from '@/server/services/action-plan-baseline';
import { resolveEligibleActions } from '@/server/services/action-plan-eligibility';
import { resolveActionPlanTransition } from '@/server/services/action-plan-lifecycle';
import {
  ACTION_PLAN_COMPLETION_COPY,
  ACTION_PLAN_STATUS_LABELS,
} from '@/server/services/action-plan-presentation';
import {
  createActionPlanSchema,
  transitionActionPlanSchema,
} from '@/server/validation/diagnostics';

const acceptedCandidates = [
  'BILL_ADMINISTRATION_CHANGE',
  'NEW_ELECTRICAL_APPLIANCE',
  'OCCUPANCY_INCREASE',
  'SPECIAL_ACTIVITY',
  'WATER_SYSTEM_CHANGE',
];

function options(candidateCode: string, inspectionResult: 'FOUND' | 'NOT_FOUND' | 'UNKNOWN' | 'NEEDS_HELP') {
  return resolveEligibleActions({
    candidateCode,
    candidateVersion: 1,
    candidateRuleVersion: 'DIAG_CANDIDATE_RULE_V1',
    inspectionRuleVersion: 'INSPECTION_RULE_V1',
    inspectionResult,
  });
}

describe('IT-DIAG-05 action catalog and eligibility', () => {
  it('is centralized, versioned, uniquely coded, and deterministically ordered', () => {
    expect(new Set(ACTION_PLAN_CATALOG.map((item) => item.actionCode)).size).toBe(
      ACTION_PLAN_CATALOG.length
    );
    for (const definition of ACTION_PLAN_CATALOG) {
      expect(definition.actionVersion).toBeGreaterThan(0);
      expect(definition.ruleVersion).toBe(ACTION_PLAN_RULE_VERSION);
      expect(definition.steps.length).toBeGreaterThan(0);
      expect(definition.steps.map((step) => step.order)).toEqual(
        definition.steps.map((_, index) => index + 1)
      );
    }
    expect(options('NEW_ELECTRICAL_APPLIANCE', 'FOUND')).toEqual(
      options('NEW_ELECTRICAL_APPLIANCE', 'FOUND')
    );
  });

  it.each(acceptedCandidates)('returns candidate-specific FOUND actions for %s', (candidateCode) => {
    const result = options(candidateCode, 'FOUND');
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(3);
    expect(result.every((item) => item.candidateCodes.includes(candidateCode))).toBe(true);
    expect(result.every((item) => item.allowedInspectionResults.includes('FOUND'))).toBe(true);
  });

  it('maps NEEDS_HELP, UNKNOWN, and NOT_FOUND exactly', () => {
    for (const candidateCode of acceptedCandidates) {
      expect(options(candidateCode, 'NEEDS_HELP').map((item) => item.actionCode)).toEqual([
        'REQUEST_COMPETENT_HELP',
      ]);
      expect(options(candidateCode, 'UNKNOWN').map((item) => item.actionCode)).toEqual([
        'COLLECT_MISSING_INFORMATION',
      ]);
      expect(options(candidateCode, 'NOT_FOUND')).toEqual([]);
    }
  });

  it('does not map DATA_QUALITY, unknown candidates, unknown versions, or AC', () => {
    expect(options('INFORMATION_COMPLETENESS', 'FOUND')).toEqual([]);
    expect(options('AC', 'FOUND')).toEqual([]);
    expect(
      resolveEligibleActions({
        candidateCode: 'NEW_ELECTRICAL_APPLIANCE',
        candidateVersion: 2,
        candidateRuleVersion: 'DIAG_CANDIDATE_RULE_V1',
        inspectionRuleVersion: 'INSPECTION_RULE_V1',
        inspectionResult: 'FOUND',
      })
    ).toEqual([]);
  });

  it('contains no unsafe imperative, saving guarantee, probability, or repair recommendation', () => {
    const texts = ACTION_PLAN_CATALOG.flatMap((item) => [
      item.title,
      item.description,
      item.reasonTemplate,
      ...item.steps.map((step) => step.instruction),
    ]);
    const guarantees = ['pasti hemat', 'akan menghemat', 'hemat 20%', 'tagihan pasti turun', 'roi', 'payback', '% kemungkinan'];
    const unsafeImperatives = ['silakan buka panel', 'ukur tegangan', 'ukur arus', 'gunakan multimeter', 'ganti komponen', 'perbaiki perangkat', 'sentuh instalasi'];
    for (const text of texts) {
      const normalized = text.toLocaleLowerCase('id-ID');
      for (const phrase of guarantees) expect(normalized).not.toContain(phrase);
      for (const phrase of unsafeImperatives) expect(normalized).not.toContain(phrase);
    }
    const help = ACTION_PLAN_CATALOG.find((item) => item.actionCode === 'REQUEST_COMPETENT_HELP');
    expect(help?.steps.map((step) => step.instruction).join(' ')).toContain(
      'Jangan membongkar, menyentuh instalasi, atau melakukan pengukuran listrik sendiri.'
    );
  });
});

describe('IT-DIAG-05 immutable baseline', () => {
  it('serializes exact Rupiah and milli-kWh strings with inclusive-day normalization', () => {
    const snapshot = buildActionPlanBaseline({
      currentBill: {
        id: 'bill-current',
        periodStart: '2026-02-01',
        periodEnd: '2026-02-28',
        totalAmountRupiah: 1_500_001n,
        kwh: '500.125',
        tariffRupiahPerKwh: '1500.50',
      },
      comparisonBill: {
        id: 'bill-previous',
        periodStart: '2026-01-01',
        periodEnd: '2026-01-31',
        totalAmountRupiah: 1_000_000n,
        kwh: '300.000',
        tariffRupiahPerKwh: '1500.00',
      },
      candidateCode: 'NEW_ELECTRICAL_APPLIANCE',
      candidateVersion: 1,
      inspectionCode: 'NEW_APPLIANCE_REVIEW',
      inspectionVersion: 1,
      inspectionResultCode: 'FOUND',
      capturedAt: new Date('2026-03-01T02:03:04.000Z'),
    });
    expect(snapshot).toMatchObject({
      inclusiveDays: 28,
      totalCostRupiah: '1500001',
      costPerDayRupiah: '53571',
      totalKwhMilliKwh: '500125',
      kwhPerDayMilliKwh: '17862',
      comparisonInclusiveDays: 31,
      comparisonTotalCostRupiah: '1000000',
      comparisonCostPerDayRupiah: '32258',
      comparisonTotalKwhMilliKwh: '300000',
      comparisonKwhPerDayMilliKwh: '9677',
      capturedAt: '2026-03-01T02:03:04.000Z',
    });
    expect(typeof snapshot.totalCostRupiah).toBe('string');
  });

  it('keeps missing kWh and comparison values null', () => {
    const snapshot = buildActionPlanBaseline({
      currentBill: {
        id: 'bill-current', periodStart: '2026-01-01', periodEnd: '2026-01-01',
        totalAmountRupiah: 10n, kwh: null, tariffRupiahPerKwh: null,
      },
      comparisonBill: null,
      candidateCode: 'SPECIAL_ACTIVITY', candidateVersion: 1,
      inspectionCode: 'SPECIAL_ACTIVITY_REVIEW', inspectionVersion: 1,
      inspectionResultCode: 'UNKNOWN', capturedAt: new Date(0),
    });
    expect(snapshot.totalKwhMilliKwh).toBeNull();
    expect(snapshot.kwhPerDayMilliKwh).toBeNull();
    expect(snapshot.comparisonBillId).toBeNull();
    expect(snapshot.comparisonInclusiveDays).toBeNull();
  });
});

describe('IT-DIAG-05 lifecycle, labels, and validation', () => {
  it('allows only the canonical transitions and idempotent terminal retry', () => {
    expect(resolveActionPlanTransition('PLANNED', 'START')).toBe('IN_PROGRESS');
    expect(resolveActionPlanTransition('PLANNED', 'CANCEL')).toBe('CANCELLED');
    expect(resolveActionPlanTransition('IN_PROGRESS', 'COMPLETE')).toBe('COMPLETED');
    expect(resolveActionPlanTransition('IN_PROGRESS', 'CANCEL')).toBe('CANCELLED');
    expect(resolveActionPlanTransition('IN_PROGRESS', 'START')).toBe('IN_PROGRESS');
    expect(resolveActionPlanTransition('COMPLETED', 'COMPLETE')).toBe('COMPLETED');
    expect(resolveActionPlanTransition('CANCELLED', 'CANCEL')).toBe('CANCELLED');
    expect(() => resolveActionPlanTransition('PLANNED', 'COMPLETE')).toThrow();
    expect(() => resolveActionPlanTransition('COMPLETED', 'CANCEL')).toThrow();
    expect(() => resolveActionPlanTransition('CANCELLED', 'START')).toThrow();
  });

  it('keeps exact user labels and non-causal completion copy', () => {
    expect(ACTION_PLAN_STATUS_LABELS).toEqual({
      PLANNED: 'Direncanakan',
      IN_PROGRESS: 'Sedang Dijalankan',
      COMPLETED: 'Tindakan Selesai',
      CANCELLED: 'Dibatalkan',
    });
    expect(ACTION_PLAN_COMPLETION_COPY).toContain('Dampaknya belum dapat ditentukan');
    expect(ACTION_PLAN_COMPLETION_COPY).not.toContain('berhasil menghemat');
  });

  it('validates date-only input, trims note, and rejects spoofed fields', () => {
    expect(createActionPlanSchema.safeParse({
      sessionId: 'session', inspectionPlanId: 'inspection', selectedActionCode: 'ACTION',
      plannedStartDate: '2026-02-28', userNote: ' note ',
    }).success).toBe(true);
    expect(createActionPlanSchema.safeParse({
      sessionId: 'session', inspectionPlanId: 'inspection', selectedActionCode: 'ACTION',
      plannedStartDate: '2026-02-30',
    }).success).toBe(false);
    expect(createActionPlanSchema.safeParse({
      sessionId: 'session', inspectionPlanId: 'inspection', selectedActionCode: 'ACTION',
      plannedStartDate: '2026-02-28', businessId: 'spoofed',
    }).success).toBe(false);
    expect(transitionActionPlanSchema.safeParse({
      sessionId: 'session', actionPlanId: 'plan', status: 'COMPLETED',
    }).success).toBe(false);
  });
});
