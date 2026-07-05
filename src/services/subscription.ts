import { db } from "@/lib/db";
import { cache } from "react";

export interface PlanFeature {
  key: string;
  name: string;
}

// Helper to get user's active plan/subscription
export const getUserPlan = cache(async (userId: string) => {
  // 1. Find active subscription
  let subscription = await db.subscription.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },
    include: {
      plan: true,
    },
  });

  const now = new Date();

  // 2. Check if the active subscription has expired
  if (subscription && subscription.endsAt && subscription.endsAt < now) {
    // Graceful downgrade to FREE
    const freePlan = await db.plan.findUnique({
      where: { code: "FREE" },
    });

    if (freePlan) {
      await db.$transaction(async (tx) => {
        // Mark old one as EXPIRED
        await tx.subscription.update({
          where: { id: subscription!.id },
          data: { status: "EXPIRED" },
        });

        // Create new active FREE subscription
        subscription = await tx.subscription.create({
          data: {
            userId,
            planId: freePlan.id,
            status: "ACTIVE",
            startsAt: now,
            endsAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000), // 1 year fallback
          },
          include: {
            plan: true,
          },
        });
      });
    }
  }

  // 3. If no subscription exists at all for this user, auto-initialize with a 30-day Pro Trial
  if (!subscription) {
    // Check if there is any subscription (active or expired)
    const anySub = await db.subscription.findFirst({
      where: { userId },
    });

    if (!anySub) {
      // Truly a new user! Create a 30-day Pro Trial (using PRO_UMKM plan)
      const proPlan = await db.plan.findUnique({
        where: { code: "PRO_UMKM" },
      });

      if (proPlan) {
        subscription = await db.subscription.create({
          data: {
            userId,
            planId: proPlan.id,
            status: "ACTIVE",
            startsAt: now,
            endsAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000), // 30 days Pro Trial
          },
          include: {
            plan: true,
          },
        });
      }
    }

    // If still no subscription (e.g. they had an expired subscription but it was manually deleted/not captured above), fallback to FREE
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
            startsAt: now,
            endsAt: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
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
  const { plan } = await getUserPlan(userId);
  if (!plan) return false;

  // FREE plan features
  const freeFeatures = [
    "1-usaha",
    "dashboard-dasar",
    "input-manual",
    "input-pendapatan",
    "prediksi-kwh-dasar",
    "estimasi-tagihan-dasar",
    "rasio-listrik-pendapatan",
    "rekomendasi-dasar",
    "histori-3-bulan",
  ];
  
  // PRO plan features (includes all Free + advanced)
  const proFeatures = [
    ...freeFeatures,
    "multi-usaha",
    "semua-analitik",
    "anomaly-detection",
    "rekomendasi-lanjutan",
    "laporan-pdf",
    "histori-12-bulan",
    "potensi-penghematan",
    "reminder-input",
    "simulasi-iot",
    "prediksi-tagihan",
    "appliance-classifier",
    "export-csv",
  ];
  
  // BUSINESS plan features (includes all Pro + multi-cabang)
  const businessFeatures = [
    ...proFeatures,
    "multi-cabang",
    "dashboard-agregat",
    "laporan-per-lokasi",
    "multi-user-admin",
    "export-massal",
    "prioritas-support",
    "komparasi-lokasi",
    "laporan-bulanan",
    "fitur-pilot",
  ];

  // ENTERPRISE plan features (includes all Business + custom)
  const enterpriseFeatures = [
    ...businessFeatures,
    "onboarding-khusus",
    "integrasi-iot-lanjutan",
    "support-khusus",
    "unlimited-bisnis",
  ];

  let allowedFeatures: string[] = [];
  if (plan.code === "FREE") {
    allowedFeatures = freeFeatures;
  } else if (plan.code === "PRO_UMKM") {
    allowedFeatures = proFeatures;
  } else if (plan.code === "BUSINESS") {
    allowedFeatures = businessFeatures;
  } else if (plan.code === "ENTERPRISE") {
    allowedFeatures = enterpriseFeatures;
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
