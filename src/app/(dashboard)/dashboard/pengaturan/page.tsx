import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Bell,
  CreditCard,
  Info,
  Store,
  User as UserIcon,
} from "lucide-react";
import { authOptions } from "@/lib/auth";
import { PageHeader } from "@/components/ui/common";

export const dynamic = "force-dynamic";

const items: Array<{
  label: string;
  href: string;
  desc: string;
  icon: typeof UserIcon;
  tone: string;
  external?: boolean;
}> = [
  {
    label: "Akun & Profil Usaha",
    href: "/dashboard/profil",
    desc: "Ubah data akun dan profil usaha aktif Anda.",
    icon: UserIcon,
    tone: "bg-emerald-50 text-emerald-600",
  },
  {
    label: "Notifikasi",
    href: "/dashboard/notifikasi",
    desc: "Kelola preferensi notifikasi dan lihat riwayat pesan sistem.",
    icon: Bell,
    tone: "bg-blue-50 text-blue-600",
  },
  {
    label: "Ganti Bisnis Aktif",
    href: "/dashboard/usaha-alat",
    desc: "Kelola profil bisnis, alat, atau tambah usaha baru.",
    icon: Store,
    tone: "bg-amber-50 text-amber-600",
  },
  {
    label: "Harga Paket",
    href: "/dashboard/harga-paket",
    desc: "Lihat paket berlangganan dan tingkatkan kapasitas fitur.",
    icon: CreditCard,
    tone: "bg-slate-100 text-slate-600",
  },
];

export default async function PengaturanPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    redirect("/login?callbackUrl=/dashboard/pengaturan");
  }

  return (
    <div>
      <PageHeader
        title="Pengaturan"
        subtitle="Atur akun, preferensi notifikasi, dan langganan WattWise AI Anda."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="card card-hover group flex flex-col justify-between"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${item.tone}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-800">
                    {item.label}
                  </h3>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                    {item.desc}
                  </p>
                </div>
              </div>
              <div className="mt-5 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 group-hover:underline">
                Buka menu
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p className="text-xs leading-relaxed text-slate-600">
          Pengaturan preferensi lanjutan (bahasa, tema, ekspor data akun) akan
          ditambahkan pada pembaruan berikutnya.
        </p>
      </div>
    </div>
  );
}
