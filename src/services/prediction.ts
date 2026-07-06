import { db } from "../lib/db";
import { PredictionResult } from "@prisma/client";
import { calculateHistoryStats, buildTabularFeatures, buildLstmSequence } from "../lib/prediction/feature-builder";
import { predictRuleBased } from "../lib/prediction/rule-based-model";
import { predictTabularUmkm } from "../lib/prediction/tabular-umkm-model";
import { predictLstmUmkm } from "../lib/prediction/lstm-umkm-model";


export interface PredictionInput {
  businessId: string;
  month: number;
  year: number;
  userId: string;
}

function formatRp(n: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);
}

export async function generatePrediction({
  businessId,
  month,
  year,
  userId,
}: PredictionInput): Promise<PredictionResult | null> {
  // 1. Ambil business dan electricity entries dari database.
  const business = await db.business.findFirst({
    where: { id: businessId, userId },
    select: { type: true },
  });

  if (!business) {
    return null;
  }

  // Ambil sampai 36 bulan ke belakang
  const entries = await db.electricityEntry.findMany({
    where: {
      businessId,
      OR: [
        { year: { lt: year } },
        { year, month: { lte: month } }
      ]
    },
    orderBy: [
      { year: "desc" },
      { month: "desc" }
    ],
    take: 36,
  });

  if (entries.length === 0) {
    return null;
  }

  // 2. Hitung history stats menggunakan feature-builder.
  const stats = calculateHistoryStats(entries);

  // 3. Panggil model-router untuk menentukan model.
  let selectedModel: "RULE_BASED" | "TABULAR_MODEL" | "LSTM" = "RULE_BASED";
  if (stats.historyMonths < 3) {
    selectedModel = "RULE_BASED";
  } else if (stats.historyMonths >= 3 && stats.historyMonths <= 5) {
    selectedModel = "TABULAR_MODEL";
  } else {
    selectedModel = "LSTM";
  }

  // Deklarasi variabel output prediksi
  let predictedUsageKwh = 0.0;
  let method: "RULE_BASED" | "TABULAR_UMKM_V1" | "LSTM_PROTOTYPE" | "HYBRID_FALLBACK" = "RULE_BASED";
  let modelVersion = "";
  let confidenceLevel: "HIGH" | "MEDIUM" | "LOW" = "LOW";
  let confidenceReason = "";
  let explanation = "";

  const isKnownType = business.type !== "OTHER";
  const isAnomalous = stats.hasSpike || stats.hasDrop;
  const anomalyDeviation = stats.anomalyDeviation;

  // 4. Jika selectedModel RULE_BASED: jalankan rule-based prediction.
  if (selectedModel === "RULE_BASED") {
    method = "RULE_BASED";
    modelVersion = "Rule-Based v1.0";

    const rbRes = predictRuleBased({
      businessId,
      businessType: business.type,
      month,
      year,
      historicalEntries: entries,
    });
    predictedUsageKwh = rbRes.predictedUsageKwh;

    confidenceLevel = "LOW";
    confidenceReason = entries.length < 2
      ? `Baru tersedia ${entries.length} bulan data pemakaian — model LSTM butuh 6 bulan. Silakan lengkapi data bulan berikutnya untuk akurasi yang lebih baik.`
      : `Data historis ${entries.length} bulan — model LSTM butuh minimal 6 bulan. Sistem memakai estimasi sederhana (rule-based).`;

    explanation = "Data historis belum cukup untuk model AI penuh, sehingga sistem memakai estimasi sederhana berbasis aturan.";
  }

  // 5. Jika selectedModel TABULAR_MODEL: jalankan predictTabularUmkm(features).
  else if (selectedModel === "TABULAR_MODEL") {
    method = "TABULAR_UMKM_V1";
    modelVersion = "Gradient Boosting UMKM v1.0";

    try {
      const features = buildTabularFeatures({
        businessType: business.type,
        entries,
      });
      const tabularRes = predictTabularUmkm(features);
      predictedUsageKwh = tabularRes.predictedUsageKwh;

      // Sanity check output tabular (>3x atau <1/3x dari latest usage)
      const upperBound = stats.latestUsageKwh * 3;
      const lowerBound = stats.latestUsageKwh / 3;
      const invalid = predictedUsageKwh > upperBound || predictedUsageKwh < lowerBound;

      if (invalid) {
        // Fallback ke HYBRID_FALLBACK
        method = "HYBRID_FALLBACK";
        modelVersion = "Gradient Boosting UMKM v1.0 → Rule-Based v1.0";

        const rbRes = predictRuleBased({
          businessId,
          businessType: business.type,
          month,
          year,
          historicalEntries: entries,
        });
        predictedUsageKwh = rbRes.predictedUsageKwh;
        confidenceLevel = "LOW";
        confidenceReason = "Model utama menghasilkan output tidak wajar sehingga sistem beralih ke estimasi rule-based.";
        explanation = "AI memilih model tabular karena data historis belum cukup untuk LSTM. Namun, karena model utama tidak stabil untuk data usaha Anda, sistem beralih ke estimasi cadangan berbasis aturan.";
      } else {
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
        explanation = "AI memilih model tabular karena data historis belum cukup untuk LSTM. Prediksi dihitung dari pemakaian terakhir, rata-rata 3 bulan, tren pemakaian, jenis usaha, dan tarif listrik.";
      }
    } catch (err) {
      // Fallback total
      method = "HYBRID_FALLBACK";
      modelVersion = "Gradient Boosting UMKM v1.0 → Rule-Based v1.0";
      const rbRes = predictRuleBased({
        businessId,
        businessType: business.type,
        month,
        year,
        historicalEntries: entries,
      });
      predictedUsageKwh = rbRes.predictedUsageKwh;
      confidenceLevel = "LOW";
      confidenceReason = "Model utama mengalami kegagalan sistem sehingga dialihkan ke rule-based.";
      explanation = "Data historis belum cukup untuk model AI penuh, sehingga sistem memakai estimasi sederhana berbasis aturan.";
    }
  }

  // 6. Jika selectedModel LSTM: buat sequence 6 bulan dan jalankan predictLstmUmkm.
  else {
    method = "LSTM_PROTOTYPE";
    modelVersion = "LSTM UMKM v0.1";
    if (stats.historyMonths >= 24) {
      modelVersion = "LSTM UMKM v0.1 (Long-History Hook)";
    }

    try {
      const sequence = buildLstmSequence({
        businessType: business.type,
        entries,
        sequenceLength: 6,
      });
      const rawPrediction = predictLstmUmkm(sequence);
      predictedUsageKwh = rawPrediction;

      // Sanity check LSTM
      const upperBound = stats.latestUsageKwh * 3;
      const lowerBound = stats.latestUsageKwh / 3;
      const invalid = predictedUsageKwh > upperBound || predictedUsageKwh < lowerBound;

      if (invalid) {
        method = "HYBRID_FALLBACK";
        modelVersion = `${modelVersion} → Rule-Based v1.0`;
        const rbRes = predictRuleBased({
          businessId,
          businessType: business.type,
          month,
          year,
          historicalEntries: entries,
        });
        predictedUsageKwh = rbRes.predictedUsageKwh;
        confidenceLevel = "LOW";
        confidenceReason = "Model utama menghasilkan output tidak wajar sehingga sistem beralih ke estimasi rule-based.";
        explanation = "AI memilih model LSTM karena tersedia 6 bulan data historis. Namun, karena model utama tidak stabil untuk data usaha Anda, sistem beralih ke estimasi cadangan berbasis aturan.";
      } else {
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
        explanation = `AI memilih model LSTM karena tersedia 6 bulan data historis. Model membaca pola pemakaian berurutan dan memperkirakan pemakaian bulan depan sebesar ${predictedUsageKwh.toFixed(1)} kWh.`;
      }
    } catch (err) {
      method = "HYBRID_FALLBACK";
      modelVersion = `${modelVersion} → Rule-Based v1.0`;
      const rbRes = predictRuleBased({
        businessId,
        businessType: business.type,
        month,
        year,
        historicalEntries: entries,
      });
      predictedUsageKwh = rbRes.predictedUsageKwh;
      confidenceLevel = "LOW";
      confidenceReason = "Model utama mengalami kegagalan sistem sehingga dialihkan ke rule-based.";
      explanation = "AI memilih model LSTM karena tersedia 6 bulan data historis. Namun, karena model utama tidak stabil untuk data usaha Anda, sistem beralih ke estimasi cadangan berbasis aturan.";
    }
  }

  // 7. Setelah prediksi angka keluar: jalankan calibration.
  const MIN_KWH_PREDICTION = 10.0;
  if (!Number.isFinite(predictedUsageKwh) || predictedUsageKwh < MIN_KWH_PREDICTION) {
    predictedUsageKwh = MIN_KWH_PREDICTION;
  }

  const predictedCostIdr = Math.round(predictedUsageKwh * stats.avgTariff);

  const trendPercent = parseFloat(
    (((predictedUsageKwh - stats.latestUsageKwh) / (stats.latestUsageKwh + 1e-5)) * 100).toFixed(1)
  );

  let trendDirection: "NAIK" | "TURUN" | "STABIL" = "STABIL";
  if (Math.abs(trendPercent) >= 1.0) {
    trendDirection = trendPercent > 0 ? "NAIK" : "TURUN";
  }

  const disclaimer = "Hasil ini adalah estimasi, bukan tagihan resmi PLN.";

  // Tentukan target periode prediksi (bulan depan)
  const predictedForMonth = month === 12 ? 1 : month + 1;
  const predictedForYear = month === 12 ? year + 1 : year;

  const payload = {
    predictedUsageKwh,
    predictedCostIdr,
    trendDirection,
    trendPercent,
    confidenceLevel,
    confidenceReason,
    method,
    explanation,
    disclaimer,
    modelVersion,
  };

  // 8. Simpan ke PredictionResult
  const existingPrediction = await db.predictionResult.findFirst({
    where: {
      businessId,
      month,
      year,
      predictedForMonth,
      predictedForYear,
    },
    select: { id: true },
  });

  if (existingPrediction) {
    return db.predictionResult.update({
      where: { id: existingPrediction.id },
      data: payload,
    });
  }

  return db.predictionResult.create({
    data: {
      businessId,
      month,
      year,
      predictedForMonth,
      predictedForYear,
      ...payload,
    },
  });
}
