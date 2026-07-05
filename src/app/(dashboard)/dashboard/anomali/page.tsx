import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import AnomaliClient from "./anomali-client";
import { getAnomaliDataForBusiness } from "@/services/business";
import { getUserPlan } from "@/services/subscription";
import { FeatureGate } from "@/components/feature-gate";

export default async function AnomaliPage() {
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
        featureName="Deteksi Anomali Daya & Multi-Cabang"
        requiredTier="Pro UMKM"
        description="Pantau konsumsi daya peralatan secara real-time dan deteksi kebocoran daya atau anomali operasional di berbagai cabang usaha Anda secara otomatis."
      />
    );
  }

  const business = await getAnomaliDataForBusiness(session.user.id);

  if (!business) {
    redirect("/onboarding");
  }

  const latestAnalysis = business.analysisResults[0];
  const activeMonth = latestAnalysis?.month ?? 5;
  const activeYear = latestAnalysis?.year ?? 2026;

  const currentMonthAnomalies = business.anomalies.filter(
    (a) => a.month === activeMonth && a.year === activeYear
  );

  const highSeverityAnomalies = currentMonthAnomalies.filter(
    (a) => a.severity === "HIGH" && !a.isResolved
  );

  let judulLonjakan = "Pemakaian Normal";
  let waktu = "Tidak terdeteksi";
  let kemungkinanPenyebab = "Belum terdeteksi adanya peralatan listrik bermasalah.";
  let dampakEstimasi = "Tagihan listrik berjalan sesuai estimasi normal.";

  if (highSeverityAnomalies.length > 0) {
    judulLonjakan = "Lonjakan Pemakaian Kritis";
    waktu = "Jam Operasional Utama";
    kemungkinanPenyebab = highSeverityAnomalies[0].description;
    
    let totalImpact = 0;
    highSeverityAnomalies.forEach((a) => {
      if (a.usageKwh && a.expectedKwh && a.usageKwh > a.expectedKwh) {
        totalImpact += (a.usageKwh - a.expectedKwh) * 1450;
      }
    });

    dampakEstimasi = totalImpact > 0
      ? `Tambahan biaya sekitar Rp${Math.round(totalImpact).toLocaleString("id-ID")} bulan ini`
      : "Terdeteksi pemborosan energi signifikan.";
  } else if (currentMonthAnomalies.length > 0) {
    judulLonjakan = "Perlu Perhatian";
    waktu = "Variatif";
    
    const unresolved = currentMonthAnomalies.filter((a) => !a.isResolved);
    if (unresolved.length > 0) {
      kemungkinanPenyebab = unresolved[0].description;
    } else {
      kemungkinanPenyebab = "Beberapa anomali ringan terdeteksi namun telah ditangani.";
    }

    let totalImpact = 0;
    unresolved.forEach((a) => {
      if (a.usageKwh && a.expectedKwh && a.usageKwh > a.expectedKwh) {
        totalImpact += (a.usageKwh - a.expectedKwh) * 1450;
      }
    });

    dampakEstimasi = totalImpact > 0
      ? `Tambahan biaya sekitar Rp${Math.round(totalImpact).toLocaleString("id-ID")} bulan ini`
      : "Potensi peningkatan biaya listrik.";
  }

  const mappedAnomalies = business.anomalies.map((a) => {
    let status: "Normal" | "Perlu Dicek" | "Boros" = "Normal";
    if (a.severity === "HIGH") {
      status = "Boros";
    } else if (a.severity === "MEDIUM") {
      status = "Perlu Dicek";
    }

    const normalVal = a.expectedKwh ?? 30;
    const terdeteksiVal = a.usageKwh ?? 30;
    const costImpact = Math.max(0, Math.round((terdeteksiVal - normalVal) * 1450));

    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "Mei", "Jun", 
      "Jul", "Agt", "Sep", "Okt", "Nov", "Des"
    ];
    const dateLabel = `${monthNames[a.month - 1] || "Bulan"} ${a.year}`;

    let saran = "Lakukan pemantauan berkala pada peralatan listrik Anda.";
    const descLower = a.description.toLowerCase();
    if (descLower.includes("boiler") || descLower.includes("setrika")) {
      saran = "Servis elemen pemanas boiler setrika atau atur jadwal penggunaan agar tidak berbarengan.";
    } else if (descLower.includes("pompa")) {
      saran = "Periksa instalasi pipa untuk mendeteksi kebocoran air, pasang otomatis tandon air.";
    } else if (descLower.includes("kondensor") || descLower.includes("ac")) {
      saran = "Lakukan cuci AC / pembersihan kondensor outdoor secara berkala, ganti filter kotor.";
    } else if (descLower.includes("gasket") || descLower.includes("segel")) {
      saran = "Segera ganti karet pintu (gasket) freezer yang bocor agar udara dingin tidak keluar.";
    } else if (descLower.includes("standby") || descLower.includes("malam")) {
      saran = "Matikan total (cabut saklar) peralatan yang tidak terpakai saat toko tutup.";
    }

    return {
      id: a.id,
      tanggal: dateLabel,
      normal: normalVal,
      terdeteksi: terdeteksiVal,
      status,
      penyebab: a.description,
      costImpact,
      saran,
    };
  });

  const summaryData = {
    judulLonjakan,
    waktu,
    kemungkinanPenyebab,
    dampakEstimasi,
  };

  return (
    <AnomaliClient
      summary={summaryData}
      anomalies={mappedAnomalies}
    />
  );
}