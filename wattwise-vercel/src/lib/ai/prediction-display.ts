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
