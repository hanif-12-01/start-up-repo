import { and, eq, inArray, isNull } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import * as schema from '@/server/db/schema';

export type PortfolioHealthStatus = 'Aman' | 'Perlu Dicek' | 'Perlu Perhatian' | 'Data Belum Lengkap';

export interface PortfolioSummary {
  activeLocations: number;
  locationsWithElectricity: number;
  locationsWithRevenue: number;
  electricityCoveragePercent: number;
  revenueCoveragePercent: number;
  totalUsageKwh: number | null;
  totalElectricityCostIdr: number | null;
  totalRevenueIdr: number | null;
  electricityRevenueRatioPercent: number | null;
}

export interface PortfolioComparison {
  comparableLocationCount: number;
  currentCostTotal: number | null;
  previousCostTotal: number | null;
  costDifferenceAbsolute: number | null;
  electricityCostChangePercent: number | null;
  usageChangePercent: number | null;
  revenueChangePercent: number | null;
}

export interface PortfolioHealth {
  safeCount: number;
  checkCount: number;
  attentionCount: number;
  incompleteCount: number;
  summaryText: string;
}

export interface PortfolioAttentionItem {
  businessId: string;
  businessName: string;
  businessType: string;
  city: string | null;
  status: PortfolioHealthStatus;
  primaryReason: string;
  costImpactIdr: number | null;
  percentageChange: number | null;
  revenueContext: string | null;
  ctaText: string;
  ctaHref: string;
}

export interface PortfolioLocationRow {
  id: string;
  name: string;
  businessType: string;
  city: string | null;
  status: PortfolioHealthStatus;
  statusDescription: string;
  usageKwh: number | null;
  electricityCostIdr: number | null;
  revenueIdr: number | null;
  costChangePercent: number | null;
  revenueChangePercent: number | null;
  costVsRevenueContext: string | null;
  hasElectricityData: boolean;
  hasRevenueData: boolean;
}

export interface PortfolioTrendPoint {
  periodMonth: string; // YYYY-MM
  label: string; // e.g. "Jul 2026"
  totalCostIdr: number | null;
  totalRevenueIdr: number | null;
  businessCountWithData: number;
  totalActiveBusinesses: number;
}

export interface PortfolioOverview {
  selectedMonth: string;
  previousMonth: string;
  availableMonths: string[];
  summary: PortfolioSummary;
  comparison: PortfolioComparison;
  health: PortfolioHealth;
  attentionItems: PortfolioAttentionItem[];
  locations: PortfolioLocationRow[];
  trend: PortfolioTrendPoint[];
}

// Authoritative anomaly detection thresholds (matching product-analysis.ts and PRD)
export const THRES_BOROS = 20.0;
export const THRES_DICEK = 10.0;

export function formatMonthLabel(ym: string): string {
  const [yearStr, monthStr] = ym.split('-');
  const y = parseInt(yearStr, 10);
  const m = parseInt(monthStr, 10);
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  return `${monthNames[m - 1] ?? monthStr} ${y}`;
}

export function getPreviousMonth(ym: string): string {
  const [yearStr, monthStr] = ym.split('-');
  let y = parseInt(yearStr, 10);
  let m = parseInt(monthStr, 10) - 1;
  if (m < 1) {
    m = 12;
    y -= 1;
  }
  return `${y}-${String(m).padStart(2, '0')}`;
}

export function getPastNMonths(endYm: string, n = 6): string[] {
  const months: string[] = [];
  let cur = endYm;
  for (let i = 0; i < n; i++) {
    months.unshift(cur);
    cur = getPreviousMonth(cur);
  }
  return months;
}

export interface BillDataLike {
  businessId: string;
  periodEnd: string;
  totalAmountRupiah: bigint | number;
  kwh: string | number | null;
  tariffRupiahPerKwh: string | number | null;
}

export interface RevenueDataLike {
  businessId: string;
  periodMonth: string;
  amountRupiah: bigint | number;
}

export interface BusinessDataLike {
  id: string;
  name: string;
  businessType: string;
  city: string | null;
}

export function resolveUsageAndCost(bill?: BillDataLike): { usage: number | null; cost: number | null } {
  if (!bill) return { usage: null, cost: null };
  const cost = Number(bill.totalAmountRupiah);
  let usage: number | null = bill.kwh !== null ? Number(bill.kwh) : null;
  if (usage === null && bill.tariffRupiahPerKwh !== null) {
    const tariff = Number(bill.tariffRupiahPerKwh);
    if (tariff > 0) {
      usage = cost / tariff;
    }
  }
  return { usage, cost };
}

export function calculateAnomalyStatus(
  currentUsage: number | null,
  historicalUsages: number[],
  previousUsage: number | null
): { status: PortfolioHealthStatus; statusDescription: string; differencePercent: number | null } {
  if (currentUsage === null) {
    return {
      status: 'Data Belum Lengkap',
      statusDescription: 'Data bulan ini belum cukup untuk menilai kondisi lokasi.',
      differencePercent: null,
    };
  }

  let differencePercent: number | null = null;
  if (historicalUsages.length > 0) {
    const baseline = historicalUsages.reduce((acc, h) => acc + h, 0) / historicalUsages.length;
    differencePercent = baseline === 0
      ? (currentUsage === 0 ? 0 : 100)
      : ((currentUsage - baseline) / baseline) * 100;
  } else if (previousUsage !== null && previousUsage > 0) {
    differencePercent = ((currentUsage - previousUsage) / previousUsage) * 100;
  }

  if (differencePercent !== null) {
    if (differencePercent >= THRES_BOROS) {
      return {
        status: 'Perlu Perhatian',
        statusDescription: 'Pemakaian meningkat cukup besar dibanding pola sebelumnya.',
        differencePercent,
      };
    }
    if (differencePercent >= THRES_DICEK) {
      return {
        status: 'Perlu Dicek',
        statusDescription: 'Pemakaian meningkat dibanding pola sebelumnya. Ada baiknya lokasi ini diperiksa.',
        differencePercent,
      };
    }
  }

  return {
    status: 'Aman',
    statusDescription: 'Pemakaian masih berada dalam pola yang wajar berdasarkan data yang tersedia.',
    differencePercent,
  };
}

export interface ProcessedLocationData {
  business: BusinessDataLike;
  currentUsage: number | null;
  previousUsage: number | null;
  currentCost: number | null;
  previousCost: number | null;
  currentRev: number | null;
  previousRev: number | null;
  status: PortfolioHealthStatus;
  statusDescription: string;
  costChangePercent: number | null;
  usageChangePercent: number | null;
  revenueChangePercent: number | null;
  costImpactIdr: number | null;
  costVsRevenueContext: string | null;
}

export function processLocations(
  businesses: BusinessDataLike[],
  allBills: BillDataLike[],
  allRevenues: RevenueDataLike[],
  selectedMonth: string,
  previousMonth: string
): ProcessedLocationData[] {
  return businesses.map((b) => {
    const bBills = allBills.filter((bill) => bill.businessId === b.id);
    const bRevs = allRevenues.filter((rev) => rev.businessId === b.id);

    const currentBill = bBills.find((bill) => bill.periodEnd.slice(0, 7) === selectedMonth);
    const previousBill = bBills.find((bill) => bill.periodEnd.slice(0, 7) === previousMonth);

    const currentRevEntry = bRevs.find((rev) => rev.periodMonth.slice(0, 7) === selectedMonth);
    const previousRevEntry = bRevs.find((rev) => rev.periodMonth.slice(0, 7) === previousMonth);

    const curData = resolveUsageAndCost(currentBill);
    const prevData = resolveUsageAndCost(previousBill);

    const currentRev = currentRevEntry ? Number(currentRevEntry.amountRupiah) : null;
    const previousRev = previousRevEntry ? Number(previousRevEntry.amountRupiah) : null;

    let costChangePercent: number | null = null;
    let costImpactIdr: number | null = null;
    if (curData.cost !== null && prevData.cost !== null && prevData.cost > 0) {
      costChangePercent = ((curData.cost - prevData.cost) / prevData.cost) * 100;
      costImpactIdr = curData.cost - prevData.cost;
    }

    let usageChangePercent: number | null = null;
    if (curData.usage !== null && prevData.usage !== null && prevData.usage > 0) {
      usageChangePercent = ((curData.usage - prevData.usage) / prevData.usage) * 100;
    }

    let revenueChangePercent: number | null = null;
    if (currentRev !== null && previousRev !== null && previousRev > 0) {
      revenueChangePercent = ((currentRev - previousRev) / previousRev) * 100;
    }

    let costVsRevenueContext: string | null = null;
    if (costChangePercent !== null && revenueChangePercent !== null) {
      if (costChangePercent > revenueChangePercent && costChangePercent > 0) {
        costVsRevenueContext = 'Biaya listrik naik lebih cepat daripada pendapatan.';
      } else if (costChangePercent < revenueChangePercent && revenueChangePercent > 0) {
        costVsRevenueContext = 'Pertumbuhan pendapatan melampaui pertumbuhan biaya listrik.';
      }
    }

    const historicalUsages = bBills
      .filter((bill) => bill.periodEnd.slice(0, 7) < selectedMonth)
      .map((bill) => resolveUsageAndCost(bill).usage)
      .filter((usage): usage is number => usage !== null && Number.isFinite(usage));

    const { status, statusDescription } = calculateAnomalyStatus(
      curData.usage,
      historicalUsages,
      prevData.usage
    );

    return {
      business: b,
      currentUsage: curData.usage,
      previousUsage: prevData.usage,
      currentCost: curData.cost,
      previousCost: prevData.cost,
      currentRev,
      previousRev,
      status,
      statusDescription,
      costChangePercent,
      usageChangePercent,
      revenueChangePercent,
      costImpactIdr,
      costVsRevenueContext,
    };
  });
}

export function calculateSummary(
  activeLocations: number,
  processedList: ProcessedLocationData[]
): PortfolioSummary {
  const businessesWithElectricity = processedList.filter((p) => p.currentCost !== null).length;
  const businessesWithRevenue = processedList.filter((p) => p.currentRev !== null).length;

  const totalUsageKwh = businessesWithElectricity > 0
    ? processedList.reduce((acc, p) => acc + (p.currentUsage ?? 0), 0)
    : null;

  const totalElectricityCostIdr = businessesWithElectricity > 0
    ? processedList.reduce((acc, p) => acc + (p.currentCost ?? 0), 0)
    : null;

  const totalRevenueIdr = businessesWithRevenue > 0
    ? processedList.reduce((acc, p) => acc + (p.currentRev ?? 0), 0)
    : null;

  const electricityRevenueRatioPercent =
    totalElectricityCostIdr !== null && totalRevenueIdr !== null && totalRevenueIdr > 0
      ? (totalElectricityCostIdr / totalRevenueIdr) * 100
      : null;

  return {
    activeLocations,
    locationsWithElectricity: businessesWithElectricity,
    locationsWithRevenue: businessesWithRevenue,
    electricityCoveragePercent: activeLocations > 0 ? (businessesWithElectricity / activeLocations) * 100 : 0,
    revenueCoveragePercent: activeLocations > 0 ? (businessesWithRevenue / activeLocations) * 100 : 0,
    totalUsageKwh,
    totalElectricityCostIdr,
    totalRevenueIdr,
    electricityRevenueRatioPercent,
  };
}

export function calculateComparison(
  processedList: ProcessedLocationData[]
): PortfolioComparison {
  const comparableCostItems = processedList.filter(
    (p) => p.currentCost !== null && p.previousCost !== null
  );
  const comparableLocationCount = comparableCostItems.length;

  let currentCostTotal: number | null = null;
  let previousCostTotal: number | null = null;
  let costDifferenceAbsolute: number | null = null;
  let electricityCostChangePercent: number | null = null;
  let usageChangePercent: number | null = null;

  if (comparableLocationCount > 0) {
    currentCostTotal = comparableCostItems.reduce((acc, p) => acc + (p.currentCost ?? 0), 0);
    previousCostTotal = comparableCostItems.reduce((acc, p) => acc + (p.previousCost ?? 0), 0);
    costDifferenceAbsolute = currentCostTotal - previousCostTotal;

    if (previousCostTotal > 0) {
      electricityCostChangePercent = (costDifferenceAbsolute / previousCostTotal) * 100;
    }

    const curUsageTotal = comparableCostItems.reduce((acc, p) => acc + (p.currentUsage ?? 0), 0);
    const prevUsageTotal = comparableCostItems.reduce((acc, p) => acc + (p.previousUsage ?? 0), 0);
    if (prevUsageTotal > 0) {
      usageChangePercent = ((curUsageTotal - prevUsageTotal) / prevUsageTotal) * 100;
    }
  }

  const comparableRevenueItems = processedList.filter(
    (p) => p.currentRev !== null && p.previousRev !== null
  );
  let revenueChangePercent: number | null = null;
  if (comparableRevenueItems.length > 0) {
    const curRev = comparableRevenueItems.reduce((acc, p) => acc + (p.currentRev ?? 0), 0);
    const prevRev = comparableRevenueItems.reduce((acc, p) => acc + (p.previousRev ?? 0), 0);
    if (prevRev > 0) {
      revenueChangePercent = ((curRev - prevRev) / prevRev) * 100;
    }
  }

  return {
    comparableLocationCount,
    currentCostTotal,
    previousCostTotal,
    costDifferenceAbsolute,
    electricityCostChangePercent,
    usageChangePercent,
    revenueChangePercent,
  };
}

export function calculateHealth(processedList: ProcessedLocationData[]): PortfolioHealth {
  const safeCount = processedList.filter((p) => p.status === 'Aman').length;
  const checkCount = processedList.filter((p) => p.status === 'Perlu Dicek').length;
  const attentionCount = processedList.filter((p) => p.status === 'Perlu Perhatian').length;
  const incompleteCount = processedList.filter((p) => p.status === 'Data Belum Lengkap').length;

  let summaryText = 'Semua lokasi usaha berjalan normal.';
  const issuesCount = attentionCount + checkCount;
  if (issuesCount > 0) {
    summaryText = `Sebagian besar lokasi berjalan normal. Ada ${issuesCount} lokasi yang sebaiknya Anda periksa.`;
  } else if (incompleteCount > 0 && safeCount === 0) {
    summaryText = 'Data pemakaian bulan ini belum dicatat untuk sebagian besar lokasi.';
  }

  return {
    safeCount,
    checkCount,
    attentionCount,
    incompleteCount,
    summaryText,
  };
}

export function buildAttentionItems(
  processedList: ProcessedLocationData[]
): PortfolioAttentionItem[] {
  const exceptionCandidates = processedList.filter((p) => p.status !== 'Aman');

  exceptionCandidates.sort((a, b) => {
    const severityWeight = (s: PortfolioHealthStatus) => {
      if (s === 'Perlu Perhatian') return 3;
      if (s === 'Perlu Dicek') return 2;
      return 1; // Data Belum Lengkap
    };

    const diffSeverity = severityWeight(b.status) - severityWeight(a.status);
    if (diffSeverity !== 0) return diffSeverity;

    const aImpact = a.costImpactIdr ?? 0;
    const bImpact = b.costImpactIdr ?? 0;
    return bImpact - aImpact;
  });

  return exceptionCandidates.slice(0, 5).map((p) => {
    let primaryReason = p.statusDescription;
    let ctaText = 'Lihat Lokasi';

    if (p.status === 'Perlu Perhatian') {
      const pct = p.costChangePercent !== null ? Math.round(p.costChangePercent) : null;
      primaryReason = pct !== null
        ? `Pemakaian listrik ${pct}% lebih tinggi dari pola sebelumnya.`
        : 'Pemakaian meningkat cukup besar dibanding pola sebelumnya.';
    } else if (p.status === 'Perlu Dicek') {
      const pct = p.costChangePercent !== null ? Math.round(p.costChangePercent) : null;
      primaryReason = pct !== null
        ? `Pemakaian listrik ${pct}% lebih tinggi dari bulan lalu.`
        : 'Pemakaian meningkat dibanding pola sebelumnya.';
    } else if (p.status === 'Data Belum Lengkap') {
      primaryReason = 'Pemakaian listrik bulan ini belum dicatat.';
      ctaText = 'Lengkapi Data';
    }

    return {
      businessId: p.business.id,
      businessName: p.business.name,
      businessType: p.business.businessType,
      city: p.business.city,
      status: p.status,
      primaryReason,
      costImpactIdr: p.costImpactIdr,
      percentageChange: p.costChangePercent,
      revenueContext: p.costVsRevenueContext,
      ctaText,
      ctaHref: `/dashboard?businessId=${encodeURIComponent(p.business.id)}`,
    };
  });
}

export function buildTrend(
  businesses: BusinessDataLike[],
  allBills: BillDataLike[],
  allRevenues: RevenueDataLike[],
  trendMonths: string[]
): PortfolioTrendPoint[] {
  const activeLocations = businesses.length;

  return trendMonths.map((ym) => {
    let monthCost: number | null = null;
    let monthRev: number | null = null;
    let countWithData = 0;

    for (const b of businesses) {
      const bill = allBills.find((x) => x.businessId === b.id && x.periodEnd.slice(0, 7) === ym);
      const rev = allRevenues.find((x) => x.businessId === b.id && x.periodMonth.slice(0, 7) === ym);

      let hasDataForBusiness = false;
      if (bill) {
        hasDataForBusiness = true;
        const cost = Number(bill.totalAmountRupiah);
        monthCost = (monthCost ?? 0) + cost;
      }
      if (rev) {
        hasDataForBusiness = true;
        const r = Number(rev.amountRupiah);
        monthRev = (monthRev ?? 0) + r;
      }

      if (hasDataForBusiness) {
        countWithData += 1;
      }
    }

    return {
      periodMonth: ym,
      label: formatMonthLabel(ym),
      totalCostIdr: monthCost,
      totalRevenueIdr: monthRev,
      businessCountWithData: countWithData,
      totalActiveBusinesses: activeLocations,
    };
  });
}

export async function getPortfolioOverview(
  userId: string,
  requestedMonth?: string
): Promise<PortfolioOverview> {
  const db = getDb();

  const businesses = await db
    .select({
      id: schema.business.id,
      name: schema.business.name,
      businessType: schema.business.businessType,
      city: schema.business.city,
    })
    .from(schema.business)
    .where(
      and(
        eq(schema.business.userId, userId),
        eq(schema.business.isActive, true),
        isNull(schema.business.archivedAt)
      )
    );

  const activeLocations = businesses.length;
  if (activeLocations === 0) {
    const nowYm = new Date().toISOString().slice(0, 7);
    return {
      selectedMonth: nowYm,
      previousMonth: getPreviousMonth(nowYm),
      availableMonths: [nowYm],
      summary: {
        activeLocations: 0,
        locationsWithElectricity: 0,
        locationsWithRevenue: 0,
        electricityCoveragePercent: 0,
        revenueCoveragePercent: 0,
        totalUsageKwh: null,
        totalElectricityCostIdr: null,
        totalRevenueIdr: null,
        electricityRevenueRatioPercent: null,
      },
      comparison: {
        comparableLocationCount: 0,
        currentCostTotal: null,
        previousCostTotal: null,
        costDifferenceAbsolute: null,
        electricityCostChangePercent: null,
        usageChangePercent: null,
        revenueChangePercent: null,
      },
      health: {
        safeCount: 0,
        checkCount: 0,
        attentionCount: 0,
        incompleteCount: 0,
        summaryText: 'Belum ada lokasi usaha aktif.',
      },
      attentionItems: [],
      locations: [],
      trend: [],
    };
  }

  const businessIds = businesses.map((b) => b.id);

  const allBills = await db
    .select({
      id: schema.electricityBill.id,
      businessId: schema.electricityBill.businessId,
      periodStart: schema.electricityBill.periodStart,
      periodEnd: schema.electricityBill.periodEnd,
      totalAmountRupiah: schema.electricityBill.totalAmountRupiah,
      kwh: schema.electricityBill.kwh,
      tariffRupiahPerKwh: schema.electricityBill.tariffRupiahPerKwh,
    })
    .from(schema.electricityBill)
    .where(inArray(schema.electricityBill.businessId, businessIds));

  const allRevenues = await db
    .select({
      id: schema.revenueEntry.id,
      businessId: schema.revenueEntry.businessId,
      periodMonth: schema.revenueEntry.periodMonth,
      amountRupiah: schema.revenueEntry.amountRupiah,
    })
    .from(schema.revenueEntry)
    .where(inArray(schema.revenueEntry.businessId, businessIds));

  const recordedMonthsSet = new Set<string>();
  for (const b of allBills) {
    recordedMonthsSet.add(b.periodEnd.slice(0, 7));
  }
  for (const r of allRevenues) {
    recordedMonthsSet.add(r.periodMonth.slice(0, 7));
  }

  const sortedRecordedMonths = Array.from(recordedMonthsSet).sort((a, b) => b.localeCompare(a));
  const currentCalendarMonth = new Date().toISOString().slice(0, 7);

  let selectedMonth = currentCalendarMonth;
  if (requestedMonth && /^\d{4}-\d{2}$/.test(requestedMonth)) {
    selectedMonth = requestedMonth;
  } else if (sortedRecordedMonths.length > 0) {
    selectedMonth = sortedRecordedMonths[0];
  }

  const previousMonth = getPreviousMonth(selectedMonth);
  const trendMonths = getPastNMonths(selectedMonth, 6);

  if (!recordedMonthsSet.has(selectedMonth)) {
    recordedMonthsSet.add(selectedMonth);
  }
  if (!recordedMonthsSet.has(currentCalendarMonth)) {
    recordedMonthsSet.add(currentCalendarMonth);
  }
  const availableMonths = Array.from(recordedMonthsSet).sort((a, b) => b.localeCompare(a));

  const processedList = processLocations(
    businesses,
    allBills,
    allRevenues,
    selectedMonth,
    previousMonth
  );

  const summary = calculateSummary(activeLocations, processedList);
  const comparison = calculateComparison(processedList);
  const health = calculateHealth(processedList);
  const attentionItems = buildAttentionItems(processedList);

  const locations: PortfolioLocationRow[] = processedList.map((p) => ({
    id: p.business.id,
    name: p.business.name,
    businessType: p.business.businessType,
    city: p.business.city,
    status: p.status,
    statusDescription: p.statusDescription,
    usageKwh: p.currentUsage,
    electricityCostIdr: p.currentCost,
    revenueIdr: p.currentRev,
    costChangePercent: p.costChangePercent,
    revenueChangePercent: p.revenueChangePercent,
    costVsRevenueContext: p.costVsRevenueContext,
    hasElectricityData: p.currentCost !== null,
    hasRevenueData: p.currentRev !== null,
  }));

  const trend = buildTrend(businesses, allBills, allRevenues, trendMonths);

  return {
    selectedMonth,
    previousMonth,
    availableMonths,
    summary,
    comparison,
    health,
    attentionItems,
    locations,
    trend,
  };
}
