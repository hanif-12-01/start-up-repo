import { env } from '@/config/env';
import {
  findNextEligibleBill,
  findNextEligibleBillForUser,
  findOutcomeForUser,
  insertOutcomeEvaluation,
  loadOutcomeByAction,
  type OutcomeEvaluationRecord,
} from '@/server/repositories/outcome.repository';
import {
  withLockedActionPlanById,
  type ActionPlanRecord,
} from '@/server/repositories/action-plan.repository';
import { findActionDefinition } from '@/server/services/action-plan-catalog';
import { getActionPlan } from '@/server/services/action-plan.service';
import {
  buildOutcomeEvaluation,
  dateOnlyInTimeZone,
  DEFAULT_EVALUATION_TIMEZONE,
  OUTCOME_EVALUATION_RULE_VERSION,
  parseAcceptedBaseline,
  SIMILARITY_BAND_BPS,
  type OutcomeBillInput,
} from '@/server/services/outcome-evaluation';

export class OutcomeTrackingUnavailableError extends Error {
  constructor() {
    super('Evaluasi Hasil belum tersedia.');
    this.name = 'OutcomeTrackingUnavailableError';
  }
}

export class OutcomeActionNotFoundError extends Error {
  constructor() {
    super('Rencana Hemat tidak ditemukan.');
    this.name = 'OutcomeActionNotFoundError';
  }
}

export class OutcomeNotEligibleError extends Error {
  constructor(message = 'Rencana Hemat ini belum dapat dievaluasi.') {
    super(message);
    this.name = 'OutcomeNotEligibleError';
  }
}

export class OutcomeWaitingForBillError extends Error {
  constructor() {
    super('Belum ada tagihan evaluasi yang memenuhi syarat.');
    this.name = 'OutcomeWaitingForBillError';
  }
}

export type OutcomeEvaluationState =
  | {
      kind: 'NOT_COMPLETED';
      plan: ActionPlanRecord;
      outcome: null;
      eligibleAfterDate: null;
      followUpBill: null;
    }
  | {
      kind: 'WAITING_FOR_BILL';
      plan: ActionPlanRecord;
      outcome: null;
      eligibleAfterDate: string;
      followUpBill: null;
    }
  | {
      kind: 'READY';
      plan: ActionPlanRecord;
      outcome: null;
      eligibleAfterDate: string;
      followUpBill: OutcomeBillInput;
    }
  | {
      kind: 'EVALUATED';
      plan: ActionPlanRecord;
      outcome: OutcomeEvaluationRecord;
      eligibleAfterDate: string;
      followUpBill: null;
    };

function requireFeature() {
  if (!env.OUTCOME_TRACKING_ENABLED || !env.ACTION_PLANS_ENABLED) {
    throw new OutcomeTrackingUnavailableError();
  }
}

function eligibleAfterDate(plan: ActionPlanRecord): string {
  if (!plan.completedAt) throw new OutcomeNotEligibleError();
  return dateOnlyInTimeZone(plan.completedAt, DEFAULT_EVALUATION_TIMEZONE);
}

function assertKnownCompletedPlan(plan: ActionPlanRecord) {
  if (plan.status !== 'COMPLETED' || plan.reviewMode !== 'NEXT_ELIGIBLE_BILL') {
    throw new OutcomeNotEligibleError();
  }
  const definition = findActionDefinition(plan.actionCode);
  if (
    !definition ||
    definition.actionVersion !== plan.actionVersion ||
    definition.ruleVersion !== plan.ruleVersion
  ) {
    throw new OutcomeNotEligibleError(
      'Versi Rencana Hemat ini belum memiliki aturan evaluasi yang dikenal.'
    );
  }
  let baseline;
  try {
    baseline = parseAcceptedBaseline(plan.baseline);
  } catch {
    throw new OutcomeNotEligibleError('Snapshot baseline Rencana Hemat tidak valid.');
  }
  if (!definition.candidateCodes.includes(baseline.candidateCode)) {
    throw new OutcomeNotEligibleError('Snapshot baseline tidak sesuai dengan Rencana Hemat.');
  }
  return baseline;
}

export async function getOutcomeEvaluationState(
  userId: string,
  sessionId: string,
  actionPlanId: string
): Promise<OutcomeEvaluationState | null> {
  requireFeature();
  const plan = await getActionPlan(userId, sessionId, actionPlanId);
  if (!plan) return null;
  const existing = await findOutcomeForUser(userId, sessionId, actionPlanId);
  if (existing) {
    return {
      kind: 'EVALUATED',
      plan,
      outcome: existing,
      eligibleAfterDate: existing.evaluationEligibleAfterDate,
      followUpBill: null,
    };
  }
  if (plan.status !== 'COMPLETED') {
    return {
      kind: 'NOT_COMPLETED',
      plan,
      outcome: null,
      eligibleAfterDate: null,
      followUpBill: null,
    };
  }
  if (plan.diagnosticSessionStatus !== 'INSPECTION_IN_PROGRESS') {
    throw new OutcomeNotEligibleError('Sesi yang sudah ditutup tidak dapat membuat evaluasi baru.');
  }
  const baseline = assertKnownCompletedPlan(plan);
  const date = eligibleAfterDate(plan);
  const followUpBill = await findNextEligibleBillForUser({
    userId,
    businessId: plan.businessId,
    baselineBillId: baseline.sourceBillId,
    comparisonBillId: baseline.comparisonBillId,
    eligibleAfterDate: date,
  });
  return followUpBill
    ? { kind: 'READY', plan, outcome: null, eligibleAfterDate: date, followUpBill }
    : {
        kind: 'WAITING_FOR_BILL',
        plan,
        outcome: null,
        eligibleAfterDate: date,
        followUpBill: null,
      };
}

export async function evaluateActionOutcome(
  userId: string,
  actionPlanId: string
): Promise<OutcomeEvaluationRecord> {
  requireFeature();
  const outcome = await withLockedActionPlanById(userId, actionPlanId, async (client, plan) => {
    const existing = await loadOutcomeByAction(client, actionPlanId);
    if (existing) return existing;
    if (plan.diagnosticSessionStatus !== 'INSPECTION_IN_PROGRESS') {
      throw new OutcomeNotEligibleError('Sesi yang sudah ditutup tidak dapat membuat evaluasi baru.');
    }
    const baseline = assertKnownCompletedPlan(plan);
    const date = eligibleAfterDate(plan);
    const followUpBill = await findNextEligibleBill(client, {
      businessId: plan.businessId,
      baselineBillId: baseline.sourceBillId,
      comparisonBillId: baseline.comparisonBillId,
      eligibleAfterDate: date,
    });
    if (!followUpBill) throw new OutcomeWaitingForBillError();
    const timestamp = await client.query<{ evaluated_at: Date }>('SELECT now() AS evaluated_at');
    const evaluatedAt = timestamp.rows[0].evaluated_at;
    const evaluation = buildOutcomeEvaluation({
      baselineSnapshot: baseline,
      followUpBill,
      capturedAt: evaluatedAt,
    });
    return insertOutcomeEvaluation(client, {
      id: crypto.randomUUID(),
      businessId: plan.businessId,
      diagnosticSessionId: plan.diagnosticSessionId,
      actionPlanId: plan.id,
      baselineBillId: baseline.sourceBillId,
      followUpBillId: followUpBill.id,
      ruleVersion: OUTCOME_EVALUATION_RULE_VERSION,
      similarityBandBps: SIMILARITY_BAND_BPS,
      eligibleAfterDate: date,
      evaluation,
      evaluatedAt,
    });
  });
  if (!outcome) throw new OutcomeActionNotFoundError();
  return outcome;
}
