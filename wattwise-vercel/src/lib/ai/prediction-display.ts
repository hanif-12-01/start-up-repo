import type { PredictionResult } from '@/server/services/product-analysis';

export function deriveDisplayedPrediction(
  deterministic: PredictionResult,
  predictionKwh: number,
  tariff: number | null,
  continuousHistoryMonths: number,
  engine: 'lightgbm' | 'nbeats' = 'nbeats'
): PredictionResult {
  const rounded = Number(Math.max(0, predictionKwh).toFixed(2));
  const previous = deterministic.previousUsageKwh;
  const changePercent =
    previous !== null && previous > 0
      ? Number((((rounded - previous) / previous) * 100).toFixed(1))
      : null;
  const risk =
    changePercent === null
      ? null
      : changePercent >= 15
        ? 'HIGH'
        : changePercent >= 5
          ? 'MEDIUM'
          : 'LOW';

  return {
    ...deterministic,
    hasPrediction: true,
    predictedUsageKwh: rounded,
    estimatedBill: tariff && tariff > 0 ? Number((rounded * tariff).toFixed(2)) : null,
    changePercent,
    risk,
    confidence:
      continuousHistoryMonths >= 13 ? 'Tinggi' : continuousHistoryMonths >= 3 ? 'Sedang' : 'Rendah',
    method:
      engine === 'lightgbm'
        ? 'Prediksi WattWise berbasis LightGBM'
        : 'Prediksi WattWise berbasis N-BEATS',
    historyMonths: continuousHistoryMonths,
  };
}

export interface DataReadinessStatus {
  phaseKey: 'H00' | 'H01_02' | 'H03_05' | 'H06_12' | 'H13_PLUS';
  label: string;
  description: string;
  milestoneMessage: string;
  isAiReady: boolean;
}

export function getDataReadinessStatus(continuousHistoryMonths: number): DataReadinessStatus {
  if (continuousHistoryMonths <= 0) {
    return {
      phaseKey: 'H00',
      label: 'Belum ada histori konsumsi',
      description: 'Catat tagihan listrik bulanan pertama Anda untuk memulai analisis.',
      milestoneMessage: 'Lanjutkan pencatatan tagihan bulanan untuk membangun histori.',
      isAiReady: false,
    };
  }
  if (continuousHistoryMonths <= 2) {
    return {
      phaseKey: 'H01_02',
      label: 'Histori awal',
      description: 'Estimasi awal aktif berdasarkan catatan tagihan pertama.',
      milestoneMessage: `Lanjutkan pencatatan ${6 - continuousHistoryMonths} bulan berurutan lagi untuk membuka Prediksi AI.`,
      isAiReady: false,
    };
  }
  if (continuousHistoryMonths <= 5) {
    return {
      phaseKey: 'H03_05',
      label: 'Histori berkembang',
      description: 'Estimasi berbasis tren histori tersedia.',
      milestoneMessage: `Lanjutkan pencatatan ${6 - continuousHistoryMonths} bulan berurutan lagi untuk membuka Prediksi AI.`,
      isAiReady: false,
    };
  }
  if (continuousHistoryMonths <= 12) {
    return {
      phaseKey: 'H06_12',
      label: 'Siap untuk Prediksi AI',
      description: 'Prediksi AI aktif menggunakan pola konsumsi 6 bulan berurutan.',
      milestoneMessage: 'Histori konsumsi mencukupi untuk pemodelan deret waktu N-BEATS.',
      isAiReady: true,
    };
  }
  return {
    phaseKey: 'H13_PLUS',
    label: 'Histori panjang',
    description: 'Histori konsumsi Anda sudah matang. Prediksi AI saat ini menggunakan 6 bulan terbaru yang berurutan.',
    milestoneMessage: 'Anda memiliki histori yang panjang. Model N-BEATS menggunakan 6 bulan terbaru sebagai input inferensi.',
    isAiReady: true,
  };
}
