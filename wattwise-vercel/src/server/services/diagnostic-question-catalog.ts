import type { BusinessSegment } from '@/server/db/schema/journey';
import {
  DIAGNOSTIC_ANSWER_CODES,
  type DiagnosticAnswerCode,
} from '@/server/db/schema/diagnostics';

export const KOS_DIAGNOSTIC_RULE_VERSION = 'KOS_CONTEXT_V1';

export const KOS_QUESTION_CODES = [
  'ADMIN_RECORDING_CHANGED',
  'ADMIN_TARIFF_POWER_CHANGED',
  'OCCUPANCY_INCREASED',
  'SPECIAL_ACTIVITY',
  'NEW_ELECTRICAL_APPLIANCE',
  'WATER_PUMP_MORE_FREQUENT',
  'WATER_FLOW_LEAK_ISSUE',
] as const;

export type KosQuestionCode = (typeof KOS_QUESTION_CODES)[number];

export interface DiagnosticQuestion {
  code: KosQuestionCode;
  version: 1;
  prompt: string;
  helpText: string;
}

export interface DiagnosticCatalogAnswer {
  questionCode: string;
  questionVersion: number;
  answerCode: DiagnosticAnswerCode;
}

export const DIAGNOSTIC_ANSWER_OPTIONS: ReadonlyArray<{
  code: DiagnosticAnswerCode;
  label: string;
}> = [
  { code: 'YES', label: 'Ya' },
  { code: 'NO', label: 'Tidak' },
  { code: 'UNKNOWN', label: 'Tidak tahu' },
  { code: 'NOT_APPLICABLE', label: 'Tidak relevan' },
];

const KOS_QUESTIONS: ReadonlyArray<DiagnosticQuestion> = [
  {
    code: 'ADMIN_RECORDING_CHANGED',
    version: 1,
    prompt: 'Apakah tanggal atau cara pencatatan tagihan berbeda dari periode sebelumnya?',
    helpText: 'Jawab berdasarkan informasi administrasi tagihan yang Anda miliki.',
  },
  {
    code: 'ADMIN_TARIFF_POWER_CHANGED',
    version: 1,
    prompt: 'Apakah tarif atau daya listrik berubah, jika Anda mengetahuinya?',
    helpText: 'Pilih “Tidak tahu” bila informasi tarif atau daya tidak tersedia.',
  },
  {
    code: 'OCCUPANCY_INCREASED',
    version: 1,
    prompt: 'Apakah jumlah penghuni bertambah pada periode ini?',
    helpText: 'Pertimbangkan penghuni tetap maupun tambahan sementara.',
  },
  {
    code: 'SPECIAL_ACTIVITY',
    version: 1,
    prompt: 'Apakah ada kegiatan khusus pada periode ini?',
    helpText: 'Contohnya renovasi, acara, atau aktivitas lain di luar rutinitas.',
  },
  {
    code: 'NEW_ELECTRICAL_APPLIANCE',
    version: 1,
    prompt: 'Apakah ada alat listrik baru yang mulai digunakan?',
    helpText: 'Jawab berdasarkan perubahan peralatan yang Anda ketahui.',
  },
  {
    code: 'WATER_PUMP_MORE_FREQUENT',
    version: 1,
    prompt: 'Apakah pompa air lebih sering menyala pada periode ini?',
    helpText: 'Pilih “Tidak relevan” bila usaha tidak menggunakan pompa air.',
  },
  {
    code: 'WATER_FLOW_LEAK_ISSUE',
    version: 1,
    prompt: 'Apakah ada kebocoran atau masalah aliran air yang diketahui?',
    helpText: 'Pertanyaan ini hanya muncul bila kondisi pompa perlu diperiksa lebih lanjut.',
  },
];

const BASE_QUESTION_CODES = KOS_QUESTION_CODES.slice(0, 6);

function answerMap(answers: ReadonlyArray<DiagnosticCatalogAnswer>) {
  return new Map(
    answers.map((answer) => [
      `${answer.questionCode}:${answer.questionVersion}`,
      answer.answerCode,
    ])
  );
}

export function getDiagnosticCatalog(segment: BusinessSegment, ruleVersion: string) {
  if (segment !== 'KOS' || ruleVersion !== KOS_DIAGNOSTIC_RULE_VERSION) return null;
  return KOS_QUESTIONS;
}

export function resolveKosQuestionnaire(answers: ReadonlyArray<DiagnosticCatalogAnswer>) {
  const byQuestion = answerMap(answers);
  const pumpAnswer = byQuestion.get('WATER_PUMP_MORE_FREQUENT:1');
  const includeWaterFlowQuestion = pumpAnswer === 'YES' || pumpAnswer === 'UNKNOWN';
  const eligibleCodes = includeWaterFlowQuestion
    ? KOS_QUESTION_CODES
    : BASE_QUESTION_CODES;
  const questions = KOS_QUESTIONS.filter((question) => eligibleCodes.includes(question.code));
  const nextQuestion =
    questions.find(
      (question) => !byQuestion.has(`${question.code}:${question.version}`)
    ) ?? null;

  return {
    questions,
    nextQuestion,
    completed: nextQuestion === null,
    answeredCount: questions.filter((question) =>
      byQuestion.has(`${question.code}:${question.version}`)
    ).length,
    maximumQuestionCount: KOS_QUESTIONS.length,
  };
}

export function isDiagnosticAnswerCode(value: string): value is DiagnosticAnswerCode {
  return DIAGNOSTIC_ANSWER_CODES.some((code) => code === value);
}
