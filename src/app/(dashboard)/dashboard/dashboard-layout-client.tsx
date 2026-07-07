  "use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import type { LucideIcon } from "lucide-react";
import {
  AlertTriangle,
  BadgeDollarSign,
  Beaker,
  Bell,
  Cpu,
  CreditCard,
  FileText,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  NotebookPen,
  PlusCircle,
  Settings,
  Sparkles,
  Store,
  TrendingUp,
  User,
  Wallet,
  X,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BusinessSwitcher } from "@/components/business-switcher";

// Menu hierarkis: parent + children terlihat sekaligus supaya user langsung
// tahu di mana letak fitur seperti "Deteksi Anomali" tanpa harus klik hub dulu.
// Parent-only (tanpa href) dirender sebagai section heading non-clickable
// ("Analisis AI") — murni untuk pengelompokan visual.
type MenuItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  children?: MenuItem[];
};

const menuItems: MenuItem[] = [
  { label: "Beranda", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "Catat Data",
    href: "/dashboard/catat-data",
    icon: NotebookPen,
    children: [
      { label: "Input Data Listrik", href: "/dashboard/input", icon: PlusCircle },
      { label: "Pendapatan & Listrik", href: "/dashboard/pendapatan", icon: BadgeDollarSign },
    ],
  },
  {
    label: "Analisis AI",
    icon: Sparkles,
    children: [
      { label: "Prediksi & Estimasi", href: "/dashboard/prediksi", icon: TrendingUp },
      { label: "Deteksi Anomali", href: "/dashboard/anomali", icon: AlertTriangle },
      { label: "Rekomendasi Hemat", href: "/dashboard/rekomendasi", icon: Lightbulb },
      { label: "AI Lab", href: "/dashboard/ai-lab", icon: Beaker },
    ],
  },
  {
    label: "Usaha & Alat",
    href: "/dashboard/usaha-alat",
    icon: Store,
    children: [
      { label: "Profil Usaha", href: "/dashboard/profil", icon: User },
      { label: "Peralatan", href: "/dashboard/peralatan", icon: Zap },
      { label: "Tambah Usaha Baru", href: "/dashboard/tambah-usaha", icon: PlusCircle },
    ],
  },
  { label: "Laporan", href: "/dashboard/laporan", icon: FileText },
  { label: "AIoT", href: "/dashboard/aiot", icon: Cpu },
  {
    label: "Pengaturan",
    href: "/dashboard/pengaturan",
    icon: Settings,
    children: [
      { label: "Notifikasi", href: "/dashboard/notifikasi", icon: Bell },
      { label: "Harga Paket", href: "/dashboard/harga-paket", icon: CreditCard },
      { label: "Simulasi Paket", href: "/dashboard/paket-demo", icon: Sparkles },
    ],
  },
];

interface Business {
  id: string;
  name: string;
}

interface DashboardLayoutClientProps {
  children: ReactNode;
  businesses: Business[];
  activeBusinessId: string;
  subscription?: {
    status: string;
    trialEndDate: string | null;
    plan: {
      code: string;
      name: string;
    };
  } | null;
}

export default function DashboardLayoutClient({
  children,
  businesses,
  activeBusinessId,
  subscription = null,
}: DashboardLayoutClientProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();

  const isActive = (href: string): boolean =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname === href;

  const Nav = ({ mobile = false }: { mobile?: boolean }) => {
    const closeMobile = () => mobile && setMobileOpen(false);

    const renderChild = (child: MenuItem) => {
      if (!child.href) return null;
      const ChildIcon = child.icon;
      const active = isActive(child.href);
      const dataTour = 
        child.href === "/dashboard/pendapatan"
          ? "sidebar-pendapatan"
          : child.href === "/dashboard/rekomendasi"
          ? "sidebar-rekomendasi"
          : undefined;

      return (
        <Link
          key={child.href}
          href={child.href}
          onClick={closeMobile}
          data-tour={dataTour}
          className={cn(
            "flex items-center gap-2.5 rounded-lg border-l-2 px-3 py-2 text-[13px] font-medium transition-all",
            active
              ? "border-emerald-500 bg-emerald-50/70 font-semibold text-emerald-700"
              : "border-slate-100 text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800",
          )}
        >
          <ChildIcon className="h-4 w-4 shrink-0" />
          {child.label}
        </Link>
      );
    };

    return (
      <nav className="space-y-3">
        {menuItems.map((item, idx) => {
          const Icon = item.icon;
          const hasChildren = !!item.children?.length;
          const parentActive = item.href ? isActive(item.href) : false;
          const parentDataTour = 
            item.href === "/dashboard/catat-data"
              ? "sidebar-catat-data"
              : item.href === "/dashboard/laporan"
              ? "sidebar-laporan"
              : undefined;

          return (
            <div key={item.href ?? `heading-${idx}`}>
              {item.href ? (
                <Link
                  href={item.href}
                  onClick={closeMobile}
                  data-tour={parentDataTour}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-200",
                    parentActive
                      ? "border-emerald-100/70 bg-emerald-50/80 text-emerald-700 shadow-sm"
                      : "border-transparent text-slate-700 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {item.label}
                </Link>
              ) : (
                <div className="flex items-center gap-2 px-4 pb-1 pt-2">
                  <Icon className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    {item.label}
                  </span>
                </div>
              )}
              {hasChildren && (
                <div className="mt-1 space-y-1 pl-3">
                  {item.children!.map(renderChild)}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    );
  };

  const ProfileCard = () => {
    const name = session?.user?.name || "Pengguna";
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .substring(0, 2)
      .toUpperCase();

    const planCode = subscription?.plan?.code || "FREE";
    const isTrial = planCode === "PRO_TRIAL" || subscription?.status === "TRIAL_ACTIVE";
    let trialDays = 0;
    if (isTrial && subscription?.trialEndDate) {
      const trialEndDate = new Date(subscription.trialEndDate);
      const today = new Date();
      const diffTime = trialEndDate.getTime() - today.getTime();
      trialDays = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/50 p-3.5 font-sans">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-emerald-50 border border-emerald-100 text-sm font-bold text-emerald-700 shadow-sm">
            {initials}
          </div>
          <div className="overflow-hidden">
            <p className="truncate text-xs font-bold text-slate-800 leading-tight">{name}</p>
            <p className="truncate text-[10px] text-slate-400 font-medium mt-0.5 leading-tight">{session?.user?.email}</p>
            {subscription ? (
              <div className="mt-1.5 flex flex-col gap-0.5">
                <span className={cn(
                  "inline-block rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider w-max text-center leading-none",
                  planCode === "FREE" ? "bg-slate-100 text-slate-600 border border-slate-200" :
                  planCode === "PRO_TRIAL" ? "bg-indigo-50 text-indigo-700 border border-indigo-200" :
                  planCode === "PRO_UMKM" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" :
                  planCode === "BUSINESS" ? "bg-blue-50 text-blue-700 border border-blue-200" :
                  "bg-amber-50 text-amber-750 border border-amber-250"
                )}>
                  {planCode === "PRO_TRIAL" ? "Pro Trial 30 Hari" : 
                   planCode === "PRO_UMKM" ? "Pro" : 
                   planCode === "BUSINESS" ? "Business" :
                   planCode === "ENTERPRISE" ? "Enterprise/Custom" :
                   subscription.plan.name}
                </span>
                {planCode === "ENTERPRISE" && (
                  <span className="text-[8px] font-bold text-amber-600 mt-1 block">Custom plan</span>
                )}
                {isTrial && trialDays > 0 && (
                  <span className="text-[8px] font-bold text-indigo-600">Trial sisa {trialDays} hari</span>
                )}
                {isTrial && trialDays <= 0 && (
                  <span className="text-[8px] font-bold text-rose-600">Trial berakhir</span>
                )}
              </div>
            ) : (
              <div className="mt-1.5 flex flex-col gap-0.5">
                <span className="inline-block rounded-md px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider w-max text-center leading-none bg-slate-100 text-slate-600 border border-slate-200">
                  Gratis
                </span>
              </div>
            )}
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
              Listrik Lebih Cerdas
            </p>
          </div>
        </Link>
        
        <div className="mb-6 border-b border-slate-100 pb-5">
          <BusinessSwitcher businesses={businesses} activeBusinessId={activeBusinessId} />
        </div>

        {/* Menu scroll di tengah — logo & switcher (atas) + ProfileCard (bawah)
            tetap terlihat walau menu overflow. `min-h-0` wajib supaya
            overflow-y-auto benar-benar aktif di dalam parent flex. */}
        <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2">
          <Nav />
        </div>

        <div className="mt-4 border-t border-slate-100 pt-4">
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
            <div className="-mx-2 min-h-0 flex-1 overflow-y-auto px-2">
              <Nav mobile />
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4">
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
