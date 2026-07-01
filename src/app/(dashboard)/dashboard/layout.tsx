"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  CreditCard,
  FileText,
  LayoutDashboard,
  Lightbulb,
  Menu,
  PlusCircle,
  TrendingUp,
  User,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Input Data", href: "/dashboard/input", icon: PlusCircle },
  { label: "Prediksi Tagihan", href: "/dashboard/prediksi", icon: TrendingUp },
  { label: "Deteksi Anomali", href: "/dashboard/anomali", icon: AlertTriangle },
  { label: "Rekomendasi Hemat", href: "/dashboard/rekomendasi", icon: Lightbulb },
  { label: "Laporan", href: "/dashboard/laporan", icon: FileText },
  { label: "Harga Paket", href: "/dashboard/harga", icon: CreditCard },
  { label: "Profil Usaha", href: "/dashboard/profil", icon: User },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const Nav = ({ mobile = false }: { mobile?: boolean }) => (
    <nav className="flex-1 space-y-1">
      {menuItems.map((item) => {
        const active = pathname === item.href;
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => mobile && setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
              active
                ? "bg-brand-greenSoft text-brand-greenDark"
                : "text-slate-600 hover:bg-slate-50 hover:text-brand-ink"
            )}
          >
            <Icon className="h-5 w-5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const ProfileCard = () => (
    <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
      <div className="grid h-9 w-9 place-items-center rounded-full bg-brand-greenSoft text-sm font-bold text-brand-greenDark">
        LB
      </div>
      <div className="overflow-hidden">
        <p className="truncate text-xs font-bold">Laundry Berkah</p>
        <p className="truncate text-[10px] text-slate-400">Purwokerto</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-brand-ink">
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <Link href="/" className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand-green text-white">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <span className="text-sm font-bold">
            WattWise <span className="text-brand-green">AI</span>
          </span>
        </Link>
        <button
          onClick={() => setMobileOpen((v) => !v)}
          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
          aria-label="Buka menu"
        >
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </header>

      <aside className="fixed bottom-0 left-0 top-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white p-5 md:flex">
        <Link href="/" className="mb-8 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand-green text-white shadow-soft">
            <Zap className="h-5 w-5 fill-current" />
          </div>
          <div>
            <span className="text-base font-bold">
              WattWise <span className="text-brand-green">AI</span>
            </span>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              Listrik Cerdas UMKM
            </p>
          </div>
        </Link>
        <Nav />
        <div className="mt-auto border-t border-slate-100 pt-4">
          <ProfileCard />
        </div>
      </aside>

      {mobileOpen && (
        <>
          <button
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Tutup menu"
          />
          <aside className="fixed bottom-0 left-0 top-[53px] z-50 flex w-72 flex-col bg-white p-5 shadow-2xl animate-[slideInLeft_.2s_ease] md:hidden">
            <Nav mobile />
            <div className="border-t border-slate-100 pt-4">
              <ProfileCard />
            </div>
          </aside>
          <style>{`@keyframes slideInLeft{from{transform:translateX(-100%)}to{transform:none}}`}</style>
        </>
      )}

      <main className="p-4 pb-10 sm:p-6 md:pl-[17.5rem] md:pt-6">
        <div className="mx-auto max-w-6xl">{children}</div>
      </main>
    </div>
  );
}