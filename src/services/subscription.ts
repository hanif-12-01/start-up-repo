import { db } from "@/lib/db";
import { cache } from "react";
import { canAccessFeature, isTrialActive as checkTrialActive } from "@/lib/plan-entitlements";

export interface PlanFeature {
  key: string;
  name: string;
}

// Helper to get user's active plan/subscription
export const getUserPlan = cache(async (userId: string) => {
  // Find active subscription
  let subscription = await db.subscription.findFirst({
    where: {
      userId,
      status: { in: ["ACTIVE", "TRIAL_ACTIVE"] },
    },
    include: {
      plan: true,
    },
  });

  // Check if active subscription has expired
  if (subscription && subscription.endsAt && subscription.endsAt < new Date()) {
    // Update subscription to EXPIRED
    await db.subscription.update({
      where: { id: subscription.id },
      data: { status: "EXPIRED" },
    });

    subscription = null;
  }

  // If no active subscription, look for any subscription at all for this user
  if (!subscription) {
    const anySub = await db.subscription.findFirst({
      where: { userId },
    });

    if (!anySub) {
      // First time user: Auto-create a FREE plan
      const freePlan = await db.plan.findUnique({
        where: { code: "FREE" },
      });

      if (freePlan) {
        subscription = await db.subscription.create({
          data: {
            userId,
            planId: freePlan.id,
            status: "ACTIVE",
            startsAt: new Date(),
            endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          },
          include: {
            plan: true,
          },
        });
      }
    }

    // If still no subscription (e.g. not a new user, but previous paid/trial expired), auto-create FREE plan
    if (!subscription) {
      const freePlan = await db.plan.findUnique({
        where: { code: "FREE" },
      });

      if (freePlan) {
        subscription = await db.subscription.create({
          data: {
            userId,
            planId: freePlan.id,
            status: "ACTIVE",
            startsAt: new Date(),
            endsAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          },
          include: {
            plan: true,
          },
        });
      }
    }
  }

  return {
    subscription,
    plan: subscription?.plan || null,
  };
});


// Check if user has access to a specific feature key or plan limit
export async function hasFeature(userId: string, featureKey: string): Promise<boolean> {
  const { subscription, plan } = await getUserPlan(userId);
  if (!plan) return false;
  const trialActive = subscription ? checkTrialActive(subscription) : false;
  return canAccessFeature(featureKey, plan.code, trialActive);
}

// Throws error if feature is missing
export async function requireFeature(userId: string, featureKey: string): Promise<void> {
  const allowed = await hasFeature(userId, featureKey);
  if (!allowed) {
    throw new Error(`Fitur ini memerlukan paket yang lebih tinggi.`);
  }
}
