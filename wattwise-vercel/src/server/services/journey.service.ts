import { eq } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { userPlan, business } from '@/server/db/schema/journey';

export type JourneyStep = 'PLAN' | 'ONBOARDING' | 'BUSINESS' | 'COMPLETE';

export const JOURNEY_ROUTES: Record<JourneyStep, string> = {
  PLAN: '/plan',
  ONBOARDING: '/onboarding',
  BUSINESS: '/businesses/new',
  COMPLETE: '/setup',
};

export async function resolveJourneyStep(userId: string): Promise<JourneyStep> {
  if (!userId) return 'PLAN';

  const db = getDb();

  const plan = await db.select().from(userPlan).where(eq(userPlan.userId, userId)).limit(1);
  if (!plan.length) return 'PLAN';

  const row = plan[0];
  if (!row.onboardingCompletedAt) return 'ONBOARDING';

  const biz = await db.select({ id: business.id }).from(business).where(eq(business.userId, userId)).limit(1);
  if (!biz.length) return 'BUSINESS';

  return 'COMPLETE';
}

export function getJourneyRedirect(step: JourneyStep): string {
  return JOURNEY_ROUTES[step];
}

const TRIAL_DURATION_DAYS = 30;

export async function selectPlan(
  userId: string,
  planType: 'FREE' | 'PRO_TRIAL',
  idempotencyKey?: string
): Promise<{ plan: string; trialEndsAt: Date | null; alreadyExists: boolean }> {
  const db = getDb();

  const existing = await db.select().from(userPlan).where(eq(userPlan.userId, userId)).limit(1);
  if (existing.length) {
    return {
      plan: existing[0].plan,
      trialEndsAt: existing[0].trialEndsAt,
      alreadyExists: true,
    };
  }

  const now = new Date();
  const trialStartsAt = planType === 'PRO_TRIAL' ? now : null;
  const trialEndsAt = planType === 'PRO_TRIAL' ? new Date(now.getTime() + TRIAL_DURATION_DAYS * 86400000) : null;

  await db.insert(userPlan).values({
    userId,
    plan: planType,
    trialStartsAt,
    trialEndsAt,
    idempotencyKey: idempotencyKey || `plan_${userId}_${Date.now()}`,
  });

  return { plan: planType, trialEndsAt, alreadyExists: false };
}

export async function completeOnboarding(userId: string): Promise<boolean> {
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
  const db = getDb();
  const rows = await db.select().from(userPlan).where(eq(userPlan.userId, userId)).limit(1);
  return rows[0] ?? null;
}
