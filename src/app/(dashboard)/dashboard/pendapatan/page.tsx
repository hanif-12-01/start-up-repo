import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Banknote } from "lucide-react";
import { authOptions } from "@/lib/auth";
import {
  getActiveBusinessId,
  getActiveBusiness,
} from "@/services/business";
import { getBusinessMembership } from "@/services/membership";
import {
  getCashFlowEntryForPeriod,
  getLatestCashFlowEntry,
} from "@/services/cash-flow";
import { PageHeader } from "@/components/ui/common";
import PendapatanClient from "./pendapatan-client";

export const dynamic = "force-dynamic";

export default async function PendapatanPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/pendapatan");
  }

  const activeBusinessId = await getActiveBusinessId(session.user.id);
  if (!activeBusinessId) {
    redirect("/onboarding");
  }

  const membership = await getBusinessMembership(
    session.user.id,
    activeBusinessId,
  );
  if (!membership) {
    return (
      <div>
        <PageHeader
          title="Pendapatan & Listrik"
          subtitle="Analitik sederhana untuk melihat dampak biaya listrik terhadap pendapatan usaha."
        />
        <div className="card flex flex-col items-center justify-center border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 p-12 text-center">
          <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-slate-200/60 text-slate-500 shadow-sm">
            <Banknote className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Akses Terbatas</h2>
          <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            Anda tidak memiliki akses ke bisnis ini.
          </p>
        </div>
      </div>
    );
  }

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [business, latest, currentPeriodEntry] = await Promise.all([
    getActiveBusiness(session.user.id),
    getLatestCashFlowEntry(activeBusinessId),
    getCashFlowEntryForPeriod(activeBusinessId, currentMonth, currentYear),
  ]);

  return (
    <PendapatanClient
      businessName={business?.name ?? "Usaha Anda"}
      defaultMonth={currentMonth}
      defaultYear={currentYear}
      latestSnapshot={
        latest
          ? {
              month: latest.month,
              year: latest.year,
              revenueIdr: latest.revenueIdr,
              notes: latest.notes,
            }
          : null
      }
      currentPeriodEntry={
        currentPeriodEntry
          ? {
              month: currentPeriodEntry.month,
              year: currentPeriodEntry.year,
              revenueIdr: currentPeriodEntry.revenueIdr,
              grossProfitIdr: currentPeriodEntry.grossProfitIdr,
              marginPercent: currentPeriodEntry.marginPercent,
              otherOperationalCostIdr:
                currentPeriodEntry.otherOperationalCostIdr,
              notes: currentPeriodEntry.notes,
            }
          : null
      }
    />
  );
}
