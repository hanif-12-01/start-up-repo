import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { getDb } from '@/server/db';
import * as schema from '@/server/db/schema';
import { analyzeLatestAnomaly, type UsageSample } from './product-analysis';
import { env } from '@/config/env';

export type PortfolioHealthStatus =
  | 'Aman'
  | 'Perlu Dicek'
  | 'Perlu Perhatian'
  | 'Data Belum Lengkap';

export type PortfolioTrendDirection = 'Naik' | 'Stabil' | 'Turun';

export interface PortfolioCoverage {
  activeBusinessCount: number;
  businessesWithElectricityData: number;
  electricityCoveragePercent: number;
}

export interface PortfolioSummary {
  totalUsageKwh: number | null;
  totalElectricityCostIdr: number | null;
}

export interface PortfolioComparison {
  comparableBusinessCount: number;
  currentComparableUsageKwh: number | null;
  previousComparableUsageKwh: number | null;
  usageDifferenceKwh: number | null;
  usageDifferencePercent: number | null;
  currentComparableCostIdr: number | null;
  previousComparableCostIdr: number | null;
  costDifferenceIdr: number | null;
  costDifferencePercent: number | null;
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
  status: 'Perlu Perhatian' | 'Perlu Dicek' | 'Data Belum Lengkap';
  trend: PortfolioTrendDirection | null;
  primaryReason: string;
  diagnosticHint?: string | null;
  costImpactIdr: number | null;
  usageChangePercent: number | null;
  ctaText: string;
  ctaHref: string;
}

export interface PortfolioIncreaseContributor {
  businessId: string;
  businessName: string;
  businessType: string;
  city: string | null;
  increaseKwh: number;
  increaseCostIdr: number;
  contributionPercent: number | null;
  ctaHref: string;
}

export interface PortfolioLocationRow {
  id: string;
  name: string;
  businessType: string;
  city: string | null;
  usageKwh: number | null;
  usageChangePercent: number | null;
  trend: PortfolioTrendDirection | null;
  status: PortfolioHealthStatus;
  statusDescription: string;
  electricityCostIdr: number | null;
  hasElectricityData: boolean;
  ctaText: string;
  ctaHref: string;
}

export interface PortfolioTrendPoint {
  month: string;
  label: string;
  totalUsageKwh: number | null;
  totalElectricityCost: number | null;
  businessCountWithData: number;
  activeBusinessCount: number;
}

export interface PortfolioOverview {
  selectedMonth: string;
  previousMonth: string;
  availableMonths: string[];
  coverage: PortfolioCoverage;
  summary: PortfolioSummary;
  comparison: PortfolioComparison;
  health: PortfolioHealth;
  attentionItems: PortfolioAttentionItem[];
  topIncreaseContributors: PortfolioIncreaseContributor[];
  locations: PortfolioLocationRow[];
  trend: PortfolioTrendPoint[];
}

export interface BusinessDataLike {
  id: string;
  name: string;
  businessType: string;
  city: string | null;
}

export interface BillDataLike {
  id: string;
  businessId: string;
  periodStart: string;
  periodEnd: string;
  totalAmountRupiah: string | number | bigint;
  kwh: string | number | null;
  tariffRupiahPerKwh: string | number | null;
}

export interface ProcessedLocationData {
  business: BusinessDataLike;
  status: PortfolioHealthStatus;
  statusDescription: string;
  trend: PortfolioTrendDirection | null;
  currentUsageKwh: number | null;
  previousUsageKwh: number | null;
  usageChangePercent: number | null;
  currentCostIdr: number | null;
  previousCostIdr: number | null;
  costChangePercent: number | null;
  costImpactIdr: number | null;
  diagnosticHint: string | null;
  hasSelectedMonthData: boolean;
  hasPreviousMonthData: boolean;
}

export function isPortfolioFeatureEnabled(): boolean {
  return process.env.BUSINESS_PORTFOLIO_ENABLED === 'true' || env.BUSINESS_PORTFOLIO_ENABLED;
}

export function getPreviousMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const prevDate = new Date(Date.UTC(year, month - 2, 1));
  return prevDate.toISOString().slice(0, 7);
}

export function getPastNMonths(yearMonth: string, n: number): string[] {
  const [year, month] = yearMonth.split('-').map(Number);
  const result: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(year, month - 1 - i, 1));
    result.push(d.toISOString().slice(0, 7));
  }
  return result;
}

export function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const monthNames = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
  ];
  return `${monthNames[month - 1] ?? ''} ${year}`;
}

/**
 * Pure centralized trend direction calculation.
 * Categorizes percentage change into Naik (> +2%), Turun (< -2%), or Stabil.
 */
export function deriveTrendDirection(
  differencePercent: number | null
): PortfolioTrendDirection | null {
  if (differencePercent === null || !Number.isFinite(differencePercent)) {
    return null;
  }
  if (differencePercent > 2.0) return 'Naik';
  if (differencePercent < -2.0) return 'Turun';
  return 'Stabil';
}

/**
 * Process a single location's bills against the selected and previous months.
 * Reuses the authoritative anomaly logic from product-analysis.ts.
 */
export function processSingleLocation(
  b: BusinessDataLike,
  businessBills: BillDataLike[],
  selectedMonth: string,
  previousMonth: string
): ProcessedLocationData {
  const sortedBills = [...businessBills].sort((x, y) =>
    x.periodEnd.localeCompare(y.periodEnd)
  );

  const selectedBill = sortedBills.find((x) => x.periodEnd.slice(0, 7) === selectedMonth);
  const previousBill = sortedBills.find((x) => x.periodEnd.slice(0, 7) === previousMonth);

  const hasSelectedMonthData = !!selectedBill;
  const hasPreviousMonthData = !!previousBill;

  const resolveUsage = (bill: BillDataLike | undefined): number | null => {
    if (!bill) return null;
    if (bill.kwh !== null && bill.kwh !== undefined && bill.kwh !== '') {
      const parsed = Number(bill.kwh);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    const cost = Number(bill.totalAmountRupiah);
    const tariff = bill.tariffRupiahPerKwh ? Number(bill.tariffRupiahPerKwh) : null;
    if (tariff && tariff > 0 && Number.isFinite(cost)) {
      return cost / tariff;
    }
    return null;
  };

  const currentUsageKwh = resolveUsage(selectedBill);
  const previousUsageKwh = resolveUsage(previousBill);

  const currentCostIdr = selectedBill ? Number(selectedBill.totalAmountRupiah) : null;
  const previousCostIdr = previousBill ? Number(previousBill.totalAmountRupiah) : null;

  let usageChangePercent: number | null = null;
  if (currentUsageKwh !== null && previousUsageKwh !== null && previousUsageKwh > 0) {
    usageChangePercent = ((currentUsageKwh - previousUsageKwh) / previousUsageKwh) * 100;
  }

  let costChangePercent: number | null = null;
  let costImpactIdr: number | null = null;
  if (currentCostIdr !== null && previousCostIdr !== null) {
    costImpactIdr = currentCostIdr - previousCostIdr;
    if (previousCostIdr > 0) {
      costChangePercent = (costImpactIdr / previousCostIdr) * 100;
    }
  }

  // Trend direction uses electricity usage change if available, otherwise cost change
  const trend = deriveTrendDirection(usageChangePercent ?? costChangePercent);

  let status: PortfolioHealthStatus = 'Data Belum Lengkap';
  let statusDescription = 'Data pemakaian bulan ini belum tersedia.';
  let diagnosticHint: string | null = null;

  if (hasSelectedMonthData) {
    // Build UsageSample list up to selectedMonth to feed existing pure classifier
    const relevantBills = sortedBills.filter((x) => x.periodEnd.slice(0, 7) <= selectedMonth);
    const samples: UsageSample[] = relevantBills.map((bill) => ({
      period: bill.periodEnd,
      usageKwh: resolveUsage(bill),
      billAmount: Number(bill.totalAmountRupiah),
      tariff: bill.tariffRupiahPerKwh ? Number(bill.tariffRupiahPerKwh) : null,
    }));

    const anomaly = analyzeLatestAnomaly(samples);

    if (anomaly.status === 'Boros') {
      status = 'Perlu Perhatian';
      const pct = anomaly.differencePercent !== null ? Math.round(anomaly.differencePercent) : null;
      statusDescription = pct !== null
        ? `Pemakaian listrik ${pct}% lebih tinggi dari pola sebelumnya.`
        : 'Pemakaian meningkat cukup besar dibanding pola sebelumnya.';
      diagnosticHint = 'Ada indikasi kenaikan signifikan yang perlu diperiksa.';
    } else if (anomaly.status === 'Perlu Dicek') {
      status = 'Perlu Dicek';
      const pct = anomaly.differencePercent !== null ? Math.round(anomaly.differencePercent) : null;
      statusDescription = pct !== null
        ? `Pemakaian listrik ${pct}% lebih tinggi dari pola baseline.`
        : 'Pemakaian meningkat dibanding pola sebelumnya.';
      diagnosticHint = 'Ada bagian yang disarankan untuk diperiksa.';
    } else if (anomaly.status === 'Normal') {
      status = 'Aman';
      statusDescription = 'Pemakaian listrik berada dalam batas wajar.';
    } else {
      status = 'Data Belum Lengkap';
      statusDescription = 'Data historis belum cukup untuk analisis baseline.';
    }
  }

  return {
    business: b,
    status,
    statusDescription,
    trend,
    currentUsageKwh,
    previousUsageKwh,
    usageChangePercent,
    currentCostIdr,
    previousCostIdr,
    costChangePercent,
    costImpactIdr,
    diagnosticHint,
    hasSelectedMonthData,
    hasPreviousMonthData,
  };
}

export function calculateSummary(
  activeLocations: number,
  processedList: ProcessedLocationData[]
): { coverage: PortfolioCoverage; summary: PortfolioSummary } {
  let totalUsageKwh: number | null = null;
  let totalElectricityCostIdr: number | null = null;
  let businessesWithElectricityData = 0;

  for (const p of processedList) {
    if (p.hasSelectedMonthData) {
      businessesWithElectricityData += 1;
      if (p.currentUsageKwh !== null) {
        totalUsageKwh = (totalUsageKwh ?? 0) + p.currentUsageKwh;
      }
      if (p.currentCostIdr !== null) {
        totalElectricityCostIdr = (totalElectricityCostIdr ?? 0) + p.currentCostIdr;
      }
    }
  }

  const electricityCoveragePercent =
    activeLocations > 0 ? (businessesWithElectricityData / activeLocations) * 100 : 0;

  return {
    coverage: {
      activeBusinessCount: activeLocations,
      businessesWithElectricityData,
      electricityCoveragePercent,
    },
    summary: {
      totalUsageKwh: totalUsageKwh !== null ? Math.round(totalUsageKwh) : null,
      totalElectricityCostIdr,
    },
  };
}

export function calculateComparison(
  processedList: ProcessedLocationData[]
): PortfolioComparison {
  const comparable = processedList.filter(
    (p) => p.hasSelectedMonthData && p.hasPreviousMonthData
  );

  const comparableBusinessCount = comparable.length;
  if (comparableBusinessCount === 0) {
    return {
      comparableBusinessCount: 0,
      currentComparableUsageKwh: null,
      previousComparableUsageKwh: null,
      usageDifferenceKwh: null,
      usageDifferencePercent: null,
      currentComparableCostIdr: null,
      previousComparableCostIdr: null,
      costDifferenceIdr: null,
      costDifferencePercent: null,
    };
  }

  let currentUsageSum: number | null = null;
  let prevUsageSum: number | null = null;
  let currentCostSum = 0;
  let prevCostSum = 0;

  for (const c of comparable) {
    if (c.currentUsageKwh !== null && c.previousUsageKwh !== null) {
      currentUsageSum = (currentUsageSum ?? 0) + c.currentUsageKwh;
      prevUsageSum = (prevUsageSum ?? 0) + c.previousUsageKwh;
    }
    if (c.currentCostIdr !== null) {
      currentCostSum += c.currentCostIdr;
    }
    if (c.previousCostIdr !== null) {
      prevCostSum += c.previousCostIdr;
    }
  }

  let usageDifferenceKwh: number | null = null;
  let usageDifferencePercent: number | null = null;
  if (currentUsageSum !== null && prevUsageSum !== null) {
    usageDifferenceKwh = currentUsageSum - prevUsageSum;
    if (prevUsageSum > 0) {
      usageDifferencePercent = (usageDifferenceKwh / prevUsageSum) * 100;
    }
  }

  const costDifferenceIdr = currentCostSum - prevCostSum;
  const costDifferencePercent = prevCostSum > 0 ? (costDifferenceIdr / prevCostSum) * 100 : null;

  return {
    comparableBusinessCount,
    currentComparableUsageKwh: currentUsageSum !== null ? Math.round(currentUsageSum) : null,
    previousComparableUsageKwh: prevUsageSum !== null ? Math.round(prevUsageSum) : null,
    usageDifferenceKwh: usageDifferenceKwh !== null ? Math.round(usageDifferenceKwh) : null,
    usageDifferencePercent: usageDifferencePercent !== null ? Number(usageDifferencePercent.toFixed(1)) : null,
    currentComparableCostIdr: currentCostSum,
    previousComparableCostIdr: prevCostSum,
    costDifferenceIdr,
    costDifferencePercent: costDifferencePercent !== null ? Number(costDifferencePercent.toFixed(1)) : null,
  };
}

export function calculateHealth(processedList: ProcessedLocationData[]): PortfolioHealth {
  let safeCount = 0;
  let checkCount = 0;
  let attentionCount = 0;
  let incompleteCount = 0;

  for (const p of processedList) {
    if (p.status === 'Aman') safeCount += 1;
    else if (p.status === 'Perlu Dicek') checkCount += 1;
    else if (p.status === 'Perlu Perhatian') attentionCount += 1;
    else incompleteCount += 1;
  }

  const needsReview = attentionCount + checkCount;
  let summaryText = 'Sebagian besar lokasi masih berada dalam pola penggunaan yang wajar.';
  if (needsReview > 0) {
    summaryText = `Sebagian besar lokasi masih berada dalam pola penggunaan yang wajar. Ada ${needsReview} lokasi yang sebaiknya Anda tinjau.`;
  } else if (incompleteCount > 0 && safeCount === 0) {
    summaryText = 'Data listrik belum tercatat lengkap untuk sebagian besar lokasi usaha.';
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

    // Strongest supported electricity deviation
    const aDev = Math.abs(a.usageChangePercent ?? a.costChangePercent ?? 0);
    const bDev = Math.abs(b.usageChangePercent ?? b.costChangePercent ?? 0);
    return bDev - aDev;
  });

  return exceptionCandidates.slice(0, 5).map((p) => {
    let primaryReason = p.statusDescription;
    let ctaText = 'Lihat Lokasi';

    if (p.status === 'Perlu Perhatian') {
      const pct = p.usageChangePercent !== null
        ? Math.round(p.usageChangePercent)
        : p.costChangePercent !== null
        ? Math.round(p.costChangePercent)
        : null;
      primaryReason = pct !== null
        ? `Pemakaian listrik ${pct}% lebih tinggi dibanding pola sebelumnya.`
        : 'Pemakaian meningkat cukup besar dibanding pola sebelumnya.';
    } else if (p.status === 'Perlu Dicek') {
      const pct = p.usageChangePercent !== null
        ? Math.round(p.usageChangePercent)
        : p.costChangePercent !== null
        ? Math.round(p.costChangePercent)
        : null;
      primaryReason = pct !== null
        ? `Pemakaian listrik ${pct}% lebih tinggi dari pola baseline.`
        : 'Pemakaian meningkat dibanding pola sebelumnya.';
    } else if (p.status === 'Data Belum Lengkap') {
      primaryReason = 'Data listrik bulan ini belum tersedia.';
      ctaText = 'Lengkapi Data';
    }

    return {
      businessId: p.business.id,
      businessName: p.business.name,
      businessType: p.business.businessType,
      city: p.business.city,
      status: p.status as 'Perlu Perhatian' | 'Perlu Dicek' | 'Data Belum Lengkap',
      trend: p.trend,
      primaryReason,
      diagnosticHint: p.diagnosticHint,
      costImpactIdr: p.costImpactIdr,
      usageChangePercent: p.usageChangePercent !== null ? Number(p.usageChangePercent.toFixed(1)) : null,
      ctaText,
      ctaHref: `/dashboard?businessId=${encodeURIComponent(p.business.id)}`,
    };
  });
}

/**
 * Top contributors to electricity increase.
 * Answers: "Lokasi mana yang paling besar menyumbang kenaikan listrik saya?"
 * Evaluated strictly on comparable population with positive kWh increase.
 */
export function buildTopIncreaseContributors(
  processedList: ProcessedLocationData[]
): PortfolioIncreaseContributor[] {
  const comparable = processedList.filter(
    (p) =>
      p.hasSelectedMonthData &&
      p.hasPreviousMonthData &&
      p.currentUsageKwh !== null &&
      p.previousUsageKwh !== null
  );

  const increaseItems: Array<{
    business: BusinessDataLike;
    increaseKwh: number;
    increaseCostIdr: number;
  }> = [];

  for (const c of comparable) {
    const diff = (c.currentUsageKwh ?? 0) - (c.previousUsageKwh ?? 0);
    if (diff > 0) {
      const costDiff = Math.max(0, (c.currentCostIdr ?? 0) - (c.previousCostIdr ?? 0));
      increaseItems.push({
        business: c.business,
        increaseKwh: Math.round(diff),
        increaseCostIdr: costDiff,
      });
    }
  }

  const totalIncreaseKwh = increaseItems.reduce((acc, item) => acc + item.increaseKwh, 0);

  increaseItems.sort((a, b) => b.increaseKwh - a.increaseKwh);

  return increaseItems.slice(0, 5).map((item) => {
    const contributionPercent =
      totalIncreaseKwh > 0 ? Number(((item.increaseKwh / totalIncreaseKwh) * 100).toFixed(1)) : null;

    return {
      businessId: item.business.id,
      businessName: item.business.name,
      businessType: item.business.businessType,
      city: item.business.city,
      increaseKwh: item.increaseKwh,
      increaseCostIdr: item.increaseCostIdr,
      contributionPercent,
      ctaHref: `/dashboard?businessId=${encodeURIComponent(item.business.id)}`,
    };
  });
}

export function buildTrend(
  businesses: BusinessDataLike[],
  allBills: BillDataLike[],
  trendMonths: string[]
): PortfolioTrendPoint[] {
  const activeLocations = businesses.length;

  return trendMonths.map((ym) => {
    let monthCost: number | null = null;
    let monthUsage: number | null = null;
    let countWithData = 0;

    for (const b of businesses) {
      const bill = allBills.find((x) => x.businessId === b.id && x.periodEnd.slice(0, 7) === ym);

      if (bill) {
        countWithData += 1;
        const cost = Number(bill.totalAmountRupiah);
        if (Number.isFinite(cost)) {
          monthCost = (monthCost ?? 0) + cost;
        }

        if (bill.kwh !== null && bill.kwh !== undefined && bill.kwh !== '') {
          const k = Number(bill.kwh);
          if (Number.isFinite(k)) {
            monthUsage = (monthUsage ?? 0) + k;
          }
        } else if (bill.tariffRupiahPerKwh) {
          const t = Number(bill.tariffRupiahPerKwh);
          if (t > 0 && Number.isFinite(cost)) {
            monthUsage = (monthUsage ?? 0) + cost / t;
          }
        }
      }
    }

    return {
      month: ym,
      label: formatMonthLabel(ym),
      totalUsageKwh: monthUsage !== null ? Math.round(monthUsage) : null,
      totalElectricityCost: monthCost,
      businessCountWithData: countWithData,
      activeBusinessCount: activeLocations,
    };
  });
}

/**
 * Main entry point: get the complete portfolio overview for an authenticated user.
 * Executes batched queries without N+1 queries.
 */
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
    )
    .orderBy(desc(schema.business.createdAt));

  const activeLocations = businesses.length;
  if (activeLocations === 0) {
    const nowYm = new Date().toISOString().slice(0, 7);
    return {
      selectedMonth: nowYm,
      previousMonth: getPreviousMonth(nowYm),
      availableMonths: [nowYm],
      coverage: {
        activeBusinessCount: 0,
        businessesWithElectricityData: 0,
        electricityCoveragePercent: 0,
      },
      summary: {
        totalUsageKwh: null,
        totalElectricityCostIdr: null,
      },
      comparison: {
        comparableBusinessCount: 0,
        currentComparableUsageKwh: null,
        previousComparableUsageKwh: null,
        usageDifferenceKwh: null,
        usageDifferencePercent: null,
        currentComparableCostIdr: null,
        previousComparableCostIdr: null,
        costDifferenceIdr: null,
        costDifferencePercent: null,
      },
      health: {
        safeCount: 0,
        checkCount: 0,
        attentionCount: 0,
        incompleteCount: 0,
        summaryText: 'Belum ada lokasi usaha aktif.',
      },
      attentionItems: [],
      topIncreaseContributors: [],
      locations: [],
      trend: [],
    };
  }

  const businessIds = businesses.map((b) => b.id);

  // Single batched query for all bills across all owned active businesses
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

  // Determine available calendar months from electricity bills
  const recordedMonthsSet = new Set<string>();
  for (const b of allBills) {
    recordedMonthsSet.add(b.periodEnd.slice(0, 7));
  }

  const sortedRecordedMonths = Array.from(recordedMonthsSet).sort((a, b) => b.localeCompare(a));
  const currentCalendarMonth = new Date().toISOString().slice(0, 7);

  let selectedMonth = currentCalendarMonth;
  if (requestedMonth && /^\d{4}-\d{2}$/.test(requestedMonth)) {
    selectedMonth = requestedMonth;
  } else if (sortedRecordedMonths.length > 0) {
    // Default to latest calendar month with electricity data
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

  // Group bills by businessId in memory (O(1) database queries)
  const billsByBusinessId = new Map<string, BillDataLike[]>();
  for (const b of allBills) {
    const list = billsByBusinessId.get(b.businessId) ?? [];
    list.push(b);
    billsByBusinessId.set(b.businessId, list);
  }

  const processedList = businesses.map((b) =>
    processSingleLocation(
      b,
      billsByBusinessId.get(b.id) ?? [],
      selectedMonth,
      previousMonth
    )
  );

  const { coverage, summary } = calculateSummary(activeLocations, processedList);
  const comparison = calculateComparison(processedList);
  const health = calculateHealth(processedList);
  const attentionItems = buildAttentionItems(processedList);
  const topIncreaseContributors = buildTopIncreaseContributors(processedList);

  const locations: PortfolioLocationRow[] = processedList.map((p) => ({
    id: p.business.id,
    name: p.business.name,
    businessType: p.business.businessType,
    city: p.business.city,
    usageKwh: p.currentUsageKwh !== null ? Math.round(p.currentUsageKwh) : null,
    usageChangePercent: p.usageChangePercent !== null ? Number(p.usageChangePercent.toFixed(1)) : null,
    trend: p.trend,
    status: p.status,
    statusDescription: p.statusDescription,
    electricityCostIdr: p.currentCostIdr,
    hasElectricityData: p.hasSelectedMonthData,
    ctaText: p.hasSelectedMonthData ? 'Lihat Lokasi' : 'Lengkapi Data',
    ctaHref: `/dashboard?businessId=${encodeURIComponent(p.business.id)}`,
  }));

  const trend = buildTrend(businesses, allBills, trendMonths);

  return {
    selectedMonth,
    previousMonth,
    availableMonths,
    coverage,
    summary,
    comparison,
    health,
    attentionItems,
    topIncreaseContributors,
    locations,
    trend,
  };
}
