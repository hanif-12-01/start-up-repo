export type TourAdvanceMode = 'manual' | 'target-click' | 'route-change';

export interface TourStep {
  id: string;
  stepNumber: number;
  stage: 'DATA' | 'UNDERSTAND' | 'PREDICT' | 'DECIDE / ACT' | 'MEASURE';
  route: string;
  targetTourId: string;
  fallbackTourId?: string;
  placement?: 'top' | 'right' | 'bottom' | 'left';
  title: string;
  instruction: string;
  detailedContext: string;
  benefit?: string;
  actionLabel?: string;
  ctaLabel: string;
  ctaHref: string;
  advanceMode: TourAdvanceMode;
  expectedPathname?: string;
  expectedSearchParam?: {
    key: string;
    value: string;
  };
  isMultiLocationOnly?: boolean;
}

export const CORE_TOUR_STEPS: TourStep[] = [
  {
    id: 'step-welcome',
    stepNumber: 1,
    stage: 'UNDERSTAND',
    route: '/dashboard',
    targetTourId: 'dashboard-header',
    fallbackTourId: 'sidebar-dashboard',
    placement: 'bottom',
    title: 'Selamat datang di WattWise',
    instruction:
      'WattWise membantu Anda memantau perubahan penggunaan dan biaya listrik tanpa harus membaca data satu per satu.',
    detailedContext:
      'Mulai dari tagihan bulanan yang sudah Anda miliki, sistem akan merangkum kondisi listrik dan menandai hal yang layak diperiksa.',
    benefit: 'Membantu bisnis menghemat biaya listrik operasional secara terarah.',
    actionLabel: 'Mulai Pelajari',
    ctaLabel: 'Buka Ringkasan',
    ctaHref: '/dashboard',
    advanceMode: 'manual',
    expectedPathname: '/dashboard',
  },
  {
    id: 'step-bills',
    stepNumber: 2,
    stage: 'DATA',
    route: '/dashboard',
    targetTourId: 'sidebar-bills',
    fallbackTourId: 'add-bill',
    placement: 'right',
    title: 'Catat tagihan listrik bulanan',
    instruction:
      'Mulai dari sini. Tambahkan tagihan listrik setiap bulan agar riwayat penggunaan Anda terbentuk.',
    detailedContext:
      'Data tagihan bulanan adalah kunci agar WattWise dapat membaca tren pemakaian dan mendeteksi indikasi lonjakan biaya.',
    benefit: 'Riwayat yang konsisten memudahkan identifikasi lonjakan sejak dini.',
    actionLabel: 'Tagihan sudah dicatat — lanjut',
    ctaLabel: 'Buka Tagihan Listrik',
    ctaHref: '/bills',
    advanceMode: 'target-click',
    expectedPathname: '/bills',
  },
  {
    id: 'step-summary',
    stepNumber: 3,
    stage: 'UNDERSTAND',
    route: '/dashboard',
    targetTourId: 'dashboard-summary',
    fallbackTourId: 'dashboard-header',
    placement: 'bottom',
    title: 'Ringkasan kondisi terkini',
    instruction:
      'Ringkasan ini membantu Anda melihat kondisi pengeluaran listrik terbaru dengan cepat.',
    detailedContext:
      'Pantau tagihan terbaru, estimasi biaya harian, dan porsi pengeluaran listrik terhadap pendapatan usaha Anda.',
    benefit: 'Ketahui posisi biaya listrik usaha Anda dalam hitungan detik.',
    actionLabel: 'Lanjut ke Tren',
    ctaLabel: 'Lihat Ringkasan',
    ctaHref: '/dashboard',
    advanceMode: 'manual',
    expectedPathname: '/dashboard',
  },
  {
    id: 'step-chart',
    stepNumber: 4,
    stage: 'PREDICT',
    route: '/dashboard',
    targetTourId: 'dashboard-chart',
    fallbackTourId: 'dashboard-summary',
    placement: 'top',
    title: 'Tren pemakaian & biaya',
    instruction:
      'Di sini Anda bisa melihat apakah biaya atau pemakaian listrik berubah dari bulan ke bulan.',
    detailedContext:
      'Setelah data mencukupi, WattWise dapat membantu memperkirakan periode berikutnya agar Anda dapat bersiap sebelum tagihan jatuh tempo.',
    benefit: 'Menghindari kejutan lonjakan tagihan pada akhir bulan.',
    actionLabel: 'Lanjut ke Cek Kenaikan',
    ctaLabel: 'Buka Riwayat',
    ctaHref: '/dashboard',
    advanceMode: 'manual',
    expectedPathname: '/dashboard',
  },
  {
    id: 'step-diagnostics',
    stepNumber: 5,
    stage: 'DECIDE / ACT',
    route: '/dashboard',
    targetTourId: 'dashboard-candidates',
    fallbackTourId: 'sidebar-diagnostics',
    placement: 'top',
    title: 'Cek bagian yang perlu diperiksa',
    instruction:
      'Gunakan bagian ini ketika Anda ingin memahami perubahan yang terjadi dan apa yang perlu diperiksa.',
    detailedContext:
      'WattWise tidak membuat vonis sepihak, melainkan memberikan kandidat terarah untuk Anda periksa langsung di lokasi usaha.',
    benefit: 'Fokus memeriksa peralatan yang paling relevan dengan kenaikan pemakaian.',
    actionLabel: 'Lanjut ke Tindakan',
    ctaLabel: 'Buka Cek Kenaikan',
    ctaHref: '/diagnostics',
    advanceMode: 'manual',
    expectedPathname: '/dashboard',
  },
  {
    id: 'step-actions',
    stepNumber: 6,
    stage: 'MEASURE',
    route: '/dashboard',
    targetTourId: 'dashboard-actions',
    fallbackTourId: 'sidebar-reports',
    placement: 'top',
    title: 'Rencana Hemat & evaluasi hasil',
    instruction:
      'Buka Cek Kenaikan untuk melihat bagian yang layak diperiksa dan langkah selanjutnya.',
    detailedContext:
      'Setelah tindakan dijalankan, catat tagihan bulan berikutnya untuk membuktikan apakah pengeluaran listrik berhasil dikendalikan.',
    benefit: 'Memastikan setiap upaya efisiensi benar-benar menghasilkan penghematan nyata.',
    actionLabel: 'Selesai',
    ctaLabel: 'Kembali ke Dashboard',
    ctaHref: '/dashboard',
    advanceMode: 'manual',
    expectedPathname: '/dashboard',
  },
];

export const MULTI_LOCATION_STEP: TourStep = {
  id: 'step-portfolio',
  stepNumber: 7,
  stage: 'UNDERSTAND',
  route: '/dashboard',
  targetTourId: 'business-selector',
  fallbackTourId: 'manage-business',
  placement: 'bottom',
  title: 'Kelola beberapa lokasi usaha',
  instruction:
    'Kelola beberapa lokasi? Buka pilihan usaha untuk melihat lokasi mana yang perlu Anda perhatikan lebih dulu.',
  detailedContext:
    'Bagi pemilik banyak cabang atau properti, Anda dapat berpindah lokasi dengan cepat dari menu ini.',
  benefit: 'Kendali menyeluruh seluruh lokasi usaha dari satu dashboard WattWise.',
  actionLabel: 'Selesai',
  ctaLabel: 'Kelola Usaha',
  ctaHref: '/businesses',
  advanceMode: 'manual',
  expectedPathname: '/dashboard',
  isMultiLocationOnly: true,
};

export function getEffectiveTourSteps(includeMultiLocation = false): TourStep[] {
  if (!includeMultiLocation) {
    return CORE_TOUR_STEPS.map((s, idx) => ({ ...s, stepNumber: idx + 1 }));
  }
  return [...CORE_TOUR_STEPS, MULTI_LOCATION_STEP].map((s, idx) => ({
    ...s,
    stepNumber: idx + 1,
  }));
}

export const TOUR_STEPS: TourStep[] = CORE_TOUR_STEPS;

export const STORAGE_TOUR_V2_COMPLETED_KEY = 'wattwise:interactive-tour:v2:completed';
export const STORAGE_TOUR_V1_COMPLETED_KEY = 'wattwise:onboarding:v1:completed';
export const STORAGE_DISMISSED_SESSION_KEY = 'wattwise:interactive-tour:v2:dismissed';
export const SESSION_TOUR_ACTIVE_KEY = 'wattwise:interactive-tour:v2:active';
export const SESSION_TOUR_STEP_KEY = 'wattwise:interactive-tour:v2:step';
export const SESSION_TOUR_PENDING_STEP_KEY = 'wattwise:interactive-tour:v2:pending-step';
