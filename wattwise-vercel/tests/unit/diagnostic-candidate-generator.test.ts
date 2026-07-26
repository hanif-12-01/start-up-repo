import { describe, expect, it } from 'vitest';
import {
  DIAGNOSTIC_CANDIDATE_CATALOG,
  DIAGNOSTIC_CANDIDATE_RULE_VERSION,
  DIAGNOSTIC_DATA_QUALITY_CANDIDATE,
} from '../../src/server/services/diagnostic-candidate-catalog';
import {
  generateDiagnosticCandidates,
  type DiagnosticCandidateGenerationInput,
} from '../../src/server/services/diagnostic-candidate-generator';
import { generateDiagnosticCandidatesSchema } from '../../src/server/validation/diagnostics';

type AnswerCode = 'YES' | 'NO' | 'UNKNOWN' | 'NOT_APPLICABLE';

const QUESTION_CODES = [
  'ADMIN_RECORDING_CHANGED',
  'ADMIN_TARIFF_POWER_CHANGED',
  'OCCUPANCY_INCREASED',
  'SPECIAL_ACTIVITY',
  'NEW_ELECTRICAL_APPLIANCE',
  'WATER_PUMP_MORE_FREQUENT',
  'WATER_FLOW_LEAK_ISSUE',
] as const;

function input(
  entries: Partial<Record<(typeof QUESTION_CODES)[number], AnswerCode>>,
  options: {
    currentKwh?: string | null;
    previousKwh?: string | null;
    currentTariff?: string | null;
    previousTariff?: string | null;
  } = {}
): DiagnosticCandidateGenerationInput {
  return {
    answers: Object.entries(entries).map(([questionCode, answerCode]) => ({
      questionCode,
      questionVersion: 1,
      answerCode,
    })),
    eligibleQuestionCount: Object.keys(entries).length,
    currentBill: {
      id: 'current',
      periodStart: '2026-02-01',
      periodEnd: '2026-02-28',
      totalAmountRupiah: 1_600_000n,
      kwh: options.currentKwh === undefined ? '560.000' : options.currentKwh,
      tariffRupiahPerKwh:
        options.currentTariff === undefined ? '1600.00' : options.currentTariff,
    },
    comparisonBill: {
      id: 'previous',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      totalAmountRupiah: 1_000_000n,
      kwh: options.previousKwh === undefined ? '310.000' : options.previousKwh,
      tariffRupiahPerKwh:
        options.previousTariff === undefined ? '1500.00' : options.previousTariff,
    },
  };
}

function fullAnswers(answer: AnswerCode) {
  return Object.fromEntries(QUESTION_CODES.map((code) => [code, answer])) as Record<
    (typeof QUESTION_CODES)[number],
    AnswerCode
  >;
}

describe('IT-DIAG-03 candidate catalog', () => {
  it('has unique stable codes, valid types, and explicit versions', () => {
    const codes = DIAGNOSTIC_CANDIDATE_CATALOG.map((candidate) => candidate.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(DIAGNOSTIC_CANDIDATE_CATALOG.every((candidate) => candidate.version === 1)).toBe(
      true
    );
    expect(
      DIAGNOSTIC_CANDIDATE_CATALOG.every(
        (candidate) => candidate.ruleVersion === DIAGNOSTIC_CANDIDATE_RULE_VERSION
      )
    ).toBe(true);
    expect(
      DIAGNOSTIC_CANDIDATE_CATALOG.every(
        (candidate) =>
          candidate.eligibilityRule ===
          'REQUIRED_ANSWERS_PRESENT_NO_NOT_APPLICABLE'
      )
    ).toBe(true);
    expect(DIAGNOSTIC_DATA_QUALITY_CANDIDATE).toMatchObject({
      code: 'INFORMATION_COMPLETENESS',
      version: 1,
      type: 'DATA_QUALITY',
      ruleVersion: DIAGNOSTIC_CANDIDATE_RULE_VERSION,
    });
    expect(DIAGNOSTIC_CANDIDATE_CATALOG.map((candidate) => candidate.type)).toEqual(
      expect.arrayContaining([
        'ADMINISTRATIVE',
        'OCCUPANCY',
        'OPERATIONAL',
        'APPLIANCE',
        'WATER_SYSTEM',
      ])
    );
  });

  it('does not invent an AC candidate without an accepted AC question code', () => {
    expect(
      DIAGNOSTIC_CANDIDATE_CATALOG.some((candidate) =>
        candidate.code.includes('AIR_CONDITIONER')
      )
    ).toBe(false);
  });
});

describe('IT-DIAG-03 deterministic candidate generator', () => {
  it('returns identical output for identical input and ranks at most three candidates', () => {
    const generationInput = input(fullAnswers('YES'));
    const first = generateDiagnosticCandidates(generationInput);
    const second = generateDiagnosticCandidates(generationInput);
    expect(first).toEqual(second);
    expect(first).toHaveLength(3);
    expect(first.map((candidate) => candidate.rank)).toEqual([1, 2, 3]);
  });

  it('maps YES to support, NO to contradiction, and produces LIMITED evidence safely', () => {
    const candidates = generateDiagnosticCandidates(
      input({
        WATER_PUMP_MORE_FREQUENT: 'YES',
        WATER_FLOW_LEAK_ISSUE: 'NO',
      })
    );
    const water = candidates.find(
      (candidate) => candidate.candidateCode === 'WATER_SYSTEM_CHANGE'
    );
    expect(water?.supportingFactors.some((factor) => factor.sourceCode === 'WATER_PUMP_MORE_FREQUENT')).toBe(
      true
    );
    expect(water?.contradictingFactors.some((factor) => factor.sourceCode === 'WATER_FLOW_LEAK_ISSUE')).toBe(
      true
    );
    expect(water?.evidenceLevel).toBe('LIMITED');
    expect(water?.internalScore).toBe(35);
  });

  it('uses STRONG for two direct administrative supports and MODERATE for one direct support', () => {
    const strong = generateDiagnosticCandidates(
      input({
        ADMIN_RECORDING_CHANGED: 'YES',
        ADMIN_TARIFF_POWER_CHANGED: 'YES',
      })
    ).find((candidate) => candidate.candidateCode === 'BILL_ADMINISTRATION_CHANGE');
    expect(strong?.evidenceLevel).toBe('STRONG');

    const moderate = generateDiagnosticCandidates(
      input({ NEW_ELECTRICAL_APPLIANCE: 'YES' })
    ).find((candidate) => candidate.candidateCode === 'NEW_ELECTRICAL_APPLIANCE');
    expect(moderate?.evidenceLevel).toBe('MODERATE');
  });

  it('keeps UNKNOWN neutral, makes NOT_APPLICABLE ineligible, and hides unsupported candidates', () => {
    const unknown = generateDiagnosticCandidates(
      input({ OCCUPANCY_INCREASED: 'UNKNOWN' })
    );
    expect(
      unknown.some((candidate) => candidate.candidateCode === 'OCCUPANCY_INCREASE')
    ).toBe(false);

    const notApplicable = generateDiagnosticCandidates(
      input({ OCCUPANCY_INCREASED: 'NOT_APPLICABLE' })
    );
    expect(
      notApplicable.some(
        (candidate) => candidate.candidateCode === 'OCCUPANCY_INCREASE'
      )
    ).toBe(false);
  });

  it('does not use cost-only data for usage support and adds at most one kWh factor', () => {
    const costOnly = generateDiagnosticCandidates(
      input(
        { NEW_ELECTRICAL_APPLIANCE: 'YES' },
        { currentKwh: null, previousKwh: null }
      )
    ).find((candidate) => candidate.candidateCode === 'NEW_ELECTRICAL_APPLIANCE');
    expect(
      costOnly?.supportingFactors.some((factor) => factor.sourceType === 'BILL_CONTEXT')
    ).toBe(false);

    const withKwh = generateDiagnosticCandidates(
      input({ NEW_ELECTRICAL_APPLIANCE: 'YES' })
    ).find((candidate) => candidate.candidateCode === 'NEW_ELECTRICAL_APPLIANCE');
    expect(
      withKwh?.supportingFactors.filter((factor) => factor.sourceType === 'BILL_CONTEXT')
    ).toHaveLength(1);
    expect(withKwh?.internalScore).toBe(50);
  });

  it('evaluates administrative, occupancy, operational, appliance, and water candidates', () => {
    const candidates = generateDiagnosticCandidates(input(fullAnswers('YES')));
    const allCodes = DIAGNOSTIC_CANDIDATE_CATALOG.map((definition) => definition.code);
    for (const code of allCodes) {
      const isolatedEntries = Object.fromEntries(
        QUESTION_CODES.map((questionCode) => [questionCode, 'NO'])
      ) as Record<(typeof QUESTION_CODES)[number], AnswerCode>;
      const definition = DIAGNOSTIC_CANDIDATE_CATALOG.find(
        (candidate) => candidate.code === code
      )!;
      for (const factor of definition.answerFactors) {
        isolatedEntries[factor.questionCode] = 'YES';
      }
      expect(
        generateDiagnosticCandidates(input(isolatedEntries)).some(
          (candidate) => candidate.candidateCode === code
        )
      ).toBe(true);
    }
    expect(candidates.every((candidate) => candidate.internalScore >= 0 && candidate.internalScore <= 100)).toBe(
      true
    );
  });

  it('uses deterministic catalog priority when score and evidence are tied', () => {
    const candidates = generateDiagnosticCandidates(
      input({
        OCCUPANCY_INCREASED: 'YES',
        SPECIAL_ACTIVITY: 'YES',
        NEW_ELECTRICAL_APPLIANCE: 'YES',
      })
    );
    expect(candidates.map((candidate) => candidate.candidateCode)).toEqual([
      'OCCUPANCY_INCREASE',
      'SPECIAL_ACTIVITY',
      'NEW_ELECTRICAL_APPLIANCE',
    ]);
  });

  it('produces DATA_QUALITY for all UNKNOWN and a zero state for all NO with complete kWh', () => {
    const allUnknown = generateDiagnosticCandidates(input(fullAnswers('UNKNOWN')));
    expect(allUnknown).toHaveLength(1);
    expect(allUnknown[0].candidateType).toBe('DATA_QUALITY');
    expect(allUnknown[0].evidenceLevel).toBe('LIMITED');

    const allNo = generateDiagnosticCandidates(input(fullAnswers('NO')));
    expect(allNo).toEqual([]);
  });

  it('uses only stored factors in explanations without causal, recommendation, or probability wording', () => {
    const candidate = generateDiagnosticCandidates(
      input({
        WATER_PUMP_MORE_FREQUENT: 'YES',
        WATER_FLOW_LEAK_ISSUE: 'NO',
      })
    )[0];
    for (const factor of [
      ...candidate.supportingFactors,
      ...candidate.contradictingFactors,
    ]) {
      expect(candidate.explanation).toContain(factor.displayLabel);
    }
    expect(candidate.explanation.toLowerCase()).not.toMatch(
      /kemungkinan|probabilitas|rekomendasi|penyebab pasti/
    );
  });
});

describe('IT-DIAG-03 generation payload validation', () => {
  it('accepts only the authoritative session identifier', () => {
    expect(generateDiagnosticCandidatesSchema.safeParse({ sessionId: 'session-1' }).success).toBe(
      true
    );
    for (const forbidden of [
      'businessId',
      'userId',
      'candidateType',
      'internalScore',
      'rank',
      'ruleVersion',
      'status',
    ]) {
      expect(
        generateDiagnosticCandidatesSchema.safeParse({
          sessionId: 'session-1',
          [forbidden]: 'spoofed',
        }).success
      ).toBe(false);
    }
  });
});
