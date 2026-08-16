'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import {
  Building2,
  ChartNoAxesCombined,
  FileText,
  LayoutDashboard,
  Menu,
  PackageOpen,
  PlugZap,
  ReceiptText,
  Search,
  Settings,
  WalletCards,
  X,
} from 'lucide-react';
import { LogoutButton } from '@/components/LogoutButton';
import { ThemeToggle } from '@/components/product/ThemeToggle';
import { WattWiseLogo } from '@/components/WattWiseLogo';
import {
  BeginnerGuideProvider,
  BeginnerGuideModal,
  GuideReplayButton,
} from '@/components/onboarding';

type Item = { href: string; label: string; icon: LucideIcon };

const groups: Array<{ label: string; items: Item[] }> = [
  {
    label: 'UTAMA',
    items: [
      { href: '/dashboard', label: 'Ringkasan', icon: LayoutDashboard },
      { href: '/analysis', label: 'Analisis', icon: ChartNoAxesCombined },
    ],
  },
  {
    label: 'DATA',
    items: [
      { href: '/bills', label: 'Tagihan Listrik', icon: ReceiptText },
      { href: '/revenue', label: 'Pendapatan', icon: WalletCards },
      { href: '/appliances', label: 'Peralatan', icon: PlugZap },
      { href: '/businesses', label: 'Usaha Saya', icon: Building2 },
    ],
  },
  {
    label: 'TINDAKAN',
    items: [
      { href: '/diagnostics', label: 'Cek Kenaikan', icon: Search },
      { href: '/reports/monthly', label: 'Laporan', icon: FileText },
    ],
  },
  {
    label: 'AKUN',
    items: [
      { href: '/plans', label: 'Paket Saya', icon: PackageOpen },
      { href: '/settings/profile', label: 'Pengaturan', icon: Settings },
    ],
  },
];

const shellBypass = ['/plan', '/onboarding', '/setup'];

function NavLink({ item, pathname, close }: { item: Item; pathname: string; close: () => void }) {
  const active =
    pathname === item.href ||
    (item.href !== '/dashboard' && pathname.startsWith(`${item.href}`));
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={close}
      aria-current={active ? 'page' : undefined}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all ${
        active
          ? 'bg-[var(--primary-soft)] text-[var(--primary)] font-extrabold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-[var(--primary)]'
          : 'text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]'
      }`}
    >
      <Icon aria-hidden="true" className={`h-4 w-4 shrink-0 ${active ? 'text-[var(--primary)]' : 'text-[var(--muted)] group-hover:text-[var(--foreground)]'}`} />
      <span>{item.label}</span>
    </Link>
  );
}

export function ProductShell({
  children,
  userName,
  userEmail,
  plan = 'FREE',
}: {
  children: React.ReactNode;
  userName?: string;
  userEmail?: string;
  plan?: string;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;

    document.body.style.overflow = 'hidden';
    const trigger = menuButtonRef.current;
    const drawer = drawerRef.current;
    const focusable = drawer?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
      trigger?.focus();
    };
  }, [menuOpen]);

  if (shellBypass.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return children;
  }

  const close = () => setMenuOpen(false);

  const sidebar = (
    <aside className="flex h-full w-[256px] flex-col border-r border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-4 text-[var(--foreground)]">
      <Link href="/dashboard" onClick={close} className="flex items-center gap-2.5 px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] rounded-xl">
        <WattWiseLogo size={36} />
        <div>
          <strong className="block text-base tracking-tight font-black">WattWise AI</strong>
          <span className="block text-[10px] font-semibold text-[var(--muted)]">Kendali biaya listrik</span>
        </div>
      </Link>

      <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2.5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--primary)]">Ruang kerja</p>
          <span className="rounded-full bg-[var(--primary-soft)] px-2 py-0.5 text-[9px] font-black text-[var(--primary)]">
            {plan}
          </span>
        </div>
        <p className="mt-1 truncate text-xs font-extrabold text-[var(--foreground)]">{userName || 'Pemilik usaha'}</p>
        {userEmail && <p className="truncate text-[10px] text-[var(--muted)]">{userEmail}</p>}
      </div>

      <nav aria-label="Navigasi produk" className="mt-3 flex-1 overflow-y-auto pr-0.5 space-y-3">
        {groups.map((group) => (
          <section key={group.label}>
            <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--muted)]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} close={close} />
              ))}
            </div>
          </section>
        ))}
      </nav>

      <div className="mt-2 border-t border-[var(--border)] pt-3 space-y-2">
        <GuideReplayButton closeMenu={close} />
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-bold text-[var(--muted)]">Tampilan</span>
          <ThemeToggle />
        </div>
        <LogoutButton
          label="Keluar"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-bold text-[var(--foreground)] transition hover:bg-[var(--primary-soft)] hover:text-[var(--primary)] disabled:opacity-50"
        />
        <p className="text-center text-[10px] text-[var(--muted)]">
          Bukan aplikasi resmi PLN · hasil berbasis data Anda
        </p>
      </div>
    </aside>
  );

  return (
    <BeginnerGuideProvider>
      <div className="product-shell min-h-screen lg:flex">
        <div className="product-shell-sidebar fixed inset-y-0 left-0 z-50 hidden lg:block">
          {sidebar}
        </div>

        <header className="product-shell-mobile sticky top-0 z-40 flex items-center justify-between border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_90%,transparent)] px-4 py-2.5 backdrop-blur lg:hidden">
          <Link href="/dashboard" className="flex items-center gap-2 font-extrabold text-sm">
            <WattWiseLogo size={24} />
            WattWise AI
          </Link>
          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-controls="product-mobile-menu"
            className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--foreground)]"
          >
            <Menu className="h-4 w-4" />
            Menu
          </button>
        </header>

        {menuOpen && (
          <div
            id="product-mobile-menu"
            className="fixed inset-0 z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Navigasi produk"
          >
            <button
              type="button"
              aria-label="Tutup menu"
              onClick={close}
              className="absolute inset-0 bg-[var(--overlay)] backdrop-blur-xs"
            />
            <div ref={drawerRef} className="absolute inset-y-0 left-0 z-10 shadow-[var(--shadow-medium)]">{sidebar}</div>
            <button
              type="button"
              onClick={close}
              className="absolute right-4 top-4 z-20 rounded-full bg-[var(--surface)] p-2 shadow-lg text-[var(--foreground)]"
              aria-label="Tutup menu navigasi"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="min-w-0 flex-1 lg:pl-[256px]">{children}</div>
        <BeginnerGuideModal />
      </div>
    </BeginnerGuideProvider>
  );
}

