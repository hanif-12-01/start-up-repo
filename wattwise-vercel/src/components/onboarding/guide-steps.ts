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
    actionLabel: 'Lanjut',
    ctaLabel: 'Kelola Usaha',
    ctaHref: '/businesses',
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
    instruction:
      'Isi informasi usaha Anda pada formulir ini, seperti nama usaha, jenis usaha, daya listrik, dan tarif jika tersedia.',
    detailedContext:
      'Profil usaha menyediakan konteks penting untuk menghitung rasio biaya dan menentukan batas efisiensi operasional.',
    actionLabel: 'Profil sudah siap — lanjut',
    ctaLabel: 'Tambah Usaha Baru',
    ctaHref: '/businesses/new',
  },
  {
    id: 'step-nav-bills',
    stepNumber: 3,
    stage: 'DATA',
    route: '/dashboard',
    targetTourId: 'sidebar-bills',
    placement: 'right',
    title: 'Selanjutnya, catat tagihan listrik',
    instruction: 'Klik Tagihan Listrik untuk mulai membangun histori konsumsi usaha Anda.',
    detailedContext:
      'Histori bulanan yang teratur adalah kunci untuk membaca tren dan menemukan indikasi perubahan biaya.',
    actionLabel: 'Lanjut',
    ctaLabel: 'Buka Tagihan Listrik',
    ctaHref: '/bills',
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
      'Klik Tambah Tagihan untuk mencatat satu periode penggunaan listrik, atau isi pemakaian kWh dan biaya sesuai bukti bayar Anda.',
    detailedContext:
      'Semakin konsisten histori bulanan Anda, semakin banyak analisis dan prediksi yang dapat dihitung oleh WattWise.',
    actionLabel: 'Saya sudah punya tagihan — lanjut',
    ctaLabel: 'Tambah Tagihan',
    ctaHref: '/bills/new',
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
      'Bagian Langkah Berikutnya membantu Anda menentukan tindakan paling relevan berdasarkan kondisi data saat ini.',
    detailedContext:
      'Dashboard juga merangkum biaya harian dan rasio biaya listrik terhadap pendapatan usaha Anda.',
    actionLabel: 'Lanjut',
    ctaLabel: 'Buka Dashboard',
    ctaHref: '/dashboard',
  },
  {
    id: 'step-nav-analysis',
    stepNumber: 6,
    stage: 'UNDERSTAND',
    route: '/analysis',
    targetTourId: 'analysis-trend-section',
    fallbackTourId: 'sidebar-analysis',
    placement: 'bottom',
    title: 'Pahami perubahan konsumsi',
    instruction:
      'Klik Analisis untuk memahami perubahan konsumsi dan biaya dari histori yang sudah Anda catat.',
    detailedContext:
      'Di sini Anda dapat melihat tren dan indikasi kenaikan yang perlu diperiksa tanpa penetapan penyebab sepihak.',
    actionLabel: 'Lanjut',
    ctaLabel: 'Buka Analisis',
    ctaHref: '/analysis',
  },
  {
    id: 'step-forecast',
    stepNumber: 7,
    stage: 'PREDICT',
    route: '/analysis',
    targetTourId: 'analysis-forecast-tab',
    fallbackTourId: 'sidebar-predictions',
    placement: 'top',
    title: 'Lihat perkiraan bulan berikutnya',
    instruction:
      'Bagian Prediksi memperkirakan penggunaan periode berikutnya berdasarkan histori yang tersedia.',
    detailedContext:
      'Jika histori kurang dari 6 bulan berurutan, WattWise menggunakan estimasi historis. Setelah tersedia minimal 6 bulan histori berurutan, WattWise dapat menjalankan Prediksi AI N-BEATS. Jika Prediksi AI tidak dapat dijalankan, WattWise tetap menyediakan estimasi historis sebagai fallback.',
    actionLabel: 'Lanjut',
    ctaLabel: 'Lihat Prediksi',
    ctaHref: '/predictions',
  },
  {
    id: 'step-act-result',
    stepNumber: 8,
    stage: 'DECIDE / ACT',
    route: '/recommendations',
    targetTourId: 'analysis-next-action',
    fallbackTourId: 'sidebar-diagnostics',
    placement: 'top',
    title: 'Jangan berhenti di angka prediksi',
    instruction:
      'Gunakan hasil prediksi, risiko, dan rekomendasi untuk menentukan langkah yang perlu diperiksa atau dilakukan berikutnya.',
    detailedContext:
      'Tindakan yang jelas membantu mengendalikan potensi lonjakan tagihan sebelum jatuh tempo berikutnya.',
    actionLabel: 'Lanjut',
    ctaLabel: 'Lihat Rekomendasi',
    ctaHref: '/recommendations',
  },
  {
    id: 'step-measure',
    stepNumber: 9,
    stage: 'MEASURE',
    route: '/dashboard',
    targetTourId: 'sidebar-reports',
    fallbackTourId: 'dashboard-header',
    placement: 'right',
    title: 'Ukur hasil pada tagihan berikutnya',
    instruction:
      'Setelah melakukan tindakan, catat kembali tagihan bulan berikutnya. WattWise dapat membantu Anda membandingkan perubahan dari waktu ke waktu.',
    detailedContext:
      'Gunakan evaluasi Rencana Hemat untuk meninjau efektivitas penghematan. Selesai! Anda dapat membuka kembali panduan ini kapan saja melalui menu Panduan Interaktif.',
    actionLabel: 'Selesai',
    ctaLabel: 'Kembali ke Dashboard',
    ctaHref: '/dashboard',
  },
];

export const STORAGE_TOUR_V2_COMPLETED_KEY = 'wattwise:interactive-tour:v2:completed';
export const STORAGE_TOUR_V1_COMPLETED_KEY = 'wattwise:onboarding:v1:completed';
export const STORAGE_DISMISSED_SESSION_KEY = 'wattwise:interactive-tour:v2:dismissed';
export const SESSION_TOUR_ACTIVE_KEY = 'wattwise:interactive-tour:v2:active';
export const SESSION_TOUR_STEP_KEY = 'wattwise:interactive-tour:v2:step';