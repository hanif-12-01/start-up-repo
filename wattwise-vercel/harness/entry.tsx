// Stage5G.14 synthetic browser harness.
// Renders REAL production components (TrendChart, ActiveLocationOverview, tour overlay,
// sidebar shell) with only the Next.js router, session and data layer stubbed.
// Not a production route; never shipped in the app bundle.
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import Link from 'next/link';
import { usePathname, useSearchParams, navigate, currentHref } from './next-stub';
import { TrendChart, type TrendPoint } from '@/components/analysis/TrendChart';
import { ActiveLocationOverview } from '@/components/product/ActiveLocationOverview';
import { BeginnerGuideProvider, InteractiveGuideOverlay } from '@/components/onboarding';
import { CORE_TOUR_STEPS } from '@/components/onboarding/guide-steps';
import { withBusinessId } from '@/lib/business-query';
import { ProductShell } from '@/components/product/ProductShell';
import { AnalysisView } from '@/components/analysis/AnalysisView';
import { ActiveLocationSelection } from '@/components/product/ActiveLocationSelection';

const POINTS: TrendPoint[] = [
  { period: '2026-04', label: 'April 2026', usageKwh: 380, billAmount: 560000, tariff: 1474, type: 'historical' },
  { period: '2026-05', label: 'Mei 2026', usageKwh: 420, billAmount: 620000, tariff: 1476, type: 'historical' },
  { period: '2026-06', label: 'Juni 2026', usageKwh: 395, billAmount: 590000, tariff: 1494, type: 'historical' },
  { period: '2026-07', label: 'Juli 2026', usageKwh: 470, billAmount: 705000, tariff: 1500, type: 'forecast' },
];

const BUSINESS = {
  id: 'biz-1',
  name: 'Kos Melati',
  segment: 'KOS',
  electricalSystem: 'TOKEN_PER_KAMAR',
  address: 'Jl. Melati 12',
  city: 'Bandung',
  province: 'Jawa Barat',
  roomCount: 12,
  occupiedRoomCount: 9,
  employeeCount: 2,
  operatingDaysPerMonth: 30,
  tariffRupiahPerKwh: '1500',
  powerVa: 5500,
};

const BILLS = [
  { id: 'bill-3', periodStart: '2026-06-01', periodEnd: '2026-06-30', totalAmountRupiah: 590000, kwh: '395', tariffRupiahPerKwh: '1494' },
  { id: 'bill-2', periodStart: '2026-05-01', periodEnd: '2026-05-31', totalAmountRupiah: 620000, kwh: '420', tariffRupiahPerKwh: '1476' },
  { id: 'bill-1', periodStart: '2026-04-01', periodEnd: '2026-04-30', totalAmountRupiah: 560000, kwh: '380', tariffRupiahPerKwh: '1474' },
];

const NAV = [
  { href: '/dashboard', label: 'Dashboard', tourId: 'sidebar-dashboard' },
  { href: '/bills', label: 'Tagihan', tourId: 'sidebar-bills' },
  { href: '/diagnostics', label: 'Cek Kenaikan', tourId: 'sidebar-diagnostics' },
  { href: '/reports', label: 'Laporan', tourId: 'sidebar-reports' },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const searchParams = useSearchParams();
  const ids = searchParams.getAll('businessId');
  const businessId = ids.length === 1 ? ids[0] : '';
  const pathname = usePathname();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const href = withBusinessId(item.href, businessId);
        return (
          <Link
            key={item.href}
            href={href}
            data-tour-id={item.tourId}
            onClick={onNavigate}
            aria-current={pathname === item.href ? 'page' : undefined}
            className="min-h-11 rounded-xl px-3 py-2.5 text-sm font-bold text-[var(--foreground)] hover:bg-[var(--primary-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function DashboardPanel({ hideCandidates = false }: { hideCandidates?: boolean }) {
  return (
    <>
      <header
        data-tour-id="dashboard-header"
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
      >
        <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[var(--primary)]">Lokasi aktif</p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Dashboard Kos Melati</h1>
        <p className="mt-1 text-xs text-[var(--muted)]">Estimasi berdasarkan data yang Anda masukkan.</p>
      </header>

      <section
        data-tour-id="dashboard-summary"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          ['Tagihan terbaru', 'Rp 590.000'],
          ['Pemakaian terbaru', '395 kWh'],
          ['Estimasi biaya harian', 'Rp 19.667'],
          ['Porsi terhadap pendapatan', '18%'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{label}</p>
            <p className="mt-2 text-lg font-black tabular-nums">{value}</p>
          </div>
        ))}
      </section>

      <section data-tour-id="dashboard-chart" className="grid gap-4 lg:grid-cols-2">
        <TrendChart points={POINTS} metric="rupiah" forecastLabel="Estimasi berikutnya" title="Tren biaya listrik" description="Lihat perubahan biaya listrik dari bulan ke bulan." />
        <TrendChart points={POINTS} metric="kwh" forecastLabel="Estimasi berikutnya" title="Tren pemakaian listrik" description="Lihat perubahan pemakaian listrik dalam kWh dari bulan ke bulan." />
      </section>

      {!hideCandidates && (
        <section data-tour-id="dashboard-candidates" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
          <h2 className="text-base font-black">Kandidat yang perlu diperiksa</h2>
          <p className="mt-1 text-xs text-[var(--muted)]">Indikasi dari data tagihan. Perlu verifikasi manual di lokasi.</p>
        </section>
      )}

      <section data-tour-id="dashboard-actions" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
        <h2 className="text-base font-black">Rencana hemat & evaluasi</h2>
        <p className="mt-1 text-xs text-[var(--muted)]">Catat tagihan bulan berikutnya untuk mengevaluasi hasil.</p>
      </section>

      <ActiveLocationOverview
        business={BUSINESS}
        businesses={[
          { id: 'biz-1', name: 'Kos Melati' },
          { id: 'biz-2', name: 'Kos Anggrek' },
        ]}
        bills={BILLS}
        diagnostics={{ available: true, reason: 'SUPPORTED' }}
        comparisonCount={BILLS.length - 1}
        costIncreaseDetected
        heading="Ringkasan lokasi aktif (Dashboard OFF)"
      />
    </>
  );
}

function BillsPanel() {
  return (
    <section data-tour-id="add-bill" className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h1 className="text-2xl font-black">Tagihan Listrik</h1>
      <button type="button" className="mt-3 inline-flex min-h-11 items-center rounded-xl bg-[var(--primary)] px-4 text-xs font-extrabold text-[var(--primary-foreground)]">
        Tambah Tagihan
      </button>
      <p className="mt-3 text-xs text-[var(--muted)]">Data tagihan bulanan membentuk riwayat pemakaian.</p>
    </section>
  );
}

function GenericPanel({ label }: { label: string }) {
  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <h1 className="text-2xl font-black">{label}</h1>
    </section>
  );
}

function TourControls() {
  const [completed, setCompleted] = useState('belum');
  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px]">
      <button
        type="button"
        data-harness="start"
        onClick={() => {
          sessionStorage.setItem('wattwise:interactive-tour:v2:active', 'true');
          sessionStorage.setItem('wattwise:interactive-tour:v2:step', '0');
          window.dispatchEvent(new Event('wattwise-tour-update'));
        }}
        className="min-h-11 rounded-xl bg-[var(--primary)] px-3 font-extrabold text-[var(--primary-foreground)]"
      >
        Mulai panduan
      </button>
      <button
        type="button"
        data-harness="stop"
        onClick={() => {
          sessionStorage.removeItem('wattwise:interactive-tour:v2:active');
          window.dispatchEvent(new Event('wattwise-tour-update'));
        }}
        className="min-h-11 rounded-xl border border-[var(--border-strong)] px-3 font-extrabold"
      >
        Tutup panduan
      </button>
      <span data-harness="completed">{completed}</span>
      <button
        type="button"
        data-harness="clear-completed"
        onClick={() => {
          localStorage.removeItem('wattwise:interactive-tour:v2:completed');
          setCompleted('dihapus');
        }}
        className="min-h-11 rounded-xl border border-[var(--border)] px-3"
      >
        Reset selesai
      </button>
      <span data-harness="href">{currentHref()}</span>
    </div>
  );
}

function FixtureShell() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
  const [hideCandidates, setHideCandidates] = useState(false);

  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', next === 'dark');
    setTheme(next);
  };

  return (
    <BeginnerGuideProvider
      steps={CORE_TOUR_STEPS}
      isMobileMenuOpen={menuOpen}
      onSetMobileMenuOpen={setMenuOpen}
    >
      <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        <div className="flex">
          <aside className="hidden w-[256px] shrink-0 border-r border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-4 lg:block">
            <p className="px-2 pb-3 text-sm font-extrabold">WattWise</p>
            <NavLinks />
          </aside>

          {menuOpen && (
            <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-label="Menu navigasi">
              <button
                type="button"
                aria-label="Tutup menu"
                onClick={() => setMenuOpen(false)}
                className="absolute inset-0 bg-[var(--overlay)]"
              />
              <aside
                id="product-mobile-menu"
                className="relative flex h-full w-[256px] max-w-[85vw] flex-col overflow-y-auto border-r border-[var(--border)] bg-[var(--surface-muted)] px-3.5 py-4"
              >
                <p className="px-2 pb-3 text-sm font-extrabold">WattWise</p>
                <NavLinks onNavigate={() => setMenuOpen(false)} />
              </aside>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
              <button
                type="button"
                aria-label="Buka menu"
                data-harness="menu"
                onClick={() => setMenuOpen((open) => !open)}
                className="min-h-11 min-w-11 rounded-xl border border-[var(--border-strong)] lg:hidden"
              >
                Menu
              </button>
              <button
                type="button"
                data-harness="theme"
                onClick={toggleTheme}
                className="min-h-11 rounded-xl border border-[var(--border-strong)] px-3 text-xs font-bold"
              >
                Tema: {theme}
              </button>
              <button
                type="button"
                data-harness="hide-candidates"
                onClick={() => setHideCandidates((value) => !value)}
                className="min-h-11 rounded-xl border border-[var(--border-strong)] px-3 text-xs font-bold"
              >
                Sembunyikan kandidat: {hideCandidates ? 'ya' : 'tidak'}
              </button>
              <TourControls />
            </div>

            <main className="space-y-4 px-4 py-5 sm:px-6 lg:px-8">
              {pathname === '/dashboard' && <DashboardPanel hideCandidates={hideCandidates} />}
              {pathname === '/bills' && <BillsPanel />}
              {pathname === '/diagnostics' && <GenericPanel label="Cek Kenaikan" />}
              {pathname === '/reports' && <GenericPanel label="Laporan" />}
              {!['/dashboard', '/bills', '/diagnostics', '/reports', '/businesses', '/analysis'].includes(pathname) && (
                <GenericPanel label={`Halaman ${pathname}`} />
              )}
              {['/businesses', '/analysis'].includes(pathname) && <GenericPanel label={`Halaman ${pathname}`} />}
            </main>
          </div>
        </div>
        <InteractiveGuideOverlay />
      </div>
    </BeginnerGuideProvider>
  );
}

declare global {
  interface Window {
    __harness?: { navigate: typeof navigate; currentHref: typeof currentHref };
  }
}

window.__harness = { navigate, currentHref };

function Shell() {
  const pathname = usePathname();
  const query = useSearchParams();
  const [hidden, setHidden] = useState(false);
  return (
    <ProductShell userName="Synthetic fixture" businessCount={2} diagnosticsEnabled>
      <div className="flex flex-wrap gap-2 p-4">
        <button data-harness="theme" onClick={() => document.documentElement.classList.toggle('dark')}>Tema</button>
        <button data-harness="hide-candidates" onClick={() => setHidden(!hidden)}>Sembunyikan kandidat</button>
        <TourControls />
      </div>
      <main className="space-y-4 px-4 py-5 sm:px-6 lg:px-8">
        {pathname === '/analysis' ? <AnalysisFixture activeTab={query.get('tab') ?? 'trend'} /> : pathname === '/dashboard' && query.get('fixture') === 'selection' ? <ActiveLocationSelection businesses={[BUSINESS, { ...BUSINESS, id: 'biz-2', name: 'Kos Anggrek' }]} /> : pathname === '/dashboard' && query.get('fixture') === 'overview' ? <ActiveLocationOverview business={BUSINESS} businesses={[BUSINESS]} bills={BILLS} diagnostics={{ available: true, reason: 'SUPPORTED' }} comparisonCount={2} costIncreaseDetected={false} /> : pathname === '/dashboard' ? <DashboardPanel hideCandidates={hidden} /> : pathname === '/bills' ? <BillsPanel /> : <GenericPanel label={pathname} />}
      </main>
    </ProductShell>
  );
}

function AnalysisFixture({ activeTab }: { activeTab: string }) {
  return <AnalysisView
    data={{ business: { ...BUSINESS, businessType: 'KOS' }, businesses: [{ ...BUSINESS, businessType: 'KOS' }], bills: BILLS.map(bill => ({ ...bill, totalAmountRupiah: BigInt(bill.totalAmountRupiah) })), latestBill: BILLS[0], appliances: [] }}
    tariff={1500}
    samples={POINTS.filter((point) => point.type === 'historical').map((point) => ({ period: point.period, usageKwh: point.usageKwh, billAmount: point.billAmount!, tariff: point.tariff! }))}
    forecastPlan={{ reportingPhase: 'H03_05', continuousHistoryMonths: 3, requestedEngine: 'deterministic_baseline', targetPeriod: '2026-07', deterministicPrediction: { hasPrediction: true, predictedUsageKwh: 410.21, estimatedBill: 615312.5, previousUsageKwh: 395, changePercent: 3.9, risk: 'LOW', confidence: 'Sedang', method: 'Tren linear & rata-rata bergerak berbobot', historyMonths: 3, hasGaps: false, gapMonths: 0, highVolatility: false }, history6m: null, tariff: 1500, modelVersion: null, eligible: false, sourceLabel: 'Prediksi aman berdasarkan histori tersedia', phaseLabel: 'Histori 3 bulan', dataProvenance: 'SYNTHETIC_DEMO' }}
    anomaly={{ hasData: true, status: 'Normal', baseline: 620000, observed: 590000, differencePercent: -4.84 }}
    score={{ score: 75, label: 'Cukup', confidence: 'Rendah' }}
    recommendations={[]}
    entitlements={{ limits: { detailedAnalysis: true } }}
    activeTab={activeTab} businessQuery="businessId=biz-1" diagnosticsAvailable
  />;
}

// Retained fixture shell for comparing historical synthetic screenshots only.
void FixtureShell;
createRoot(document.getElementById('root')!).render(<Shell />);
