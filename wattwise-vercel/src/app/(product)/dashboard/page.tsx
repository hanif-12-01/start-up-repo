import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import {
  BadgeCheck,
  Calculator,
  CalendarDays,
  Compass,
  FileText,
  Lightbulb,
  Percent,
  PlugZap,
  ReceiptText,
  Search,
  TriangleAlert,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import { businessSegmentLabel, decimal, formatMonth, rupiah } from '@/lib/format';
import { SoftCard, secondaryButton } from '@/components/product/WorkspaceUI';
import { getOptionalSession } from '@/server/auth/session';
import {
  DashboardBusinessNotFoundError,
  DashboardUnavailableError,
  getDashboardReadModel,
} from '@/server/services/dashboard.service';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';
import { getDecisionSupport } from '@/server/services/workspace.service';
import { getProductAnalysisReadModel } from '@/server/services/product-analysis';
import { StartDiagnosticButton } from '../diagnostics/StartDiagnosticButton';

export const dynamic = 'force-dynamic';

const quickLinks = [
  ['/bills/new', ReceiptText, 'Tambah tagihan', 'Catat periode baru'],
  ['/revenue', WalletCards, 'Catat pendapatan', 'Lihat rasio listrik'],
  ['/appliances', PlugZap, 'Kelola peralatan', 'Profil alat opsional'],
  ['/predictions', Calculator, 'Buka simulator', 'Coba skenario alat'],
  ['/recommendations', Lightbulb, 'Lihat rekomendasi', 'Prioritas tindakan'],
  ['/reports/monthly', FileText, 'Buka laporan', 'Ringkasan bulanan'],
] satisfies Array<[string, LucideIcon, string, string]>;

function KpiCard({
  Icon,
  label,
  value,
  note,
  accent = false,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  note: string;
  accent?: boolean;
}) {
  return (
    <article className={`rounded-3xl border p-5 ${accent ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--foreground)]'}`}>
      <div className="flex items-center justify-between">
        <span aria-hidden="true" className={`grid h-10 w-10 place-items-center rounded-2xl ${accent ? 'bg-white/15' : 'bg-[var(--primary-soft)]'}`}>
          <Icon className="h-5 w-5" />
        </span>
        <span className={`text-[10px] font-extrabold uppercase tracking-[0.14em] ${accent ? 'text-emerald-100' : 'text-[var(--muted)]'}`}>{label}</span>
      </div>
      <p className="mt-5 text-2xl font-black tracking-tight">{value}</p>
      <p className={`mt-2 text-xs leading-5 ${accent ? 'text-emerald-100' : 'text-[var(--muted)]'}`}>{note}</p>
    </article>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string | string[] }>;
}) {
  const session = await getOptionalSession();
  if (!session?.user) redirect('/login');
  const userId = session.user.id;
  const journeyStep = await resolveJourneyStep(userId);
  if (journeyStep !== 'COMPLETE') redirect(getJourneyRedirect(journeyStep));

  const query = await searchParams;
  if (Array.isArray(query.businessId)) notFound();
  const requestedBusinessId = typeof query.businessId === 'string' && query.businessId.trim()
    ? query.businessId
    : undefined;

  let dashboard;
  try {
    dashboard = await getDashboardReadModel(userId, requestedBusinessId);
  } catch (error) {
    if (error instanceof DashboardUnavailableError) redirect('/setup');
    if (error instanceof DashboardBusinessNotFoundError) notFound();
    throw error;
  }

  const selectedBusinessId = dashboard.businessSummary.options.find((item) => item.selected)?.id;
  if (!selectedBusinessId) notFound();
  const [support, analysisReadModel] = await Promise.all([
    getDecisionSupport(userId, selectedBusinessId),
    getProductAnalysisReadModel(userId, selectedBusinessId),
  ]);
  const anomaly = analysisReadModel.anomaly;
  const businessQuery = `?businessId=${encodeURIComponent(selectedBusinessId)}`;
  const latestOutcome = dashboard.outcomeSummaries[0] ?? null;

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-5 border-b border-[var(--border)] pb-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--primary)]">Dashboard kendali biaya</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] sm:text-4xl">
              Halo, {session.user.name?.split(' ')[0] || 'Pemilik Usaha'}
            </h1>
            <p className="mt-3 text-sm text-[var(--muted)]">
              Berikut ringkasan <strong>{dashboard.businessSummary.name}</strong> dan satu langkah paling relevan untuk dilanjutkan.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            {dashboard.businessSummary.options.length > 1 && (
              <form action="/dashboard" method="get" className="flex items-end gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-2.5">
                <label>
                  <span className="mb-1 block text-[10px] font-bold uppercase text-[var(--primary)]">Usaha aktif</span>
                  <select name="businessId" defaultValue={selectedBusinessId} className="min-w-48 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-[var(--focus)]">
                    {dashboard.businessSummary.options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <button className="rounded-lg bg-[var(--primary)] px-3 py-2 text-sm font-bold text-white">Pilih</button>
              </form>
            )}
            <Link href="/businesses" className={secondaryButton}>Kelola Usaha</Link>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[2rem] bg-emerald-950 p-6 text-white shadow-[0_30px_80px_-50px_rgba(6,78,59,0.9)] sm:p-8">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" aria-hidden="true" />
          <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-300">Langkah berikutnya</p>
              <h2 className="mt-3 max-w-3xl text-2xl font-black tracking-tight sm:text-3xl">{dashboard.nextAction.label}</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-100/75">Satu tindakan utama dipilih dari progres data dan perjalanan Cek Kenaikan Anda. Dashboard tidak membuat prediksi atau menetapkan penyebab.</p>
            </div>
            <div>
              {dashboard.nextAction.kind === 'START_DIAGNOSTIC'
                ? <StartDiagnosticButton electricityBillId={dashboard.nextAction.electricityBillId} resumable={false} />
                : <Link href={dashboard.nextAction.href} className="inline-flex rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-emerald-900 hover:bg-emerald-50">{dashboard.nextAction.label} →</Link>}
            </div>
          </div>
          <nav aria-label="Tautan pendukung" className="relative mt-6 flex flex-wrap gap-4 border-t border-white/10 pt-4">
            {dashboard.secondaryLinks.map((item) => <Link key={item.label} href={item.href} className="text-xs font-bold text-emerald-100 underline decoration-emerald-500 underline-offset-4 hover:text-white">{item.label}</Link>)}
          </nav>
        </section>

        {anomaly.hasData && (anomaly.status === 'Perlu Dicek' || anomaly.status === 'Boros') && (
          <Link
            href={`/analysis?businessId=${encodeURIComponent(selectedBusinessId)}&tab=anomaly`}
            className={`flex flex-col gap-3 rounded-2xl border p-4 transition sm:flex-row sm:items-center sm:justify-between ${
              anomaly.status === 'Boros'
                ? 'border-amber-400 bg-amber-100/80 text-amber-950 hover:bg-amber-100'
                : 'border-amber-300 bg-amber-50 text-amber-950 hover:bg-amber-100'
            }`}
          >
            <span className="flex items-start gap-3">
              <TriangleAlert aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
              <span>
                <strong className="block text-sm">
                  {anomaly.status === 'Boros' ? 'Indikasi pemakaian boros' : 'Pemakaian perlu ditinjau'}
                </strong>
                <span className="mt-1 block text-xs leading-5">
                  {anomaly.status === 'Boros'
                    ? `Terdeteksi kenaikan pemakaian signifikan sebesar ${anomaly.differencePercent?.toFixed(1)}% dari baseline tercatat.`
                    : `Terdeteksi kenaikan pemakaian indikatif sebesar ${anomaly.differencePercent?.toFixed(1)}% dari baseline tercatat.`}
                </span>
              </span>
            </span>
            <span className="text-xs font-extrabold text-amber-900">Lihat analisis indikasi →</span>
          </Link>
        )}

        <section aria-label="Ringkasan utama" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard Icon={ReceiptText} label="Tagihan terbaru" value={dashboard.latestBillSummary?.totalCost ?? 'Belum ada data'} note={dashboard.latestBillSummary?.period ?? 'Masukkan tagihan untuk memulai'} accent />
          <KpiCard Icon={CalendarDays} label="Biaya per hari" value={dashboard.latestBillSummary?.dailyCost ?? 'Belum tersedia'} note={dashboard.billComparisonSummary?.dailyCostChange ?? 'Perlu satu periode tagihan'} />
          <KpiCard Icon={WalletCards} label="Pendapatan bulan sama" value={support.matchingRevenue ? rupiah.format(support.matchingRevenue.amountRupiah) : 'Belum dicatat'} note={support.matchingRevenue?.inputMode === 'ESTIMATE' ? 'Perkiraan pengguna' : 'Gunakan untuk konteks cash flow'} />
          <KpiCard Icon={Percent} label="Rasio listrik" value={support.ratio === null ? 'Belum tersedia' : `${decimal.format(support.ratio)}%`} note="Porsi biaya listrik terhadap omzet, bukan margin laba" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <SoftCard>
            <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">Riwayat biaya</p><h2 className="mt-1 text-xl font-black">Tren tagihan tercatat</h2></div><Link href={`/bills${businessQuery}`} className="text-xs font-extrabold text-[var(--primary)]">Lihat semua →</Link></div>
            {support.bills.length === 0
              ? <p className="mt-6 rounded-2xl border border-dashed border-[var(--border)] p-8 text-center text-sm text-[var(--muted)]">Belum ada tagihan untuk ditampilkan.</p>
              : (() => {
                  const W = 560; const H = 200;
                  const padL = 12; const padR = 12; const padT = 36; const padB = 32;
                  const chartW = W - padL - padR;
                  const chartH = H - padT - padB;
                  const bills = [...support.bills].reverse();
                  const minVal = Math.min(...bills.map((b) => Number(b.totalAmountRupiah)));
                  const maxVal = Math.max(...bills.map((b) => Number(b.totalAmountRupiah)));
                  const valRange = maxVal - minVal || 1;
                  const getX = (i: number) => padL + (bills.length === 1 ? chartW / 2 : (i / (bills.length - 1)) * chartW);
                  const getY = (v: number) => padT + chartH - ((v - minVal) / valRange) * chartH;
                  const pts = bills.map((b, i) => ({ x: getX(i), y: getY(Number(b.totalAmountRupiah)), b }));
                  const polyline = pts.map((p) => `${p.x},${p.y}`).join(' ');
                  const areaPath = `M ${pts[0].x} ${padT + chartH} L ${pts.map((p) => `${p.x} ${p.y}`).join(' L ')} L ${pts.at(-1)!.x} ${padT + chartH} Z`;
                  return (
                    <div className="mt-4">
                      <svg
                        viewBox={`0 0 ${W} ${H}`}
                        className="w-full h-auto"
                        role="img"
                        aria-label="Grafik tren tagihan bulanan"
                        style={{ overflow: 'visible' }}
                      >
                        <defs>
                          <linearGradient id="lineArea" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
                            <stop offset="100%" stopColor="#059669" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                        {[0, 0.5, 1].map((t) => (
                          <line
                            key={t}
                            x1={padL} x2={W - padR}
                            y1={padT + chartH * (1 - t)} y2={padT + chartH * (1 - t)}
                            stroke="currentColor" strokeOpacity="0.1" strokeWidth="1"
                            className="text-[var(--foreground)]"
                          />
                        ))}
                        <path d={areaPath} fill="url(#lineArea)" />
                        <polyline
                          points={polyline}
                          fill="none"
                          stroke="#059669"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {pts.map((p, i) => (
                          <g key={bills[i].id}>
                            <text
                              x={p.x} y={p.y - 10}
                              textAnchor="middle"
                              fontSize="9"
                              fontWeight="700"
                              fill="#059669"
                            >
                              {rupiah.format(bills[i].totalAmountRupiah)}
                            </text>
                            <circle cx={p.x} cy={p.y} r="4" fill="#059669" stroke="white" strokeWidth="2" />
                            <text
                              x={p.x} y={padT + chartH + 18}
                              textAnchor="middle"
                              fontSize="10"
                              fontWeight="600"
                              fill="currentColor"
                              className="text-[var(--muted)]"
                              opacity="0.7"
                            >
                              {formatMonth(bills[i].periodEnd).split(' ')[0].slice(0, 3)}
                            </text>
                          </g>
                        ))}
                      </svg>
                      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                        Grafik menggunakan total biaya yang dimasukkan pengguna. Bandingkan biaya per hari ketika panjang periode berbeda.
                      </p>
                    </div>
                  );
                })()}
          </SoftCard>

          <SoftCard>
            <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">Akses cepat</p><h2 className="mt-1 text-xl font-black">Kelola data usaha</h2></div><Compass aria-hidden="true" className="h-6 w-6 text-[var(--primary)]" /></div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
              {quickLinks.map(([href, Icon, title, note]) => (
                <Link key={href} href={`${href}${href.includes('?') ? '&' : '?'}businessId=${encodeURIComponent(selectedBusinessId)}`} className="flex items-center gap-3 rounded-2xl border border-[var(--border)] p-3 transition hover:border-emerald-500/40 hover:bg-[var(--primary-soft)]">
                  <span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-[var(--surface-muted)]"><Icon className="h-5 w-5 text-[var(--primary)]" /></span>
                  <span><strong className="block text-sm">{title}</strong><span className="mt-0.5 block text-xs text-[var(--muted)]">{note}</span></span>
                </Link>
              ))}
            </div>
          </SoftCard>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <SoftCard>
            <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">Cek Kenaikan</p><h2 className="mt-1 text-xl font-black">Bagian yang perlu dicek</h2></div><Search aria-hidden="true" className="h-6 w-6 text-[var(--primary)]" /></div>
            {dashboard.candidateSummaries.length === 0
              ? <p className="mt-5 rounded-2xl border border-dashed border-[var(--border)] p-6 text-sm leading-6 text-[var(--muted)]">Belum ada kandidat. Jalankan Cek Kenaikan setelah dua periode tagihan tersedia.</p>
              : <ol className="mt-5 space-y-3">{dashboard.candidateSummaries.map((candidate) => <li key={`${candidate.rankLabel}-${candidate.title}`} className="rounded-2xl bg-[var(--surface-muted)] p-4"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--primary)]">{candidate.rankLabel}</span><span className="text-[10px] font-bold text-[var(--muted)]">{candidate.inspectionStatusLabel}</span></div><h3 className="mt-2 font-extrabold">{candidate.title}</h3><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{candidate.explanation}</p></li>)}</ol>}
          </SoftCard>

          <SoftCard>
            <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">Tindakan berjalan</p><h2 className="mt-1 text-xl font-black">Rencana Hemat</h2></div><BadgeCheck aria-hidden="true" className="h-6 w-6 text-[var(--primary)]" /></div>
            {dashboard.actionPlanSummaries.length === 0
              ? <p className="mt-5 rounded-2xl border border-dashed border-[var(--border)] p-6 text-sm leading-6 text-[var(--muted)]">Belum ada Rencana Hemat. Rencana dapat dibuat setelah pemeriksaan kandidat.</p>
              : <div className="mt-5 space-y-3">{dashboard.actionPlanSummaries.map((action) => <article key={action.title} className="rounded-2xl bg-[var(--primary-soft)] p-4"><h3 className="font-extrabold">{action.title}</h3><p className="mt-1 text-xs font-bold text-[var(--primary)]">{action.statusLabel}</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">Mulai {action.plannedStartDate} · {action.reviewTarget}</p></article>)}</div>}
            {latestOutcome && <div className="mt-4 border-t border-[var(--border)] pt-4"><p className="text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">Evaluasi hasil terakhir</p><p className="mt-2 font-extrabold">{latestOutcome.overallOutcomeLabel}</p><p className="mt-2 text-xs leading-5 text-[var(--muted)]">{latestOutcome.baselinePeriod} → {latestOutcome.followUpPeriod} · {latestOutcome.costDirectionLabel}</p><p className="mt-2 text-[11px] leading-5 text-[var(--muted)]">{latestOutcome.caveat}</p></div>}
          </SoftCard>
        </section>

        <footer className="flex flex-col gap-3 border-t border-[var(--border)] py-5 text-xs text-[var(--muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>Data terakhir diperbarui {dashboard.dataFreshness.updatedAt} · {dashboard.dataFreshness.label}</p>
          <p>{businessSegmentLabel(support.business.segment)} · {dashboard.planSummary?.usageLabel ?? 'Paket aktif'}</p>
        </footer>
      </div>
    </main>
  );
}
