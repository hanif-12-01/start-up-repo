import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import DashboardClient from "./dashboard-client";
import { db } from "@/lib/db";
import {
  getActiveBusinessId,
  getDashboardDataForBusiness,
} from "@/services/business";
import {
  getCashFlowTrendData,
  getLatestCashFlowEntry,
} from "@/services/cash-flow";
import {
  calculateBillAfterSavings,
  calculateElectricityRevenueRatio,
  calculatePotentialRemainingRevenueAfterSavings,
  calculateRemainingRevenueAfterElectricity,
  classifyElectricityRevenueRatio,
  type CashFlowAnalytics,
  type CashFlowAnalyticsTrendPoint,
  type CashFlowBusinessType,
} from "@/lib/cash-flow";
import { getUserPlan } from "@/services/subscription";
import { getApplianceSummaryForBusiness } from "@/services/appliance";
import { shouldShowAds } from "@/lib/ads";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const business = await getDashboardDataForBusiness(session.user.id);

  if (!business) {
    redirect("/onboarding");
  }


  const entries = [...business.electricityEntries].reverse();
  const latest = entries[entries.length - 1];
  const prev = entries.length > 1 ? entries[entries.length - 2] : null;
  const analysis = business.analysisResults[0];
  const hasElectricityData = entries.length > 0;
  const isFirstMonthOnly = entries.length === 1;
  const hasTrendComparison = entries.length > 1;
  
  const hasAnomaly = hasElectricityData && business.anomalies.length > 0;
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

  let statusPemakaian: "Aman" | "Perlu Perhatian" | "Boros" | "Belum Ada Data" = "Aman";
  if (!hasElectricityData) {
    statusPemakaian = "Belum Ada Data";
  } else if (energyScore < 60) {
    statusPemakaian = "Boros";
  } else if (energyScore < 80) {
    statusPemakaian = "Perlu Perhatian";
  }

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
    hasElectricityData,
    isFirstMonthOnly,
    hasTrendComparison,
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
  const efisiensiPeralatan = business.recommendations.slice(0, 3).map((rec) => ({
    id: rec.id,
    name: rec.title,
    status: "Perlu Dicek" as const,
    reason: "Rekomendasi tersimpan dari analisis listrik terakhir.",
    practicalAdvice: rec.description,
    estimatedMonthlySavingIdr: rec.estimatedSavingsIdr,
  }));

  // ─────────────────────────────────────────────────────────────
  // Cash Flow Analytics (Task 7) — data-flow saja, UI belum dirender.
  //
  // Rule:
  //  - Nol pipeline analisis berat; hanya read DB + fungsi murni dari lib.
  //  - Defensif terhadap CashFlowEntry belum ter-migrate (P2021) — kalau
  //    tabel belum ada, kita treat sebagai "belum ada data pendapatan"
  //    supaya dashboard tetap render.
  //  - Ownership sudah dijamin oleh `getDashboardDataForBusiness` di atas —
  //    kita pakai ulang `activeBusinessId` (dedup via React.cache).
  // ─────────────────────────────────────────────────────────────

  const activeBusinessId = await getActiveBusinessId(session.user.id);
  let cashFlowAnalytics: CashFlowAnalytics | null = null;

  if (activeBusinessId) {
    let latestRevenue: { revenueIdr: number; month: number; year: number } | null = null;
    let trend: CashFlowAnalyticsTrendPoint[] = [];
    try {
      const [rev, trendData] = await Promise.all([
        getLatestCashFlowEntry(activeBusinessId),
        getCashFlowTrendData(activeBusinessId),
      ]);
      latestRevenue = rev
        ? { revenueIdr: rev.revenueIdr, month: rev.month, year: rev.year }
        : null;
      trend = trendData;
    } catch (error) {
      // Tabel CashFlowEntry belum di-migrate (Prisma P2021). Log server-side
      // saja; UI dashboard fallback ke state "belum ada data pendapatan".
      console.warn(
        "[dashboard] CashFlowEntry not available — running migrate would enable analytics:",
        error instanceof Error ? error.message : error,
      );
    }

    // Sumber biaya listrik: aktual dulu, fallback ke prediksi tersimpan.
    let electricityCostIdr: number | null = null;
    let electricityCostLabel: string | null = null;
    if (latest) {
      electricityCostIdr = latest.costIdr;
      electricityCostLabel = "Tagihan listrik tercatat";
    } else {
      const latestPrediction = await db.predictionResult.findFirst({
        where: { businessId: activeBusinessId },
        orderBy: [
          { predictedForYear: "desc" },
          { predictedForMonth: "desc" },
        ],
        select: { predictedCostIdr: true },
      });
      if (latestPrediction) {
        electricityCostIdr = latestPrediction.predictedCostIdr;
        electricityCostLabel = "Estimasi tagihan listrik";
      }
    }

    // Business type untuk klasifikasi rasio per sektor (mengambil hanya field
    // `type` — read super ringan; ownership sudah dijamin di step atas).
    const businessMeta = await db.business.findFirst({
      where: { id: activeBusinessId, userId: session.user.id },
      select: { type: true },
    });
    const businessType = (businessMeta?.type ?? "OTHER") as CashFlowBusinessType;

    const revenueIdr = latestRevenue?.revenueIdr ?? null;
    const potentialSavingsIdr = potensiHemat; // reuse hitungan existing

    const ratioPercent =
      revenueIdr !== null && electricityCostIdr !== null
        ? calculateElectricityRevenueRatio(revenueIdr, electricityCostIdr)
        : null;
    const ratioStatus = classifyElectricityRevenueRatio(ratioPercent, businessType);

    const remainingRevenueIdr =
      revenueIdr !== null && electricityCostIdr !== null
        ? calculateRemainingRevenueAfterElectricity(revenueIdr, electricityCostIdr)
        : null;
    const estimatedBillAfterSavingsIdr =
      electricityCostIdr !== null
        ? calculateBillAfterSavings(electricityCostIdr, potentialSavingsIdr)
        : null;
    const potentialRemainingRevenueIdr =
      revenueIdr !== null && electricityCostIdr !== null
        ? calculatePotentialRemainingRevenueAfterSavings(
            revenueIdr,
            electricityCostIdr,
            potentialSavingsIdr,
          )
        : null;

    cashFlowAnalytics = {
      hasRevenueData: revenueIdr !== null,
      revenueIdr,
      electricityCostIdr,
      electricityCostLabel,
      ratioPercent,
      ratioStatus,
      remainingRevenueIdr,
      potentialSavingsIdr,
      estimatedBillAfterSavingsIdr,
      potentialRemainingRevenueIdr,
      trend,
    };
  }

  const latestPrediction = activeBusinessId
    ? await db.predictionResult.findFirst({
        where: { businessId: activeBusinessId },
        orderBy: [
          { predictedForYear: "desc" },
          { predictedForMonth: "desc" },
        ],
      })
    : null;

  // Count history months
  const historyMonths = activeBusinessId
    ? await db.electricityEntry.count({
        where: { businessId: activeBusinessId },
      })
    : 0;

  // Calculate AI factors
  const last3Entries = entries.slice(-3);
  const avg3 = last3Entries.length > 0
    ? last3Entries.reduce((sum, e) => sum + e.usageKwh, 0) / last3Entries.length
    : 0;

  const last6Entries = entries.slice(-6);
  const avg6 = last6Entries.length > 0
    ? last6Entries.reduce((sum, e) => sum + e.usageKwh, 0) / last6Entries.length
    : 0;

  const trend1 = latest && prev && prev.usageKwh > 0
    ? ((latest.usageKwh - prev.usageKwh) / prev.usageKwh) * 100
    : 0;

  const trend3 = latest && avg3 > 0
    ? ((latest.usageKwh - avg3) / avg3) * 100
    : 0;

  const aiFactors = {
    latestUsageKwh: latest?.usageKwh ?? 0,
    previousUsageKwh: prev?.usageKwh ?? 0,
    avg3UsageKwh: avg3,
    avg6UsageKwh: historyMonths >= 6 ? avg6 : null,
    trend1MonthPercent: trend1,
    trend3MonthPercent: trend3,
    businessType: business.type,
    avgTariffIdr: latest && latest.usageKwh > 0 ? latest.costIdr / latest.usageKwh : 1444.70,
  };

  const { subscription, plan } = await getUserPlan(session.user.id);

  const expiredTrial = await db.subscription.findFirst({
    where: {
      userId: session.user.id,
      plan: { code: "PRO_TRIAL" },
      status: "EXPIRED"
    }
  });

  const applianceSummary = activeBusinessId
    ? await getApplianceSummaryForBusiness(session.user.id, activeBusinessId)
    : null;

  const adsEnabled = await shouldShowAds(session.user.id);

  return (
    <DashboardClient
      ringkasan={ringkasan}
      tagihanBulanan={tagihanBulanan}
      pemakaianHarian={pemakaianHarian}
      pemakaianPeralatan={pemakaianPeralatan}
      efisiensiPeralatan={efisiensiPeralatan}
      cashFlowAnalytics={cashFlowAnalytics}
      latestPrediction={latestPrediction}
      historyMonths={historyMonths}
      aiFactors={aiFactors}
      expiredTrial={!!expiredTrial}
      applianceSummary={applianceSummary}
      adsEnabled={adsEnabled}
      subscription={subscription ? {
        status: subscription.status,
        trialEndDate: subscription.trialEndDate?.toISOString() || null,
        plan: {
          code: plan?.code || "FREE",
          name: plan?.name || "Gratis",
        }
      } : null}
    />
  );
}
