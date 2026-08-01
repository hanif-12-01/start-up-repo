import type { InspectionAnswerCode } from '@/server/db/schema/inspections';
import { DIAGNOSTIC_CANDIDATE_RULE_VERSION } from '@/server/services/diagnostic-candidate-catalog';
import { INSPECTION_RULE_VERSION } from '@/server/services/inspection-catalog';

export const ACTION_PLAN_RULE_VERSION = 'ACTION_PLAN_RULE_V1';

export interface ActionStepDefinition {
  stepCode: string;
  instruction: string;
  order: number;
}

export interface ActionDefinition {
  actionCode: string;
  actionVersion: 1;
  ruleVersion: typeof ACTION_PLAN_RULE_VERSION;
  candidateCodes: ReadonlyArray<string>;
  candidateVersion: 1;
  candidateRuleVersion: typeof DIAGNOSTIC_CANDIDATE_RULE_VERSION;
  inspectionRuleVersion: typeof INSPECTION_RULE_VERSION;
  allowedInspectionResults: ReadonlyArray<InspectionAnswerCode>;
  title: string;
  description: string;
  reasonTemplate: string;
  steps: ReadonlyArray<ActionStepDefinition>;
  priority: number;
  reviewMode: 'NEXT_ELIGIBLE_BILL';
}

const ALL_INSPECTABLE_CANDIDATES = [
  'BILL_ADMINISTRATION_CHANGE',
  'OCCUPANCY_INCREASE',
  'SPECIAL_ACTIVITY',
  'NEW_ELECTRICAL_APPLIANCE',
  'WATER_SYSTEM_CHANGE',
] as const;

function action(
  definition: Omit<
    ActionDefinition,
    | 'actionVersion'
    | 'ruleVersion'
    | 'candidateVersion'
    | 'candidateRuleVersion'
    | 'inspectionRuleVersion'
    | 'reviewMode'
  >
): ActionDefinition {
  return {
    ...definition,
    actionVersion: 1,
    ruleVersion: ACTION_PLAN_RULE_VERSION,
    candidateVersion: 1,
    candidateRuleVersion: DIAGNOSTIC_CANDIDATE_RULE_VERSION,
    inspectionRuleVersion: INSPECTION_RULE_VERSION,
    reviewMode: 'NEXT_ELIGIBLE_BILL',
  };
}

export const ACTION_PLAN_CATALOG: ReadonlyArray<ActionDefinition> = [
  action({
    actionCode: 'REVIEW_BILL_RECORDS',
    candidateCodes: ['BILL_ADMINISTRATION_CHANGE'],
    allowedInspectionResults: ['FOUND'],
    title: 'Tinjau kembali catatan tagihan',
    description: 'Rapikan perbandingan data tagihan yang sudah tersedia tanpa menyimpulkan adanya kesalahan penyedia.',
    reasonTemplate: 'Pemeriksaan mencatat perbedaan pada rincian administrasi yang layak ditinjau kembali.',
    priority: 10,
    steps: [
      { stepCode: 'COMPARE_PERIOD_DATES', instruction: 'Bandingkan kembali tanggal awal dan akhir periode.', order: 1 },
      { stepCode: 'COMPARE_RECORDED_AMOUNTS', instruction: 'Bandingkan nominal yang dimasukkan dengan sumber tagihan yang tersedia.', order: 2 },
      { stepCode: 'NOTE_DIFFERENCES', instruction: 'Catat perbedaan yang ditemukan dengan bahasa netral.', order: 3 },
      { stepCode: 'KEEP_BILL_SOURCE', instruction: 'Simpan sumber tagihan yang digunakan untuk peninjauan berikutnya.', order: 4 },
    ],
  }),
  action({
    actionCode: 'PREPARE_OFFICIAL_PROVIDER_INQUIRY',
    candidateCodes: ['BILL_ADMINISTRATION_CHANGE'],
    allowedInspectionResults: ['FOUND'],
    title: 'Siapkan pertanyaan untuk kanal resmi penyedia',
    description: 'Kumpulkan rincian yang tersedia sebelum meminta penjelasan melalui kanal resmi penyedia bila diperlukan.',
    reasonTemplate: 'Pemeriksaan mencatat rincian yang dapat diklarifikasi tanpa menyatakan penyedia melakukan kesalahan.',
    priority: 20,
    steps: [
      { stepCode: 'COLLECT_PERIOD_DETAIL', instruction: 'Kumpulkan rincian periode yang dibandingkan.', order: 1 },
      { stepCode: 'COLLECT_AVAILABLE_VALUES', instruction: 'Kumpulkan nominal dan data lain yang sudah tersedia.', order: 2 },
      { stepCode: 'WRITE_NEUTRAL_QUESTIONS', instruction: 'Catat pertanyaan secara netral tanpa menyimpulkan kesalahan.', order: 3 },
      { stepCode: 'USE_OFFICIAL_CHANNEL', instruction: 'Gunakan kanal resmi penyedia jika perlu meminta penjelasan.', order: 4 },
    ],
  }),
  action({
    actionCode: 'TRACK_OCCUPANCY_AND_SHARED_USAGE',
    candidateCodes: ['OCCUPANCY_INCREASE'],
    allowedInspectionResults: ['FOUND'],
    title: 'Catat okupansi dan penggunaan bersama',
    description: 'Buat catatan sederhana mengenai perubahan penghuni, kamar aktif, dan fasilitas bersama.',
    reasonTemplate: 'Pemeriksaan mencatat perubahan okupansi yang dapat dipantau tanpa menyalahkan penghuni.',
    priority: 10,
    steps: [
      { stepCode: 'LOG_ACTIVE_OCCUPANTS', instruction: 'Catat jumlah penghuni aktif yang diketahui.', order: 1 },
      { stepCode: 'LOG_ACTIVE_ROOMS', instruction: 'Catat perubahan jumlah kamar aktif.', order: 2 },
      { stepCode: 'LOG_SHARED_USAGE', instruction: 'Catat penggunaan fasilitas bersama yang diketahui.', order: 3 },
    ],
  }),
  action({
    actionCode: 'SET_SHARED_FACILITY_ROUTINE',
    candidateCodes: ['OCCUPANCY_INCREASE'],
    allowedInspectionResults: ['FOUND'],
    title: 'Susun rutinitas fasilitas bersama',
    description: 'Susun rutinitas penggunaan fasilitas yang realistis bersama penghuni.',
    reasonTemplate: 'Pemeriksaan mencatat perubahan aktivitas bersama yang dapat dikelola melalui rutinitas yang disepakati.',
    priority: 20,
    steps: [
      { stepCode: 'IDENTIFY_SHARED_FACILITIES', instruction: 'Catat fasilitas bersama yang paling sering digunakan.', order: 1 },
      { stepCode: 'DISCUSS_REALISTIC_ROUTINE', instruction: 'Bicarakan rutinitas penggunaan yang realistis tanpa menyalahkan penghuni.', order: 2 },
      { stepCode: 'RECORD_AGREED_ROUTINE', instruction: 'Catat rutinitas yang disepakati untuk dipantau pada periode berikutnya.', order: 3 },
    ],
  }),
  action({
    actionCode: 'LOG_SPECIAL_ACTIVITY',
    candidateCodes: ['SPECIAL_ACTIVITY'],
    allowedInspectionResults: ['FOUND'],
    title: 'Catat kegiatan khusus',
    description: 'Dokumentasikan kegiatan di luar rutinitas tanpa menyatakan kegiatan itu sebagai penyebab pasti.',
    reasonTemplate: 'Pemeriksaan mencatat kegiatan khusus yang dapat dibandingkan dengan periode berikutnya.',
    priority: 10,
    steps: [
      { stepCode: 'LOG_ACTIVITY_DATE', instruction: 'Catat tanggal kegiatan khusus.', order: 1 },
      { stepCode: 'LOG_ACTIVITY_DURATION', instruction: 'Catat durasi kegiatan yang diketahui.', order: 2 },
      { stepCode: 'LOG_USED_FACILITIES', instruction: 'Catat fasilitas yang digunakan selama kegiatan.', order: 3 },
    ],
  }),
  action({
    actionCode: 'PLAN_RECURRING_ACTIVITY_SCHEDULE',
    candidateCodes: ['SPECIAL_ACTIVITY'],
    allowedInspectionResults: ['FOUND'],
    title: 'Susun jadwal kegiatan berulang',
    description: 'Buat jadwal sederhana bila kegiatan serupa akan berulang agar konteks periode berikutnya lebih jelas.',
    reasonTemplate: 'Pemeriksaan mencatat kegiatan yang mungkin berulang dan dapat dipantau melalui jadwal.',
    priority: 20,
    steps: [
      { stepCode: 'LIST_RECURRING_ACTIVITY', instruction: 'Catat kegiatan yang diperkirakan akan berulang.', order: 1 },
      { stepCode: 'PLAN_ACTIVITY_TIME', instruction: 'Susun tanggal dan durasi kegiatan sesuai kebutuhan operasional.', order: 2 },
      { stepCode: 'RECORD_ACTUAL_ACTIVITY', instruction: 'Catat pelaksanaan aktual untuk evaluasi tagihan berikutnya.', order: 3 },
    ],
  }),
  action({
    actionCode: 'TRACK_APPLIANCE_OPERATING_TIME',
    candidateCodes: ['NEW_ELECTRICAL_APPLIANCE'],
    allowedInspectionResults: ['FOUND'],
    title: 'Catat waktu operasi alat baru',
    description: 'Pantau waktu penggunaan dari aktivitas normal tanpa membuka, memindahkan, atau mengukur alat.',
    reasonTemplate: 'Pemeriksaan mencatat alat baru yang waktu operasinya dapat didokumentasikan secara aman.',
    priority: 10,
    steps: [
      { stepCode: 'LOG_USAGE_TIME', instruction: 'Catat kapan alat digunakan dalam operasi normal.', order: 1 },
      { stepCode: 'LOG_USAGE_DURATION', instruction: 'Catat durasi penggunaan yang diketahui.', order: 2 },
      { stepCode: 'LOG_OPERATIONAL_PURPOSE', instruction: 'Catat tujuan operasional penggunaan alat.', order: 3 },
      { stepCode: 'READ_OFFICIAL_MANUAL', instruction: 'Baca manual resmi bila tersedia tanpa membuka casing atau komponen.', order: 4 },
    ],
  }),
  action({
    actionCode: 'SET_APPLIANCE_USAGE_ROUTINE',
    candidateCodes: ['NEW_ELECTRICAL_APPLIANCE'],
    allowedInspectionResults: ['FOUND'],
    title: 'Susun rutinitas penggunaan alat',
    description: 'Atur jam penggunaan sesuai kebutuhan operasional nyata dan dokumentasikan pelaksanaannya.',
    reasonTemplate: 'Pemeriksaan mencatat alat baru yang dapat dipantau melalui rutinitas penggunaan.',
    priority: 20,
    steps: [
      { stepCode: 'IDENTIFY_NEEDED_USAGE', instruction: 'Catat kebutuhan operasional yang memerlukan alat.', order: 1 },
      { stepCode: 'SET_REALISTIC_HOURS', instruction: 'Atur jam penggunaan sesuai kebutuhan nyata.', order: 2 },
      { stepCode: 'LOG_ROUTINE_USAGE', instruction: 'Catat pelaksanaan rutinitas tanpa melakukan pemeriksaan kelistrikan.', order: 3 },
    ],
  }),
  action({
    actionCode: 'TRACK_PUMP_OPERATION',
    candidateCodes: ['WATER_SYSTEM_CHANGE'],
    allowedInspectionResults: ['FOUND'],
    title: 'Catat aktivitas pompa dari area aman',
    description: 'Pantau suara atau aktivitas pompa hanya dari area kering dan aman.',
    reasonTemplate: 'Pemeriksaan mencatat perubahan sistem air yang dapat dipantau tanpa mendekati instalasi.',
    priority: 10,
    steps: [
      { stepCode: 'LOG_SAFE_PUMP_TIME', instruction: 'Dari area aman, catat waktu pompa terdengar aktif.', order: 1 },
      { stepCode: 'LOG_UNUSUAL_ACTIVITY', instruction: 'Catat aktivitas di luar pola biasa yang terdengar dari area aman.', order: 2 },
      { stepCode: 'STOP_IF_UNSAFE', instruction: 'Hentikan pencatatan jika area basah atau kondisi lain terlihat tidak aman.', order: 3 },
    ],
  }),
  action({
    actionCode: 'RECORD_WATER_DEMAND_AND_PUMP_ACTIVITY',
    candidateCodes: ['WATER_SYSTEM_CHANGE'],
    allowedInspectionResults: ['FOUND'],
    title: 'Catat kebutuhan air dan aktivitas pompa',
    description: 'Dokumentasikan perubahan kebutuhan air bersama catatan aktivitas pompa dari area aman.',
    reasonTemplate: 'Pemeriksaan mencatat konteks sistem air yang dapat dibandingkan pada tagihan berikutnya.',
    priority: 20,
    steps: [
      { stepCode: 'LOG_WATER_DEMAND', instruction: 'Catat perubahan kebutuhan air yang diketahui.', order: 1 },
      { stepCode: 'LOG_SAFE_PUMP_ACTIVITY', instruction: 'Catat aktivitas pompa yang terdengar dari area kering dan aman.', order: 2 },
      { stepCode: 'STOP_NEAR_ELECTRICAL_WATER', instruction: 'Hentikan observasi dan minta bantuan jika terlihat air dekat instalasi listrik.', order: 3 },
    ],
  }),
  action({
    actionCode: 'REQUEST_COMPETENT_HELP',
    candidateCodes: ALL_INSPECTABLE_CANDIDATES,
    allowedInspectionResults: ['NEEDS_HELP'],
    title: 'Minta bantuan orang yang kompeten',
    description: 'Minta bantuan orang yang kompeten untuk meninjau kondisi yang ditemukan.',
    reasonTemplate: 'Pemeriksaan menunjukkan bahwa observasi mandiri perlu dihentikan demi keselamatan.',
    priority: 10,
    steps: [
      { stepCode: 'STOP_SELF_INSPECTION', instruction: 'Hentikan pemeriksaan mandiri.', order: 1 },
      { stepCode: 'KEEP_SAFE_DISTANCE', instruction: 'Jangan membongkar, menyentuh instalasi, atau melakukan pengukuran listrik sendiri.', order: 2 },
      { stepCode: 'REQUEST_COMPETENT_REVIEW', instruction: 'Minta bantuan orang yang kompeten untuk meninjau kondisi yang ditemukan.', order: 3 },
    ],
  }),
  action({
    actionCode: 'COLLECT_MISSING_INFORMATION',
    candidateCodes: ALL_INSPECTABLE_CANDIDATES,
    allowedInspectionResults: ['UNKNOWN'],
    title: 'Lengkapi informasi yang belum tersedia',
    description: 'Kumpulkan informasi tambahan sebelum menentukan tindakan operasional.',
    reasonTemplate: 'Hasil pemeriksaan belum cukup pasti sehingga informasi tambahan perlu dikumpulkan secara aman.',
    priority: 10,
    steps: [
      { stepCode: 'LOG_EVENT_TIME', instruction: 'Catat waktu kejadian yang diketahui.', order: 1 },
      { stepCode: 'LOG_USAGE_FREQUENCY', instruction: 'Catat frekuensi penggunaan dari aktivitas normal.', order: 2 },
      { stepCode: 'CHECK_AVAILABLE_DOCUMENTS', instruction: 'Periksa dokumen yang sudah tersedia.', order: 3 },
      { stepCode: 'CONTINUE_SAFE_OBSERVATION', instruction: 'Lanjutkan observasi aman tanpa membongkar atau mengukur instalasi.', order: 4 },
    ],
  }),
];

export function findActionDefinition(actionCode: string): ActionDefinition | null {
  return ACTION_PLAN_CATALOG.find((item) => item.actionCode === actionCode) ?? null;
}
