import { db } from "@/lib/db";
import { PredictionResult } from "@prisma/client";
import {
  predictRidgeUmkm,
  MODEL_VERSION as RIDGE_UMKM_MODEL_VERSION,
  DISCLAIMER as RIDGE_UMKM_DISCLAIMER,
  type RidgeFeatureInput,
} from "@/lib/prediction/ridge-umkm-model";

export interface PredictionInput {
  businessId: string;
  month: number;
  year: number;
  userId: string;
}

export async function generatePrediction({
  businessId,
  month,
  year,
  userId,
}: PredictionInput): Promise<PredictionResult | null> {
  // 1. Ambil data bisnis dengan ownership terkunci di query — service tidak boleh
  //    memproses business yang bukan milik userId pemanggil, meski sudah dicek di
  //    server action (defense-in-depth).
  const business = await db.business.findFirst({
    where: { id: businessId, userId },
    select: { type: true },
  });

  if (!business) {
    return null;
  }

  // 2. Ambil riwayat pemakaian listrik terdekat (sampai 6 bulan ke belakang)
  // Diurutkan secara kronologis terbalik (dari terbaru ke terlama) untuk memudahkan indexing
  // Filter entry yang tahun & bulannya <= periode aktif untuk menghindari kebocoran data masa depan
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
    take: 6,
  });

  if (entries.length === 0) {
    return null;
  }

  const currentEntry = entries[0];
  const prevEntry = entries[1] || null;

  // Tentukan target periode prediksi (bulan depan)
  const predictedForMonth = month === 12 ? 1 : month + 1;
  const predictedForYear = month === 12 ? year + 1 : year;

  // 3. Hitung fitur dasar dari data historis
  const latest_usage_kwh = currentEntry.usageKwh;
  const previous_usage_kwh = prevEntry ? prevEntry.usageKwh : latest_usage_kwh;

  // Hitung rata-rata 3 bulan (rolling 3)
  const avg3Count = Math.min(entries.length, 3);
  let sum3 = 0;
  for (let i = 0; i < avg3Count; i++) {
    sum3 += entries[i].usageKwh;
  }
  const avg_3_month_usage_kwh = sum3 / avg3Count;

  // Hitung rata-rata 6 bulan (rolling 6)
  const avg6Count = Math.min(entries.length, 6);
  let sum6 = 0;
  for (let i = 0; i < avg6Count; i++) {
    sum6 += entries[i].usageKwh;
  }
  const avg_6_month_usage_kwh = sum6 / avg6Count;

  // Hitung tren perubahan
  const trend_1_month = (latest_usage_kwh - previous_usage_kwh) / (previous_usage_kwh + 1e-5);
  const trend_3_month = (latest_usage_kwh - avg_3_month_usage_kwh) / (avg_3_month_usage_kwh + 1e-5);

  const avgTariff = currentEntry.usageKwh > 0 ? currentEntry.costIdr / currentEntry.usageKwh : 1444.70;

  // Deklarasi variabel output prediksi
  let predictedUsageKwh = 0.0;
  let predictedCostIdr = 0.0;
  let trendPercent = 0.0;
  let trendDirection: "NAIK" | "TURUN" | "STABIL" = "STABIL";
  let confidenceLevel: "HIGH" | "MEDIUM" | "LOW" = "LOW";
  let confidenceReason = "";
  let method: "RIDGE_UMKM_V1" | "RULE_BASED" | "HYBRID_FALLBACK" = "RULE_BASED";
  let modelVersion = "";
  let explanation = "";
  const disclaimer = RIDGE_UMKM_DISCLAIMER;

  // Ambang batas heuristik yang dipakai bersama
  const STABIL_THRESHOLD_PCT = 1.0; // |Δ| < 1% dianggap stabil
  const ANOMALY_DEVIATION_PCT = 40; // |latest vs avg6| > 40% dianggap anomali
  const MIN_KWH_PREDICTION = 10.0; // batas bawah prediksi kWh
  const isKnownType = business.type !== "OTHER";

  // Cek indikasi data anomali (deviasi latest terhadap rata-rata 6 bulan)
  const anomalyDeviation = avg_6_month_usage_kwh > 0
    ? Math.abs((latest_usage_kwh - avg_6_month_usage_kwh) / avg_6_month_usage_kwh) * 100
    : 0;
  const isAnomalous = anomalyDeviation > ANOMALY_DEVIATION_PCT;

  const classifyTrend = (pct: number): "NAIK" | "TURUN" | "STABIL" => {
    if (Math.abs(pct) < STABIL_THRESHOLD_PCT) return "STABIL";
    return pct > 0 ? "NAIK" : "TURUN";
  };

  const trendLabelId = (dir: "NAIK" | "TURUN" | "STABIL") =>
    dir === "NAIK" ? "naik" : dir === "TURUN" ? "turun" : "stabil";

  const formatRp = (n: number) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(n);

  // Rule-based fallback dipakai (a) saat data <3 bulan, atau (b) saat model utama
  // menghasilkan output tidak masuk akal. Dikemas sebagai fungsi supaya bisa dipanggil dari dua jalur.
  const runRuleBasedFallback = () => {
    let fallbackTrendPercent = 0.0;
    if (prevEntry && prevEntry.usageKwh > 0) {
      const changePct = (currentEntry.usageKwh - prevEntry.usageKwh) / prevEntry.usageKwh;
      fallbackTrendPercent = parseFloat((Math.max(-0.2, Math.min(0.2, changePct)) * 100).toFixed(1));
    } else {
      // Data hanya 1 bulan → default asumsi kenaikan wajar 2%
      fallbackTrendPercent = 2.0;
    }
    const rawKwh = currentEntry.usageKwh * (1 + fallbackTrendPercent / 100);
    return {
      trendPercent: fallbackTrendPercent,
      predictedUsageKwh: parseFloat(Math.max(MIN_KWH_PREDICTION, rawKwh).toFixed(2)),
    };
  };

  // 4. Cek ketersediaan data untuk model Ridge ML
  //    Model membutuhkan minimal 3 bulan data historis agar fitur rolling/tren valid.
  if (entries.length >= 3) {
    method = "RIDGE_UMKM_V1";
    modelVersion = RIDGE_UMKM_MODEL_VERSION;

    // Encode business type — mapping ini harus SAMA persis dengan encoding
    // yang dipakai saat training (lihat ML/outputs_umkm/model_metadata.json).
    const typeMapping: Record<string, number> = {
      LAUNDRY: 0,
      FNB: 1,
      RETAIL: 2,
      MANUFACTURE: 3,
      COLD_STORAGE: 4,
      OTHER: 6,
    };
    const business_type_encoded = typeMapping[business.type] ?? 6;

    const month_sin = Math.sin((2 * Math.PI * month) / 12);
    const month_cos = Math.cos((2 * Math.PI * month) / 12);

    // Susun input persis sesuai FEATURE_ORDER pada
    // src/lib/prediction/ridge-umkm-model.ts (koefisien Ridge UMKM v1.1 hasil
    // export dari ML/outputs_umkm/ridge_model.pkl).
    const ridgeFeatures: RidgeFeatureInput = {
      business_type_encoded,
      month,
      latest_usage_kwh,
      previous_usage_kwh,
      avg_3_month_usage_kwh,
      avg_6_month_usage_kwh,
      trend_1_month,
      trend_3_month,
      month_sin,
      month_cos,
      avg_tariff_idr_per_kwh: avgTariff,
    };

    // Jalankan model utama. Fungsi ini melempar bila ada fitur non-finite,
    // yang kita tangani sebagai jalur HYBRID_FALLBACK di catch di bawah.
    let rawPrediction: number = NaN;
    try {
      rawPrediction = predictRidgeUmkm(ridgeFeatures);
    } catch {
      rawPrediction = NaN;
    }

    // Sanity-check output model: NaN, terlalu ekstrem (>3x latest atau <1/3 latest),
    // atau di bawah batas minimum → jatuh ke rule-based sebagai HYBRID_FALLBACK.
    const upperBound = latest_usage_kwh * 3;
    const lowerBound = latest_usage_kwh / 3;
    const modelOutputInvalid =
      !Number.isFinite(rawPrediction) ||
      rawPrediction < MIN_KWH_PREDICTION ||
      rawPrediction > upperBound ||
      rawPrediction < lowerBound;

    if (modelOutputInvalid) {
      const fb = runRuleBasedFallback();
      method = "HYBRID_FALLBACK";
      modelVersion = `${RIDGE_UMKM_MODEL_VERSION} → Rule-Based v1.0`;
      predictedUsageKwh = fb.predictedUsageKwh;
      trendPercent = fb.trendPercent;
      confidenceLevel = "LOW";
      confidenceReason = "Model utama menghasilkan output tidak wajar sehingga sistem beralih ke estimasi rule-based.";
    } else {
      predictedUsageKwh = parseFloat(Math.max(MIN_KWH_PREDICTION, rawPrediction).toFixed(2));
      trendPercent = parseFloat((((predictedUsageKwh - latest_usage_kwh) / (latest_usage_kwh + 1e-5)) * 100).toFixed(1));

      // Aturan confidence untuk jalur model utama
      if (entries.length >= 6 && isKnownType && !isAnomalous) {
        confidenceLevel = "HIGH";
        confidenceReason = "Data historis lengkap (≥6 bulan), jenis usaha dikenali, dan pola pemakaian stabil tanpa anomali.";
      } else if (isAnomalous) {
        confidenceLevel = "LOW";
        confidenceReason = `Terdeteksi lonjakan pemakaian tidak wajar (deviasi ${anomalyDeviation.toFixed(0)}% dari rata-rata 6 bulan) — prediksi mungkin kurang akurat.`;
      } else if (!isKnownType) {
        confidenceLevel = "LOW";
        confidenceReason = "Jenis usaha 'Lainnya' belum dikenali penuh oleh model — hasil merupakan estimasi kasar.";
      } else if (entries.length >= 3) {
        confidenceLevel = "MEDIUM";
        confidenceReason = "Data historis cukup (3–5 bulan) dan jenis usaha dikenali, namun belum optimal — sebaiknya lengkapi hingga 6 bulan.";
      }
    }

    predictedCostIdr = Math.round(predictedUsageKwh * avgTariff);
    trendDirection = classifyTrend(trendPercent);

    const trendPhrase = trendDirection === "STABIL"
      ? "pola pemakaian yang relatif stabil"
      : `pola pemakaian yang cenderung ${trendLabelId(trendDirection)} ${Math.abs(trendPercent)}% dari bulan sebelumnya`;
    const methodPhrase = method === "HYBRID_FALLBACK"
      ? "estimasi cadangan (rule-based) karena model utama tidak stabil untuk data usaha Anda"
      : "model AI ringan yang menganalisis pola tagihan Anda";
    explanation = `Perkiraan pemakaian bulan depan sekitar ${predictedUsageKwh.toFixed(1)} kWh dengan biaya ${formatRp(predictedCostIdr)}. Angka ini dihitung memakai ${methodPhrase}, berdasarkan ${trendPhrase}.`;

  } else {
    // 5. Fallback jika data <3 bulan → langsung RULE_BASED
    method = "RULE_BASED";
    modelVersion = "Rule-Based v1.0";

    const fb = runRuleBasedFallback();
    predictedUsageKwh = fb.predictedUsageKwh;
    trendPercent = fb.trendPercent;
    predictedCostIdr = Math.round(predictedUsageKwh * avgTariff);
    trendDirection = classifyTrend(trendPercent);

    confidenceLevel = "LOW";
    confidenceReason = entries.length < 2
      ? "Baru tersedia 1 bulan data pemakaian — belum cukup untuk melihat pola. Silakan isi data bulan berikutnya untuk akurasi yang lebih baik."
      : "Data historis kurang dari 3 bulan sehingga sistem memakai estimasi sederhana (rule-based). Akurasi masih terbatas.";

    const trendPhrase = trendDirection === "STABIL"
      ? "pola pemakaian yang relatif stabil"
      : `pola pemakaian yang cenderung ${trendLabelId(trendDirection)} ${Math.abs(trendPercent)}% dari bulan sebelumnya`;
    explanation = `Perkiraan pemakaian bulan depan sekitar ${predictedUsageKwh.toFixed(1)} kWh dengan biaya ${formatRp(predictedCostIdr)}. Karena data pemakaian Anda belum lengkap, angka ini dihitung memakai estimasi sederhana berdasarkan ${trendPhrase}.`;
  }

  // Safety-net akhir: pastikan tidak ada nilai negatif / NaN yang lolos.
  if (!Number.isFinite(predictedUsageKwh) || predictedUsageKwh < MIN_KWH_PREDICTION) {
    predictedUsageKwh = MIN_KWH_PREDICTION;
  }
  if (!Number.isFinite(predictedCostIdr) || predictedCostIdr < 0) {
    predictedCostIdr = Math.round(predictedUsageKwh * avgTariff);
  }
  if (!Number.isFinite(trendPercent)) {
    trendPercent = 0;
    trendDirection = "STABIL";
  }

  // 6. Cari prediksi yang sudah ada untuk periode ini (update-or-create manual;
  //    skema tidak punya composite unique jadi tidak bisa pakai upsert langsung)
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
