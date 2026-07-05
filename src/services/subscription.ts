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
      // First time user: Auto-create a 30-day PRO_UMKM Trial
      const proPlan = await db.plan.findUnique({
        where: { code: "PRO_UMKM" },
      });

      if (proPlan) {
        subscription = await db.subscription.create({
          data: {
            userId,
            planId: proPlan.id,
            status: "ACTIVE",
            startsAt: new Date(),
            endsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            trialStartDate: new Date(),
            trialEndDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
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
