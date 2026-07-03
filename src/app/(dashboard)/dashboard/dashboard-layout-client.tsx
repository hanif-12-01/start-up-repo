  "use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import {
  AlertTriangle,
  Bell,
  CreditCard,
  FileText,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  PlusCircle,
  SlidersHorizontal,
  Store,
  TrendingUp,
  User,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BusinessSwitcher } from "@/components/business-switcher";

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Tambah Usaha Baru", href: "/dashboard/tambah-usaha", icon: Store },
  { label: "Input Data", href: "/dashboard/input", icon: PlusCircle },
  { label: "Prediksi Tagihan", href: "/dashboard/prediksi", icon: TrendingUp },
  { label: "Deteksi Anomali", href: "/dashboard/anomali", icon: AlertTriangle },
  { label: "Peralatan", href: "/dashboard/peralatan", icon: Zap },
  { label: "Rekomendasi Hemat", href: "/dashboard/rekomendasi", icon: Lightbulb },
  { label: "Simulasi Hemat", href: "/dashboard/simulasi", icon: SlidersHorizontal },
  { label: "Laporan", href: "/dashboard/laporan", icon: FileText },
  { label: "Notifikasi", href: "/dashboard/notifikasi", icon: Bell },
  { label: "Harga Paket", href: "/dashboard/harga-paket", icon: CreditCard },
  { label: "Profil Usaha", href: "/dashboard/profil", icon: User },
];

interface Business {
  id: string;
  name: string;
}

interface DashboardLayoutClientProps {
  children: ReactNode;
  businesses: Business[];
  activeBusinessId: string;
}

export default function DashboardLayoutClient({
  children,
  businesses,
  activeBusinessId,
}: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();

  const Nav = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className="flex-1 space-y-1">
      {menuItems.map((item) => {
        const active = item.href === "/dashboard"
          ? pathname === "/dashboard"
          : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => mobile && setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 border",
              active
                ? "bg-emerald-50/80 border-emerald-100/70 text-emerald-700 shadow-sm"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 border-transparent"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const ProfileCard = () => {
    const name = session?.user?.name || "Pengguna";
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 border border-emerald-100 text-sm font-bold text-emerald-700 shadow-sm">
            {initials}
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-xs font-bold text-slate-800 leading-tight">{name}</p>
            <p className="truncate text-[10px] text-slate-400 font-medium mt-0.5">{session?.user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex w-full items-center gap-2.5 rounded-xl px-4 py-2.5 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-all duration-200 border border-transparent hover:border-rose-100/50"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          Keluar (Logout)
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-brand-ink">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-md px-4 py-3 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-green text-white shadow-soft">
            <Zap className="h-4 w-4 fill-current" />
          </div>
          <span className="text-sm font-extrabold tracking-tight">
            WattWise <span className="text-brand-green">AI</span>
          </span>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-44">
            <BusinessSwitcher businesses={businesses} activeBusinessId={activeBusinessId} />
          </div>
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Buka menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white p-5 md:flex">
        <Link href="/" className="mb-6 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-green text-white shadow-soft">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div>
            <span className="text-base font-extrabold tracking-tight">
              WattWise <span className="text-brand-green">AI</span>
            </span>
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
              Listrik Cerdas UMKM
            </p>
          </div>
        </Link>
        
        <div className="mb-6 border-b border-slate-100 pb-5">
          <BusinessSwitcher businesses={businesses} activeBusinessId={activeBusinessId} />
        </div>

        <Nav />
        
        <div className="mt-auto border-t border-slate-100 pt-4">
          <ProfileCard />
        </div>
      </aside>

      {mobileOpen && (
        <>
          <button
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
          />
          <aside className="fixed bottom-0 left-0 top-[53px] z-50 flex w-72 flex-col bg-white p-5 shadow-2xl animate-[slideInLeft_.2s_ease] md:hidden animate-in fade-in slide-in-from-left-1 duration-150">
            <Nav mobile />
            <div className="border-t border-slate-100 pt-4">
              <ProfileCard />
            </div>
          </aside>
        </>
      )}

      <main className="p-4 pb-12 sm:p-6 md:pl-[17.5rem] md:pt-8">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}
