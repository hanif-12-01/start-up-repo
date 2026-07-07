import { db } from "@/lib/db";
import { getUserPlan } from "@/services/subscription";
import { getApplianceSummaryForBusiness } from "@/services/appliance";
import { shouldShowAds } from "@/lib/ads";
import { getLatestCashFlowEntry, getCashFlowTrendData } from "@/services/cash-flow";

export async function getDashboardSnapshot(userId: string, businessId: string) {
  // Validate ownership first
  const business = await db.business.findFirst({
    where: { id: businessId, userId },
    select: { id: true, name: true, type: true, mode: true },
  });

  if (!business) {
    return null;
  }

  // Fetch all snapshot data in parallel with safe try/catches (Promise.allSettled)
  const [
    electricityEntriesRes,
    dailyUsagesRes,
    appliancesRes,
    analysisResultsRes,
    anomaliesRes,
    recommendationsRes,
    latestPredictionRes,
    historyCountRes,
    subscriptionInfoRes,
    expiredTrialRes,
    applianceSummaryRes,
    adsEnabledRes,
    latestRevenueRes,
    cashflowTrendRes,
  ] = await Promise.allSettled([
    db.electricityEntry.findMany({
      where: { businessId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 6,
      select: { id: true, month: true, year: true, usageKwh: true, costIdr: true },
    }),
    db.dailyUsage.findMany({
      where: { businessId },
      orderBy: { date: "asc" },
      take: 14,
      select: { date: true, usageKwh: true, costIdr: true },
    }),
    db.appliance.findMany({
      where: { businessId, usageStatus: "ACTIVE" },
      orderBy: { powerWatt: "desc" },
      select: { id: true, name: true, category: true, powerWatt: true, quantity: true, dailyUsageHours: true },
    }),
    db.analysisResult.findMany({
      where: { businessId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
      take: 1,
      select: { avgDailyKwh: true, efficiencyScore: true },
    }),
    db.anomaly.findMany({
      where: { businessId, isResolved: false },
      orderBy: { createdAt: "desc" },
      take: 1,
      select: { description: true },
    }),
    db.recommendation.findMany({
      where: { businessId, isImplemented: false },
      orderBy: { estimatedSavingsIdr: "desc" },
      select: { id: true, title: true, description: true, estimatedSavingsIdr: true },
    }),
    db.predictionResult.findFirst({
      where: { businessId },
      orderBy: [
        { predictedForYear: "desc" },
        { predictedForMonth: "desc" },
      ],
    }),
    db.electricityEntry.count({
      where: { businessId },
    }),
    getUserPlan(userId),
    db.subscription.findFirst({
      where: {
        userId,
        plan: { code: "PRO_TRIAL" },
        status: "EXPIRED",
      },
    }),
    getApplianceSummaryForBusiness(userId, businessId),
    shouldShowAds(userId),
    getLatestCashFlowEntry(businessId),
    getCashFlowTrendData(businessId),
  ]);

  // Extract results safely with fallback values
  const electricityEntries = electricityEntriesRes.status === "fulfilled" ? electricityEntriesRes.value : [];
  const dailyUsages = dailyUsagesRes.status === "fulfilled" ? dailyUsagesRes.value : [];
  const appliances = appliancesRes.status === "fulfilled" ? appliancesRes.value : [];
  const analysisResults = analysisResultsRes.status === "fulfilled" ? analysisResultsRes.value : [];
  const anomalies = anomaliesRes.status === "fulfilled" ? anomaliesRes.value : [];
  const recommendations = recommendationsRes.status === "fulfilled" ? recommendationsRes.value : [];
  const latestPrediction = latestPredictionRes.status === "fulfilled" ? latestPredictionRes.value : null;
  const historyCount = historyCountRes.status === "fulfilled" ? historyCountRes.value : 0;
  const subscriptionInfo = subscriptionInfoRes.status === "fulfilled" ? subscriptionInfoRes.value : { subscription: null, plan: null };
  const expiredTrial = expiredTrialRes.status === "fulfilled" ? expiredTrialRes.value : null;
  const applianceSummary = applianceSummaryRes.status === "fulfilled" ? applianceSummaryRes.value : null;
  const adsEnabled = adsEnabledRes.status === "fulfilled" ? adsEnabledRes.value : false;
  const latestRevenue = latestRevenueRes.status === "fulfilled" ? latestRevenueRes.value : null;
  const cashflowTrend = cashflowTrendRes.status === "fulfilled" ? cashflowTrendRes.value : [];

  return {
    business,
    electricityEntries,
    dailyUsages,
    appliances,
    analysisResults,
    anomalies,
    recommendations,
    latestPrediction,
    historyCount,
    subscriptionInfo,
    expiredTrial: !!expiredTrial,
    applianceSummary,
    adsEnabled,
    latestRevenue,
    cashflowTrend,
  };
}
