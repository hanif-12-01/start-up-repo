export interface GuideStep {
  stepNumber: number;
  stage: 'DATA' | 'UNDERSTAND' | 'PREDICT' | 'DECIDE / ACT' | 'MEASURE';
  title: string;
  shortDescription: string;
  detailedContext: string;
  ctaLabel: string;
  ctaHref: string;
}

export const GUIDE_STEPS: GuideStep[] = [
  {
    stepNumber: 1,
    stage: 'DATA',
    title: '1. Siapkan profil usaha',
    shortDescription: 'Mulai dengan memilih atau membuat usaha yang ingin dipantau.',
    detailedContext:
      'Profil usaha memberikan konteks penting seperti jenis usaha, daya listrik terpasang, dan tarif listrik yang berlaku sebagai dasar analisis.',
    ctaLabel: 'Kelola Usaha',
    ctaHref: '/businesses',
  },
  {
    stepNumber: 2,
    stage: 'DATA',
    title: '2. Catat tagihan listrik',
    shortDescription:
      'Tambahkan pemakaian kWh dan biaya listrik setiap bulan agar WattWise memiliki histori yang dapat dianalisis.',
    detailedContext:
      'Semakin konsisten histori bulanan Anda, semakin banyak analisis yang dapat digunakan WattWise. Anda dapat mencatat tagihan secara mandiri.',
    ctaLabel: 'Tambah Tagihan',
    ctaHref: '/bills/new',
  },
  {
    stepNumber: 3,
    stage: 'UNDERSTAND',
    title: '3. Pahami perubahan konsumsi',
    shortDescription:
      'Gunakan halaman Analisis untuk melihat tren dan indikasi perubahan konsumsi dari histori tagihan Anda.',
    detailedContext:
      'Di sini Anda dapat melihat apakah konsumsi relatif stabil atau ada kenaikan yang perlu diperiksa. Analisis membantu membaca pola tanpa asumsi sepihak.',
    ctaLabel: 'Lihat Analisis',
    ctaHref: '/analysis',
  },
  {
    stepNumber: 4,
    stage: 'PREDICT',
    title: '4. Lihat perkiraan bulan berikutnya',
    shortDescription:
      'Jika histori masih kurang dari 6 bulan berurutan, WattWise menggunakan estimasi historis. Setelah tersedia minimal 6 bulan histori berurutan, WattWise dapat menjalankan Prediksi AI N-BEATS.',
    detailedContext:
      'Jika Prediksi AI tidak dapat dijalankan, WattWise tetap menyediakan estimasi historis sebagai fallback yang andal.',
    ctaLabel: 'Lihat Prediksi',
    ctaHref: '/predictions',
  },
  {
    stepNumber: 5,
    stage: 'DECIDE / ACT',
    title: '5. Tentukan langkah berikutnya',
    shortDescription:
      'WattWise tidak berhenti pada angka prediksi. Gunakan hasil analisis, risiko, dan rekomendasi untuk menentukan tindakan yang relevan.',
    detailedContext:
      'Dashboard menampilkan "Langkah Berikutnya" berdasarkan kondisi data dan perjalanan penggunaan Anda, seperti Cek Kenaikan atau Rekomendasi Tindakan.',
    ctaLabel: 'Lihat Rekomendasi',
    ctaHref: '/recommendations',
  },
  {
    stepNumber: 6,
    stage: 'MEASURE',
    title: '6. Catat hasil dan evaluasi',
    shortDescription:
      'Setelah melakukan tindakan, catat tagihan periode berikutnya agar perubahan sebelum dan sesudah dapat dibandingkan.',
    detailedContext:
      'Gunakan fitur Rencana Hemat untuk mengevaluasi dampak penghematan secara berkala. Selesai! Anda dapat membuka Panduan kapan saja dari menu WattWise.',
    ctaLabel: 'Kembali ke Dashboard',
    ctaHref: '/dashboard',
  },
];

export const STORAGE_COMPLETED_KEY = 'wattwise:onboarding:v1:completed';
export const STORAGE_DISMISSED_SESSION_KEY = 'wattwise:onboarding:v1:dismissed';