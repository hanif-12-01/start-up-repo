/**
 * Ridge UMKM v1.1 — koefisien linear model hasil training pada dataset UMKM.
 *
 * SUMBER TUNGGAL untuk angka-angka di file ini:
 *   ML/outputs_umkm/ridge_model_export.json
 * yang di-generate oleh skrip:
 *   ML/scripts/15_export_ridge_model_to_json.py
 * dari pickle:
 *   ML/outputs_umkm/ridge_model.pkl
 *
 * CATATAN PENTING — koefisien di file ini SENGAJA berbeda dengan angka lama
 * yang sebelumnya di-hardcode di `src/services/prediction.ts`. Angka lama
 * berasal dari `ML/outputs/ridge_model.pkl` (dataset generik non-UMKM) dan
 * TIDAK boleh dipakai untuk UMKM. Jangan campur.
 *
 * File ini murni deklarasi konstanta + inferensi linear di runtime Node/browser.
 * Tidak memanggil Python, tidak load pickle, tidak butuh sidecar API.
 */

export const MODEL_NAME = "Ridge Regression" as const;
export const MODEL_VERSION = "Ridge UMKM v1.1" as const;

/** Urutan fitur harus persis sama dengan yang dipakai saat training. */
export const FEATURE_ORDER = [
  "business_type_encoded",
  "month",
  "latest_usage_kwh",
  "previous_usage_kwh",
  "avg_3_month_usage_kwh",
  "avg_6_month_usage_kwh",
  "trend_1_month",
  "trend_3_month",
  "month_sin",
  "month_cos",
  "avg_tariff_idr_per_kwh",
] as const;

export type RidgeFeatureName = (typeof FEATURE_ORDER)[number];

/** Intercept dari Ridge UMKM v1.1 (ML/outputs_umkm/ridge_model.pkl). */
export const INTERCEPT = 104.10710307364889;

/** Koefisien selaras 1:1 dengan FEATURE_ORDER (index i ↔ FEATURE_ORDER[i]). */
export const COEFFICIENTS: readonly number[] = [
  13.646472143945566,       // business_type_encoded
  -1.7983517725861613,      // month
  0.8716166973225002,       // latest_usage_kwh
  0.02552799231344214,      // previous_usage_kwh
  -0.0691297957710631,      // avg_3_month_usage_kwh
  0.0228489013572503,       // avg_6_month_usage_kwh
  0.36693568253024095,      // trend_1_month
  -205.95021884390903,      // trend_3_month
  4.141801853671001,        // month_sin
  -12.866319209021267,      // month_cos
  -1.208858364005224e-22,   // avg_tariff_idr_per_kwh
];

/**
 * StandardScaler mean/scale. `null` berarti model asli tidak dibungkus scaler
 * (Pipeline). Konsumen HARUS mendukung kedua kasus supaya nanti tidak perlu
 * ubah code kalau kita re-train pakai Pipeline(StandardScaler + Ridge).
 */
export const SCALER_MEAN: readonly number[] | null = null;
export const SCALER_SCALE: readonly number[] | null = null;

/** Metrik uji terakhir untuk model ini (dari model_comparison.csv). */
export const METRICS = {
  mae_usage_kwh: 177.1367,
  rmse_usage_kwh: 406.4574,
  mape_usage_percent: 17.5782,
  smape_usage_percent: 14.8774,
  wmape_usage_percent: 16.3158,
  mae_cost_idr: 255909.4513,
  rmse_cost_idr: 587208.9612,
  mape_cost_percent: 17.5782,
  smape_cost_percent: 14.8774,
  wmape_cost_percent: 16.3158,
  training_time_seconds: 0.0134,
  inference_time_ms: 0.63,
  notes: "Baseline ML linier.",
} as const;

export const DISCLAIMER =
  "Hasil ini adalah estimasi, bukan tagihan resmi PLN." as const;

export type RidgeFeatureInput = Record<RidgeFeatureName, number>;

/**
 * Inferensi linear Ridge UMKM v1.1.
 *
 * Alur:
 *  1. Susun vektor fitur mengikuti FEATURE_ORDER (menolak nilai NaN/Infinity).
 *  2. Jika SCALER_MEAN & SCALER_SCALE tersedia, terapkan
 *     `x_scaled = (x - mean) / scale` per fitur; kalau tidak, pakai apa adanya.
 *  3. Hitung `y = intercept + Σ(coef_i * x_i)`.
 *  4. Clamp ke non-negatif: `Math.max(0, y)`.
 *
 * Fungsi ini SENGAJA hanya melakukan inferensi; keputusan fallback, confidence,
 * dan penulisan ke DB tetap tanggung jawab `src/services/prediction.ts`.
 */
export function predictRidgeUmkm(features: RidgeFeatureInput): number {
  const vector: number[] = new Array(FEATURE_ORDER.length);
  for (let i = 0; i < FEATURE_ORDER.length; i++) {
    const name = FEATURE_ORDER[i];
    const raw = features[name];
    if (typeof raw !== "number" || !Number.isFinite(raw)) {
      throw new Error(
        `Ridge UMKM: nilai fitur "${name}" harus number berhingga, dapat ${raw}`,
      );
    }
    vector[i] = raw;
  }

  if (SCALER_MEAN && SCALER_SCALE) {
    if (
      SCALER_MEAN.length !== FEATURE_ORDER.length ||
      SCALER_SCALE.length !== FEATURE_ORDER.length
    ) {
      throw new Error(
        "Ridge UMKM: panjang SCALER_MEAN/SCALER_SCALE tidak cocok dengan FEATURE_ORDER.",
      );
    }
    for (let i = 0; i < vector.length; i++) {
      const scale = SCALER_SCALE[i];
      if (scale === 0) {
        // Fitur konstan saat training; hindari division-by-zero dengan
        // memaksa hasil setelah scaling menjadi 0 (setara std=1, mean=x).
        vector[i] = 0;
      } else {
        vector[i] = (vector[i] - SCALER_MEAN[i]) / scale;
      }
    }
  }

  let y = INTERCEPT;
  for (let i = 0; i < COEFFICIENTS.length; i++) {
    y += COEFFICIENTS[i] * vector[i];
  }

  return Math.max(0, y);
}
