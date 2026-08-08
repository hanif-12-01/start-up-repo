'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import { Activity, BarChart3, Bolt, Building2, ClipboardCheck, FileText, Gauge, LayoutDashboard, Menu, PackageOpen, ReceiptText, Settings, TrendingUp, WalletCards, X, Zap } from 'lucide-react';
import { LogoutButton } from '@/components/LogoutButton';

type Item = { href: string; label: string; icon: LucideIcon };
const groups: Array<{ label: string; items: Item[] }> = [
  { label: 'Ringkasan', items: [{ href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }] },
  { label: 'Operasional', items: [
    { href: '/businesses', label: 'Usaha Saya', icon: Building2 },
    { href: '/bills', label: 'Tagihan Listrik', icon: ReceiptText },
    { href: '/revenue', label: 'Pendapatan', icon: WalletCards },
    { href: '/appliances', label: 'Peralatan', icon: Zap },
  ] },
  { label: 'Analisis', items: [
    { href: '/analysis', label: 'Pusat Analisis', icon: BarChart3 },
    { href: '/anomalies', label: 'Perlu Ditinjau', icon: Activity },
    { href: '/predictions', label: 'Simulator', icon: TrendingUp },
  ] },
  { label: 'Tindakan', items: [
    { href: '/recommendations', label: 'Rekomendasi', icon: ClipboardCheck },
    { href: '/diagnostics', label: 'Cek Kenaikan', icon: Gauge },
  ] },
  { label: 'Laporan', items: [{ href: '/reports/monthly', label: 'Laporan Bulanan', icon: FileText }] },
  { label: 'Akun', items: [
    { href: '/plans', label: 'Paket Saya', icon: PackageOpen },
    { href: '/settings/profile', label: 'Pengaturan', icon: Settings },
  ] },
];

const shellBypass = ['/plan', '/onboarding', '/setup'];

function NavLink({ item, pathname, close }: { item: Item; pathname: string; close: () => void }) {
  const active = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`));
  const Icon = item.icon;
  return <Link href={item.href} onClick={close} aria-current={active ? 'page' : undefined} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active ? 'bg-[var(--primary)] text-white shadow-sm' : 'text-[var(--muted)] hover:bg-[var(--primary-soft)] hover:text-[var(--foreground)]'}`}>
    <Icon aria-hidden="true" className="h-[18px] w-[18px] shrink-0"/><span>{item.label}</span>
  </Link>;
}

export function ProductShell({ children, userName, userEmail, plan = 'FREE' }: { children: React.ReactNode; userName?: string; userEmail?: string; plan?: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  if (shellBypass.some((route) => pathname === route || pathname.startsWith(`${route}/`))) return children;
  const close = () => setMenuOpen(false);
  const sidebar = <aside className="flex h-full w-72 flex-col border-r border-[var(--border)] bg-[var(--surface-muted)] px-4 py-5 text-[var(--foreground)]">
    <Link href="/dashboard" onClick={close} className="flex items-center gap-3 rounded-xl px-2 py-2">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-[var(--primary)] text-white shadow-md"><Bolt className="h-5 w-5" aria-hidden="true"/></span>
      <span><strong className="block text-lg tracking-tight">WattWise AI</strong><span className="block text-[11px] font-medium text-[var(--muted)]">Kendali biaya listrik</span></span>
    </Link>
    <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex items-center justify-between gap-2"><p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--primary)]">Ruang kerja</p><span className="rounded-full bg-[var(--primary-soft)] px-2 py-1 text-[9px] font-black text-[var(--primary)]">{plan}</span></div>
      <p className="mt-1 truncate text-sm font-bold">{userName || 'Pemilik usaha'}</p>{userEmail && <p className="mt-0.5 truncate text-xs text-[var(--muted)]">{userEmail}</p>}
    </div>
    <nav aria-label="Navigasi produk" className="mt-4 flex-1 overflow-y-auto pr-1">{groups.map((group) => <section key={group.label} className="mb-3"><p className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">{group.label}</p><div className="space-y-1">{group.items.map((item) => <NavLink key={item.href} item={item} pathname={pathname} close={close}/>)}</div></section>)}</nav>
    <div className="mt-3 border-t border-[var(--border)] pt-4"><LogoutButton label="Keluar" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm font-semibold transition hover:bg-[var(--primary-soft)] disabled:opacity-50"/><p className="mt-3 text-center text-[10px] leading-relaxed text-[var(--muted)]">Bukan aplikasi resmi PLN · hasil berbasis data Anda</p></div>
  </aside>;
  return <div className="product-shell min-h-screen lg:flex"><div className="product-shell-sidebar fixed inset-y-0 left-0 z-50 hidden lg:block">{sidebar}</div><header className="product-shell-mobile sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_92%,transparent)] px-4 py-3 backdrop-blur lg:hidden"><Link href="/dashboard" className="flex items-center gap-2 font-extrabold"><Bolt className="h-5 w-5 text-[var(--primary)]"/>WattWise AI</Link><button type="button" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-controls="product-mobile-menu" className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-bold"><Menu className="h-4 w-4"/>Menu</button></header>{menuOpen && <div id="product-mobile-menu" className="fixed inset-0 z-50 lg:hidden"><button type="button" aria-label="Tutup menu" onClick={close} className="absolute inset-0 bg-emerald-950/45 backdrop-blur-sm"/><div className="absolute inset-y-0 left-0 shadow-2xl">{sidebar}</div><button type="button" onClick={close} className="absolute right-4 top-4 rounded-full bg-[var(--surface)] p-2.5 shadow-lg" aria-label="Tutup menu navigasi"><X className="h-5 w-5"/></button></div>}<div className="min-w-0 flex-1 lg:pl-72">{children}</div></div>;
}
