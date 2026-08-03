import { z } from 'zod';
import { env, isEntitlementsEnabled } from '@/config/env';
import type { ActionPlanStatus } from '@/server/db/schema/action-plans';
import type { DiagnosticStatus } from '@/server/db/schema/diagnostics';
import {
  MONTHLY_REPORT_BILL_LIMIT,
  readMonthlyReportContext,
  readMonthlyReportPeriod,
  type MonthlyReportJourneyRecord,
} from '@/server/repositories/monthly-report.repository';
import { ACTION_PLAN_STATUS_LABELS } from '@/server/services/action-plan-presentation';
import {
  compareBills,
  inclusivePeriodDays,
} from '@/server/services/bill-comparison.service';
import { INSPECTION_ANSWER_LABELS } from '@/server/services/inspection-presentation';
import { decimalToScaledInteger } from '@/server/services/outcome-evaluation';
import {
  OUTCOME_DATA_QUALITY_LABELS,
  OUTCOME_DIRECTION_LABELS,
  OVERALL_OUTCOME_LABELS,
} from '@/server/services/outcome-presentation';
import {
  DEFAULT_REPORT_TIMEZONE,
  reportMonthBoundaries,
  resolveReportMonth,
} from '@/server/validation/monthly-report';
import { getUserEntitlements } from '@/server/services/entitlement.service';

export const REPORT_COMPLETENESS_CODES = [
  'NO_BILL',
  'BILL_ONLY',
  'DIAGNOSTIC_IN_PROGRESS',
  'ACTION_IN_PROGRESS',
  'WAITING_EVALUATION',
  'EVALUATED',
  'SESSION_CLOSED',
] as const;
export type ReportCompletenessCode = (typeof REPORT_COMPLETENESS_CODES)[number];

const REPORT_COMPLETENESS_LABELS: Record<ReportCompletenessCode, string> = {
  NO_BILL: 'Belum ada data tagihan',
  BILL_ONLY: 'Ringkasan tagihan tersedia',
  DIAGNOSTIC_IN_PROGRESS: 'Cek Kenaikan sedang berjalan',
  ACTION_IN_PROGRESS: 'Rencana Hemat sedang berjalan',
  WAITING_EVALUATION: 'Menunggu evaluasi tagihan berikutnya',
  EVALUATED: 'Evaluasi hasil tersedia',
  SESSION_CLOSED: 'Perjalanan Cek Kenaikan selesai',
};

const DIAGNOSTIC_STATUS_LABELS: Record<DiagnosticStatus, string> = {
  DRAFT: 'Cek Kenaikan belum dimulai',
  COLLECTING_CONTEXT: 'Pertanyaan sedang dilengkapi',
  ANALYZED: 'Bagian yang perlu dicek tersedia',
  INSPECTION_IN_PROGRESS: 'Pemeriksaan atau Rencana Hemat sedang berjalan',
  CLOSED: 'Perjalanan Cek Kenaikan selesai',
};

const INSPECTION_STATUS_LABELS = {
  IN_PROGRESS: 'Sedang diperiksa',
  COMPLETED: 'Pemeriksaan selesai',
} as const;

const BUSINESS_SEGMENT_LABELS: Record<string, string> = {
  KOS: 'Kos dan properti kecil',
  FNB: 'Makanan dan minuman',
  LAUNDRY: 'Laundry',
  RETAIL: 'Ritel',
  COLD_STORAGE: 'Penyimpanan dingin',
  OTHER: 'Usaha lainnya',
};

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});
const integer = new Intl.NumberFormat('id-ID');

export interface MonthlyReportReadModel {
  businessSummary: {
    name: string;
    segment: string;
    options: Array<{ id: string; name: string; selected: boolean }>;
  };
  reportMonth: string;
  monthLabel: string;
  timezoneLabel: string;
  monthSummary: {
    billCount: number;
    totalCost: string;
    recordedPeriods: number;
    totalKwh: string | null;
    dataCompletenessNote: string;
  };
  billSummaries: Array<{
    period: string;
    inclusiveDays: number;
    totalCost: string;
    costPerDay: string;
    kwh: string | null;
    tariff: string | null;
    isPrimary: boolean;
  }>;
  primaryBillSummary: { period: string; totalCost: string } | null;
  previousBillSummary: { period: string; totalCost: string } | null;
  billComparisonSummary: {
    title: string;
    detail: string;
    currentDailyCost: string;
    previousDailyCost: string;
    usageDirection: string | null;
    tariffContext: string;
  } | null;
  diagnosticSummary: {
    statusLabel: string;
    startedAt: string;
    closedAt: string | null;
    sourcePeriod: string;
  } | null;
  candidateSummaries: Array<{
    title: string;
    rankLabel: string;
    explanation: string;
    inspectionState: string;
  }>;
  inspectionSummaries: Array<{
    title: string;
    statusLabel: string;
    resultLabel: string | null;
    completedAt: string | null;
  }>;
  actionPlanSummaries: Array<{
    title: string;
    statusLabel: string;
    plannedStartDate: string;
    startedAt: string | null;
    finishedAt: string | null;
    reviewTarget: string;
  }>;
  outcomeSummaries: Array<{
    baselinePeriod: string;
    followUpPeriod: string;
    costDirection: string;
    usageDirection: string | null;
    tariffDirection: string | null;
    dataQualityLabel: string;
    overallOutcomeLabel: string;
    safeExplanation: string;
    evaluatedAt: string;
  }>;
  reportCompleteness: { code: ReportCompletenessCode; label: string };
  safeCaveats: string[];
  availableMonths: Array<{ value: string; label: string }>;
  navigationLinks: Array<{ label: string; href: string }>;
  generatedAtPresentation: string;
}

export class MonthlyReportsUnavailableError extends Error {
  constructor() {
    super('Laporan bulanan belum tersedia.');
    this.name = 'MonthlyReportsUnavailableError';
  }
}

export class MonthlyReportBusinessNotFoundError extends Error {
  constructor() {
    super('Usaha aktif tidak ditemukan.');
    this.name = 'MonthlyReportBusinessNotFoundError';
  }
}

export class MonthlyReportMonthError extends Error {
  constructor() {
    super('Bulan laporan tidak valid.');
    this.name = 'MonthlyReportMonthError';
  }
}

export class MonthlyReportBillLimitError extends Error {
  constructor() {
    super('Jumlah tagihan dalam satu bulan melebihi batas laporan V1.');
    this.name = 'MonthlyReportBillLimitError';
  }
}

export class MonthlyReportHistoryGatedError extends Error {
  readonly code = 'MONTHLY_REPORT_HISTORY_GATED';
  readonly status = 403;
  constructor(message = 'Akses laporan bulanan historis ini memerlukan paket PRO atau TRIAL.') {
    super(message);
    this.name = 'MonthlyReportHistoryGatedError';
  }
}

export function monthDistance(currentMonthStr: string, targetMonthStr: string): number {
  const [curY, curM] = currentMonthStr.split('-').map(Number);
  const [tarY, tarM] = targetMonthStr.split('-').map(Number);
  if (isNaN(curY) || isNaN(curM) || isNaN(tarY) || isNaN(tarM)) return 0;
  return (curY - tarY) * 12 + (curM - tarM);
}

export function resolveReportCompleteness(input: {
  hasBill: boolean;
  sessionStatus: DiagnosticStatus | null;
  actionStatuses: readonly ActionPlanStatus[];
  outcomeCount: number;
}): ReportCompletenessCode {
  if (!input.hasBill) return 'NO_BILL';
  if (!input.sessionStatus) return 'BILL_ONLY';
  if (input.sessionStatus === 'CLOSED') return 'SESSION_CLOSED';
  if (input.outcomeCount > 0) return 'EVALUATED';
  if (input.actionStatuses.includes('COMPLETED')) return 'WAITING_EVALUATION';
  if (
    input.actionStatuses.includes('PLANNED') ||
    input.actionStatuses.includes('IN_PROGRESS')
  ) {
    return 'ACTION_IN_PROGRESS';
  }
  return 'DIAGNOSTIC_IN_PROGRESS';
}

function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(`${value}T00:00:00.000Z`) : value;
  return date.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: typeof value === 'string' ? 'UTC' : DEFAULT_REPORT_TIMEZONE,
  });
}

function formatPeriod(start: string, end: string): string {
  return `${formatDate(start)}–${formatDate(end)}`;
}

function formatMonth(month: string): string {
  return new Date(`${month}-01T00:00:00.000Z`).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatDecimal(value: string): string {
  const [whole, fraction = ''] = value.split('.');
  const trimmed = fraction.replace(/0+$/, '');
  return `${integer.format(BigInt(whole))}${trimmed ? `,${trimmed}` : ''}`;
}

function formatMilliKwh(value: bigint): string {
  const digits = value.toString().padStart(4, '0');
  const whole = digits.slice(0, -3);
  const fraction = digits.slice(-3).replace(/0+$/, '');
  return `${integer.format(BigInt(whole))}${fraction ? `,${fraction}` : ''} kWh`;
}

function dailyCost(total: bigint, days: number): bigint {
  return (total + BigInt(days) / 2n) / BigInt(days);
}

function decimalDirection(value: string): string {
  if (value.startsWith('-')) return 'Pemakaian per hari tercatat lebih rendah';
  if (value === '0') return 'Pemakaian per hari tercatat serupa';
  return 'Pemakaian per hari tercatat lebih tinggi';
}

function tariffContext(current: string | null, previous: string | null): string {
  if (current === null || previous === null) return 'Data tarif belum lengkap';
  if (current === previous) return `Tarif tercatat sama, Rp${formatDecimal(current)}/kWh`;
  return `Tarif tercatat Rp${formatDecimal(previous)} menjadi Rp${formatDecimal(current)}/kWh`;
}

function actionFinishedAt(
  action: NonNullable<MonthlyReportJourneyRecord['candidates'][number]['actionPlan']>
): Date | null {
  return action.completedAt ?? action.cancelledAt;
}

export async function getMonthlyReportReadModel(
  userId: string,
  requestedBusinessId?: string,
  requestedMonth?: string,
  now = new Date()
): Promise<MonthlyReportReadModel> {
  if (!env.MONTHLY_REPORTS_ENABLED && process.env.MONTHLY_REPORTS_ENABLED !== 'true') {
    throw new MonthlyReportsUnavailableError();
  }
  const context = await readMonthlyReportContext(userId, requestedBusinessId);
  if (!context.business) throw new MonthlyReportBusinessNotFoundError();

  let reportMonth: string;
  try {
    reportMonth = resolveReportMonth({
      requestedMonth,
      latestBillPeriodEnd: context.latestBillPeriodEnd,
      now,
      timeZone: DEFAULT_REPORT_TIMEZONE,
    });
  } catch (error) {
    if (error instanceof z.ZodError || (error instanceof Error && error.message === 'REPORT_MONTH_IN_FUTURE')) {
      throw new MonthlyReportMonthError();
    }
    throw error;
  }

  let availableMonthsList = context.availableMonths;
  if (isEntitlementsEnabled()) {
    const entitlements = await getUserEntitlements(userId, now);
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const maxPastMonths = entitlements.limits.monthlyReportHistoryMonths - 1;

    if (requestedMonth && monthDistance(currentMonthStr, requestedMonth) > maxPastMonths) {
      throw new MonthlyReportHistoryGatedError();
    }
    availableMonthsList = context.availableMonths.filter(
      (month) => monthDistance(currentMonthStr, month) <= maxPastMonths
    );
  }
  const boundaries = reportMonthBoundaries(reportMonth);
  const period = await readMonthlyReportPeriod({
    userId,
    businessId: context.business.id,
    ...boundaries,
  });
  if (period.bills.length > MONTHLY_REPORT_BILL_LIMIT) {
    throw new MonthlyReportBillLimitError();
  }

  const primaryBill = period.bills[0] ?? null;
  const comparison =
    primaryBill && period.previousBill
      ? compareBills(primaryBill, period.previousBill)
      : null;
  const totalCost = period.bills.reduce(
    (sum, bill) => sum + bill.totalAmountRupiah,
    0n
  );
  const allKwhComplete =
    period.bills.length > 0 && period.bills.every((bill) => bill.kwh !== null);
  const totalMilliKwh = allKwhComplete
    ? period.bills.reduce(
        (sum, bill) => sum + decimalToScaledInteger(bill.kwh!, 3),
        0n
      )
    : null;
  const journey = period.journey;
  const actionStatuses =
    journey?.candidates.flatMap((candidate) =>
      candidate.actionPlan ? [candidate.actionPlan.status] : []
    ) ?? [];
  const outcomes =
    journey?.candidates.flatMap((candidate) =>
      candidate.outcome ? [candidate.outcome] : []
    ) ?? [];
  const completenessCode = resolveReportCompleteness({
    hasBill: primaryBill !== null,
    sessionStatus: journey?.status ?? null,
    actionStatuses,
    outcomeCount: outcomes.length,
  });
  const businessQuery = `businessId=${encodeURIComponent(context.business.id)}`;

  return {
    businessSummary: {
      name: context.business.name,
      segment: BUSINESS_SEGMENT_LABELS[context.business.segment] ?? context.business.segment,
      options: context.businesses.map((business) => ({
        id: business.id,
        name: business.name,
        selected: business.id === context.business?.id,
      })),
    },
    reportMonth,
    monthLabel: formatMonth(reportMonth),
    timezoneLabel: 'Asia/Jakarta',
    monthSummary: {
      billCount: period.bills.length,
      totalCost: rupiah.format(totalCost),
      recordedPeriods: period.bills.length,
      totalKwh: totalMilliKwh === null ? null : formatMilliKwh(totalMilliKwh),
      dataCompletenessNote:
        period.bills.length === 0
          ? 'Belum ada tagihan yang berakhir pada bulan ini.'
          : allKwhComplete
            ? 'Data biaya dan kWh tersedia untuk seluruh tagihan bulan ini.'
            : 'Data kWh belum lengkap; total pemakaian tidak ditampilkan.',
    },
    billSummaries: period.bills.map((bill) => {
      const days = inclusivePeriodDays(bill.periodStart, bill.periodEnd);
      return {
        period: formatPeriod(bill.periodStart, bill.periodEnd),
        inclusiveDays: days,
        totalCost: rupiah.format(bill.totalAmountRupiah),
        costPerDay: rupiah.format(dailyCost(bill.totalAmountRupiah, days)),
        kwh: bill.kwh === null ? null : `${formatDecimal(bill.kwh)} kWh`,
        tariff:
          bill.tariffRupiahPerKwh === null
            ? null
            : `Rp${formatDecimal(bill.tariffRupiahPerKwh)}/kWh`,
        isPrimary: bill.id === primaryBill?.id,
      };
    }),
    primaryBillSummary: primaryBill
      ? {
          period: formatPeriod(primaryBill.periodStart, primaryBill.periodEnd),
          totalCost: rupiah.format(primaryBill.totalAmountRupiah),
        }
      : null,
    previousBillSummary: period.previousBill
      ? {
          period: formatPeriod(period.previousBill.periodStart, period.previousBill.periodEnd),
          totalCost: rupiah.format(period.previousBill.totalAmountRupiah),
        }
      : null,
    billComparisonSummary:
      comparison && primaryBill && period.previousBill
        ? {
            title: comparison.wording.title,
            detail: comparison.wording.detail,
            currentDailyCost: rupiah.format(comparison.dailyCost.current),
            previousDailyCost: rupiah.format(comparison.dailyCost.previous),
            usageDirection: comparison.dailyKwh
              ? decimalDirection(comparison.dailyKwh.difference)
              : null,
            tariffContext: tariffContext(
              primaryBill.tariffRupiahPerKwh,
              period.previousBill.tariffRupiahPerKwh
            ),
          }
        : null,
    diagnosticSummary:
      journey && primaryBill
        ? {
            statusLabel: DIAGNOSTIC_STATUS_LABELS[journey.status],
            startedAt: formatDate(journey.startedAt),
            closedAt: journey.closedAt ? formatDate(journey.closedAt) : null,
            sourcePeriod: formatPeriod(primaryBill.periodStart, primaryBill.periodEnd),
          }
        : null,
    candidateSummaries:
      journey?.candidates.slice(0, 3).map((candidate) => ({
        title: candidate.title,
        rankLabel: `Prioritas ${candidate.rank}`,
        explanation: candidate.explanation,
        inspectionState: candidate.inspection
          ? candidate.inspection.resultCode
            ? INSPECTION_ANSWER_LABELS[candidate.inspection.resultCode]
            : INSPECTION_STATUS_LABELS[candidate.inspection.status]
          : 'Belum diperiksa',
      })) ?? [],
    inspectionSummaries:
      journey?.candidates.flatMap((candidate) =>
        candidate.inspection
          ? [
              {
                title: candidate.inspection.title,
                statusLabel: INSPECTION_STATUS_LABELS[candidate.inspection.status],
                resultLabel: candidate.inspection.resultCode
                  ? INSPECTION_ANSWER_LABELS[candidate.inspection.resultCode]
                  : null,
                completedAt: candidate.inspection.completedAt
                  ? formatDate(candidate.inspection.completedAt)
                  : null,
              },
            ]
          : []
      ) ?? [],
    actionPlanSummaries:
      journey?.candidates.flatMap((candidate) =>
        candidate.actionPlan
          ? [
              {
                title: candidate.actionPlan.title,
                statusLabel: ACTION_PLAN_STATUS_LABELS[candidate.actionPlan.status],
                plannedStartDate: formatDate(candidate.actionPlan.plannedStartDate),
                startedAt: candidate.actionPlan.startedAt
                  ? formatDate(candidate.actionPlan.startedAt)
                  : null,
                finishedAt: actionFinishedAt(candidate.actionPlan)
                  ? formatDate(actionFinishedAt(candidate.actionPlan)!)
                  : null,
                reviewTarget: 'Tagihan berikutnya yang memenuhi syarat',
              },
            ]
          : []
      ) ?? [],
    outcomeSummaries: outcomes.map((outcome) => ({
      baselinePeriod: formatPeriod(
        outcome.baselinePeriodStart,
        outcome.baselinePeriodEnd
      ),
      followUpPeriod: formatPeriod(
        outcome.followUpPeriodStart,
        outcome.followUpPeriodEnd
      ),
      costDirection: OUTCOME_DIRECTION_LABELS[outcome.costDirection],
      usageDirection:
        outcome.usageDirection === 'UNAVAILABLE'
          ? null
          : OUTCOME_DIRECTION_LABELS[outcome.usageDirection],
      tariffDirection:
        outcome.tariffDirection === 'UNAVAILABLE'
          ? null
          : OUTCOME_DIRECTION_LABELS[outcome.tariffDirection],
      dataQualityLabel: OUTCOME_DATA_QUALITY_LABELS[outcome.dataQualityCode],
      overallOutcomeLabel: OVERALL_OUTCOME_LABELS[outcome.overallOutcomeCode],
      safeExplanation: outcome.explanation,
      evaluatedAt: formatDate(outcome.evaluatedAt),
    })),
    reportCompleteness: {
      code: completenessCode,
      label: REPORT_COMPLETENESS_LABELS[completenessCode],
    },
    safeCaveats: [
      'Tagihan dikelompokkan berdasarkan bulan berakhirnya periode tagihan. Laporan ini tidak membagi pemakaian menjadi kalender harian.',
      'Laporan ini merangkum data yang dicatat pada WattWise AI.',
      'Perubahan sebelum dan sesudah tidak membuktikan bahwa satu tindakan merupakan satu-satunya penyebab.',
      ...(!allKwhComplete && period.bills.length > 0
        ? ['Evaluasi pemakaian terbatas karena data kWh belum lengkap.']
        : []),
    ],
    availableMonths: availableMonthsList.map((month) => ({
      value: month,
      label: formatMonth(month),
    })),
    navigationLinks: [
      { label: 'Dashboard', href: `/dashboard?${businessQuery}` },
      { label: 'Tagihan', href: `/bills?${businessQuery}` },
    ],
    generatedAtPresentation: `Disusun ${now.toLocaleString('id-ID', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: DEFAULT_REPORT_TIMEZONE,
    })} WIB`,
  };
}
