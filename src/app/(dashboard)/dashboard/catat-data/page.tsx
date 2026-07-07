import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  BadgeDollarSign,
  PlusCircle,
  Wallet,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/ui/common";

export const dynamic = "force-dynamic";

const items = [
  {
    label: "Input Data Listrik",
    href: "/dashboard/input",
    desc: "Catat tagihan listrik & pemakaian kWh bulanan Anda.",
    icon: PlusCircle,
    tone: "bg-amber-50 text-amber-600",
  },
  {
    label: "Pendapatan & Listrik",
    href: "/dashboard/pendapatan",
    desc: "Catat omzet bulanan untuk melihat dampak biaya listrik terhadap pendapatan.",
    icon: BadgeDollarSign,
    tone: "bg-emerald-50 text-emerald-600",
  },
];

export default async function CatatDataPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/catat-data");
  }

  return (
    <div>
      <PageHeader
        title="Catat Data"
        subtitle="Tempat mencatat data operasional Anda — listrik dan pendapatan."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="card card-hover group flex flex-col justify-between"
            >
              <div>
                <div
                  className={`mb-4 grid h-11 w-11 place-items-center rounded-xl ${item.tone}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-bold text-slate-800">
                  {item.label}
                </h3>
                <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
                  {item.desc}
                </p>
              </div>
              <div className="mt-5 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 group-hover:underline">
                Buka menu
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-slate-400">
        Semua data yang Anda catat digunakan untuk analisis WattWise AI dan
        tidak dibagikan ke pihak lain.
      </p>
    </div>
  );
}
