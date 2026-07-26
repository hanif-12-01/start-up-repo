import type {
  InspectionAnswerCode,
  InspectionSafetyLevel,
} from '@/server/db/schema/inspections';

export const INSPECTION_ANSWER_LABELS: Record<InspectionAnswerCode, string> = {
  FOUND: 'Ditemukan Masalah',
  NOT_FOUND: 'Tidak Ditemukan',
  UNKNOWN: 'Tidak Tahu',
  NEEDS_HELP: 'Butuh Bantuan',
};

export const INSPECTION_SAFETY_LABELS: Record<InspectionSafetyLevel, string> = {
  SAFE_OBSERVATION: 'Aman untuk diamati',
  PROFESSIONAL_REQUIRED: 'Hentikan dan minta bantuan',
};

export const INSPECTION_RESULT_COPY: Record<InspectionAnswerCode, string> = {
  FOUND:
    'Ada hal yang tercatat selama observasi. Hasil ini belum membuktikan penyebab perubahan.',
  NOT_FOUND:
    'Tidak ada hal yang tercatat pada langkah observasi ini. Hasil ini bukan kepastian bahwa tidak ada perubahan.',
  UNKNOWN:
    'Sebagian hasil belum dapat dipastikan. Jangan menebak atau melakukan pemeriksaan yang tidak aman.',
  NEEDS_HELP:
    'Pemeriksaan dihentikan. Jangan menyentuh atau membongkar perangkat; minta bantuan teknisi yang kompeten.',
};
