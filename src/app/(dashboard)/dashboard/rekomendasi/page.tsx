import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/ui/common";
import { RekomendasiClient, type RecommendationCardData } from "./rekomendasi-client";
import { getRekomendasiDataForBusiness } from "@/services/business";
import { getUserPlan } from "@/services/subscription";
import { FeatureGate } from "@/components/feature-gate";

const SAVINGS_DISCLAIMER = "Estimasi penghematan bersifat indikatif dan dapat berbeda dari tagihan PLN aktual.";

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

  const business = await getRekomendasiDataForBusiness(session.user.id);

  if (!business) {
    redirect("/onboarding");
  }

  const latestEntry = business.electricityEntries[0];
  const tariff = latestEntry?.usageKwh && latestEntry.costIdr ? latestEntry.costIdr / latestEntry.usageKwh : 1450;

  const savedRecommendations: RecommendationCardData[] = business.recommendations.map((rec) => {
    const estimatedSavingKwh = rec.estimatedSavingsKwh ?? (rec.estimatedSavingsIdr ? round1(rec.estimatedSavingsIdr / tariff) : null);
    return {
      id: rec.id,
      title: rec.title,
      description: rec.description,
      estimatedSavingIdr: rec.estimatedSavingsIdr,
      estimatedSavingKwh,
      difficulty: rec.difficulty,
      isImplemented: rec.isImplemented,
      priority: getPriority(rec.estimatedSavingsIdr, rec.difficulty),
      reason: rec.reason ?? 'Rekomendasi ini muncul dari analisis listrik terakhir.',
      impact: getImpact(estimatedSavingKwh),
      practicalSteps: rec.practicalSteps.length > 0 ? rec.practicalSteps : [rec.description],
      disclaimer: rec.disclaimer ?? SAVINGS_DISCLAIMER,
      triggerApplianceName: rec.triggerApplianceName ?? undefined,
      source: 'database',
    };
  });

  const recommendations: RecommendationCardData[] = savedRecommendations;

  const latestBill = latestEntry?.costIdr ?? 0;
  const potentialSavingsIdr = recommendations.reduce((sum, rec) => sum + (rec.estimatedSavingIdr ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Rekomendasi Hemat Listrik"
        subtitle={`Saran praktis berbasis hasil analisis listrik terakhir untuk ${business.name}.`}
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
