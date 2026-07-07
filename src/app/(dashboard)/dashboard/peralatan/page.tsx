import { PageHeader, StatCard } from "@/components/ui/common";
import { authOptions } from "@/lib/auth";
import { estimateMonthlyKwh } from "@/services/appliance-estimation";
import { getPeralatanDataForBusiness } from "@/services/business";
import { Bolt, CircleDollarSign, Gauge } from "lucide-react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import PeralatanClient from "./peralatan-client";

export const dynamic = "force-dynamic";

const fmtKwh = (n: number) => `${n.toLocaleString("id-ID", { maximumFractionDigits: 1 })} kWh`;
const fmtIdr = (n: number) => `Rp${Math.round(n).toLocaleString("id-ID")}`;

export default async function PeralatanPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const business = await getPeralatanDataForBusiness(session.user.id);
  if (!business) redirect("/onboarding");

  const latest = business.electricityEntries[0];
  const tariffPerKwh = latest?.usageKwh > 0 ? latest.costIdr / latest.usageKwh : 1450;
  const totalKwh = business.appliances.reduce((sum, a) => sum + estimateMonthlyKwh(a), 0);
  const totalCost = totalKwh * tariffPerKwh;
  const top = business.appliances.reduce<(typeof business.appliances)[number] | null>(
    (max, a) => (!max || estimateMonthlyKwh(a) > estimateMonthlyKwh(max) ? a : max),
    null
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Estimasi Peralatan"
        subtitle={`Kelola alat listrik ${business.name}. Semua angka adalah estimasi operasional, bukan tagihan resmi PLN.`}
      />

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard label="Total Estimasi" value={fmtKwh(totalKwh)} helper="Per bulan, asumsi 30 hari." icon={<Gauge className="h-5 w-5" />} tone="green" />
        <StatCard label="Estimasi Biaya" value={fmtIdr(totalCost)} helper={`Tarif estimasi ${fmtIdr(tariffPerKwh)}/kWh.`} icon={<CircleDollarSign className="h-5 w-5" />} tone="blue" />
        <StatCard label="Kandidat Alat Perlu Dicek" value={top?.name ?? "Belum Ada"} helper={top ? fmtKwh(estimateMonthlyKwh(top)) : "Tambah peralatan dulu."} icon={<Bolt className="h-5 w-5" />} tone="yellow" />
      </div>

      <PeralatanClient appliances={business.appliances} tariffPerKwh={tariffPerKwh} />
    </div>
  );
}