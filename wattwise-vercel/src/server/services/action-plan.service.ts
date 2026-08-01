import { env } from '@/config/env';
import type { ActionPlanStatus } from '@/server/db/schema/action-plans';
import {
  createOrGetActionPlan,
  findActionPlanContextForUser,
  findActionPlanForInspectionForUser,
  findActionPlanForUser,
  persistActionPlanTransition,
  withLockedActionPlan,
  type ActionPlanContext,
  type ActionPlanRecord,
} from '@/server/repositories/action-plan.repository';
import { buildActionPlanBaseline } from '@/server/services/action-plan-baseline';
import type { ActionDefinition } from '@/server/services/action-plan-catalog';
import { resolveEligibleActions } from '@/server/services/action-plan-eligibility';
import {
  resolveActionPlanTransition,
  type ActionPlanTransition,
} from '@/server/services/action-plan-lifecycle';
import { findInspectionDefinitionByVersion } from '@/server/services/inspection-catalog';

export class ActionPlansUnavailableError extends Error {
  constructor() {
    super('Rencana Hemat belum tersedia.');
    this.name = 'ActionPlansUnavailableError';
  }
}

export class ActionPlanNotFoundError extends Error {
  constructor() {
    super('Rencana Hemat tidak ditemukan.');
    this.name = 'ActionPlanNotFoundError';
  }
}

export class ActionPlanNotEligibleError extends Error {
  constructor(message = 'Pemeriksaan ini belum dapat dibuat menjadi Rencana Hemat.') {
    super(message);
    this.name = 'ActionPlanNotEligibleError';
  }
}

export class ActionPlanSelectionError extends Error {
  constructor() {
    super('Pilihan tindakan tidak tersedia untuk hasil pemeriksaan ini.');
    this.name = 'ActionPlanSelectionError';
  }
}

export class ActionPlanDateError extends Error {
  constructor() {
    super('Tanggal mulai tidak boleh sebelum akhir periode tagihan baseline.');
    this.name = 'ActionPlanDateError';
  }
}

export class ActionPlanTransitionError extends Error {
  constructor(message = 'Status Rencana Hemat tidak dapat diubah dengan tindakan ini.') {
    super(message);
    this.name = 'ActionPlanTransitionError';
  }
}

export interface ActionPlanOptionsView {
  context: ActionPlanContext;
  options: ReadonlyArray<ActionDefinition>;
  existingPlan: ActionPlanRecord | null;
  minimumPlannedStartDate: string;
}

function requireFeature() {
  if (!env.ACTION_PLANS_ENABLED) throw new ActionPlansUnavailableError();
}

function eligibleOptions(context: ActionPlanContext): ReadonlyArray<ActionDefinition> {
  if (
    context.inspectionStatus !== 'COMPLETED' ||
    !context.inspectionResult ||
    context.sessionStatus !== 'INSPECTION_IN_PROGRESS' ||
    context.candidateType === 'DATA_QUALITY'
  ) {
    throw new ActionPlanNotEligibleError();
  }
  const inspection = findInspectionDefinitionByVersion({
    inspectionCode: context.inspectionCode,
    inspectionVersion: context.inspectionVersion,
    ruleVersion: context.inspectionRuleVersion,
  });
  if (
    !inspection ||
    inspection.candidateCode !== context.candidateCode ||
    inspection.candidateVersion !== context.candidateVersion ||
    inspection.candidateRuleVersion !== context.candidateRuleVersion
  ) {
    throw new ActionPlanNotEligibleError(
      'Versi kandidat atau pemeriksaan belum memiliki pemetaan tindakan yang dikenal.'
    );
  }
  return resolveEligibleActions({
    candidateCode: context.candidateCode,
    candidateVersion: context.candidateVersion,
    candidateRuleVersion: context.candidateRuleVersion,
    inspectionRuleVersion: context.inspectionRuleVersion,
    inspectionResult: context.inspectionResult,
  });
}

export async function getActionPlanOptions(
  userId: string,
  sessionId: string,
  inspectionPlanId: string
): Promise<ActionPlanOptionsView | null> {
  requireFeature();
  const context = await findActionPlanContextForUser(userId, sessionId, inspectionPlanId);
  if (!context) return null;
  const options = eligibleOptions(context);
  const existingPlan = await findActionPlanForInspectionForUser(
    userId,
    sessionId,
    inspectionPlanId
  );
  return {
    context,
    options,
    existingPlan,
    minimumPlannedStartDate: context.currentBill.periodEnd,
  };
}

export async function getActionPlan(
  userId: string,
  sessionId: string,
  actionPlanId: string
): Promise<ActionPlanRecord | null> {
  requireFeature();
  return findActionPlanForUser(userId, sessionId, actionPlanId);
}

export async function createActionPlan(
  userId: string,
  input: {
    sessionId: string;
    inspectionPlanId: string;
    selectedActionCode: string;
    plannedStartDate: string;
    userNote: string | null;
  }
): Promise<ActionPlanRecord> {
  requireFeature();
  const plan = await createOrGetActionPlan(
    userId,
    input,
    (context, capturedAt) => {
      const options = eligibleOptions(context);
      const inspectionResult = context.inspectionResult;
      if (!inspectionResult || inspectionResult === 'NOT_FOUND' || options.length === 0) {
        throw new ActionPlanNotEligibleError(
          'Tanda yang diperiksa belum ditemukan. Pertimbangkan untuk memeriksa kandidat lain sebelum membuat Rencana Hemat.'
        );
      }
      if (input.plannedStartDate < context.currentBill.periodEnd) {
        throw new ActionPlanDateError();
      }
      const selected = options.find(
        (definition) => definition.actionCode === input.selectedActionCode
      );
      if (!selected) throw new ActionPlanSelectionError();
      return {
        actionCode: selected.actionCode,
        actionVersion: selected.actionVersion,
        ruleVersion: selected.ruleVersion,
        title: selected.title,
        description: selected.description,
        reason: selected.reasonTemplate,
        steps: selected.steps,
        inspectionResult,
        baseline: buildActionPlanBaseline({
          currentBill: context.currentBill,
          comparisonBill: context.comparisonBill,
          candidateCode: context.candidateCode,
          candidateVersion: context.candidateVersion,
          inspectionCode: context.inspectionCode,
          inspectionVersion: context.inspectionVersion,
          inspectionResultCode: inspectionResult,
          capturedAt,
        }),
        reviewMode: selected.reviewMode,
      };
    }
  );
  if (!plan) throw new ActionPlanNotFoundError();
  return plan;
}

async function transitionActionPlan(
  userId: string,
  input: { sessionId: string; actionPlanId: string },
  transition: ActionPlanTransition
): Promise<ActionPlanRecord> {
  requireFeature();
  const result = await withLockedActionPlan(
    userId,
    input.sessionId,
    input.actionPlanId,
    async (client, plan) => {
      if (plan.diagnosticSessionStatus !== 'INSPECTION_IN_PROGRESS') {
        throw new ActionPlanTransitionError('Sesi yang sudah ditutup tidak dapat diubah.');
      }
      let nextStatus: ActionPlanStatus;
      try {
        nextStatus = resolveActionPlanTransition(plan.status, transition);
      } catch {
        throw new ActionPlanTransitionError();
      }
      if (nextStatus === plan.status) return plan;
      return persistActionPlanTransition(client, plan, nextStatus);
    }
  );
  if (!result) throw new ActionPlanNotFoundError();
  return result;
}

export function startActionPlan(
  userId: string,
  input: { sessionId: string; actionPlanId: string }
) {
  return transitionActionPlan(userId, input, 'START');
}

export function completeActionPlan(
  userId: string,
  input: { sessionId: string; actionPlanId: string }
) {
  return transitionActionPlan(userId, input, 'COMPLETE');
}

export function cancelActionPlan(
  userId: string,
  input: { sessionId: string; actionPlanId: string }
) {
  return transitionActionPlan(userId, input, 'CANCEL');
}
