import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ArrowRight, PlusCircle, Store, Zap } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/ui/common";

export const dynamic = "force-dynamic";

const items = [
  {
    label: "Profil Usaha",
    href: "/dashboard/profil",
    desc: "Edit nama, jenis, alamat, daya listrik, dan jam operasional usaha aktif.",
    icon: Store,
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    label: "Peralatan",
    href: "/dashboard/peralatan",
    desc: "Kelola daftar alat listrik utama beserta daya (W), jumlah, dan jam pemakaian.",
    icon: Zap,
    tone: "bg-amber-50 text-amber-600",
  },
  {
    label: "Tambah Usaha Baru",
    href: "/dashboard/tambah-usaha",
    desc: "Punya cabang atau usaha lain? Daftarkan sebagai bisnis baru di akun Anda.",
    icon: PlusCircle,
    tone: "bg-blue-50 text-blue-600",
  },
];

export default async function UsahaAlatPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/usaha-alat");
  }

  return (
    <div>
      <PageHeader
        title="Usaha & Alat"
        subtitle="Kelola profil bisnis dan daftar peralatan listrik yang jadi dasar analisis WattWise AI."
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
    </div>
  );
}
