import { eq, and, count } from 'drizzle-orm';
import { getDb } from '@/server/db/client';
import { userPlan, business } from '@/server/db/schema/journey';

export type EffectivePlan = 'FREE' | 'TRIAL' | 'PRO';

export interface PlanEntitlements {
  maxBusinesses: number;
  monthlyReportHistoryMonths: number;
  coreDiagnosticJourneyAllowed: boolean;
}

export const ENTITLEMENT_POLICY_V1: Record<EffectivePlan, PlanEntitlements> = {
  FREE: {
    maxBusinesses: 1,
    monthlyReportHistoryMonths: 3, // Current month + 2 preceding months
    coreDiagnosticJourneyAllowed: true,
  },
  TRIAL: {
    maxBusinesses: 3,
    monthlyReportHistoryMonths: 24,
    coreDiagnosticJourneyAllowed: true,
  },
  PRO: {
    maxBusinesses: 10,
    monthlyReportHistoryMonths: 24,
    coreDiagnosticJourneyAllowed: true,
  },
};

export class BusinessLimitExceededError extends Error {
  readonly code = 'BUSINESS_LIMIT_EXCEEDED';
  readonly status = 403;

  constructor(public readonly plan: EffectivePlan, public readonly limit: number) {
    super(`Business limit reached (${limit}) for plan ${plan}. Please upgrade your plan to add more businesses.`);
    this.name = 'BusinessLimitExceededError';
  }
}

export async function getUserPlanRow(userId: string) {
  if (!userId) return null;
  const db = getDb();
  const rows = await db.select().from(userPlan).where(eq(userPlan.userId, userId)).limit(1);
  return rows[0] ?? null;
}

export function resolveEffectivePlanFromRow(
  planRow: typeof userPlan.$inferSelect | null,
  now: Date = new Date()
): { effectivePlan: EffectivePlan; isTrialExpired: boolean; trialEndsAt: Date | null } {
  if (!planRow) {
    return { effectivePlan: 'FREE', isTrialExpired: false, trialEndsAt: null };
  }

  if (planRow.plan === 'PRO_TRIAL') {
    const trialEndsAt = planRow.trialEndsAt;
    const isExpired = trialEndsAt ? now.getTime() > trialEndsAt.getTime() : false;
    if (isExpired) {
      return { effectivePlan: 'FREE', isTrialExpired: true, trialEndsAt };
    }
    return { effectivePlan: 'TRIAL', isTrialExpired: false, trialEndsAt };
  }

  if (planRow.plan === 'PRO') {
    return { effectivePlan: 'PRO', isTrialExpired: false, trialEndsAt: null };
  }

  return { effectivePlan: 'FREE', isTrialExpired: false, trialEndsAt: null };
}

export async function resolveEffectivePlan(userId: string, now: Date = new Date()) {
  const row = await getUserPlanRow(userId);
  return resolveEffectivePlanFromRow(row, now);
}

export async function getUserActiveBusinessCount(userId: string): Promise<number> {
  if (!userId) return 0;
  const db = getDb();
  const [result] = await db
    .select({ count: count() })
    .from(business)
    .where(and(eq(business.userId, userId), eq(business.isActive, true)));

  return Number(result?.count ?? 0);
}

export async function getUserEntitlements(userId: string, now: Date = new Date()) {
  const { effectivePlan, isTrialExpired, trialEndsAt } = await resolveEffectivePlan(userId, now);
  const activeBusinessCount = await getUserActiveBusinessCount(userId);
  const policy = ENTITLEMENT_POLICY_V1[effectivePlan];

  return {
    plan: effectivePlan,
    isTrialExpired,
    trialEndsAt,
    limits: {
      maxBusinesses: policy.maxBusinesses,
      monthlyReportHistoryMonths: policy.monthlyReportHistoryMonths,
      coreDiagnosticJourneyAllowed: policy.coreDiagnosticJourneyAllowed,
    },
    usage: {
      businessCount: activeBusinessCount,
    },
    canCreateBusiness: activeBusinessCount < policy.maxBusinesses,
  };
}
