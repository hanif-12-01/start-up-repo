import { db } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getUserPlan } from "@/services/subscription";
import HargaClient from "./harga-client";
import { PageHeader } from "@/components/ui/common";
import { shouldShowAds } from "@/lib/ads";

export const metadata = {
  title: "Pilih Paket - WattWise AI",
  description: "Bandingkan dan pilih paket WattWise AI terbaik untuk bisnis Anda.",
};

export default async function HargaPaketPage() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;

  // Get current active plan info
  const { plan: currentPlan } = await getUserPlan(userId);

  // Check if user has ever used a Pro Trial (to hide/show "Gratis 30 hari" badge)
  let isTrialEligible = false;
  if (userId) {
    const hasTrialHistory = await db.subscription.findFirst({
      where: {
        userId,
        plan: { code: { in: ["PRO_TRIAL", "PRO_UMKM", "BUSINESS", "ENTERPRISE"] } },
      },
    });
    isTrialEligible = !hasTrialHistory;
  }

  // Fetch all plans ordered by price
  const plans = await db.plan.findMany({
    orderBy: { priceIdr: "asc" },
  });

  const adsEnabled = userId ? await shouldShowAds(userId) : true;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <PageHeader
        title="Pilih Paket WattWise AI"
        subtitle="Dapatkan rekomendasi hemat energi cerdas, analisis mendalam, dan pantau banyak cabang usaha."
      />
      <HargaClient plans={plans} currentPlanCode={currentPlan?.code || "FREE"} isTrialEligible={isTrialEligible} adsEnabled={adsEnabled} />
    </div>
  );
}
