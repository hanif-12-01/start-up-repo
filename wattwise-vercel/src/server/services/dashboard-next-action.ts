import type { ActionPlanStatus } from '@/server/db/schema/action-plans';
import type { DiagnosticStatus } from '@/server/db/schema/diagnostics';
import type { InspectionPlanStatus } from '@/server/db/schema/inspections';

export type DashboardNextAction =
  | {
      kind: 'LINK';
      label: string;
      href: string;
    }
  | {
      kind: 'START_DIAGNOSTIC';
      label: 'Cek Kenaikan';
      electricityBillId: string;
    };

export interface DashboardNextActionInput {
  businessId: string;
  latestBillId: string | null;
  hasEligibleComparison: boolean;
  session: {
    id: string;
    status: DiagnosticStatus;
    candidates: Array<{
      rank: number;
      inspectable: boolean;
      inspection: {
        id: string;
        status: InspectionPlanStatus;
        actionEligible: boolean;
        actionPlan: {
          id: string;
          status: ActionPlanStatus;
          hasEligibleEvaluationBill: boolean;
          hasOutcome: boolean;
        } | null;
      } | null;
    }>;
    closureEligible: boolean;
  } | null;
}

function encoded(value: string) {
  return encodeURIComponent(value);
}

export function resolveDashboardNextAction(
  input: DashboardNextActionInput
): DashboardNextAction {
  const billPath = `/bills/new?businessId=${encoded(input.businessId)}`;
  if (!input.latestBillId) {
    return { kind: 'LINK', label: 'Tambah Tagihan Pertama', href: billPath };
  }
  if (!input.hasEligibleComparison) {
    return { kind: 'LINK', label: 'Tambah Tagihan Pembanding', href: billPath };
  }
  if (!input.session) {
    return {
      kind: 'START_DIAGNOSTIC',
      label: 'Cek Kenaikan',
      electricityBillId: input.latestBillId,
    };
  }

  const sessionPath = `/diagnostics/${encoded(input.session.id)}`;
  const resultsPath = `${sessionPath}/results`;
  if (input.session.status === 'DRAFT' || input.session.status === 'COLLECTING_CONTEXT') {
    return { kind: 'LINK', label: 'Lanjutkan Cek Kenaikan', href: sessionPath };
  }
  if (input.session.status === 'ANALYZED') {
    const candidateToInspect = input.session.candidates
      .slice()
      .sort((left, right) => left.rank - right.rank)
      .find((candidate) => candidate.inspectable && !candidate.inspection);
    return candidateToInspect
      ? { kind: 'LINK', label: 'Mulai Pemeriksaan', href: resultsPath }
      : { kind: 'LINK', label: 'Lihat Hasil Cek Kenaikan', href: resultsPath };
  }
  if (input.session.status === 'CLOSED') {
    return { kind: 'LINK', label: 'Lihat Ringkasan Sesi', href: resultsPath };
  }

  const candidates = input.session.candidates.slice().sort((left, right) => left.rank - right.rank);
  const inspections = candidates.flatMap((candidate) =>
    candidate.inspection ? [{ ...candidate.inspection, rank: candidate.rank }] : []
  );
  const inProgressInspection = inspections.find(
    (inspection) => inspection.status === 'IN_PROGRESS'
  );
  if (inProgressInspection) {
    return {
      kind: 'LINK',
      label: 'Lanjutkan Pemeriksaan',
      href: `${sessionPath}/inspections/${encoded(inProgressInspection.id)}`,
    };
  }

  const inspectionWithoutAction = inspections.find(
    (inspection) =>
      inspection.status === 'COMPLETED' && inspection.actionEligible && !inspection.actionPlan
  );
  if (inspectionWithoutAction) {
    return {
      kind: 'LINK',
      label: 'Buat Rencana Hemat',
      href: `${sessionPath}/inspections/${encoded(inspectionWithoutAction.id)}/actions`,
    };
  }

  const plans = inspections.flatMap((inspection) =>
    inspection.actionPlan ? [{ ...inspection.actionPlan, inspectionId: inspection.id }] : []
  );
  const planned = plans.find((plan) => plan.status === 'PLANNED');
  if (planned) {
    return {
      kind: 'LINK',
      label: 'Mulai Rencana Hemat',
      href: `${sessionPath}/actions/${encoded(planned.id)}`,
    };
  }
  const active = plans.find((plan) => plan.status === 'IN_PROGRESS');
  if (active) {
    return {
      kind: 'LINK',
      label: 'Lanjutkan Rencana Hemat',
      href: `${sessionPath}/actions/${encoded(active.id)}`,
    };
  }
  const waiting = plans.find(
    (plan) =>
      plan.status === 'COMPLETED' && !plan.hasOutcome && !plan.hasEligibleEvaluationBill
  );
  if (waiting) {
    return { kind: 'LINK', label: 'Tambah Tagihan Evaluasi', href: billPath };
  }
  const outcomeReady = plans.find(
    (plan) => plan.status === 'COMPLETED' && !plan.hasOutcome && plan.hasEligibleEvaluationBill
  );
  if (outcomeReady) {
    return {
      kind: 'LINK',
      label: 'Evaluasi Hasil',
      href: `${sessionPath}/actions/${encoded(outcomeReady.id)}`,
    };
  }
  if (input.session.closureEligible) {
    const evaluated = plans.find((plan) => plan.hasOutcome);
    return {
      kind: 'LINK',
      label: 'Tutup Sesi Cek Kenaikan',
      href: evaluated
        ? `${sessionPath}/actions/${encoded(evaluated.id)}/outcome`
        : resultsPath,
    };
  }
  return { kind: 'LINK', label: 'Lihat Perjalanan Cek Kenaikan', href: resultsPath };
}
