import type {
  DiagnosticCandidateType,
  DiagnosticEvidenceLevel,
} from '@/server/db/schema/diagnostics';
import type {
  DiagnosticAnswerRecord,
  DiagnosticBillSnapshot,
} from '@/server/repositories/diagnostic.repository';
import { compareBills } from '@/server/services/bill-comparison.service';
import {
  DIAGNOSTIC_CANDIDATE_CATALOG,
  DIAGNOSTIC_DATA_QUALITY_CANDIDATE,
  type DiagnosticCandidateDefinition,
  type DiagnosticCandidateFactor,
} from '@/server/services/diagnostic-candidate-catalog';

const MAX_CANDIDATES = 3;
const MINIMUM_CAUSAL_SCORE = 20;

export interface GeneratedDiagnosticCandidate {
  candidateCode: string;
  candidateVersion: number;
  candidateType: DiagnosticCandidateType;
  ruleVersion: string;
  title: string;
  rank: number;
  internalScore: number;
  evidenceLevel: DiagnosticEvidenceLevel;
  explanation: string;
  supportingFactors: DiagnosticCandidateFactor[];
  contradictingFactors: DiagnosticCandidateFactor[];
}

export interface DiagnosticCandidateGenerationInput {
  answers: ReadonlyArray<
    Pick<
      DiagnosticAnswerRecord,
      'questionCode' | 'questionVersion' | 'answerCode'
    >
  >;
  eligibleQuestionCount: number;
  currentBill: DiagnosticBillSnapshot;
  comparisonBill: DiagnosticBillSnapshot;
}

interface RankedCandidate extends Omit<GeneratedDiagnosticCandidate, 'rank'> {
  tieBreakPriority: number;
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function answerKey(questionCode: string, questionVersion: number) {
  return `${questionCode}:${questionVersion}`;
}

function billComparison(
  current: DiagnosticBillSnapshot,
  previous: DiagnosticBillSnapshot
) {
  const now = new Date(0);
  const toBill = (bill: DiagnosticBillSnapshot) => ({
    ...bill,
    businessId: '',
    businessName: '',
    notes: null,
    createdAt: now,
    updatedAt: now,
  });
  return compareBills(toBill(current), toBill(previous));
}

function answerFactor(
  definition: DiagnosticCandidateDefinition,
  factor: DiagnosticCandidateDefinition['answerFactors'][number],
  supporting: boolean
): DiagnosticCandidateFactor {
  const direct = factor.strength === 'DIRECT';
  return {
    factorCode: `${definition.code}_${factor.questionCode}_${supporting ? 'YES' : 'NO'}`,
    sourceType: 'ANSWER',
    sourceCode: factor.questionCode,
    sourceVersion: factor.questionVersion,
    displayLabel: supporting ? factor.supportingLabel : factor.contradictingLabel,
    weight: supporting ? (direct ? 40 : 20) : direct ? -35 : -15,
  };
}

function objectiveFactor(
  code: string,
  label: string
): DiagnosticCandidateFactor {
  return {
    factorCode: code,
    sourceType: 'BILL_CONTEXT',
    sourceCode: code,
    sourceVersion: 1,
    displayLabel: label,
    weight: 10,
  };
}

function evidenceLevel(
  definition: DiagnosticCandidateDefinition,
  supportingFactors: ReadonlyArray<DiagnosticCandidateFactor>,
  contradictingFactors: ReadonlyArray<DiagnosticCandidateFactor>
): DiagnosticEvidenceLevel {
  const directQuestionCodes = new Set(
    definition.answerFactors
      .filter((factor) => factor.strength === 'DIRECT')
      .map((factor) => factor.questionCode)
  );
  const directSupports = supportingFactors.filter(
    (factor) =>
      factor.sourceType === 'ANSWER' && directQuestionCodes.has(factor.sourceCode as never)
  ).length;
  if (directSupports >= 2 && contradictingFactors.length === 0) return 'STRONG';
  if (directSupports >= 1 && contradictingFactors.length === 0) return 'MODERATE';
  return 'LIMITED';
}

function explanation(
  definition: DiagnosticCandidateDefinition,
  supportingFactors: ReadonlyArray<DiagnosticCandidateFactor>,
  contradictingFactors: ReadonlyArray<DiagnosticCandidateFactor>
) {
  const support = supportingFactors.map((factor) => factor.displayLabel).join('; ');
  const limitation = contradictingFactors.map((factor) => factor.displayLabel).join('; ');
  return [
    definition.descriptionTemplate,
    `Bagian ini masuk daftar berdasarkan: ${support}.`,
    limitation ? `Informasi yang membatasi: ${limitation}.` : '',
    'Daftar ini merupakan bagian yang perlu dicek, bukan diagnosis penyebab.',
  ]
    .filter(Boolean)
    .join(' ');
}

function generateCausalCandidate(
  definition: DiagnosticCandidateDefinition,
  input: DiagnosticCandidateGenerationInput,
  insights: {
    usageIncreased: boolean;
    tariffChanged: boolean;
  }
): RankedCandidate | null {
  const answers = new Map(
    input.answers.map((answer) => [
      answerKey(answer.questionCode, answer.questionVersion),
      answer.answerCode,
    ])
  );
  const relevant = definition.answerFactors
    .map((factor) => ({
      factor,
      answer: answers.get(answerKey(factor.questionCode, factor.questionVersion)),
    }))
    .filter(({ answer, factor }) => answer !== undefined || !factor.optional);

  if (
    relevant.some(({ answer, factor }) => !factor.optional && answer === undefined) ||
    relevant.some(({ answer }) => answer === 'NOT_APPLICABLE')
  ) {
    return null;
  }

  const supportingFactors = relevant
    .filter(({ answer }) => answer === 'YES')
    .map(({ factor }) => answerFactor(definition, factor, true));
  const contradictingFactors = relevant
    .filter(({ answer }) => answer === 'NO')
    .map(({ factor }) => answerFactor(definition, factor, false));

  const supportingYesCount = supportingFactors.length;
  if (supportingYesCount === 0) return null;

  if (definition.supportsUsageContext && insights.usageIncreased) {
    supportingFactors.push(
      objectiveFactor(
        'DAILY_KWH_INCREASED',
        'kWh per hari tercatat lebih tinggi setelah normalisasi periode'
      )
    );
  }
  if (definition.supportsTariffContext && insights.tariffChanged) {
    supportingFactors.push(
      objectiveFactor(
        'RECORDED_TARIFF_CHANGED',
        'Nilai tarif yang tersimpan berbeda antarperiode'
      )
    );
  }

  const score = clampScore(
    supportingFactors.reduce((sum, factor) => sum + factor.weight, 0) +
      contradictingFactors.reduce((sum, factor) => sum + factor.weight, 0)
  );
  if (score < MINIMUM_CAUSAL_SCORE) return null;

  return {
    candidateCode: definition.code,
    candidateVersion: definition.version,
    candidateType: definition.type,
    ruleVersion: definition.ruleVersion,
    title: definition.title,
    internalScore: score,
    evidenceLevel: evidenceLevel(
      definition,
      supportingFactors,
      contradictingFactors
    ),
    explanation: explanation(
      definition,
      supportingFactors,
      contradictingFactors
    ),
    supportingFactors,
    contradictingFactors,
    tieBreakPriority: definition.tieBreakPriority,
  };
}

function dataQualityFactor(
  factorCode: string,
  displayLabel: string
): DiagnosticCandidateFactor {
  return {
    factorCode,
    sourceType: 'DATA_QUALITY',
    sourceCode: factorCode,
    sourceVersion: 1,
    displayLabel,
    weight: 0,
  };
}

function generateDataQualityCandidate(
  input: DiagnosticCandidateGenerationInput,
  causalCandidateCount: number
): RankedCandidate | null {
  const unknownCount = input.answers.filter(
    (answer) => answer.answerCode === 'UNKNOWN'
  ).length;
  const atLeastHalfUnknown =
    input.eligibleQuestionCount > 0 &&
    unknownCount >= Math.ceil(input.eligibleQuestionCount / 2);
  const kwhComparisonUnavailable =
    input.currentBill.kwh === null || input.comparisonBill.kwh === null;
  const insufficientRelevantSupport =
    causalCandidateCount === 0 && unknownCount > 0;

  const supportingFactors: DiagnosticCandidateFactor[] = [];
  if (atLeastHalfUnknown) {
    supportingFactors.push(
      dataQualityFactor(
        'UNKNOWN_ANSWER_COVERAGE',
        `${unknownCount} dari ${input.eligibleQuestionCount} jawaban masih belum diketahui`
      )
    );
  }
  if (kwhComparisonUnavailable) {
    supportingFactors.push(
      dataQualityFactor(
        'KWH_COMPARISON_UNAVAILABLE',
        'Data kWh belum lengkap pada kedua periode pembanding'
      )
    );
  }
  if (insufficientRelevantSupport) {
    supportingFactors.push(
      dataQualityFactor(
        'INSUFFICIENT_RELEVANT_SUPPORT',
        'Jawaban yang diketahui belum cukup untuk mempersempit bagian yang perlu dicek'
      )
    );
  }
  if (supportingFactors.length === 0) return null;

  return {
    candidateCode: DIAGNOSTIC_DATA_QUALITY_CANDIDATE.code,
    candidateVersion: DIAGNOSTIC_DATA_QUALITY_CANDIDATE.version,
    candidateType: DIAGNOSTIC_DATA_QUALITY_CANDIDATE.type,
    ruleVersion: DIAGNOSTIC_DATA_QUALITY_CANDIDATE.ruleVersion,
    title: DIAGNOSTIC_DATA_QUALITY_CANDIDATE.title,
    internalScore: clampScore(20 + (supportingFactors.length - 1) * 10),
    evidenceLevel: 'LIMITED',
    explanation: `${DIAGNOSTIC_DATA_QUALITY_CANDIDATE.descriptionTemplate} Lengkapi konteks bila informasinya tersedia; kondisi ini bukan diagnosis penyebab.`,
    supportingFactors,
    contradictingFactors: [],
    tieBreakPriority: DIAGNOSTIC_DATA_QUALITY_CANDIDATE.tieBreakPriority,
  };
}

const EVIDENCE_ORDER: Record<DiagnosticEvidenceLevel, number> = {
  STRONG: 3,
  MODERATE: 2,
  LIMITED: 1,
};

export function generateDiagnosticCandidates(
  input: DiagnosticCandidateGenerationInput
): GeneratedDiagnosticCandidate[] {
  const comparison = billComparison(input.currentBill, input.comparisonBill);
  const usageIncreased =
    comparison.dailyKwh !== null && Number(comparison.dailyKwh.difference) > 0;
  const tariffChanged =
    input.currentBill.tariffRupiahPerKwh !== null &&
    input.comparisonBill.tariffRupiahPerKwh !== null &&
    Number(input.currentBill.tariffRupiahPerKwh) !==
      Number(input.comparisonBill.tariffRupiahPerKwh);

  const causal = DIAGNOSTIC_CANDIDATE_CATALOG.map((definition) =>
    generateCausalCandidate(definition, input, {
      usageIncreased,
      tariffChanged,
    })
  ).filter((candidate): candidate is RankedCandidate => candidate !== null);
  const dataQuality = generateDataQualityCandidate(input, causal.length);
  const ranked = [...causal, ...(dataQuality ? [dataQuality] : [])]
    .sort(
      (left, right) =>
        right.internalScore - left.internalScore ||
        EVIDENCE_ORDER[right.evidenceLevel] - EVIDENCE_ORDER[left.evidenceLevel] ||
        left.tieBreakPriority - right.tieBreakPriority ||
        left.candidateCode.localeCompare(right.candidateCode)
    )
    .slice(0, MAX_CANDIDATES);

  return ranked.map((candidate, index) => ({
    candidateCode: candidate.candidateCode,
    candidateVersion: candidate.candidateVersion,
    candidateType: candidate.candidateType,
    ruleVersion: candidate.ruleVersion,
    title: candidate.title,
    rank: index + 1,
    internalScore: candidate.internalScore,
    evidenceLevel: candidate.evidenceLevel,
    explanation: candidate.explanation,
    supportingFactors: candidate.supportingFactors,
    contradictingFactors: candidate.contradictingFactors,
  }));
}
