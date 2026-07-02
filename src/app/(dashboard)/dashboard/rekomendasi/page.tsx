import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/common";
import { RekomendasiClient, type RecommendationCardData } from "./rekomendasi-client";
import { getActiveBusinessId } from "@/services/business";

function getPriority(
  estimatedSavingsIdr: number | null,
  difficulty: RecommendationCardData["difficulty"]
): RecommendationCardData["priority"] {
  const savings = estimatedSavingsIdr ?? 0;

  if ((difficulty === "EASY" && savings >= 50_000) || savings >= 200_000) return "TINGGI";
  if (difficulty === "EASY" || savings >= 25_000) return "SEDANG";
  return "RENDAH";
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
      electricityEntries: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 1,
      },
    },
  });

  if (!business) {
    redirect("/onboarding");
  }

  const recommendations: RecommendationCardData[] = business.recommendations.map((rec) => ({
    id: rec.id,
    title: rec.title,
    description: rec.description,
    estimatedSavingsIdr: rec.estimatedSavingsIdr,
    difficulty: rec.difficulty,
    isImplemented: rec.isImplemented,
    priority: getPriority(rec.estimatedSavingsIdr, rec.difficulty),
  }));

  const latestBill = business.electricityEntries[0]?.costIdr ?? 0;
  const potentialSavingsIdr = recommendations.reduce((sum, rec) => sum + (rec.estimatedSavingsIdr ?? 0), 0);

  return (
    <div>
      <PageHeader
        title="Rekomendasi Hemat Listrik"
        subtitle={`Saran praktis berbasis database untuk ${business.name}. Rekomendasi dibuat dari analisis listrik terakhir dan disesuaikan dengan jenis usaha.`}
      />

      <RekomendasiClient
        recommendations={recommendations}
        businessName={business.name}
        latestBill={latestBill}
        potentialSavingsIdr={potentialSavingsIdr}
      />
    </div>
  );
}