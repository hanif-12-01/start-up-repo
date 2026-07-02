import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const business = await db.business.findFirst({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: {
      electricityEntries: {
        orderBy: [{ year: "asc" }, { month: "asc" }],
        take: 6,
      },
      dailyUsages: {
        orderBy: { date: "asc" },
        take: 14,
      },
      appliances: {
        where: { usageStatus: "ACTIVE" },
        orderBy: { powerWatt: "desc" },
      },
      analysisResults: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 1,
      },
      anomalies: {
        where: { isResolved: false },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      recommendations: {
        where: { isImplemented: false },
        orderBy: { estimatedSavingsIdr: "desc" },
      },
    },
  });

  if (!business) {
    redirect("/onboarding");
  }

  const entries = business.electricityEntries;
  const latest = entries[entries.length - 1];
  const prev = entries.length > 1 ? entries[entries.length - 2] : null;
  const analysis = business.analysisResults[0];
  const hasAnomaly = business.anomalies.length > 0;
  const anomalyDesc = hasAnomaly ? business.anomalies[0].description : null;

  // Stat cards
  const tagihanBulanLalu = prev?.costIdr ?? 0;
  const kwhBulanIni = latest?.usageKwh ?? 0;

  let trend = 1.02;
  if (latest && prev && prev.usageKwh > 0) {
    const pct = (latest.usageKwh - prev.usageKwh) / prev.usageKwh;
    trend = 1 + Math.max(-0.2, Math.min(0.2, pct));
  }
  const avgTariff = latest && latest.usageKwh > 0 ? latest.costIdr / latest.usageKwh : 1450;
  const prediksiBulanIni = latest ? Math.round(latest.usageKwh * trend * avgTariff) : 0;

  const potensiHemat = business.recommendations.reduce(
    (sum, r) => sum + (r.estimatedSavingsIdr ?? 0),
    0
  );
  const energyScore = analysis?.efficiencyScore ?? 0;
  const kenaikanPersen = prev && prev.usageKwh > 0
    ? parseFloat((((kwhBulanIni - prev.usageKwh) / prev.usageKwh) * 100).toFixed(1))
    : 0;

  let statusPemakaian: "Aman" | "Perlu Perhatian" | "Boros" = "Aman";
  if (energyScore < 60) statusPemakaian = "Boros";
  else if (energyScore < 80) statusPemakaian = "Perlu Perhatian";

  const ringkasan = {
    tagihanBulanLalu,
    prediksiBulanIni,
    kwhBulanIni,
    potensiHemat,
    energyScore: Math.round(energyScore),
    statusPemakaian,
    kenaikanVsMingguLalu: Math.abs(kenaikanPersen),
    hasAnomaly,
    anomalyDesc,
    businessName: business.name,
  };

  // Monthly bill chart
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agt", "Sep", "Okt", "Nov", "Des"];
  const tagihanBulanan = entries.map((e, i) => ({
    bulan: monthNames[e.month - 1] || `Bln ${e.month}`,
    tagihan: e.costIdr,
    kwh: e.usageKwh,
    prediksi: i === entries.length - 1,
  }));

  // Daily usage chart
  const pemakaianHarian = business.dailyUsages.map((d) => {
    const dateObj = new Date(d.date);
    return {
      hari: dateObj.getDate().toString(),
      kwh: d.usageKwh,
      normal: analysis?.avgDailyKwh ?? d.usageKwh * 0.9,
    };
  });

  // Appliance pie chart
  const COLORS = ["#2563eb", "#16a34a", "#eab308", "#f97316", "#8b5cf6", "#94a3b8", "#ef4444", "#06b6d4"];
  const pemakaianPeralatan = business.appliances.map((a, i) => {
    const dailyKwh = (a.powerWatt * a.quantity * a.dailyUsageHours) / 1000;
    const monthlyKwh = Math.round(dailyKwh * 30);
    return {
      nama: a.name,
      kwh: monthlyKwh,
      warna: COLORS[i % COLORS.length],
    };
  });

  return (
    <DashboardClient
      ringkasan={ringkasan}
      tagihanBulanan={tagihanBulanan}
      pemakaianHarian={pemakaianHarian}
      pemakaianPeralatan={pemakaianPeralatan}
    />
  );
}
