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
  actionLabel?: string;
  ctaLabel: string;
  ctaHref: string;
  advanceMode: TourAdvanceMode;
  expectedPathname?: string;
  expectedSearchParam?: {
    key: string;
    value: string;
  };
}

export const TOUR_STEPS: TourStep[] = [
  {
    id: 'step-active-business',
    stepNumber: 1,
    stage: 'DATA',
    route: '/dashboard',
    targetTourId: 'business-selector',
    fallbackTourId: 'manage-business',
    placement: 'bottom',
    title: 'Mulai dari usaha Anda',
    instruction: 'Pilih usaha yang ingin Anda pantau di sini.',
    detailedContext:
      'Semua tagihan, analisis, dan prediksi WattWise mengikuti usaha yang sedang aktif. Jika belum ada usaha, Anda dapat menambahkannya terlebih dahulu.',
    actionLabel: 'Usaha sudah dipilih',
    ctaLabel: 'Kelola Usaha',
    ctaHref: '/businesses',
    advanceMode: 'manual',
    expectedPathname: '/dashboard',
  },
  {
    id: 'step-business-profile',
    stepNumber: 2,
    stage: 'DATA',
    route: '/businesses',
    targetTourId: 'business-profile-form',
    fallbackTourId: 'business-list',
    placement: 'bottom',
    title: 'Lengkapi profil usaha',
    instruction: 'Lengkapi profil usaha Anda pada bagian ini.',
    detailedContext:
      'Profil usaha menyediakan konteks penting untuk menghitung rasio biaya dan menentukan batas efisiensi operasional.',
    actionLabel: 'Profil sudah siap — lanjut',
    ctaLabel: 'Tambah Usaha Baru',
    ctaHref: '/businesses/new',
    advanceMode: 'manual',
    expectedPathname: '/businesses',
  },
  {
    id: 'step-nav-bills',
    stepNumber: 3,
    stage: 'DATA',
    route: '/dashboard',
    targetTourId: 'sidebar-bills',
    placement: 'right',
    title: 'Selanjutnya, catat tagihan listrik',
    instruction: 'Klik Tagihan Listrik yang disorot untuk melanjutkan.',
    detailedContext:
      'Histori bulanan yang teratur adalah kunci untuk membaca tren dan menemukan indikasi perubahan biaya.',
    ctaLabel: 'Buka Tagihan Listrik',
    ctaHref: '/bills',
    advanceMode: 'target-click',
    expectedPathname: '/bills',
  },
  {
    id: 'step-add-bill',
    stepNumber: 4,
    stage: 'DATA',
    route: '/bills',
    targetTourId: 'add-bill',
    fallbackTourId: 'bill-entry-form',
    placement: 'bottom',
    title: 'Catat tagihan listrik bulanan',
    instruction:
      'Tagihan sudah tersedia. Anda dapat menambah periode baru saat memiliki tagihan berikutnya.',
    detailedContext:
      'Semakin konsisten histori bulanan Anda, semakin banyak analisis dan prediksi yang dapat dihitung oleh WattWise.',
    actionLabel: 'Saya sudah punya tagihan — lanjut',
    ctaLabel: 'Tambah Tagihan',
    ctaHref: '/bills/new',
    advanceMode: 'manual',
    expectedPathname: '/bills',
  },
  {
    id: 'step-dashboard-orientation',
    stepNumber: 5,
    stage: 'DECIDE / ACT',
    route: '/dashboard',
    targetTourId: 'dashboard-next-action',
    fallbackTourId: 'dashboard-header',
    placement: 'bottom',
    title: 'Dashboard menunjukkan apa yang perlu dilakukan',
    instruction:
      'Bagian ini menunjukkan langkah berikutnya yang paling relevan berdasarkan kondisi data Anda.',
    detailedContext:
      'Dashboard juga merangkum biaya harian dan rasio biaya listrik terhadap pendapatan usaha Anda.',
    actionLabel: 'Lanjut',
    ctaLabel: 'Buka Dashboard',
    ctaHref: '/dashboard',
    advanceMode: 'manual',
    expectedPathname: '/dashboard',
  },
  {
    id: 'step-nav-analysis',
    stepNumber: 6,
    stage: 'UNDERSTAND',
    route: '/analysis',
    targetTourId: 'sidebar-analysis',
    fallbackTourId: 'analysis-trend-section',
    placement: 'right',
    title: 'Pahami perubahan konsumsi',
    instruction: 'Klik Analisis yang disorot.',
    detailedContext:
      'Di sini Anda dapat melihat tren dan indikasi kenaikan yang perlu diperiksa tanpa penetapan penyebab sepihak.',
    ctaLabel: 'Buka Analisis',
    ctaHref: '/analysis',
    advanceMode: 'target-click',
    expectedPathname: '/analysis',
  },
  {
    id: 'step-forecast',
    stepNumber: 7,
    stage: 'PREDICT',
    route: '/analysis',
    targetTourId: 'analysis-forecast-tab',
    placement: 'top',
    title: 'Lihat perkiraan bulan berikutnya',
    instruction: 'Klik Proyeksi untuk melihat perkiraan periode berikutnya.',
    detailedContext:
      'Jika histori kurang dari 6 bulan berurutan, WattWise menggunakan estimasi historis. Setelah tersedia minimal 6 bulan histori berurutan, WattWise dapat menjalankan Prediksi AI N-BEATS. Jika Prediksi AI tidak dapat dijalankan, WattWise tetap menyediakan estimasi historis sebagai fallback.',
    ctaLabel: 'Lihat Prediksi',
    ctaHref: '/predictions',
    advanceMode: 'target-click',
    expectedPathname: '/analysis',
    expectedSearchParam: {
      key: 'tab',
      value: 'forecast',
    },
  },
  {
    id: 'step-recommendations',
    stepNumber: 8,
    stage: 'DECIDE / ACT',
    route: '/analysis',
    targetTourId: 'analysis-recommendations-tab',
    fallbackTourId: 'analysis-next-action',
    placement: 'top',
    title: 'Lihat rekomendasi tindakan',
    instruction:
      'Klik Rekomendasi untuk melihat tindakan yang dapat dipertimbangkan berdasarkan hasil analisis.',
    detailedContext:
      'Tindakan yang jelas membantu mengendalikan potensi lonjakan tagihan sebelum jatuh tempo berikutnya.',
    ctaLabel: 'Lihat Rekomendasi',
    ctaHref: '/recommendations',
    advanceMode: 'target-click',
    expectedPathname: '/analysis',
    expectedSearchParam: {
      key: 'tab',
      value: 'recommendations',
    },
  },
  {
    id: 'step-measure',
    stepNumber: 9,
    stage: 'MEASURE',
    route: '/dashboard',
    targetTourId: 'sidebar-bills',
    fallbackTourId: 'dashboard-header',
    placement: 'right',
    title: 'Ukur hasil pada tagihan berikutnya',
    instruction:
      'Setelah melakukan tindakan, catat kembali tagihan bulan berikutnya. Dari data baru tersebut Anda dapat membandingkan perubahan dari waktu ke waktu.',
    detailedContext:
      'Gunakan evaluasi Rencana Hemat untuk meninjau efektivitas penghematan. Selesai! Anda dapat membuka kembali panduan ini kapan saja melalui menu Panduan Interaktif.',
    actionLabel: 'Selesai',
    ctaLabel: 'Kembali ke Dashboard',
    ctaHref: '/dashboard',
    advanceMode: 'manual',
    expectedPathname: '/dashboard',
  },
];

export const STORAGE_TOUR_V2_COMPLETED_KEY = 'wattwise:interactive-tour:v2:completed';
export const STORAGE_TOUR_V1_COMPLETED_KEY = 'wattwise:onboarding:v1:completed';
export const STORAGE_DISMISSED_SESSION_KEY = 'wattwise:interactive-tour:v2:dismissed';
export const SESSION_TOUR_ACTIVE_KEY = 'wattwise:interactive-tour:v2:active';
export const SESSION_TOUR_STEP_KEY = 'wattwise:interactive-tour:v2:step';
export const SESSION_TOUR_PENDING_STEP_KEY = 'wattwise:interactive-tour:v2:pending-step';