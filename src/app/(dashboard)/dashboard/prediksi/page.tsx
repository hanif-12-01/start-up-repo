import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import PrediksiClient from "./prediksi-client";
import { getActiveBusinessId } from "@/services/business";
import { getUserPlan } from "@/services/subscription";
import { FeatureGate } from "@/components/feature-gate";

export default async function PrediksiPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const activeBusinessId = await getActiveBusinessId(session.user.id);
  if (!activeBusinessId) {
    redirect("/onboarding");
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

  const business = await db.business.findFirst({
    where: { id: activeBusinessId, userId: session.user.id },
    include: {
      electricityEntries: {
        orderBy: [
          { year: "desc" },
          { month: "desc" }
        ],
        take: 2,
      },
      analysisResults: {
        orderBy: [
          { year: "desc" },
          { month: "desc" }
        ],
        take: 1,
      },
      dailyUsages: {
        orderBy: { date: "asc" },
        take: 30,
      },
    },
  });

  if (!business) {
    redirect("/onboarding");
  }

  const latestEntry = business.electricityEntries[0];
  const prevEntry = business.electricityEntries[1];
  const latestAnalysis = business.analysisResults[0];

  const tagihanBulanLalu = latestEntry ? latestEntry.costIdr : 0;
  
  let trend = 1.02;
  if (latestEntry && prevEntry && prevEntry.usageKwh > 0) {
    const pctChange = (latestEntry.usageKwh - prevEntry.usageKwh) / prevEntry.usageKwh;
    trend = 1 + Math.max(-0.2, Math.min(0.2, pctChange));
  }

  const prediksiKwh = latestEntry ? latestEntry.usageKwh * trend : 0;
  const avgTariff = latestEntry && latestEntry.usageKwh > 0 ? latestEntry.costIdr / latestEntry.usageKwh : 1450;
  const prediksiTagihan = latestEntry ? Math.round(prediksiKwh * avgTariff) : 0;

  const kenaikanPersen = latestEntry && prevEntry && prevEntry.usageKwh > 0
    ? parseFloat((((latestEntry.usageKwh - prevEntry.usageKwh) / prevEntry.usageKwh) * 100).toFixed(1))
    : parseFloat(((trend - 1) * 100).toFixed(1));

  let risikoLevel = "Rendah";
  if (latestAnalysis?.efficiencyScore !== undefined && latestAnalysis?.efficiencyScore !== null) {
    const score = latestAnalysis.efficiencyScore;
    if (score < 60) {
      risikoLevel = "Tinggi";
    } else if (score < 80) {
      risikoLevel = "Sedang";
    }
  }

  let alasanUtama = "Belum ada data pemakaian yang cukup untuk menganalisis penyebab utama.";
  if (latestEntry) {
    if (risikoLevel === "Tinggi") {
      alasanUtama = "Terdeteksi lonjakan pemakaian pada jam operasional puncak. Periksa peralatan berdaya tinggi yang berjalan melebihi waktu normal.";
    } else if (risikoLevel === "Sedang") {
      alasanUtama = "Konsumsi listrik relatif stabil namun terdeteksi beberapa kebocoran standby power pada malam hari.";
    } else {
      alasanUtama = "Penggunaan listrik sangat efisien dan terkontrol dengan baik sesuai kapasitas peralatan terdaftar.";
    }
  }

  const penjelasan = "Prediksi ini dibuat berdasarkan pola tagihan sebelumnya, jam operasional, dan kapasitas daya VA terpasang. Hasilnya adalah estimasi/proyeksi kas dan bukan tagihan resmi PLN.";

  const prediksiData = {
    prediksiTagihan,
    tagihanBulanLalu,
    kenaikanPersen,
    risikoLevel,
    alasanUtama,
    penjelasan,
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
          proyeksi: parseFloat((lastDayVal * (1 + (i * 0.02) * (trend - 1))).toFixed(2)),
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