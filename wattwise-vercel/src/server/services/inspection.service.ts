import type { InspectionAnswerCode } from '@/server/db/schema/inspections';
import type { DiagnosticCandidateRecord } from '@/server/repositories/diagnostic-candidate.repository';
import {
  completeInspectionPlanRecord,
  createOrGetInspectionPlan,
  findInspectionPlanForUser,
  findInspectionPlanSummariesForSession,
  saveInspectionItemAnswer,
  withLockedInspectionPlan,
  type InspectionCandidateContext,
  type InspectionPlanRecord,
} from '@/server/repositories/inspection.repository';
import {
  findInspectionDefinition,
  findInspectionDefinitionByVersion,
  type InspectionDefinition,
} from '@/server/services/inspection-catalog';
import { resolveInspectionResult } from '@/server/services/inspection-result-resolver';

export class InspectionNotFoundError extends Error {
  constructor() {
    super('Pemeriksaan tidak ditemukan.');
    this.name = 'InspectionNotFoundError';
  }
}

export class InspectionNotEligibleError extends Error {
  constructor(message = 'Kandidat ini belum dapat diperiksa dengan panduan aman.') {
    super(message);
    this.name = 'InspectionNotEligibleError';
  }
}

export class InspectionImmutableError extends Error {
  constructor() {
    super('Pemeriksaan yang sudah selesai tidak dapat diubah.');
    this.name = 'InspectionImmutableError';
  }
}

export class InspectionItemMismatchError extends Error {
  constructor() {
    super('Langkah pemeriksaan tidak sesuai dengan rencana yang aktif.');
    this.name = 'InspectionItemMismatchError';
  }
}

export class InspectionAnswerNotAllowedError extends Error {
  constructor() {
    super('Pilihan hasil tidak tersedia untuk langkah pemeriksaan ini.');
    this.name = 'InspectionAnswerNotAllowedError';
  }
}

export class InspectionCompletionNotReadyError extends Error {
  constructor() {
    super('Jawab semua langkah sebelum menyelesaikan pemeriksaan.');
    this.name = 'InspectionCompletionNotReadyError';
  }
}

export interface InspectionPlanView {
  plan: InspectionPlanRecord;
  definition: InspectionDefinition;
  answeredCount: number;
  totalCount: number;
  completed: boolean;
}

export interface CandidateInspectionAvailability {
  candidateId: string;
  inspectable: boolean;
  planId: string | null;
  planStatus: 'IN_PROGRESS' | 'COMPLETED' | null;
  resultCode: InspectionAnswerCode | null;
}

function assertCandidateEligibility(
  candidate: InspectionCandidateContext
): InspectionDefinition {
  if (
    candidate.sessionStatus !== 'ANALYZED' &&
    candidate.sessionStatus !== 'INSPECTION_IN_PROGRESS'
  ) {
    throw new InspectionNotEligibleError(
      'Sesi ini tidak berada pada tahap yang dapat memulai pemeriksaan.'
    );
  }
  if (candidate.rank < 1 || candidate.rank > 3) {
    throw new InspectionNotEligibleError();
  }
  if (candidate.candidateType === 'DATA_QUALITY') {
    throw new InspectionNotEligibleError(
      'Lengkapi informasi yang tersedia; kandidat ini tidak memerlukan pemeriksaan fisik.'
    );
  }
  const definition = findInspectionDefinition({
    candidateCode: candidate.candidateCode,
    candidateVersion: candidate.candidateVersion,
    candidateRuleVersion: candidate.candidateRuleVersion,
  });
  if (!definition) throw new InspectionNotEligibleError();
  return definition;
}

function resolvePlanView(plan: InspectionPlanRecord): InspectionPlanView {
  const definition = findInspectionDefinitionByVersion({
    inspectionCode: plan.inspectionCode,
    inspectionVersion: plan.inspectionVersion,
    ruleVersion: plan.ruleVersion,
  });
  if (!definition) {
    throw new InspectionNotEligibleError(
      'Versi panduan pemeriksaan ini tidak lagi tersedia.'
    );
  }
  const answeredCount = plan.items.filter(
    (item) => item.status === 'ANSWERED'
  ).length;
  return {
    plan,
    definition,
    answeredCount,
    totalCount: plan.items.length,
    completed: plan.status === 'COMPLETED',
  };
}

export async function startInspection(
  userId: string,
  candidateId: string
): Promise<InspectionPlanView> {
  const plan = await createOrGetInspectionPlan(
    userId,
    candidateId,
    assertCandidateEligibility
  );
  if (!plan) throw new InspectionNotFoundError();
  return resolvePlanView(plan);
}

export async function getInspectionPlan(
  userId: string,
  sessionId: string,
  planId: string
): Promise<InspectionPlanView | null> {
  const plan = await findInspectionPlanForUser(userId, sessionId, planId);
  return plan ? resolvePlanView(plan) : null;
}

export async function getCandidateInspectionAvailability(
  userId: string,
  sessionId: string,
  candidates: ReadonlyArray<DiagnosticCandidateRecord>
): Promise<CandidateInspectionAvailability[] | null> {
  const plans = await findInspectionPlanSummariesForSession(userId, sessionId);
  if (plans === null) return null;
  const byCandidate = new Map(
    plans.map((plan) => [plan.diagnosticCandidateId, plan])
  );
  return candidates.map((candidate) => {
    const existing = byCandidate.get(candidate.id);
    return {
      candidateId: candidate.id,
      inspectable:
        candidate.candidateType !== 'DATA_QUALITY' &&
        findInspectionDefinition({
          candidateCode: candidate.candidateCode,
          candidateVersion: candidate.candidateVersion,
          candidateRuleVersion: candidate.ruleVersion,
        }) !== null,
      planId: existing?.id ?? null,
      planStatus: existing?.status ?? null,
      resultCode: existing?.resultCode ?? null,
    };
  });
}

export async function answerInspectionItem(
  userId: string,
  input: {
    sessionId: string;
    planId: string;
    itemId: string;
    answerCode: InspectionAnswerCode;
    note: string | null;
  }
): Promise<InspectionPlanView> {
  const normalizedNote = input.note?.trim() || null;
  const plan = await withLockedInspectionPlan(
    userId,
    input.sessionId,
    input.planId,
    async (client, lockedPlan) => {
      if (lockedPlan.status === 'COMPLETED') {
        throw new InspectionImmutableError();
      }
      const item = lockedPlan.items.find((candidate) => candidate.id === input.itemId);
      if (!item) throw new InspectionItemMismatchError();
      if (!item.resultOptions.includes(input.answerCode)) {
        throw new InspectionAnswerNotAllowedError();
      }
      if (item.answerCode === input.answerCode && item.note === normalizedNote) {
        return lockedPlan;
      }
      const timestamps = await saveInspectionItemAnswer(client, {
        itemId: item.id,
        answerCode: input.answerCode,
        note: normalizedNote,
      });
      return {
        ...lockedPlan,
        items: lockedPlan.items.map((candidate) =>
          candidate.id === item.id
            ? {
                ...candidate,
                status: 'ANSWERED' as const,
                answerCode: input.answerCode,
                note: normalizedNote,
                completedAt: timestamps.completedAt,
                updatedAt: timestamps.updatedAt,
              }
            : candidate
        ),
      };
    }
  );
  if (!plan) throw new InspectionNotFoundError();
  return resolvePlanView(plan);
}

export async function completeInspection(
  userId: string,
  input: {
    sessionId: string;
    planId: string;
  }
): Promise<InspectionPlanView> {
  const plan = await withLockedInspectionPlan(
    userId,
    input.sessionId,
    input.planId,
    async (client, lockedPlan) => {
      if (lockedPlan.status === 'COMPLETED') return lockedPlan;
      const answers = lockedPlan.items.map((item) => item.answerCode);
      if (
        answers.length === 0 ||
        answers.some((answer) => answer === null)
      ) {
        throw new InspectionCompletionNotReadyError();
      }
      const resultCode = resolveInspectionResult(
        answers as InspectionAnswerCode[]
      );
      const timestamps = await completeInspectionPlanRecord(
        client,
        lockedPlan.id,
        resultCode
      );
      return {
        ...lockedPlan,
        status: 'COMPLETED' as const,
        resultCode,
        completedAt: timestamps.completedAt,
        updatedAt: timestamps.updatedAt,
      };
    }
  );
  if (!plan) throw new InspectionNotFoundError();
  return resolvePlanView(plan);
}
