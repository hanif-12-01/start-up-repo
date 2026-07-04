import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Wallet } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { getActiveBusinessId } from "@/services/business";
import { getBusinessMembership } from "@/services/membership";
import {
  getLatestCashflowSummaryForBusiness,
  getCashflowsForBusiness,
} from "@/services/cashflow";
import { PageHeader } from "@/components/ui/common";
import CashflowClient from "./cashflow-client";

export const dynamic = "force-dynamic";

export default async function CashflowPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/cashflow");
  }

  const activeBusinessId = await getActiveBusinessId(session.user.id);
  if (!activeBusinessId) {
    redirect("/onboarding");
  }

  const membership = await getBusinessMembership(
    session.user.id,
    activeBusinessId,
  );

  // Non-member — tidak terlihat sama sekali (defense selain layout)
  if (!membership) {
    return (
      <div>
        <PageHeader
          title="Cashflow Bisnis"
          subtitle="Pantau kas masuk dan keluar bisnis Anda dalam satu tempat."
        />
        <AksesTerbatas
          message="Anda tidak memiliki akses ke bisnis ini."
        />
      </div>
    );
  }

  // Staff — feature belum dirilis di Step 3D. Tampilkan panel informatif.
  if (membership.role !== "BUSINESS_OWNER") {
    return (
      <div>
        <PageHeader
          title="Cashflow Bisnis"
          subtitle="Pantau kas masuk dan keluar bisnis Anda dalam satu tempat."
        />
        <AksesTerbatas
          message="Anda tidak memiliki akses untuk mengelola cashflow bisnis ini."
          hint="Fitur ini saat ini hanya tersedia untuk owner bisnis. Halaman input untuk staff akan tersedia di pembaruan berikutnya."
        />
      </div>
    );
  }

  const [summary, cashflows] = await Promise.all([
    getLatestCashflowSummaryForBusiness({
      userId: session.user.id,
      businessId: activeBusinessId,
    }),
    getCashflowsForBusiness({
      userId: session.user.id,
      businessId: activeBusinessId,
    }),
  ]);

  return (
    <CashflowClient
      businessId={activeBusinessId}
      summary={summary}
      cashflows={cashflows}
    />
  );
}

function AksesTerbatas({
  message,
  hint,
}: {
  message: string;
  hint?: string;
}) {
  return (
    <div className="card flex flex-col items-center justify-center border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 p-12 text-center">
      <div className="mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-slate-200/60 text-slate-500 shadow-sm">
        <Wallet className="h-8 w-8" />
      </div>
      <h2 className="text-xl font-bold text-slate-800">Akses Terbatas</h2>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-500">
        {message}
      </p>
      {hint && (
        <p className="mt-3 max-w-md text-xs leading-relaxed text-slate-400">
          {hint}
        </p>
      )}
    </div>
  );
}
