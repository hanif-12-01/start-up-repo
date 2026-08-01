import { env } from '@/config/env';
import {
  findSessionClosureContextForUser,
  persistSessionClosure,
  withLockedSessionClosure,
  type SessionClosureContext,
} from '@/server/repositories/outcome.repository';

export interface SessionClosureEligibility {
  eligible: boolean;
  reason: string | null;
}

export class SessionClosureNotFoundError extends Error {
  constructor() {
    super('Sesi Cek Kenaikan tidak ditemukan.');
    this.name = 'SessionClosureNotFoundError';
  }
}

export class SessionClosureNotEligibleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SessionClosureNotEligibleError';
  }
}

function requireFeature() {
  if (!env.OUTCOME_TRACKING_ENABLED) {
    throw new SessionClosureNotEligibleError('Evaluasi Hasil belum tersedia.');
  }
}

export function resolveSessionClosureEligibility(
  context: SessionClosureContext
): SessionClosureEligibility {
  if (context.status === 'CLOSED') return { eligible: true, reason: null };
  if (context.status !== 'INSPECTION_IN_PROGRESS') {
    return { eligible: false, reason: 'Sesi belum berada pada tahap yang dapat ditutup.' };
  }
  if (context.plans.some((plan) => plan.status === 'PLANNED')) {
    return { eligible: false, reason: 'Masih ada Rencana Hemat yang belum dimulai.' };
  }
  if (context.plans.some((plan) => plan.status === 'IN_PROGRESS')) {
    return { eligible: false, reason: 'Masih ada Rencana Hemat yang sedang berjalan.' };
  }
  if (context.plans.some((plan) => plan.status === 'COMPLETED' && !plan.hasOutcome)) {
    return {
      eligible: false,
      reason: 'Setiap Rencana Hemat yang selesai harus memiliki Evaluasi Hasil.',
    };
  }
  if (!context.plans.some((plan) => plan.hasOutcome)) {
    return {
      eligible: false,
      reason: 'Minimal satu Evaluasi Hasil diperlukan sebelum sesi ditutup.',
    };
  }
  return { eligible: true, reason: null };
}

export async function getSessionClosureState(userId: string, sessionId: string) {
  requireFeature();
  const context = await findSessionClosureContextForUser(userId, sessionId);
  return context
    ? { context, eligibility: resolveSessionClosureEligibility(context) }
    : null;
}

export async function closeDiagnosticSession(userId: string, sessionId: string) {
  requireFeature();
  const result = await withLockedSessionClosure(userId, sessionId, async (client, context) => {
    if (context.status === 'CLOSED') {
      if (!context.closedAt) throw new Error('Closed diagnostic session has no timestamp');
      return { status: 'CLOSED' as const, closedAt: context.closedAt };
    }
    const eligibility = resolveSessionClosureEligibility(context);
    if (!eligibility.eligible) {
      throw new SessionClosureNotEligibleError(
        eligibility.reason ?? 'Sesi belum dapat ditutup.'
      );
    }
    return persistSessionClosure(client, sessionId);
  });
  if (!result) throw new SessionClosureNotFoundError();
  return result;
}
