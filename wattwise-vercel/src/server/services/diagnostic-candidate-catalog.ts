import type { DiagnosticCandidateType } from '@/server/db/schema/diagnostics';
import type { KosQuestionCode } from '@/server/services/diagnostic-question-catalog';

export const DIAGNOSTIC_CANDIDATE_RULE_VERSION = 'DIAG_CANDIDATE_RULE_V1';

export const DIAGNOSTIC_FACTOR_SOURCE_TYPES = [
  'ANSWER',
  'BILL_CONTEXT',
  'DATA_QUALITY',
] as const;
export type DiagnosticFactorSourceType =
  (typeof DIAGNOSTIC_FACTOR_SOURCE_TYPES)[number];

export type CandidateFactorStrength = 'DIRECT' | 'SECONDARY';

export interface DiagnosticCandidateFactor {
  factorCode: string;
  sourceType: DiagnosticFactorSourceType;
  sourceCode: string;
  sourceVersion: number;
  displayLabel: string;
  weight: number;
}

export interface CandidateAnswerFactorDefinition {
  questionCode: KosQuestionCode;
  questionVersion: 1;
  strength: CandidateFactorStrength;
  optional?: boolean;
  supportingLabel: string;
  contradictingLabel: string;
}

export interface DiagnosticCandidateDefinition {
  code: string;
  version: 1;
  ruleVersion: typeof DIAGNOSTIC_CANDIDATE_RULE_VERSION;
  type: Exclude<DiagnosticCandidateType, 'DATA_QUALITY' | 'OTHER'>;
  title: string;
  descriptionTemplate: string;
  answerFactors: ReadonlyArray<CandidateAnswerFactorDefinition>;
  eligibilityRule: 'REQUIRED_ANSWERS_PRESENT_NO_NOT_APPLICABLE';
  supportsUsageContext: boolean;
  supportsTariffContext: boolean;
  tieBreakPriority: number;
}

export const DIAGNOSTIC_CANDIDATE_CATALOG: ReadonlyArray<DiagnosticCandidateDefinition> = [
  {
    code: 'BILL_ADMINISTRATION_CHANGE',
    version: 1,
    ruleVersion: DIAGNOSTIC_CANDIDATE_RULE_VERSION,
    type: 'ADMINISTRATIVE',
    title: 'Perubahan pencatatan atau tarif tagihan',
    descriptionTemplate:
      'Periksa kembali rincian administrasi, tanggal pencatatan, tarif, dan daya pada dua periode.',
    answerFactors: [
      {
        questionCode: 'ADMIN_TARIFF_POWER_CHANGED',
        questionVersion: 1,
        strength: 'DIRECT',
        supportingLabel: 'Perubahan tarif atau daya dijawab Ya',
        contradictingLabel: 'Perubahan tarif atau daya dijawab Tidak',
      },
      {
        questionCode: 'ADMIN_RECORDING_CHANGED',
        questionVersion: 1,
        strength: 'DIRECT',
        supportingLabel: 'Perubahan cara atau tanggal pencatatan dijawab Ya',
        contradictingLabel: 'Perubahan cara atau tanggal pencatatan dijawab Tidak',
      },
    ],
    eligibilityRule: 'REQUIRED_ANSWERS_PRESENT_NO_NOT_APPLICABLE',
    supportsUsageContext: false,
    supportsTariffContext: true,
    tieBreakPriority: 10,
  },
  {
    code: 'OCCUPANCY_INCREASE',
    version: 1,
    ruleVersion: DIAGNOSTIC_CANDIDATE_RULE_VERSION,
    type: 'OCCUPANCY',
    title: 'Perubahan jumlah penghuni',
    descriptionTemplate:
      'Periksa apakah perubahan jumlah penghuni sejalan dengan perubahan aktivitas pada periode ini.',
    answerFactors: [
      {
        questionCode: 'OCCUPANCY_INCREASED',
        questionVersion: 1,
        strength: 'DIRECT',
        supportingLabel: 'Pertambahan penghuni dijawab Ya',
        contradictingLabel: 'Pertambahan penghuni dijawab Tidak',
      },
    ],
    eligibilityRule: 'REQUIRED_ANSWERS_PRESENT_NO_NOT_APPLICABLE',
    supportsUsageContext: true,
    supportsTariffContext: false,
    tieBreakPriority: 20,
  },
  {
    code: 'SPECIAL_ACTIVITY',
    version: 1,
    ruleVersion: DIAGNOSTIC_CANDIDATE_RULE_VERSION,
    type: 'OPERATIONAL',
    title: 'Kegiatan khusus pada periode tagihan',
    descriptionTemplate:
      'Periksa kegiatan di luar rutinitas yang berlangsung pada periode tagihan ini.',
    answerFactors: [
      {
        questionCode: 'SPECIAL_ACTIVITY',
        questionVersion: 1,
        strength: 'DIRECT',
        supportingLabel: 'Kegiatan khusus dijawab Ya',
        contradictingLabel: 'Kegiatan khusus dijawab Tidak',
      },
    ],
    eligibilityRule: 'REQUIRED_ANSWERS_PRESENT_NO_NOT_APPLICABLE',
    supportsUsageContext: true,
    supportsTariffContext: false,
    tieBreakPriority: 30,
  },
  {
    code: 'NEW_ELECTRICAL_APPLIANCE',
    version: 1,
    ruleVersion: DIAGNOSTIC_CANDIDATE_RULE_VERSION,
    type: 'APPLIANCE',
    title: 'Alat listrik baru',
    descriptionTemplate:
      'Periksa alat listrik yang baru mulai digunakan selama periode tagihan ini.',
    answerFactors: [
      {
        questionCode: 'NEW_ELECTRICAL_APPLIANCE',
        questionVersion: 1,
        strength: 'DIRECT',
        supportingLabel: 'Penggunaan alat listrik baru dijawab Ya',
        contradictingLabel: 'Penggunaan alat listrik baru dijawab Tidak',
      },
    ],
    eligibilityRule: 'REQUIRED_ANSWERS_PRESENT_NO_NOT_APPLICABLE',
    supportsUsageContext: true,
    supportsTariffContext: false,
    tieBreakPriority: 40,
  },
  {
    code: 'WATER_SYSTEM_CHANGE',
    version: 1,
    ruleVersion: DIAGNOSTIC_CANDIDATE_RULE_VERSION,
    type: 'WATER_SYSTEM',
    title: 'Sistem pompa atau aliran air',
    descriptionTemplate:
      'Periksa pola kerja pompa dan kondisi aliran air pada periode tagihan ini.',
    answerFactors: [
      {
        questionCode: 'WATER_PUMP_MORE_FREQUENT',
        questionVersion: 1,
        strength: 'DIRECT',
        supportingLabel: 'Pompa lebih sering menyala dijawab Ya',
        contradictingLabel: 'Pompa lebih sering menyala dijawab Tidak',
      },
      {
        questionCode: 'WATER_FLOW_LEAK_ISSUE',
        questionVersion: 1,
        strength: 'SECONDARY',
        optional: true,
        supportingLabel: 'Masalah aliran atau kebocoran dijawab Ya',
        contradictingLabel: 'Masalah aliran atau kebocoran dijawab Tidak',
      },
    ],
    eligibilityRule: 'REQUIRED_ANSWERS_PRESENT_NO_NOT_APPLICABLE',
    supportsUsageContext: true,
    supportsTariffContext: false,
    tieBreakPriority: 50,
  },
];

export const DIAGNOSTIC_DATA_QUALITY_CANDIDATE = {
  code: 'INFORMATION_COMPLETENESS',
  version: 1,
  ruleVersion: DIAGNOSTIC_CANDIDATE_RULE_VERSION,
  type: 'DATA_QUALITY',
  title: 'Kelengkapan informasi',
  descriptionTemplate:
    'Beberapa informasi masih belum diketahui, sehingga bagian yang perlu diperiksa belum dapat dipersempit.',
  eligibilityRule:
    'HALF_UNKNOWN_OR_KWH_COMPARISON_UNAVAILABLE_OR_INSUFFICIENT_RELEVANT_SUPPORT',
  tieBreakPriority: 90,
} as const;
