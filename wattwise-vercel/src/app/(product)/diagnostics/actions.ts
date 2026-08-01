'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUserId } from '@/server/auth/session';
import {
  DiagnosticAnswerImmutableError,
  DiagnosticBillNotFoundError,
  DiagnosticCandidateGenerationNotReadyError,
  DiagnosticComparisonRequiredError,
  DiagnosticQuestionMismatchError,
  DiagnosticSessionNotCollectingError,
  DiagnosticSessionNotFoundError,
  DiagnosticsUnavailableError,
  answerDiagnosticQuestion,
  generateCandidatesForDiagnosticSession,
  startDiagnosticSession,
} from '@/server/services/diagnostic.service';
import {
  InspectionAnswerNotAllowedError,
  InspectionCompletionNotReadyError,
  InspectionImmutableError,
  InspectionItemMismatchError,
  InspectionNotEligibleError,
  InspectionNotFoundError,
  answerInspectionItem,
  completeInspection,
  startInspection,
} from '@/server/services/inspection.service';
import {
  ActionPlanDateError,
  ActionPlanNotEligibleError,
  ActionPlanNotFoundError,
  ActionPlanSelectionError,
  ActionPlanTransitionError,
  ActionPlansUnavailableError,
  cancelActionPlan,
  completeActionPlan,
  createActionPlan,
  startActionPlan,
} from '@/server/services/action-plan.service';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';
import {
  OutcomeActionNotFoundError,
  OutcomeNotEligibleError,
  OutcomeTrackingUnavailableError,
  OutcomeWaitingForBillError,
  evaluateActionOutcome,
} from '@/server/services/outcome.service';
import {
  SessionClosureNotEligibleError,
  SessionClosureNotFoundError,
  closeDiagnosticSession,
} from '@/server/services/session-closure.service';
import {
  answerDiagnosticSchema,
  answerInspectionItemSchema,
  completeInspectionSchema,
  createActionPlanSchema,
  evaluateActionOutcomeSchema,
  closeDiagnosticSessionSchema,
  generateDiagnosticCandidatesSchema,
  startInspectionSchema,
  startDiagnosticSchema,
  transitionActionPlanSchema,
} from '@/server/validation/diagnostics';

export interface DiagnosticActionState {
  error?: string;
}

async function requireCompletedJourney(userId: string) {
  const step = await resolveJourneyStep(userId);
  if (step !== 'COMPLETE') redirect(getJourneyRedirect(step));
}

function safeDiagnosticMessage(error: unknown) {
  if (
    error instanceof DiagnosticsUnavailableError ||
    error instanceof DiagnosticBillNotFoundError ||
    error instanceof DiagnosticComparisonRequiredError ||
    error instanceof DiagnosticSessionNotFoundError ||
    error instanceof DiagnosticQuestionMismatchError ||
    error instanceof DiagnosticAnswerImmutableError ||
    error instanceof DiagnosticSessionNotCollectingError ||
    error instanceof DiagnosticCandidateGenerationNotReadyError ||
    error instanceof InspectionNotFoundError ||
    error instanceof InspectionNotEligibleError ||
    error instanceof InspectionImmutableError ||
    error instanceof InspectionItemMismatchError ||
    error instanceof InspectionAnswerNotAllowedError ||
    error instanceof InspectionCompletionNotReadyError
    || error instanceof ActionPlansUnavailableError
    || error instanceof ActionPlanNotFoundError
    || error instanceof ActionPlanNotEligibleError
    || error instanceof ActionPlanSelectionError
    || error instanceof ActionPlanDateError
    || error instanceof ActionPlanTransitionError
    || error instanceof OutcomeTrackingUnavailableError
    || error instanceof OutcomeActionNotFoundError
    || error instanceof OutcomeNotEligibleError
    || error instanceof OutcomeWaitingForBillError
    || error instanceof SessionClosureNotFoundError
    || error instanceof SessionClosureNotEligibleError
  ) {
    return error.message;
  }
  return 'Pemeriksaan belum dapat diperbarui. Silakan coba lagi.';
}

function strictFormData(formData: FormData): Record<string, FormDataEntryValue> {
  return Object.fromEntries(
    [...formData.entries()].filter(([key]) => !key.startsWith('$ACTION_'))
  );
}

export async function startDiagnosticAction(
  _previousState: DiagnosticActionState | null,
  formData: FormData
): Promise<DiagnosticActionState> {
  const userId = await requireUserId();
  await requireCompletedJourney(userId);
  const parsed = startDiagnosticSchema.safeParse({
    electricityBillId: formData.get('electricityBillId'),
  });
  if (!parsed.success) return { error: 'Tagihan yang dipilih tidak valid.' };

  let sessionId: string;
  try {
    const view = await startDiagnosticSession(userId, parsed.data.electricityBillId);
    sessionId = view.session.id;
  } catch (error) {
    return { error: safeDiagnosticMessage(error) };
  }
  redirect(`/diagnostics/${encodeURIComponent(sessionId)}`);
}

export async function answerDiagnosticAction(
  _previousState: DiagnosticActionState | null,
  formData: FormData
): Promise<DiagnosticActionState> {
  const userId = await requireUserId();
  await requireCompletedJourney(userId);
  const parsed = answerDiagnosticSchema.safeParse({
    sessionId: formData.get('sessionId'),
    questionCode: formData.get('questionCode'),
    questionVersion: formData.get('questionVersion'),
    answerCode: formData.get('answerCode'),
  });
  if (!parsed.success) return { error: 'Jawaban atau pertanyaan tidak valid.' };

  try {
    await answerDiagnosticQuestion(userId, parsed.data);
  } catch (error) {
    return { error: safeDiagnosticMessage(error) };
  }
  revalidatePath(`/diagnostics/${parsed.data.sessionId}`);
  redirect(`/diagnostics/${encodeURIComponent(parsed.data.sessionId)}`);
}

export async function generateDiagnosticCandidatesAction(
  _previousState: DiagnosticActionState | null,
  formData: FormData
): Promise<DiagnosticActionState> {
  const userId = await requireUserId();
  await requireCompletedJourney(userId);
  const parsed = generateDiagnosticCandidatesSchema.safeParse({
    sessionId: formData.get('sessionId'),
  });
  if (!parsed.success) return { error: 'Sesi pemeriksaan tidak valid.' };

  try {
    await generateCandidatesForDiagnosticSession(userId, parsed.data.sessionId);
  } catch (error) {
    return { error: safeDiagnosticMessage(error) };
  }
  const resultPath = `/diagnostics/${encodeURIComponent(parsed.data.sessionId)}/results`;
  revalidatePath(resultPath);
  redirect(resultPath);
}

export async function startInspectionAction(
  _previousState: DiagnosticActionState | null,
  formData: FormData
): Promise<DiagnosticActionState> {
  const userId = await requireUserId();
  await requireCompletedJourney(userId);
  const parsed = startInspectionSchema.safeParse({
    candidateId: formData.get('candidateId'),
  });
  if (!parsed.success) return { error: 'Kandidat pemeriksaan tidak valid.' };

  let destination: string;
  try {
    const view = await startInspection(userId, parsed.data.candidateId);
    destination = `/diagnostics/${encodeURIComponent(
      view.plan.diagnosticSessionId
    )}/inspections/${encodeURIComponent(view.plan.id)}`;
  } catch (error) {
    return { error: safeDiagnosticMessage(error) };
  }
  revalidatePath('/diagnostics');
  redirect(destination);
}

export async function answerInspectionItemAction(
  _previousState: DiagnosticActionState | null,
  formData: FormData
): Promise<DiagnosticActionState> {
  const userId = await requireUserId();
  await requireCompletedJourney(userId);
  const parsed = answerInspectionItemSchema.safeParse({
    sessionId: formData.get('sessionId'),
    planId: formData.get('planId'),
    itemId: formData.get('itemId'),
    answerCode: formData.get('answerCode'),
    note: formData.get('note'),
  });
  if (!parsed.success) return { error: 'Hasil atau catatan pemeriksaan tidak valid.' };

  try {
    await answerInspectionItem(userId, {
      ...parsed.data,
      note: parsed.data.note || null,
    });
  } catch (error) {
    return { error: safeDiagnosticMessage(error) };
  }
  const path = `/diagnostics/${encodeURIComponent(
    parsed.data.sessionId
  )}/inspections/${encodeURIComponent(parsed.data.planId)}`;
  revalidatePath(path);
  redirect(path);
}

export async function completeInspectionAction(
  _previousState: DiagnosticActionState | null,
  formData: FormData
): Promise<DiagnosticActionState> {
  const userId = await requireUserId();
  await requireCompletedJourney(userId);
  const parsed = completeInspectionSchema.safeParse({
    sessionId: formData.get('sessionId'),
    planId: formData.get('planId'),
  });
  if (!parsed.success) return { error: 'Rencana pemeriksaan tidak valid.' };

  try {
    await completeInspection(userId, parsed.data);
  } catch (error) {
    return { error: safeDiagnosticMessage(error) };
  }
  const path = `/diagnostics/${encodeURIComponent(
    parsed.data.sessionId
  )}/inspections/${encodeURIComponent(parsed.data.planId)}`;
  revalidatePath(path);
  revalidatePath(`/diagnostics/${encodeURIComponent(parsed.data.sessionId)}/results`);
  redirect(path);
}

export async function createActionPlanAction(
  _previousState: DiagnosticActionState | null,
  formData: FormData
): Promise<DiagnosticActionState> {
  const userId = await requireUserId();
  await requireCompletedJourney(userId);
  const parsed = createActionPlanSchema.safeParse(strictFormData(formData));
  if (!parsed.success) return { error: 'Pilihan tindakan, tanggal, atau catatan tidak valid.' };

  let actionPlanId: string;
  try {
    const plan = await createActionPlan(userId, {
      sessionId: parsed.data.sessionId,
      inspectionPlanId: parsed.data.inspectionPlanId,
      selectedActionCode: parsed.data.selectedActionCode,
      plannedStartDate: parsed.data.plannedStartDate,
      userNote: parsed.data.userNote?.trim() || null,
    });
    actionPlanId = plan.id;
  } catch (error) {
    return { error: safeDiagnosticMessage(error) };
  }
  const detailPath = `/diagnostics/${encodeURIComponent(
    parsed.data.sessionId
  )}/actions/${encodeURIComponent(actionPlanId)}`;
  revalidatePath(detailPath);
  revalidatePath(
    `/diagnostics/${encodeURIComponent(parsed.data.sessionId)}/inspections/${encodeURIComponent(parsed.data.inspectionPlanId)}`
  );
  redirect(detailPath);
}

async function transitionAction(
  formData: FormData,
  transition: typeof startActionPlan
): Promise<DiagnosticActionState> {
  const userId = await requireUserId();
  await requireCompletedJourney(userId);
  const parsed = transitionActionPlanSchema.safeParse(strictFormData(formData));
  if (!parsed.success) return { error: 'Rencana Hemat tidak valid.' };
  try {
    await transition(userId, parsed.data);
  } catch (error) {
    return { error: safeDiagnosticMessage(error) };
  }
  const detailPath = `/diagnostics/${encodeURIComponent(
    parsed.data.sessionId
  )}/actions/${encodeURIComponent(parsed.data.actionPlanId)}`;
  revalidatePath(detailPath);
  redirect(detailPath);
}

export async function startActionPlanAction(
  _previousState: DiagnosticActionState | null,
  formData: FormData
) {
  return transitionAction(formData, startActionPlan);
}

export async function completeActionPlanAction(
  _previousState: DiagnosticActionState | null,
  formData: FormData
) {
  return transitionAction(formData, completeActionPlan);
}

export async function cancelActionPlanAction(
  _previousState: DiagnosticActionState | null,
  formData: FormData
) {
  return transitionAction(formData, cancelActionPlan);
}

export async function evaluateActionOutcomeAction(
  _previousState: DiagnosticActionState | null,
  formData: FormData
): Promise<DiagnosticActionState> {
  const userId = await requireUserId();
  await requireCompletedJourney(userId);
  const parsed = evaluateActionOutcomeSchema.safeParse(strictFormData(formData));
  if (!parsed.success) return { error: 'Rencana Hemat tidak valid.' };
  let outcome;
  try {
    outcome = await evaluateActionOutcome(userId, parsed.data.actionPlanId);
  } catch (error) {
    return { error: safeDiagnosticMessage(error) };
  }
  const path = `/diagnostics/${encodeURIComponent(
    outcome.diagnosticSessionId
  )}/actions/${encodeURIComponent(outcome.actionPlanId)}/outcome`;
  revalidatePath(path);
  revalidatePath(
    `/diagnostics/${encodeURIComponent(outcome.diagnosticSessionId)}/actions/${encodeURIComponent(outcome.actionPlanId)}`
  );
  redirect(path);
}

export async function closeDiagnosticSessionAction(
  _previousState: DiagnosticActionState | null,
  formData: FormData
): Promise<DiagnosticActionState> {
  const userId = await requireUserId();
  await requireCompletedJourney(userId);
  const parsed = closeDiagnosticSessionSchema.safeParse(strictFormData(formData));
  if (!parsed.success) return { error: 'Sesi Cek Kenaikan tidak valid.' };
  try {
    await closeDiagnosticSession(userId, parsed.data.sessionId);
  } catch (error) {
    return { error: safeDiagnosticMessage(error) };
  }
  const path = `/diagnostics/${encodeURIComponent(parsed.data.sessionId)}/results`;
  revalidatePath(path);
  revalidatePath(`/diagnostics/${encodeURIComponent(parsed.data.sessionId)}`);
  redirect(path);
}
