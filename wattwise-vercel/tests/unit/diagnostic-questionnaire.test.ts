import { describe, expect, it } from 'vitest';
import {
  DIAGNOSTIC_ANSWER_OPTIONS,
  getDiagnosticCatalog,
  KOS_DIAGNOSTIC_RULE_VERSION,
  resolveKosQuestionnaire,
  type DiagnosticCatalogAnswer,
} from '../../src/server/services/diagnostic-question-catalog';
import {
  answerDiagnosticSchema,
  startDiagnosticSchema,
} from '../../src/server/validation/diagnostics';

function answers(
  entries: Array<[string, 'YES' | 'NO' | 'UNKNOWN' | 'NOT_APPLICABLE']>
): DiagnosticCatalogAnswer[] {
  return entries.map(([questionCode, answerCode]) => ({
    questionCode,
    questionVersion: 1,
    answerCode,
  }));
}

const firstFive = answers([
  ['ADMIN_RECORDING_CHANGED', 'NO'],
  ['ADMIN_TARIFF_POWER_CHANGED', 'NO'],
  ['OCCUPANCY_INCREASED', 'NO'],
  ['SPECIAL_ACTIVITY', 'NO'],
  ['NEW_ELECTRICAL_APPLIANCE', 'NO'],
]);

describe('IT-DIAG-02 versioned Kos catalog', () => {
  it('starts with administrative checks in deterministic order', () => {
    const catalog = getDiagnosticCatalog('KOS', KOS_DIAGNOSTIC_RULE_VERSION);
    expect(catalog?.map((question) => question.code).slice(0, 2)).toEqual([
      'ADMIN_RECORDING_CHANGED',
      'ADMIN_TARIFF_POWER_CHANGED',
    ]);
    expect(resolveKosQuestionnaire([]).nextQuestion?.code).toBe(
      'ADMIN_RECORDING_CHANGED'
    );
  });

  it('exposes all four explicit answer codes', () => {
    expect(DIAGNOSTIC_ANSWER_OPTIONS.map((option) => option.code)).toEqual([
      'YES',
      'NO',
      'UNKNOWN',
      'NOT_APPLICABLE',
    ]);
  });

  it('does not fall back to Kos for unsupported segments or rule versions', () => {
    expect(getDiagnosticCatalog('FNB', KOS_DIAGNOSTIC_RULE_VERSION)).toBeNull();
    expect(getDiagnosticCatalog('KOS', 'UNKNOWN_RULE')).toBeNull();
  });

  it.each(['NO', 'NOT_APPLICABLE'] as const)(
    'skips the water-flow follow-up when pump answer is %s',
    (pumpAnswer) => {
      const state = resolveKosQuestionnaire([
        ...firstFive,
        ...answers([['WATER_PUMP_MORE_FREQUENT', pumpAnswer]]),
      ]);
      expect(state.completed).toBe(true);
      expect(state.questions).toHaveLength(6);
      expect(state.questions.map((question) => question.code)).not.toContain(
        'WATER_FLOW_LEAK_ISSUE'
      );
    }
  );

  it.each(['YES', 'UNKNOWN'] as const)(
    'asks the water-flow follow-up when pump answer is %s',
    (pumpAnswer) => {
      const state = resolveKosQuestionnaire([
        ...firstFive,
        ...answers([['WATER_PUMP_MORE_FREQUENT', pumpAnswer]]),
      ]);
      expect(state.completed).toBe(false);
      expect(state.nextQuestion?.code).toBe('WATER_FLOW_LEAK_ISSUE');
      expect(state.questions).toHaveLength(7);
    }
  );

  it('handles an all-unknown path deterministically and completes after seven answers', () => {
    const allUnknown = answers([
      ['ADMIN_RECORDING_CHANGED', 'UNKNOWN'],
      ['ADMIN_TARIFF_POWER_CHANGED', 'UNKNOWN'],
      ['OCCUPANCY_INCREASED', 'UNKNOWN'],
      ['SPECIAL_ACTIVITY', 'UNKNOWN'],
      ['NEW_ELECTRICAL_APPLIANCE', 'UNKNOWN'],
      ['WATER_PUMP_MORE_FREQUENT', 'UNKNOWN'],
      ['WATER_FLOW_LEAK_ISSUE', 'UNKNOWN'],
    ]);
    const first = resolveKosQuestionnaire(allUnknown);
    const second = resolveKosQuestionnaire(allUnknown);
    expect(first).toEqual(second);
    expect(first.completed).toBe(true);
    expect(first.answeredCount).toBe(7);
  });
});

describe('IT-DIAG-02 client payload validation', () => {
  it('accepts only the bill resource identifier when starting', () => {
    expect(startDiagnosticSchema.safeParse({ electricityBillId: 'bill-1' }).success).toBe(
      true
    );
    expect(
      startDiagnosticSchema.safeParse({
        electricityBillId: 'bill-1',
        businessId: 'spoofed',
      }).success
    ).toBe(false);
  });

  it('rejects client attempts to set tenant, status, segment, or rule version', () => {
    const base = {
      sessionId: 'session-1',
      questionCode: 'ADMIN_RECORDING_CHANGED',
      questionVersion: '1',
      answerCode: 'YES',
    };
    expect(answerDiagnosticSchema.safeParse(base).success).toBe(true);
    for (const forbidden of ['userId', 'businessId', 'status', 'segment', 'ruleVersion']) {
      expect(
        answerDiagnosticSchema.safeParse({ ...base, [forbidden]: 'spoofed' }).success
      ).toBe(false);
    }
  });

  it('rejects unknown answer and question codes', () => {
    expect(
      answerDiagnosticSchema.safeParse({
        sessionId: 'session-1',
        questionCode: 'INVENTED_QUESTION',
        questionVersion: 1,
        answerCode: 'MAYBE',
      }).success
    ).toBe(false);
  });
});
