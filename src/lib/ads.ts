import { db } from "./db";

export type EffectivePlan = "FREE" | "PRO" | "BUSINESS" | "ENTERPRISE";

/**
 * Resolves the user's effective plan.
 * - During active trial (status = TRIAL_ACTIVE) -> PRO
 * - Active paid plans -> PRO, BUSINESS, ENTERPRISE
 * - Expired, cancelled, or default plan -> FREE
 */
export async function getEffectivePlan(userId: string): Promise<EffectivePlan> {
  if (!userId) return "FREE";

  const subscription = await db.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: { plan: true },
  });

  if (!subscription) {
    return "FREE";
  }

  const status = subscription.status;
  const planCode = subscription.plan?.code;
  const trialEndDate = subscription.trialEndDate;
  const endsAt = subscription.endsAt;

  // 1. FREE plan or FREE status
  if (status === "FREE" || planCode === "FREE") {
    return "FREE";
  }

  // 2. TRIAL_ACTIVE or PRO_TRIAL
  if (status === "TRIAL_ACTIVE" || planCode === "PRO_TRIAL") {
    const isTrialStillActive = trialEndDate
      ? new Date(trialEndDate) > new Date()
      : false;
    return isTrialStillActive ? "PRO" : "FREE";
  }

  // 3. TRIAL_EXPIRED / CANCELLED / EXPIRED
  if (
    status === "TRIAL_EXPIRED" ||
    status === "CANCELLED" ||
    status === "EXPIRED"
  ) {
    return "FREE";
  }

  // 4. Check endsAt expiry
  if (endsAt && new Date(endsAt) < new Date()) {
    return "FREE";
  }

  // 5. PRO_ACTIVE or PRO_UMKM
  if (
    status === "PRO_ACTIVE" ||
    planCode === "PRO_UMKM" ||
    planCode === "PRO" ||
    planCode === "PRO_ACTIVE"
  ) {
    return "PRO";
  }

  // 6. BUSINESS_ACTIVE or BUSINESS
  if (
    status === "BUSINESS_ACTIVE" ||
    planCode === "BUSINESS" ||
    planCode === "BUSINESS_ACTIVE"
  ) {
    return "BUSINESS";
  }

  // 7. ENTERPRISE_ACTIVE or ENTERPRISE
  if (
    status === "ENTERPRISE_ACTIVE" ||
    planCode === "ENTERPRISE" ||
    planCode === "ENTERPRISE_ACTIVE"
  ) {
    return "ENTERPRISE";
  }

  return "FREE";
}

/**
 * Determines whether ads should be displayed to the user.
 * Ads only show if the effective plan is FREE.
 */
export async function shouldShowAds(userId: string): Promise<boolean> {
  if (!userId) return false;
  const plan = await getEffectivePlan(userId);
  return plan === "FREE";
}

/**
 * Selects an active, matching ad campaign for a given user, placement, and business type.
 */
export async function selectAdForUser(
  userId: string,
  placement: string,
  businessType?: string
) {
  const showAds = await shouldShowAds(userId);
  if (!showAds) return null;

  const now = new Date();

  // Map business type or mode to campaign segments
  const targetSegments = ["ALL"];
  if (businessType === "KOS_PROPERTY" || businessType === "OTHER") {
    targetSegments.push("KOS");
  } else if (businessType) {
    targetSegments.push("UMKM");
  } else {
    // If no business type is loaded, search user's first business to check type
    const firstBusiness = await db.business.findFirst({
      where: { userId },
      select: { mode: true },
    });
    if (firstBusiness) {
      if (firstBusiness.mode === "KOS_PROPERTY") {
        targetSegments.push("KOS");
      } else {
        targetSegments.push("UMKM");
      }
    } else {
      targetSegments.push("UMKM", "KOS");
    }
  }

  // Find active matching campaigns
  const campaigns = await db.adCampaign.findMany({
    where: {
      placement,
      isActive: true,
      startDate: { lte: now },
      endDate: { gte: now },
      targetSegment: { in: targetSegments },
    },
  });

  if (campaigns.length === 0) return null;

  // Simple pseudo-random selection to vary the ads for demo purposes
  const randomIndex = Math.floor(Math.random() * campaigns.length);
  return campaigns[randomIndex];
}

export type AdPlacement =
  | "dashboard_bottom"
  | "report_preview_bottom"
  | "recommendation_bottom"
  | "pricing_page_middle";

export function isAdsenseEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_ADSENSE === "true";
}

export function getAdsenseClient(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_ADSENSE_CLIENT || null;
}

export function getAdSlotByPlacement(placement: AdPlacement): string | null {
  switch (placement) {
    case "dashboard_bottom":
      return process.env.NEXT_PUBLIC_ADSENSE_DASHBOARD_SLOT || null;
    case "report_preview_bottom":
      return process.env.NEXT_PUBLIC_ADSENSE_REPORT_SLOT || null;
    case "recommendation_bottom":
      return process.env.NEXT_PUBLIC_ADSENSE_RECOMMENDATION_SLOT || null;
    case "pricing_page_middle":
      return process.env.NEXT_PUBLIC_ADSENSE_PRICING_SLOT || null;
    default:
      return null;
  }
}

