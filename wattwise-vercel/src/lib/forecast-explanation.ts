import { decimal, formatMonth } from '@/lib/format';
import { parseBillNumber, parseTariff } from '@/lib/active-location-overview';

export type ForecastDirection = 'naik' | 'turun' | 'stabil' | null;

export interface ForecastExplanationInput {
  targetPeriod: string;
  continuousHistoryMonths: number;
  /** Existing capability check: flags + supported segment catalog. */
  diagnosticsAvailable: boolean;
  tariff: number | null;
  prediction: {
    hasPrediction: boolean;
    predictedUsageKwh: number | null;
    estimatedBill: number | null;
    previousUsageKwh: number | null;
    changePercent: number | null;
    method: string | null;
    hasGaps: boolean;
    gapMonths: number;
    highVolatility: boolean;
  };
}

export interface ForecastExplanation {
  targetPeriodLabel: string;
  direction: ForecastDirection;
  changePercent: number | null;
  estimatedCost: number | null;
  facts: string[];
  observations: string[];
  hypotheses: string[];
  limits: string[];
  nextStep: 'DIAGNOSTICS' | 'RECOMMENDATIONS';
  nextStepNote: string;
}

/**
 * Presentation only. The forecast arithmetic (deterministic baseline, ONNX
 * engines, fallback policy) is untouched; this builder only describes what the
 * backend already returned, including its own method label.
 */
export function buildForecastExplanation(input: ForecastExplanationInput): ForecastExplanation {
  const { prediction } = input;
  const validTariff = parseTariff(input.tariff);
  const changePercent = prediction.changePercent;
  const direction: ForecastDirection =
    changePercent === null ? null : changePercent > 0 ? 'naik' : changePercent < 0 ? 'turun' : 'stabil';

  const facts = [
    `Metode perhitungan yang dipakai: ${prediction.method ?? 'Belum tersedia'}.`,
    `Periode target: ${formatMonth(input.targetPeriod)}.`,
    `Histori valid berurutan: ${input.continuousHistoryMonths} bulan.`,
    prediction.gapMonths > 0
      ? `Terdapat ${prediction.gapMonths} bulan tanpa data di dalam rentang histori.`
      : 'Tidak ada bulan kosong di dalam rentang histori yang dipakai.',
  ];

  const observations: string[] = [];
  if (
    prediction.predictedUsageKwh !== null &&
    prediction.previousUsageKwh !== null &&
    changePercent !== null
  ) {
    observations.push(
      `Estimasi pemakaian ${decimal.format(prediction.predictedUsageKwh)} kWh, ${
        changePercent > 0 ? '+' : ''
      }${decimal.format(changePercent)}% dibanding periode pemakaian sebelumnya (${decimal.format(
        prediction.previousUsageKwh
      )} kWh).`
    );
  } else {
    observations.push('Belum ada periode pembanding yang valid untuk menghitung arah perubahan.');
  }
  observations.push(
    'Angka di atas adalah perbandingan antar periode dari data tagihan, bukan penjelasan atas penyebab perubahan.'
  );
  if (prediction.highVolatility) {
    observations.push('Histori menunjukkan variasi antar periode yang cukup tinggi.');
  }
  if (validTariff === null) {
    observations.push('Tarif belum tersedia, sehingga estimasi biaya Rupiah tidak ditampilkan.');
  }

  const wantsDiagnostics = changePercent !== null && changePercent >= 5;
  const nextStep = wantsDiagnostics && input.diagnosticsAvailable ? 'DIAGNOSTICS' : 'RECOMMENDATIONS';
  const nextStepNote =
    wantsDiagnostics && !input.diagnosticsAvailable
      ? 'Cek Kenaikan tidak aktif untuk paket atau segmen usaha ini. Langkah berikutnya memakai Rekomendasi.'
      : input.diagnosticsAvailable
        ? 'Gunakan hasil perbandingan sebagai bahan pemeriksaan, bukan sebagai kesimpulan penyebab.'
        : 'Rekomendasi disusun dari data tagihan yang sudah Anda catat.';

  return {
    targetPeriodLabel: formatMonth(input.targetPeriod),
    direction,
    changePercent,
    estimatedCost: validTariff === null ? null : parseBillNumber(prediction.estimatedBill),
    facts,
    observations,
    hypotheses: [
      'Perubahan dapat berkaitan dengan pola operasional, cuaca, atau peralatan, tetapi WattWise tidak menetapkan penyebab perangkat dari data tagihan.',
      'Estimasi ini adalah indikasi statistik dari data yang Anda masukkan, bukan pengukuran perangkat atau data resmi PLN.',
      prediction.hasGaps
        ? 'Bulan tanpa data dapat membuat arah perubahan terlihat berbeda dari kondisi sebenarnya.'
        : 'Data yang belum lengkap pada periode berikutnya dapat mengubah hasil estimasi.',
    ],
    limits: [
      'Bukan jaminan nilai tagihan periode berikutnya.',
      'Akurasi untuk UMKM Indonesia belum terverifikasi.',
      'Jalankan verifikasi manual sebelum mengambil keputusan biaya besar.',
    ],
    nextStep,
    nextStepNote,
  };
}
