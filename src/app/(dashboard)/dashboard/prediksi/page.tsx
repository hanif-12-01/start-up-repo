import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import PrediksiClient from "./prediksi-client";
import { getPrediksiDataForBusiness } from "@/services/business";
import { getUserPlan } from "@/services/subscription";
import { FeatureGate } from "@/components/feature-gate";
import { db } from "@/lib/db";

export default async function PrediksiPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Feature gate check
  const { plan } = await getUserPlan(session.user.id);
  const planCode = plan?.code || "FREE";
  if (planCode !== "PRO_UMKM" && planCode !== "BUSINESS") {
    return (
      <FeatureGate
        featureName="Prediksi Pintar Energi"
        requiredTier="Pro UMKM"
        description="Analisis pola pemakaian listrik masa lalu dan dapatkan prediksi tagihan serta estimasi kenaikan penggunaan di masa depan secara otomatis dengan AI."
      />
    );
  }

  const business = await getPrediksiDataForBusiness(session.user.id);

  if (!business) {
    redirect("/onboarding");
  }

  const latestEntry = business.electricityEntries[0];
  const latestAnalysis = business.analysisResults[0];

  let prediction = null;
  if (latestEntry) {
    // Ambil data prediksi langsung dari database (read-only)
    prediction = await db.predictionResult.findFirst({
      where: {
        businessId: business.id,
        month: latestEntry.month,
        year: latestEntry.year,
      },
    });
  }

  const tagihanBulanLalu = latestEntry ? latestEntry.costIdr : 0;
  
  let risikoLevel = "Rendah";
  if (latestAnalysis?.efficiencyScore !== undefined && latestAnalysis?.efficiencyScore !== null) {
    const score = latestAnalysis.efficiencyScore;
    if (score < 60) {
      risikoLevel = "Tinggi";
    } else if (score < 80) {
      risikoLevel = "Sedang";
    }
  }

  let alasanUtama = prediction?.explanation || "Silakan lakukan generate prediksi untuk melihat analisis penyebab utama.";
  
  const prediksiData = {
    hasPrediction: !!prediction,
    businessId: business.id,
    latestMonth: latestEntry ? latestEntry.month : undefined,
    latestYear: latestEntry ? latestEntry.year : undefined,
    prediksiTagihan: prediction ? prediction.predictedCostIdr : 0,
    predictedUsageKwh: prediction ? prediction.predictedUsageKwh : 0,
    tagihanBulanLalu,
    kenaikanPersen: prediction ? prediction.trendPercent : 0,
    risikoLevel,
    alasanUtama,
    penjelasan: prediction?.disclaimer || "Prediksi ini dibuat berdasarkan pola tagihan sebelumnya. Hasilnya adalah estimasi/proyeksi kas dan bukan tagihan resmi PLN.",
    modelVersion: prediction?.modelVersion || undefined,
    method: prediction?.method || undefined,
    confidenceLevel: prediction?.confidenceLevel || undefined,
    confidenceReason: prediction?.confidenceReason || undefined,
  };

  const proyeksiBulanIni = business.dailyUsages.map((d) => {
    const dateObj = new Date(d.date);
    const dayString = dateObj.getDate().toString();
    
    return {
      hari: dayString,
      aktual: d.usageKwh as number | null,
      proyeksi: null as number | null,
    };
  });

  const trendVal = prediction ? (prediction.trendPercent / 100) : 0.02;

  if (proyeksiBulanIni.length > 0) {
    const lastDayVal = proyeksiBulanIni[proyeksiBulanIni.length - 1].aktual || 0;
    const lastDayNum = parseInt(proyeksiBulanIni[proyeksiBulanIni.length - 1].hari);
    
    proyeksiBulanIni[proyeksiBulanIni.length - 1].proyeksi = lastDayVal;

    for (let i = 1; i <= 4; i++) {
      const nextDay = lastDayNum + i * 3;
      if (nextDay <= 30) {
        proyeksiBulanIni.push({
          hari: nextDay.toString(),
          aktual: null,
          proyeksi: parseFloat((lastDayVal * (1 + (i * 0.02) * trendVal)).toFixed(2)),
        });
      }
    }
  }

  return (
    <PrediksiClient
      prediksi={prediksiData}
      proyeksiBulanIni={proyeksiBulanIni}
    />
  );
}