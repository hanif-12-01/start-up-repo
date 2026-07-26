import type {
  InspectionAnswerCode,
  InspectionSafetyLevel,
} from '@/server/db/schema/inspections';
import { DIAGNOSTIC_CANDIDATE_RULE_VERSION } from '@/server/services/diagnostic-candidate-catalog';

export const INSPECTION_RULE_VERSION = 'INSPECTION_RULE_V1';

export interface InspectionItemDefinition {
  code: string;
  version: 1;
  instruction: string;
  safetyLevel: InspectionSafetyLevel;
  sortOrder: number;
  resultOptions: ReadonlyArray<InspectionAnswerCode>;
}

export interface InspectionDefinition {
  code: string;
  version: 1;
  ruleVersion: typeof INSPECTION_RULE_VERSION;
  candidateCode: string;
  candidateVersion: 1;
  candidateRuleVersion: typeof DIAGNOSTIC_CANDIDATE_RULE_VERSION;
  title: string;
  introduction: string;
  completionCopy: string;
  items: ReadonlyArray<InspectionItemDefinition>;
}

const STANDARD_OPTIONS = [
  'FOUND',
  'NOT_FOUND',
  'UNKNOWN',
  'NEEDS_HELP',
] as const satisfies ReadonlyArray<InspectionAnswerCode>;

const HAZARD_OPTIONS = [
  'NOT_FOUND',
  'UNKNOWN',
  'NEEDS_HELP',
] as const satisfies ReadonlyArray<InspectionAnswerCode>;

const HAZARD_ITEM = {
  code: 'VISIBLE_HAZARD_STOP',
  version: 1,
  instruction:
    'Dari jarak aman, amati apakah terlihat air dekat instalasi listrik, kabel terbuka, asap, percikan, atau tanda terbakar. Jika ada salah satunya, jangan menyentuh atau membongkar apa pun. Hentikan pemeriksaan dan minta bantuan teknisi yang kompeten.',
  safetyLevel: 'PROFESSIONAL_REQUIRED',
  resultOptions: HAZARD_OPTIONS,
} as const;

export const INSPECTION_CATALOG: ReadonlyArray<InspectionDefinition> = [
  {
    code: 'BILL_ADMINISTRATION_REVIEW',
    version: 1,
    ruleVersion: INSPECTION_RULE_VERSION,
    candidateCode: 'BILL_ADMINISTRATION_CHANGE',
    candidateVersion: 1,
    candidateRuleVersion: DIAGNOSTIC_CANDIDATE_RULE_VERSION,
    title: 'Periksa rincian tagihan yang tersimpan',
    introduction:
      'Bandingkan hanya informasi yang tercetak atau sudah tersimpan pada dua tagihan. Jangan membuka perangkat atau instalasi listrik.',
    completionCopy:
      'Observasi rincian tagihan sudah dicatat. Hasil ini belum menyatakan penyebab perubahan.',
    items: [
      {
        code: 'BILL_PERIOD_DATES',
        version: 1,
        instruction:
          'Bandingkan tanggal awal dan akhir periode pada dua tagihan yang tersimpan.',
        safetyLevel: 'SAFE_OBSERVATION',
        sortOrder: 1,
        resultOptions: STANDARD_OPTIONS,
      },
      {
        code: 'BILL_RECORDED_AMOUNT',
        version: 1,
        instruction:
          'Bandingkan nominal total yang tercetak atau tersimpan pada dua periode.',
        safetyLevel: 'SAFE_OBSERVATION',
        sortOrder: 2,
        resultOptions: STANDARD_OPTIONS,
      },
      {
        code: 'BILL_TARIFF_POWER_LABEL',
        version: 1,
        instruction:
          'Jika tercantum pada tagihan, bandingkan label tarif dan daya tanpa menebak informasi yang tidak tersedia.',
        safetyLevel: 'SAFE_OBSERVATION',
        sortOrder: 3,
        resultOptions: STANDARD_OPTIONS,
      },
      { ...HAZARD_ITEM, sortOrder: 4 },
    ],
  },
  {
    code: 'OCCUPANCY_REVIEW',
    version: 1,
    ruleVersion: INSPECTION_RULE_VERSION,
    candidateCode: 'OCCUPANCY_INCREASE',
    candidateVersion: 1,
    candidateRuleVersion: DIAGNOSTIC_CANDIDATE_RULE_VERSION,
    title: 'Periksa perubahan penghuni yang terlihat',
    introduction:
      'Catat perubahan aktivitas penghuni yang Anda ketahui. Tidak perlu memeriksa perangkat atau instalasi listrik.',
    completionCopy:
      'Observasi perubahan penghuni sudah dicatat. Catatan ini bukan diagnosis penyebab.',
    items: [
      {
        code: 'CURRENT_OCCUPANCY',
        version: 1,
        instruction:
          'Bandingkan jumlah penghuni yang diketahui pada periode sekarang dengan periode pembanding.',
        safetyLevel: 'SAFE_OBSERVATION',
        sortOrder: 1,
        resultOptions: STANDARD_OPTIONS,
      },
      {
        code: 'TEMPORARY_GUESTS',
        version: 1,
        instruction:
          'Catat apakah ada tamu atau penghuni sementara pada periode sekarang.',
        safetyLevel: 'SAFE_OBSERVATION',
        sortOrder: 2,
        resultOptions: STANDARD_OPTIONS,
      },
      {
        code: 'ACTIVE_ROOMS',
        version: 1,
        instruction:
          'Catat apakah jumlah kamar atau area bersama yang digunakan terlihat berubah.',
        safetyLevel: 'SAFE_OBSERVATION',
        sortOrder: 3,
        resultOptions: STANDARD_OPTIONS,
      },
      { ...HAZARD_ITEM, sortOrder: 4 },
    ],
  },
  {
    code: 'SPECIAL_ACTIVITY_REVIEW',
    version: 1,
    ruleVersion: INSPECTION_RULE_VERSION,
    candidateCode: 'SPECIAL_ACTIVITY',
    candidateVersion: 1,
    candidateRuleVersion: DIAGNOSTIC_CANDIDATE_RULE_VERSION,
    title: 'Periksa kegiatan di luar rutinitas',
    introduction:
      'Amati dan catat kegiatan yang terlihat atau diketahui pada periode tagihan. Jangan membongkar perangkat.',
    completionCopy:
      'Observasi kegiatan khusus sudah dicatat. Hasil ini belum membuktikan penyebab perubahan.',
    items: [
      {
        code: 'SPECIAL_EVENT',
        version: 1,
        instruction:
          'Catat apakah ada acara, pekerjaan sementara, atau kegiatan lain di luar rutinitas.',
        safetyLevel: 'SAFE_OBSERVATION',
        sortOrder: 1,
        resultOptions: STANDARD_OPTIONS,
      },
      {
        code: 'LONGER_ACTIVITY_HOURS',
        version: 1,
        instruction:
          'Bandingkan apakah jam aktivitas yang diketahui lebih panjang dari periode pembanding.',
        safetyLevel: 'SAFE_OBSERVATION',
        sortOrder: 2,
        resultOptions: STANDARD_OPTIONS,
      },
      {
        code: 'SHARED_AREA_ACTIVITY',
        version: 1,
        instruction:
          'Amati dari area yang aman apakah penggunaan ruang bersama terlihat berbeda.',
        safetyLevel: 'SAFE_OBSERVATION',
        sortOrder: 3,
        resultOptions: STANDARD_OPTIONS,
      },
      { ...HAZARD_ITEM, sortOrder: 4 },
    ],
  },
  {
    code: 'NEW_APPLIANCE_REVIEW',
    version: 1,
    ruleVersion: INSPECTION_RULE_VERSION,
    candidateCode: 'NEW_ELECTRICAL_APPLIANCE',
    candidateVersion: 1,
    candidateRuleVersion: DIAGNOSTIC_CANDIDATE_RULE_VERSION,
    title: 'Periksa alat listrik baru yang terlihat',
    introduction:
      'Amati alat dari posisi aman tanpa memindahkan, membuka casing, mencabut kabel, atau menyentuh instalasi.',
    completionCopy:
      'Observasi alat baru sudah dicatat. Catatan ini bukan diagnosis dan bukan instruksi perbaikan.',
    items: [
      {
        code: 'VISIBLE_NEW_APPLIANCE',
        version: 1,
        instruction:
          'Dari posisi aman, catat apakah ada alat listrik baru yang terlihat pada periode sekarang.',
        safetyLevel: 'SAFE_OBSERVATION',
        sortOrder: 1,
        resultOptions: STANDARD_OPTIONS,
      },
      {
        code: 'KNOWN_START_DATE',
        version: 1,
        instruction:
          'Catat waktu mulai penggunaan hanya jika informasinya sudah diketahui.',
        safetyLevel: 'SAFE_OBSERVATION',
        sortOrder: 2,
        resultOptions: STANDARD_OPTIONS,
      },
      {
        code: 'VISIBLE_USAGE_PATTERN',
        version: 1,
        instruction:
          'Catat frekuensi penggunaan yang diketahui tanpa menyalakan alat khusus untuk pemeriksaan.',
        safetyLevel: 'SAFE_OBSERVATION',
        sortOrder: 3,
        resultOptions: STANDARD_OPTIONS,
      },
      { ...HAZARD_ITEM, sortOrder: 4 },
    ],
  },
  {
    code: 'WATER_SYSTEM_REVIEW',
    version: 1,
    ruleVersion: INSPECTION_RULE_VERSION,
    candidateCode: 'WATER_SYSTEM_CHANGE',
    candidateVersion: 1,
    candidateRuleVersion: DIAGNOSTIC_CANDIDATE_RULE_VERSION,
    title: 'Periksa perubahan sistem air dari area aman',
    introduction:
      'Gunakan pengamatan visual dan suara dari area yang kering dan aman. Jangan mendekati air yang berada dekat instalasi listrik.',
    completionCopy:
      'Observasi sistem air sudah dicatat. Jika ada tanda bahaya, hentikan pemeriksaan dan minta bantuan teknisi yang kompeten.',
    items: [
      {
        code: 'KNOWN_PUMP_FREQUENCY',
        version: 1,
        instruction:
          'Dari area aman, catat apakah suara pompa terdengar lebih sering berdasarkan rutinitas yang sudah diketahui.',
        safetyLevel: 'SAFE_OBSERVATION',
        sortOrder: 1,
        resultOptions: STANDARD_OPTIONS,
      },
      {
        code: 'VISIBLE_DRY_AREA_LEAK',
        version: 1,
        instruction:
          'Dari area kering dan aman, amati apakah ada kebocoran yang terlihat tanpa menyentuh pipa, pompa, kabel, atau genangan.',
        safetyLevel: 'SAFE_OBSERVATION',
        sortOrder: 2,
        resultOptions: STANDARD_OPTIONS,
      },
      {
        code: 'KNOWN_WATER_FLOW_CHANGE',
        version: 1,
        instruction:
          'Catat perubahan aliran air hanya dari penggunaan normal yang sudah berlangsung; jangan menyalakan peralatan khusus untuk pemeriksaan.',
        safetyLevel: 'SAFE_OBSERVATION',
        sortOrder: 3,
        resultOptions: STANDARD_OPTIONS,
      },
      { ...HAZARD_ITEM, sortOrder: 4 },
    ],
  },
];

export function findInspectionDefinition(input: {
  candidateCode: string;
  candidateVersion: number;
  candidateRuleVersion: string;
}): InspectionDefinition | null {
  return (
    INSPECTION_CATALOG.find(
      (definition) =>
        definition.candidateCode === input.candidateCode &&
        definition.candidateVersion === input.candidateVersion &&
        definition.candidateRuleVersion === input.candidateRuleVersion
    ) ?? null
  );
}

export function findInspectionDefinitionByVersion(input: {
  inspectionCode: string;
  inspectionVersion: number;
  ruleVersion: string;
}): InspectionDefinition | null {
  return (
    INSPECTION_CATALOG.find(
      (definition) =>
        definition.code === input.inspectionCode &&
        definition.version === input.inspectionVersion &&
        definition.ruleVersion === input.ruleVersion
    ) ?? null
  );
}
