import { env } from '@/config/env';
import type { DiagnosticStatus } from '@/server/db/schema/diagnostics';
import type { InspectionAnswerCode } from '@/server/db/schema/inspections';
import {
  readDashboardSnapshot,
  type DashboardCandidateRecord,
} from '@/server/repositories/dashboard.repository';
import { ACTION_PLAN_STATUS_LABELS } from '@/server/services/action-plan-presentation';
import { resolveEligibleActions } from '@/server/services/action-plan-eligibility';
import {
  compareBills,
  inclusivePeriodDays,
} from '@/server/services/bill-comparison.service';
import {
  resolveDashboardNextAction,
  type DashboardNextAction,
  type DashboardNextActionInput,
} from '@/server/services/dashboard-next-action';
import { getDiagnosticCapability } from '@/server/services/diagnostic-capability';
import { findInspectionDefinition } from '@/server/services/inspection-catalog';
import { INSPECTION_ANSWER_LABELS } from '@/server/services/inspection-presentation';
import {
  OUTCOME_DATA_QUALITY_LABELS,
  OUTCOME_DIRECTION_LABELS,
  OVERALL_OUTCOME_LABELS,
} from '@/server/services/outcome-presentation';
import { resolveSessionClosureEligibility } from '@/server/services/session-closure.service';
import { getUserEntitlements, type EffectivePlan } from '@/server/services/entitlement.service';

const SESSION_STATUS_LABELS: Record<DiagnosticStatus, string> = {
  DRAFT: 'Cek Kenaikan belum dimulai',
  COLLECTING_CONTEXT: 'Pertanyaan sedang dilengkapi',
  ANALYZED: 'Bagian yang perlu dicek tersedia',
  INSPECTION_IN_PROGRESS: 'Pemeriksaan atau tindakan sedang berjalan',
  CLOSED: 'Sesi telah selesai',
};

const INSPECTION_STATUS_LABELS = {
  IN_PROGRESS: 'Sedang diperiksa',
  COMPLETED: 'Pemeriksaan selesai',
} as const;

const integer = new Intl.NumberFormat('id-ID');
const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export interface DashboardReadModel {
  businessSummary: {
    name: string;
    segment: string;
    activeLabel: 'Aktif';
    options: Array<{ id: string; name: string; selected: boolean }>;
  };
  latestBillSummary: {
    period: string;
    totalCost: string;
    days: number;
    dailyCost: string;
    kwh: string | null;
  } | null;
  previousBillSummary: { period: string; totalCost: string } | null;
  billComparisonSummary: {
    title: string;
    detail: string;
    dailyCostChange: string;
    dailyKwhChange: string | null;
  } | null;
  latestDiagnosticSummary: {
    statusLabel: string;
    startedAt: string;
    closedAt: string | null;
  } | null;
  candidateSummaries: Array<{
    title: string;
    rankLabel: string;
    explanation: string;
    inspectionStatusLabel: string;
  }>;
  inspectionSummaries: Array<{
    title: string;
    statusLabel: string;
    resultLabel: string | null;
  }>;
  actionPlanSummaries: Array<{
    title: string;
    statusLabel: string;
    plannedStartDate: string;
    reviewTarget: string;
  }>;
  outcomeSummaries: Array<{
    baselinePeriod: string;
    followUpPeriod: string;
    overallOutcomeLabel: string;
    costDirectionLabel: string;
    usageDirectionLabel: string | null;
    dataQualityLabel: string;
    caveat: string;
  }>;
  nextAction: DashboardNextAction;
  secondaryLinks: Array<{ label: string; href: string }>;
  dataFreshness: { updatedAt: string; label: string };
  planSummary?: {
    plan: EffectivePlan;
    isTrialExpired: boolean;
    trialEndsAt: string | null;
    businessCount: number;
    maxBusinesses: number;
    usageLabel: string;
  };
}

export class DashboardUnavailableError extends Error {
  constructor() {
    super('Dashboard belum tersedia.');
    this.name = 'DashboardUnavailableError';
  }
}

export class DashboardBusinessNotFoundError extends Error {
  constructor() {
    super('Usaha aktif tidak ditemukan.');
    this.name = 'DashboardBusinessNotFoundError';
  }
}

export function buildMonthlyReportLink(
  businessId: string,
  latestBillPeriodEnd: string | null
): { label: 'Lihat Laporan Bulanan'; href: string } | null {
  if (!env.MONTHLY_REPORTS_ENABLED || !latestBillPeriodEnd) return null;
  return {
    label: 'Lihat Laporan Bulanan',
    href: `/reports/monthly?businessId=${encodeURIComponent(businessId)}&month=${latestBillPeriodEnd.slice(0, 7)}`,
  };
}

function formatDate(value: string | Date): string {
  const instant = typeof value === 'string' ? new Date(`${value}T00:00:00.000Z`) : value;
  return instant.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}

function formatPeriod(start: string, end: string): string {
  return `${formatDate(start)}–${formatDate(end)}`;
}

function formatDecimal(value: string): string {
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction] = unsigned.split('.');
  return `${negative ? '-' : ''}${integer.format(BigInt(whole))}${fraction ? `,${fraction}` : ''}`;
}

function signedDecimal(value: string): string {
  return `${value.startsWith('-') || value === '0' ? '' : '+'}${formatDecimal(value)}`;
}

function signedRupiah(value: bigint): string {
  return `${value > 0n ? '+' : ''}${rupiah.format(value)}`;
}

function inspectionIsActionEligible(candidate: DashboardCandidateRecord): boolean {
  const inspection = candidate.inspection;
  if (!inspection || inspection.status !== 'COMPLETED' || !inspection.resultCode) return false;
  return (
    resolveEligibleActions({
      candidateCode: candidate.candidateCode,
      candidateVersion: candidate.candidateVersion,
      candidateRuleVersion: candidate.candidateRuleVersion,
      inspectionRuleVersion: inspection.ruleVersion,
      inspectionResult: inspection.resultCode,
    }).length > 0
  );
}

function inspectionResultLabel(resultCode: InspectionAnswerCode | null): string | null {
  return resultCode ? INSPECTION_ANSWER_LABELS[resultCode] : null;
}

export async function getDashboardReadModel(
  userId: string,
  requestedBusinessId?: string
): Promise<DashboardReadModel> {
  if (!env.DASHBOARD_ENABLED) throw new DashboardUnavailableError();
  const snapshot = await readDashboardSnapshot(userId, requestedBusinessId);
  if (!snapshot.business || (requestedBusinessId && snapshot.business.id !== requestedBusinessId)) {
    throw new DashboardBusinessNotFoundError();
  }

  const business = snapshot.business;
  const latest = snapshot.bills[0] ?? null;
  const previous = snapshot.bills[1] ?? null;
  const comparison = latest && previous ? compareBills(latest, previous) : null;
  const diagnostic = snapshot.diagnostic;
  const entitlements = await getUserEntitlements(userId);
  const planSummary = {
    plan: entitlements.plan,
    isTrialExpired: entitlements.isTrialExpired,
    trialEndsAt: entitlements.trialEndsAt ? entitlements.trialEndsAt.toISOString() : null,
    businessCount: entitlements.usage.businessCount,
    maxBusinesses: entitlements.limits.maxBusinesses,
    usageLabel: `${entitlements.usage.businessCount} dari ${entitlements.limits.maxBusinesses} usaha digunakan`,
  };

  const closureEligible = diagnostic
    ? resolveSessionClosureEligibility({
        id: diagnostic.id,
        status: diagnostic.status,
        closedAt: diagnostic.closedAt,
        plans: diagnostic.candidates.flatMap((candidate) =>
          candidate.actionPlan
            ? [
                {
                  id: candidate.actionPlan.id,
                  status: candidate.actionPlan.status,
                  hasOutcome: candidate.outcome !== null,
                },
              ]
            : []
        ),
      }).eligible
    : false;

  const diagnosticCapability = getDiagnosticCapability(business.segment);

  const nextActionInput: DashboardNextActionInput = {
    businessId: business.id,
    latestBillId: latest?.id ?? null,
    hasEligibleComparison: comparison !== null,
    diagnosticAvailable: diagnosticCapability.available,
    session: diagnostic
      ? {
          id: diagnostic.id,
          status: diagnostic.status,
          closureEligible,
          candidates: diagnostic.candidates.map((candidate) => ({
            rank: candidate.rank,
            inspectable:
              findInspectionDefinition({
                candidateCode: candidate.candidateCode,
                candidateVersion: candidate.candidateVersion,
                candidateRuleVersion: candidate.candidateRuleVersion,
              }) !== null,
            inspection: candidate.inspection
              ? {
                  id: candidate.inspection.id,
                  status: candidate.inspection.status,
                  actionEligible: inspectionIsActionEligible(candidate),
                  actionPlan: candidate.actionPlan
                    ? {
                        id: candidate.actionPlan.id,
                        status: candidate.actionPlan.status,
                        hasEligibleEvaluationBill:
                          candidate.actionPlan.hasEligibleEvaluationBill,
                        hasOutcome: candidate.outcome !== null,
                      }
                    : null,
                }
              : null,
          })),
        }
      : null,
  };
  const nextAction = resolveDashboardNextAction(nextActionInput);
  const monthlyReportLink = buildMonthlyReportLink(
    business.id,
    latest?.periodEnd ?? null
  );

  const freshnessCandidates = [
    business.updatedAt,
    ...snapshot.bills.map((bill) => bill.updatedAt),
    ...(diagnostic
      ? [
          diagnostic.updatedAt,
          ...diagnostic.candidates.flatMap((candidate) => [
            candidate.updatedAt,
            ...(candidate.inspection ? [candidate.inspection.updatedAt] : []),
            ...(candidate.actionPlan ? [candidate.actionPlan.updatedAt] : []),
            ...(candidate.outcome ? [candidate.outcome.updatedAt] : []),
          ]),
        ]
      : []),
  ];
  const updatedAt = freshnessCandidates.reduce(
    (latestDate, value) => (value.getTime() > latestDate.getTime() ? value : latestDate),
    freshnessCandidates[0]
  );

  return {
    businessSummary: {
      name: business.name,
      segment: business.segment,
      activeLabel: 'Aktif',
      options: snapshot.businesses.map((item) => ({
        id: item.id,
        name: item.name,
        selected: item.id === business.id,
      })),
    },
    latestBillSummary: latest
      ? {
          period: formatPeriod(latest.periodStart, latest.periodEnd),
          totalCost: rupiah.format(latest.totalAmountRupiah),
          days:
            comparison?.currentDays ?? inclusivePeriodDays(latest.periodStart, latest.periodEnd),
          dailyCost: comparison
            ? rupiah.format(comparison.dailyCost.current)
            : 'Tersedia setelah ada tagihan pembanding',
          kwh: latest.kwh === null ? null : `${formatDecimal(latest.kwh)} kWh`,
        }
      : null,
    previousBillSummary: previous
      ? {
          period: formatPeriod(previous.periodStart, previous.periodEnd),
          totalCost: rupiah.format(previous.totalAmountRupiah),
        }
      : null,
    billComparisonSummary: comparison
      ? {
          title: comparison.wording.title,
          detail: comparison.wording.detail,
          dailyCostChange: `${signedRupiah(comparison.dailyCost.difference)}/hari`,
          dailyKwhChange: comparison.dailyKwh
            ? `${signedDecimal(comparison.dailyKwh.difference)} kWh/hari`
            : null,
        }
      : null,
    latestDiagnosticSummary: diagnostic
      ? {
          statusLabel: SESSION_STATUS_LABELS[diagnostic.status],
          startedAt: formatDate(diagnostic.createdAt),
          closedAt: diagnostic.closedAt ? formatDate(diagnostic.closedAt) : null,
        }
      : null,
    candidateSummaries:
      diagnostic?.candidates.map((candidate) => ({
        title: candidate.title,
        rankLabel: `Prioritas ${candidate.rank}`,
        explanation: candidate.explanation,
        inspectionStatusLabel: candidate.inspection
          ? INSPECTION_STATUS_LABELS[candidate.inspection.status]
          : candidate.candidateType === 'DATA_QUALITY'
            ? 'Tidak memerlukan pemeriksaan fisik'
            : 'Belum diperiksa',
      })) ?? [],
    inspectionSummaries:
      diagnostic?.candidates.flatMap((candidate) =>
        candidate.inspection
          ? [
              {
                title: candidate.inspection.title,
                statusLabel: INSPECTION_STATUS_LABELS[candidate.inspection.status],
                resultLabel: inspectionResultLabel(candidate.inspection.resultCode),
              },
            ]
          : []
      ) ?? [],
    actionPlanSummaries:
      diagnostic?.candidates.flatMap((candidate) =>
        candidate.actionPlan
          ? [
              {
                title: candidate.actionPlan.title,
                statusLabel: ACTION_PLAN_STATUS_LABELS[candidate.actionPlan.status],
                plannedStartDate: formatDate(candidate.actionPlan.plannedStartDate),
                reviewTarget: 'Tagihan berikutnya yang memenuhi syarat',
              },
            ]
          : []
      ) ?? [],
    outcomeSummaries:
      diagnostic?.candidates.flatMap((candidate) =>
        candidate.outcome
          ? [
              {
                baselinePeriod: formatPeriod(
                  candidate.outcome.baselinePeriodStart,
                  candidate.outcome.baselinePeriodEnd
                ),
                followUpPeriod: formatPeriod(
                  candidate.outcome.followUpPeriodStart,
                  candidate.outcome.followUpPeriodEnd
                ),
                overallOutcomeLabel:
                  OVERALL_OUTCOME_LABELS[candidate.outcome.overallOutcomeCode],
                costDirectionLabel: OUTCOME_DIRECTION_LABELS[candidate.outcome.costDirection],
                usageDirectionLabel:
                  candidate.outcome.usageDirection === 'UNAVAILABLE'
                    ? null
                    : OUTCOME_DIRECTION_LABELS[candidate.outcome.usageDirection],
                dataQualityLabel:
                  OUTCOME_DATA_QUALITY_LABELS[candidate.outcome.dataQualityCode],
                caveat:
                  'Perbandingan ini memakai snapshot yang tersimpan dan tidak membuktikan penyebab perubahan.',
              },
            ]
          : []
      ) ?? [],
    nextAction,
    secondaryLinks: [
      {
        label: 'Tambah Tagihan',
        href: `/bills/new?businessId=${encodeURIComponent(business.id)}`,
      },
      {
        label: 'Lihat Riwayat Tagihan',
        href: `/bills?businessId=${encodeURIComponent(business.id)}`,
      },
      ...(monthlyReportLink ? [monthlyReportLink] : []),
      ...(diagnostic
        ? [
            {
              label: 'Lihat detail Cek Kenaikan',
              href: `/diagnostics/${encodeURIComponent(diagnostic.id)}/results`,
            },
          ]
        : []),
    ].filter(
      (link) => nextAction.kind !== 'LINK' || link.href !== nextAction.href
    ),
    dataFreshness: {
      updatedAt: updatedAt.toISOString(),
      label: `Data terakhir diperbarui ${updatedAt.toLocaleString('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: 'Asia/Jakarta',
      })}`,
    },
    planSummary,
  };
}
