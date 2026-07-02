import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/common";
import { RekomendasiClient, type RecommendationCardData } from "./rekomendasi-client";
import { getActiveBusinessId } from "@/services/business";
import { classifyApplianceEfficiency } from "@/services/appliance-efficiency";
import { buildRecommendationReasoning, SAVINGS_DISCLAIMER } from "@/services/recommendation-reasoning";
import { getUserPlan } from "@/services/subscription";
import { FeatureGate } from "@/components/feature-gate";

function getPriority(
  estimatedSavingIdr: number | null,
  difficulty: RecommendationCardData["difficulty"]
): RecommendationCardData["priority"] {
  const savings = estimatedSavingIdr ?? 0;

  if ((difficulty === "EASY" && savings >= 50_000) || savings >= 200_000) return "Tinggi";
  if (difficulty === "EASY" || savings >= 25_000) return "Sedang";
  return "Rendah";
}

function getImpact(estimatedSavingKwh: number | null): RecommendationCardData["impact"] {
  const kwh = estimatedSavingKwh ?? 0;

  if (kwh >= 50) return "Tinggi";
  if (kwh >= 15) return "Sedang";
  return "Rendah";
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export default async function RekomendasiPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const activeBusinessId = await getActiveBusinessId(session.user.id);
  if (!activeBusinessId) {
    redirect("/onboarding");
  }

  // Feature gate check
  const { plan } = await getUserPlan(session.user.id);
  const planCode = plan?.code || "FREE";
  if (planCode !== "PRO_UMKM" && planCode !== "BUSINESS") {
    return (
      <div>
        <PageHeader
          title="Rekomendasi Hemat Listrik"
          subtitle="Saran praktis berbasis aturan untuk bisnis Anda."
        />
        <FeatureGate
          featureName="Rekomendasi Hemat Listrik"
          requiredTier="Pro UMKM"
          description="Dapatkan rekomendasi hemat daya cerdas yang dipersonalisasi untuk peralatan usaha Anda, lengkap dengan proyeksi penghematan biaya dalam Rupiah."
        />
      </div>
    );
  }

  const business = await db.business.findFirst({
    where: { id: activeBusinessId, userId: session.user.id },
    include: {
      recommendations: {
        orderBy: [
          { isImplemented: "asc" },
          { estimatedSavingsIdr: "desc" },
          { createdAt: "desc" },
        ],
      },
      appliances: {
        where: { usageStatus: "ACTIVE" },
      },
      electricityEntries: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 4,
      },
    },
  });

  if (!business) {
    redirect("/onboarding");
  }

  const latestEntry = business.electricityEntries[0];
  const tariff = latestEntry?.usageKwh && latestEntry.costIdr ? latestEntry.costIdr / latestEntry.usageKwh : 1450;
  const applianceEfficiency = classifyApplianceEfficiency({
    businessType: business.type,
    appliances: business.appliances,
    electricityEntries: business.electricityEntries,
    currentMonth: latestEntry?.month,
    currentYear: latestEntry?.year,
  });

  // ponytail: generated recs are UI-only; persist them when users need per-appliance tracking.
  const generatedRecommendations: RecommendationCardData[] = buildRecommendationReasoning({
    businessType: business.type,
    appliances: applianceEfficiency,
  }).map((rec) => ({
    ...rec,
    description: `Rekomendasi berbasis klasifikasi peralatan untuk ${rec.triggerApplianceName ?? "alat terkait"}.`,
    isImplemented: false,
    source: "generated",
  }));

  const savedRecommendations: RecommendationCardData[] = business.recommendations.map((rec) => {
    const estimatedSavingKwh = rec.estimatedSavingsIdr ? round1(rec.estimatedSavingsIdr / tariff) : null;
    return {
      id: rec.id,
      title: rec.title,
      description: rec.description,
      estimatedSavingIdr: rec.estimatedSavingsIdr,
      estimatedSavingKwh,
      difficulty: rec.difficulty,
      isImplemented: rec.isImplemented,
      priority: getPriority(rec.estimatedSavingsIdr, rec.difficulty),
      reason: `Rekomendasi ini muncul dari analisis listrik terakhir untuk jenis usaha ${business.type}.`,
      impact: getImpact(estimatedSavingKwh),
      practicalSteps: [rec.description],
      disclaimer: SAVINGS_DISCLAIMER,
      source: "database",
    };
  });

  const recommendations: RecommendationCardData[] = [...generatedRecommendations, ...savedRecommendations];

  const latestBill = latestEntry?.costIdr ?? 0;
  const potentialSavingsIdr = recommendations.reduce((sum, rec) => sum + (rec.estimatedSavingIdr ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Rekomendasi Hemat Listrik"
        subtitle={`Saran praktis berbasis aturan untuk ${business.name}. Rekomendasi dibuat dari analisis listrik terakhir, klasifikasi peralatan, dan jenis usaha.`}
      />

      <RekomendasiClient
        recommendations={recommendations}
        businessName={business.name}
        latestBill={latestBill}
        potentialSavingsIdr={potentialSavingsIdr}
        businessType={business.type}
        appliances={business.appliances}
        latestEntryCost={latestEntry?.costIdr || null}
        latestEntryKwh={latestEntry?.usageKwh || null}
      />
    </div>
  );
}