import { eq, sql } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { userPlan, business } from '@/server/db/schema/journey';

export type JourneyStep = 'PLAN' | 'ONBOARDING' | 'BUSINESS' | 'COMPLETE';
export type JourneyStatus = 'PLAN_REQUIRED' | 'ONBOARDING_REQUIRED' | 'BUSINESS_REQUIRED' | 'COMPLETE';
type JourneyRow = Pick<typeof userPlan.$inferSelect, 'id' | 'userId' | 'plan' | 'trialStartsAt' | 'trialEndsAt' | 'idempotencyKey' | 'onboardingCompletedAt' | 'createdAt' | 'updatedAt'>;

export const JOURNEY_ROUTES: Record<JourneyStep, string> = {
  PLAN: '/plan',
  ONBOARDING: '/onboarding',
  BUSINESS: '/businesses/new',
  COMPLETE: '/dashboard',
};

export const TRIAL_DURATION_DAYS = 30;
export const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * 24 * 60 * 60 * 1000;

export class PlanTransitionForbiddenError extends Error {
  constructor(message = 'Plan switching or conversion is forbidden in IT-DIAG-01A') {
    super(message);
    this.name = 'PlanTransitionForbiddenError';
  }
}

export async function resolveJourneyState(userId: string): Promise<{
  step: JourneyStep;
  status: JourneyStatus;
  journey: JourneyRow | null;
}> {
  if (!userId) {
    return { step: 'PLAN', status: 'PLAN_REQUIRED', journey: null };
  }

  const db = getDb();
  const plan = await db.select({ id: userPlan.id, userId: userPlan.userId, plan: userPlan.plan, trialStartsAt: userPlan.trialStartsAt, trialEndsAt: userPlan.trialEndsAt, idempotencyKey: userPlan.idempotencyKey, onboardingCompletedAt: userPlan.onboardingCompletedAt, createdAt: userPlan.createdAt, updatedAt: userPlan.updatedAt }).from(userPlan).where(eq(userPlan.userId, userId)).limit(1);

  if (!plan.length) {
    return { step: 'PLAN', status: 'PLAN_REQUIRED', journey: null };
  }

  const row = plan[0];
  if (!row.onboardingCompletedAt) {
    return { step: 'ONBOARDING', status: 'ONBOARDING_REQUIRED', journey: row };
  }

  const biz = await db.select({ id: business.id }).from(business).where(eq(business.userId, userId)).limit(1);
  if (!biz.length) {
    return { step: 'BUSINESS', status: 'BUSINESS_REQUIRED', journey: row };
  }

  return { step: 'COMPLETE', status: 'COMPLETE', journey: row };
}

export async function resolveJourneyStep(userId: string): Promise<JourneyStep> {
  const state = await resolveJourneyState(userId);
  return state.step;
}

export function getJourneyRedirect(step: JourneyStep): string {
  return JOURNEY_ROUTES[step];
}

export async function selectPlan(
  userId: string,
  planType: 'FREE' | 'PRO_TRIAL',
  idempotencyKey?: string
): Promise<{ plan: string; trialEndsAt: Date | null; alreadyExists: boolean }> {
  if (!userId) {
    throw new Error('User ID is required');
  }

  const db = getDb();

  const existing = await db.select({ id: userPlan.id, userId: userPlan.userId, plan: userPlan.plan, trialStartsAt: userPlan.trialStartsAt, trialEndsAt: userPlan.trialEndsAt, idempotencyKey: userPlan.idempotencyKey, onboardingCompletedAt: userPlan.onboardingCompletedAt, createdAt: userPlan.createdAt, updatedAt: userPlan.updatedAt }).from(userPlan).where(eq(userPlan.userId, userId)).limit(1);
  if (existing.length) {
    const current = existing[0];
    if (current.plan === planType) {
      return {
        plan: current.plan,
        trialEndsAt: current.trialEndsAt,
        alreadyExists: true,
      };
    }
    throw new PlanTransitionForbiddenError(`Cannot change plan from ${current.plan} to ${planType}`);
  }

  const now = new Date();
  const trialStartsAt = planType === 'PRO_TRIAL' ? now : null;
  const trialEndsAt = planType === 'PRO_TRIAL' ? new Date(now.getTime() + TRIAL_DURATION_MS) : null;

  await db.execute(sql`
    INSERT INTO "user_plan" ("id", "user_id", "plan", "trial_starts_at", "trial_ends_at", "idempotency_key")
    VALUES (${crypto.randomUUID()}, ${userId}, ${planType}, ${trialStartsAt}, ${trialEndsAt}, ${idempotencyKey || `plan_${userId}_${Date.now()}`})
  `);

  return { plan: planType, trialEndsAt, alreadyExists: false };
}

export async function completeOnboarding(userId: string): Promise<boolean> {
  if (!userId) return false;

  const db = getDb();

  const existing = await db.select().from(userPlan).where(eq(userPlan.userId, userId)).limit(1);
  if (!existing.length) return false;
  if (existing[0].onboardingCompletedAt) return true;

  await db
    .update(userPlan)
    .set({ onboardingCompletedAt: new Date(), updatedAt: new Date() })
    .where(eq(userPlan.userId, userId));

  return true;
}

export async function getUserPlan(userId: string) {
  if (!userId) return null;
  const db = getDb();
  const rows = await db.select({ id: userPlan.id, userId: userPlan.userId, plan: userPlan.plan, trialStartsAt: userPlan.trialStartsAt, trialEndsAt: userPlan.trialEndsAt, idempotencyKey: userPlan.idempotencyKey, onboardingCompletedAt: userPlan.onboardingCompletedAt, createdAt: userPlan.createdAt, updatedAt: userPlan.updatedAt }).from(userPlan).where(eq(userPlan.userId, userId)).limit(1);
  return rows[0] ?? null;
}
