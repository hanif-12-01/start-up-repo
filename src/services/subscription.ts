import { db } from "@/lib/db";
import { cache } from "react";

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
      status: "ACTIVE",
    },
    include: {
      plan: true,
    },
  });

  // If no active subscription, look for any subscription, or default to FREE
  if (!subscription) {
    const freePlan = await db.plan.findUnique({
      where: { code: "FREE" },
    });

    if (freePlan) {
      // Auto-create FREE subscription for the user to keep database consistent
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

  return {
    subscription,
    plan: subscription?.plan || null,
  };
});


// Check if user has access to a specific feature key or plan limit
export async function hasFeature(userId: string, featureKey: string): Promise<boolean> {
  const { plan } = await getUserPlan(userId);
  if (!plan) return false;

  // FREE plan features
  const freeFeatures = ["1-usaha", "dashboard-dasar", "input-manual", "rekomendasi-dasar"];
  
  // PRO plan features
  const proFeatures = [
    ...freeFeatures,
    "multi-usaha",
    "prediksi-tagihan",
    "appliance-classifier",
    "rekomendasi-lanjutan",
    "laporan-pdf"
  ];

  // BUSINESS plan features
  const businessFeatures = [
    ...proFeatures,
    "multi-cabang",
    "export-csv",
    "laporan-bulanan",
    "prioritas-support",
    "fitur-pilot"
  ];

  let allowedFeatures: string[] = [];
  if (plan.code === "FREE") {
    allowedFeatures = freeFeatures;
  } else if (plan.code === "PRO_UMKM") {
    allowedFeatures = proFeatures;
  } else if (plan.code === "BUSINESS") {
    allowedFeatures = businessFeatures;
  }

  return allowedFeatures.includes(featureKey);
}

// Throws error if feature is missing
export async function requireFeature(userId: string, featureKey: string): Promise<void> {
  const allowed = await hasFeature(userId, featureKey);
  if (!allowed) {
    throw new Error(`Fitur ini memerlukan paket yang lebih tinggi.`);
  }
}
