import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { PlusCircle, UserCheck, Zap } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/ui/common";
import { getSimulasiDataForBusiness } from "@/services/business";
import { resolveTariff } from "@/services/scenario-simulator";
import { SimulasiClient } from "./simulasi-client";

export const dynamic = "force-dynamic";

export default async function SimulasiPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login");
  }

  const business = await getSimulasiDataForBusiness(session.user.id);

  if (!business) {
    return (
      <EmptyState
        icon={<UserCheck className="h-7 w-7" />}
        title="Profil Usaha Belum Lengkap"
        message="Lengkapi profil usaha terlebih dahulu agar WattWise AI dapat menjalankan simulasi hemat berdasarkan peralatan usaha Anda."
        href="/onboarding"
        cta="Lengkapi Profil Usaha"
      />
    );
  }

  if (business.appliances.length === 0) {
    return (
      <EmptyState
        icon={<PlusCircle className="h-7 w-7" />}
        title="Belum Ada Peralatan Aktif"
        message="Tambahkan minimal satu peralatan aktif agar WattWise AI dapat mensimulasikan potensi penghematan listrik Anda."
        href="/dashboard/peralatan"
        cta="Tambah Peralatan"
      />
    );
  }

  const latestEntry = business.electricityEntries[0];
  const { tariff, isEstimated } = resolveTariff(latestEntry?.costIdr ?? null, latestEntry?.usageKwh ?? null);

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Simulasi Hemat Listrik"
        subtitle={`Uji skenario "bagaimana jika" untuk peralatan ${business.name} tanpa mengubah data asli.`}
      />
      <SimulasiClient
        appliances={business.appliances}
        tariff={tariff}
        isTariffEstimated={isEstimated}
        currentBillIdr={latestEntry?.costIdr ?? null}
      />
    </div>
  );
}

function EmptyState({
  icon,
  title,
  message,
  href,
  cta,
}: {
  icon: React.ReactNode;
  title: string;
  message: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="max-w-3xl">
      <PageHeader title="Simulasi Hemat Listrik" subtitle="Uji skenario penghematan berbasis peralatan usaha Anda." />
      <div className="card flex flex-col items-center gap-4 py-14 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-greenSoft text-brand-green">
          {icon ?? <Zap className="h-7 w-7" />}
        </div>
        <h2 className="text-lg font-bold text-brand-ink">{title}</h2>
        <p className="max-w-md text-sm leading-relaxed text-slate-500">{message}</p>
        <Link href={href} className="btn-primary mt-2">
          {cta}
        </Link>
      </div>
    </div>
  );
}
