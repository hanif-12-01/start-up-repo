'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LogoutButton } from '@/components/LogoutButton';

const navigation = [
  { href: '/dashboard', label: 'Ringkasan', icon: '🏡' },
  { href: '/businesses', label: 'Usaha Saya', icon: '🏢' },
  { href: '/bills', label: 'Tagihan Listrik', icon: '🧾' },
  { href: '/revenue', label: 'Pendapatan', icon: '💰' },
  { href: '/appliances', label: 'Peralatan', icon: '🔌' },
  { href: '/anomalies', label: 'Perlu Ditinjau', icon: '🔎' },
  { href: '/predictions', label: 'Simulator', icon: '🧮' },
  { href: '/recommendations', label: 'Rekomendasi', icon: '💡' },
  { href: '/reports/monthly', label: 'Laporan', icon: '📄' },
];

const settingsNavigation = [
  { href: '/settings/profile', label: 'Pengaturan', icon: '⚙️' },
  { href: '/plan', label: 'Paket Saya', icon: '🌱' },
];

const shellBypass = ['/plan', '/onboarding', '/setup'];

function NavLink({ href, label, icon, pathname, close }: {
  href: string;
  label: string;
  icon: string;
  pathname: string;
  close: () => void;
}) {
  const active = pathname === href || (href !== '/dashboard' && pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      onClick={close}
      aria-current={active ? 'page' : undefined}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-400 ${
        active
          ? 'bg-emerald-700 text-white shadow-sm shadow-emerald-900/20'
          : 'text-emerald-950/70 hover:bg-emerald-100 hover:text-emerald-950'
      }`}
    >
      <span aria-hidden="true" className="text-base">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export function ProductShell({
  children,
  userName,
  userEmail,
}: {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  if (shellBypass.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return children;
  }

  const close = () => setMenuOpen(false);
  const sidebar = (
    <aside className="flex h-full w-72 flex-col border-r border-emerald-900/10 bg-[#edf4e8] px-4 py-5 text-slate-900">
      <Link href="/dashboard" onClick={close} className="flex items-center gap-3 rounded-xl px-2 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-600 text-xl text-white shadow-md shadow-emerald-900/20" aria-hidden="true">⚡</span>
        <span>
          <strong className="block text-lg tracking-tight text-emerald-950">WattWise AI</strong>
          <span className="block text-[11px] font-medium text-emerald-900/80">Kendali biaya listrik</span>
        </span>
      </Link>

      <div className="mt-6 rounded-2xl border border-emerald-900/10 bg-white/70 p-3">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-700">Ruang kerja</p>
        <p className="mt-1 truncate text-sm font-bold text-slate-900">{userName || 'Pemilik usaha'}</p>
        {userEmail && <p className="mt-0.5 truncate text-xs text-slate-500">{userEmail}</p>}
      </div>

      <nav aria-label="Navigasi produk" className="mt-5 flex-1 space-y-1 overflow-y-auto pr-1">
        {navigation.map((item) => (
          <NavLink key={item.href} {...item} pathname={pathname} close={close} />
        ))}
        <p className="px-3 pb-1 pt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-900/80">Akun</p>
        {settingsNavigation.map((item) => (
          <NavLink key={item.href} {...item} pathname={pathname} close={close} />
        ))}
      </nav>

      <div className="mt-4 border-t border-emerald-900/10 pt-4">
        <LogoutButton
          label="Keluar"
          className="w-full rounded-xl border border-emerald-900/10 bg-white px-3 py-2.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50"
        />
        <p className="mt-3 text-center text-[10px] leading-relaxed text-emerald-950/75">Bukan aplikasi resmi PLN · hasil berbasis data yang Anda masukkan</p>
      </div>
    </aside>
  );

  return (
    <div className="product-shell min-h-screen bg-[#f7f9f4] text-slate-900 lg:flex">
      <div className="product-shell-sidebar fixed inset-y-0 left-0 z-50 hidden lg:block">{sidebar}</div>
      <header className="product-shell-mobile sticky top-0 z-40 flex items-center justify-between border-b border-emerald-900/10 bg-[#f7f9f4]/95 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/dashboard" className="flex items-center gap-2 font-extrabold text-emerald-950"><span aria-hidden="true">⚡</span> WattWise AI</Link>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-expanded={menuOpen}
          aria-controls="product-mobile-menu"
          className="rounded-lg border border-emerald-900/15 bg-white px-3 py-2 text-sm font-bold text-emerald-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
        >
          Menu
        </button>
      </header>

      {menuOpen && (
        <div id="product-mobile-menu" className="fixed inset-0 z-50 lg:hidden">
          <button type="button" aria-label="Tutup menu" onClick={close} className="absolute inset-0 bg-emerald-950/35 backdrop-blur-sm" />
          <div className="absolute inset-y-0 left-0 shadow-2xl">{sidebar}</div>
          <button type="button" onClick={close} className="absolute right-4 top-4 rounded-full bg-white px-3 py-2 font-bold text-emerald-950 shadow-lg" aria-label="Tutup menu navigasi">×</button>
        </div>
      )}

      <div className="min-w-0 flex-1 lg:pl-72">{children}</div>
    </div>
  );
}
