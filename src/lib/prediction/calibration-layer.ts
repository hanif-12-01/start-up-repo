import { PredictionEngineInput, PredictionEngineResult } from "./types";
import { predictRuleBased } from "./rule-based-model";
import { MODEL_VERSION as LSTM_MODEL_VERSION, DISCLAIMER as LSTM_DISCLAIMER } from "./lstm-umkm-model";
import { MODEL_VERSION as RIDGE_MODEL_VERSION, DISCLAIMER as RIDGE_DISCLAIMER } from "./ridge-umkm-model";
import { MODEL_VERSION as TABULAR_MODEL_VERSION } from "./tabular-umkm-model";

const MIN_KWH_PREDICTION = 10.0;
const STABIL_THRESHOLD_PCT = 1.0;
const ANOMALY_DEVIATION_PCT = 10.0;

function formatRp(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export function calibratePrediction(
  rawKwh: number,
  methodUsed: "RULE_BASED" | "TABULAR_RIDGE" | "TABULAR_UMKM_V1" | "LSTM_PROTOTYPE",
  input: PredictionEngineInput
): PredictionEngineResult {
  const entries = input.historicalEntries;
  if (entries.length === 0) {
    throw new Error("Cannot calibrate predictions with empty history.");
  }

  const currentEntry = entries[0];
  const latest_usage_kwh = currentEntry.usageKwh;
  const avgTariff = latest_usage_kwh > 0 ? currentEntry.costIdr / latest_usage_kwh : 1444.70;

  // 1. Calculate historical metrics for calibration and explanations
  const avg3Count = Math.min(entries.length, 3);
  const avg_3_month_usage_kwh = entries.slice(0, avg3Count).reduce((s, e) => s + e.usageKwh, 0) / avg3Count;

  const avg6Count = Math.min(entries.length, 6);
  const avg_6_month_usage_kwh = entries.slice(0, avg6Count).reduce((s, e) => s + e.usageKwh, 0) / avg6Count;

  const anomalyDeviation = avg_6_month_usage_kwh > 0
    ? Math.abs((latest_usage_kwh - avg_6_month_usage_kwh) / avg_6_month_usage_kwh) * 100
    : 0;
  const isAnomalous = anomalyDeviation > ANOMALY_DEVIATION_PCT;
  const isKnownType = input.businessType !== "OTHER";

  // 2. Perform Sanity Checks & Fallbacks
  let finalMethod: "RULE_BASED" | "TABULAR_RIDGE" | "TABULAR_UMKM_V1" | "LSTM_PROTOTYPE" | "HYBRID_FALLBACK" = methodUsed;
  let finalKwh = rawKwh;
  let modelVersion = "";
  let disclaimer = LSTM_DISCLAIMER;
  let confidenceLevel: "HIGH" | "MEDIUM" | "LOW" = "LOW";
  let confidenceReason = "";
  let isFallbackTriggered = false;

  // Set model versions and initial disclaimers
  if (methodUsed === "RULE_BASED") {
    modelVersion = "Rule-Based v1.0";
    disclaimer = LSTM_DISCLAIMER; // Keep consistent with existing system disclaimer
  } else if (methodUsed === "TABULAR_RIDGE") {
    modelVersion = RIDGE_MODEL_VERSION;
    disclaimer = RIDGE_DISCLAIMER;
  } else if (methodUsed === "TABULAR_UMKM_V1") {
    modelVersion = TABULAR_MODEL_VERSION;
    disclaimer = "Hasil ini adalah estimasi, bukan tagihan resmi PLN.";
  } else if (methodUsed === "LSTM_PROTOTYPE") {
    modelVersion = LSTM_MODEL_VERSION;
    disclaimer = LSTM_DISCLAIMER;
  }

  // Model bounds checks
  if (methodUsed !== "RULE_BASED") {
    const upperBound = latest_usage_kwh * 3;
    const lowerBound = latest_usage_kwh / 3;
    const modelOutputInvalid =
      !Number.isFinite(rawKwh) ||
      rawKwh <= 0 ||
      rawKwh < MIN_KWH_PREDICTION ||
      rawKwh > upperBound ||
      rawKwh < lowerBound;

    if (modelOutputInvalid) {
      isFallbackTriggered = true;
      finalMethod = "HYBRID_FALLBACK";
      modelVersion = `${modelVersion} → Rule-Based v1.0`;
      
      const fb = predictRuleBased(input);
      finalKwh = fb.predictedUsageKwh;
      confidenceLevel = "LOW";
      confidenceReason = "Model utama menghasilkan output tidak wajar sehingga sistem beralih ke estimasi rule-based.";
    }
  }

  // 3. Finalize Kwh, Cost, and Trend calculations
  const predictedUsageKwh = parseFloat(Math.max(MIN_KWH_PREDICTION, finalKwh).toFixed(2));
  const predictedCostIdr = Math.round(predictedUsageKwh * avgTariff);
  
  const trendPercent = parseFloat(
    (((predictedUsageKwh - latest_usage_kwh) / (latest_usage_kwh + 1e-5)) * 100).toFixed(1)
  );

  const trendDirection: "NAIK" | "TURUN" | "STABIL" =
    Math.abs(trendPercent) < STABIL_THRESHOLD_PCT
      ? "STABIL"
      : trendPercent > 0
      ? "NAIK"
      : "TURUN";

  const trendLabelId = trendDirection === "NAIK" ? "naik" : trendDirection === "TURUN" ? "turun" : "stabil";

  // 4. Determine Confidence Level for non-fallback paths
  if (!isFallbackTriggered) {
    if (finalMethod === "LSTM_PROTOTYPE") {
      if (isKnownType && !isAnomalous) {
        confidenceLevel = "HIGH";
        confidenceReason = "Model LSTM memakai 6 bulan pola pemakaian listrik yang lengkap; jenis usaha dikenali dan pola stabil tanpa anomali.";
      } else if (isAnomalous) {
        confidenceLevel = "LOW";
        confidenceReason = `Terdeteksi lonjakan pemakaian tidak wajar (deviasi ${anomalyDeviation.toFixed(0)}% dari rata-rata 6 bulan) — prediksi LSTM mungkin kurang akurat.`;
      } else {
        confidenceLevel = "MEDIUM";
        confidenceReason = "Model LSTM memakai 6 bulan pola pemakaian listrik, namun jenis usaha 'Lainnya' belum sepenuhnya dikenali oleh model.";
      }
    } else if (finalMethod === "TABULAR_RIDGE") {
      if (isKnownType && !isAnomalous) {
        confidenceLevel = "MEDIUM";
        confidenceReason = `Model linear (Ridge) menganalisis data pemakaian usaha Anda selama ${entries.length} bulan; jenis usaha dikenali dan pola stabil.`;
      } else if (isAnomalous) {
        confidenceLevel = "LOW";
        confidenceReason = `Terdeteksi lonjakan pemakaian tidak wajar (deviasi ${anomalyDeviation.toFixed(0)}% dari rata-rata ${entries.length} bulan) — prediksi model linear kurang akurat.`;
      } else {
        confidenceLevel = "LOW";
        confidenceReason = `Model linear menganalisis ${entries.length} bulan pemakaian, namun jenis usaha 'Lainnya' belum sepenuhnya dikenali oleh model.`;
      }
    } else if (finalMethod === "TABULAR_UMKM_V1") {
      if (isKnownType && !isAnomalous) {
        confidenceLevel = "MEDIUM";
        confidenceReason = `Model Gradient Boosting menganalisis data pemakaian usaha Anda selama ${entries.length} bulan; jenis usaha dikenali dan pola stabil.`;
      } else if (isAnomalous) {
        confidenceLevel = "LOW";
        confidenceReason = `Terdeteksi lonjakan pemakaian tidak wajar (deviasi ${anomalyDeviation.toFixed(0)}% dari rata-rata ${entries.length} bulan) — prediksi model kurang akurat.`;
      } else {
        confidenceLevel = "LOW";
        confidenceReason = `Model Gradient Boosting menganalisis ${entries.length} bulan pemakaian, namun jenis usaha 'Lainnya' belum sepenuhnya dikenali oleh model.`;
      }
    } else {
      // Rule-Based
      confidenceLevel = "LOW";
      confidenceReason = entries.length < 2
        ? `Baru tersedia ${entries.length} bulan data pemakaian — model LSTM butuh 6 bulan. Silakan lengkapi data bulan berikutnya untuk akurasi yang lebih baik.`
        : `Data historis ${entries.length} bulan — model LSTM butuh minimal 6 bulan. Sistem memakai estimasi sederhana (rule-based).`;
    }
  }

  // 5. Generate Explanation Texts
  const trendPhrase = trendDirection === "STABIL"
    ? "pola pemakaian listrik yang relatif stabil"
    : `pola pemakaian listrik yang cenderung ${trendLabelId} ${Math.abs(trendPercent)}% dari bulan sebelumnya`;

  let explanation = "";
  if (finalMethod === "HYBRID_FALLBACK") {
    explanation = `Prediksi pemakaian listrik bulan depan sekitar ${predictedUsageKwh.toFixed(1)} kWh dengan estimasi tagihan listrik ${formatRp(predictedCostIdr)}. Angka ini dihitung memakai estimasi cadangan (rule-based) karena model utama tidak stabil untuk data usaha Anda, berdasarkan ${trendPhrase}.`;
  } else if (finalMethod === "LSTM_PROTOTYPE") {
    explanation = `Prediksi pemakaian listrik bulan depan sekitar ${predictedUsageKwh.toFixed(1)} kWh dengan estimasi tagihan listrik ${formatRp(predictedCostIdr)}. Angka ini dihitung memakai model AI LSTM yang menganalisis 6 bulan pola pemakaian listrik Anda, berdasarkan ${trendPhrase}.`;
  } else if (finalMethod === "TABULAR_RIDGE") {
    explanation = `Prediksi pemakaian listrik bulan depan sekitar ${predictedUsageKwh.toFixed(1)} kWh dengan estimasi tagihan listrik ${formatRp(predictedCostIdr)}. Angka ini dihitung memakai model linear (Ridge) yang menganalisis ${entries.length} bulan pola pemakaian listrik Anda, berdasarkan ${trendPhrase}.`;
  } else if (finalMethod === "TABULAR_UMKM_V1") {
    explanation = `Prediksi pemakaian listrik bulan depan sekitar ${predictedUsageKwh.toFixed(1)} kWh dengan estimasi tagihan listrik ${formatRp(predictedCostIdr)}. Angka ini dihitung memakai model Gradient Boosting yang menganalisis ${entries.length} bulan pola pemakaian listrik Anda, berdasarkan ${trendPhrase}.`;
  } else {
    explanation = `Prediksi pemakaian listrik bulan depan sekitar ${predictedUsageKwh.toFixed(1)} kWh dengan estimasi tagihan listrik ${formatRp(predictedCostIdr)}. Karena data pemakaian belum lengkap (${entries.length}/6 bulan), angka ini dihitung memakai estimasi sederhana berdasarkan ${trendPhrase}.`;
  }

  return {
    predictedUsageKwh,
    predictedCostIdr,
    trendDirection,
    trendPercent,
    confidenceLevel,
    confidenceReason,
    method: finalMethod,
    modelVersion,
    explanation,
    disclaimer,
  };
}
