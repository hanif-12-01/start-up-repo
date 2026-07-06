import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { getUserPlan } from "@/services/subscription";
import { canAccessFeature, isTrialActive, FEATURE_KEYS } from "@/lib/plan-entitlements";
import { PageHeader } from "@/components/ui/common";
import { UpgradeCta } from "@/components/subscription/UpgradeCta";
import BulkReportClient from "./bulk-report-client";

export const dynamic = "force-dynamic";

export default async function BulkReportPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login?callbackUrl=/dashboard/bulk-report");

  const { subscription, plan } = await getUserPlan(session.user.id);
  const planCode = plan?.code || "FREE";
  const trialActive = subscription ? isTrialActive(subscription) : false;

  if (!canAccessFeature(FEATURE_KEYS.REPORT_BULK_PDF, planCode, trialActive)) {
    return (
      <div>
        <PageHeader
          title="Bulk PDF Report"
          subtitle="Simulasi ekspor laporan PDF untuk banyak lokasi sekaligus."
        />
        <UpgradeCta
          title="Bulk PDF Terkunci"
          description="Bulk PDF tersedia di Paket Bisnis."
          requiredTier="Paket Bisnis"
          buttonText="Lihat Paket Bisnis"
          href="/dashboard/paket-demo"
        />
      </div>
    );
  }

  const businesses = await db.business.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      type: true,
      electricityEntries: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
        take: 1,
        select: { month: true, year: true, usageKwh: true, costIdr: true },
      },
    },
  });

  const initialList = businesses.map((b) => ({
    id: b.id,
    name: b.name,
    type: b.type,
    latestMonth: b.electricityEntries[0]?.month ?? null,
    latestYear: b.electricityEntries[0]?.year ?? null,
    latestUsageKwh: b.electricityEntries[0]?.usageKwh ?? null,
    latestCostIdr: b.electricityEntries[0]?.costIdr ?? null,
  }));

  return (
    <div>
      <PageHeader
        title="Bulk PDF Report"
        subtitle="Simulasi ekspor laporan PDF untuk banyak lokasi sekaligus (MVP)."
      />
      <BulkReportClient businesses={initialList} />
    </div>
  );
}
