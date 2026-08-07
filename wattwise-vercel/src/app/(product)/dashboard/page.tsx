import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { businessSegmentLabel, decimal, formatMonth, rupiah } from '@/lib/format';
import { SoftCard, secondaryButton } from '@/components/product/WorkspaceUI';
import { getOptionalSession } from '@/server/auth/session';
import { DashboardBusinessNotFoundError, DashboardUnavailableError, getDashboardReadModel } from '@/server/services/dashboard.service';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';
import { getDecisionSupport } from '@/server/services/workspace.service';
import { StartDiagnosticButton } from '../diagnostics/StartDiagnosticButton';

export const dynamic = 'force-dynamic';

const quickLinks = [
  ['/bills/new', '🧾', 'Tambah tagihan', 'Catat periode baru'],
  ['/revenue', '💰', 'Catat pendapatan', 'Lihat rasio listrik'],
  ['/appliances', '🔌', 'Kelola peralatan', 'Profil alat opsional'],
  ['/predictions', '🧮', 'Buka simulator', 'Coba skenario alat'],
  ['/recommendations', '💡', 'Lihat rekomendasi', 'Prioritas tindakan'],
  ['/reports/monthly', '📄', 'Buka laporan', 'Ringkasan bulanan'],
];

function KpiCard({ icon, label, value, note, accent = false }: { icon: string; label: string; value: string; note: string; accent?: boolean }) {
  return <article className={`rounded-3xl border p-5 ${accent ? 'border-emerald-700 bg-emerald-700 text-white' : 'border-emerald-900/10 bg-white text-slate-900'}`}><div className="flex items-center justify-between"><span aria-hidden="true" className={`grid h-10 w-10 place-items-center rounded-2xl ${accent ? 'bg-white/15' : 'bg-emerald-50'}`}>{icon}</span><span className={`text-[10px] font-extrabold uppercase tracking-[0.14em] ${accent ? 'text-emerald-100' : 'text-slate-600'}`}>{label}</span></div><p className="mt-5 text-2xl font-black tracking-tight">{value}</p><p className={`mt-2 text-xs leading-5 ${accent ? 'text-emerald-100' : 'text-slate-600'}`}>{note}</p></article>;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ businessId?: string | string[] }> }) {
  const session = await getOptionalSession();
  if (!session?.user) redirect('/login');
  const userId = session.user.id;
  const journeyStep = await resolveJourneyStep(userId);
  if (journeyStep !== 'COMPLETE') redirect(getJourneyRedirect(journeyStep));
  const query = await searchParams;
  if (Array.isArray(query.businessId)) notFound();
  const requestedBusinessId = typeof query.businessId === 'string' && query.businessId.trim() ? query.businessId : undefined;

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
  const support = await getDecisionSupport(userId, selectedBusinessId);
  const businessQuery = `?businessId=${encodeURIComponent(selectedBusinessId)}`;
  const maxBill = Math.max(...support.bills.map((item) => Number(item.totalAmountRupiah)), 1);
  const latestOutcome = dashboard.outcomeSummaries[0] ?? null;

  return (
    <main className="min-h-screen bg-[#f7f9f4] px-4 py-6 text-slate-900 sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-5 border-b border-emerald-900/10 pb-6 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-700">Dashboard kendali biaya</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.04em] text-emerald-950 sm:text-4xl">Halo, {session.user.name?.split(' ')[0] || 'Pemilik Usaha'} 👋</h1>
            <p className="mt-3 text-sm text-slate-600">Berikut ringkasan <strong>{dashboard.businessSummary.name}</strong> dan satu langkah paling relevan untuk dilanjutkan.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            {dashboard.businessSummary.options.length > 1 && <form action="/dashboard" method="get" className="flex items-end gap-2 rounded-2xl border border-emerald-900/10 bg-white p-2.5"><label><span className="mb-1 block text-[10px] font-bold uppercase text-emerald-700">Usaha aktif</span><select name="businessId" defaultValue={selectedBusinessId} className="min-w-48 rounded-lg border border-emerald-900/15 bg-[#fbfcfa] px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-emerald-500">{dashboard.businessSummary.options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><button className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white">Pilih</button></form>}
            <Link href="/businesses" className={secondaryButton}>Kelola Usaha</Link>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-[2rem] bg-emerald-950 p-6 text-white shadow-[0_30px_80px_-50px_rgba(6,78,59,0.9)] sm:p-8">
          <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-emerald-400/15 blur-3xl" aria-hidden="true" />
          <div className="relative grid gap-7 lg:grid-cols-[1fr_auto] lg:items-center">
            <div><p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-300">Langkah berikutnya</p><h2 className="mt-3 max-w-3xl text-2xl font-black tracking-tight sm:text-3xl">{dashboard.nextAction.label}</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-100/75">Satu tindakan utama dipilih dari progres data dan perjalanan Cek Kenaikan Anda. Dashboard tidak membuat prediksi atau menetapkan penyebab.</p></div>
            <div>{dashboard.nextAction.kind === 'START_DIAGNOSTIC' ? <StartDiagnosticButton electricityBillId={dashboard.nextAction.electricityBillId} resumable={false} /> : <Link href={dashboard.nextAction.href} className="inline-flex rounded-xl bg-white px-5 py-3 text-sm font-extrabold text-emerald-900 hover:bg-emerald-50">{dashboard.nextAction.label} →</Link>}</div>
          </div>
          <nav aria-label="Tautan pendukung" className="relative mt-6 flex flex-wrap gap-4 border-t border-white/10 pt-4">{dashboard.secondaryLinks.map((item) => <Link key={item.label} href={item.href} className="text-xs font-bold text-emerald-100 underline decoration-emerald-500 underline-offset-4 hover:text-white">{item.label}</Link>)}</nav>
        </section>

        {support.anomalies.length > 0 && <Link href={`/anomalies${businessQuery}`} className="flex flex-col gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-amber-950 transition hover:bg-amber-100 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-start gap-3"><span aria-hidden="true" className="text-xl">⚠️</span><span><strong className="block text-sm">Ada periode yang perlu ditinjau</strong><span className="mt-1 block text-xs leading-5">{support.anomalies.length} perubahan biaya harian melewati ambang indikasi 15%.</span></span></span><span className="text-xs font-extrabold">Lihat indikasi →</span></Link>}

        <section aria-label="Ringkasan utama" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard icon="🧾" label="Tagihan terbaru" value={dashboard.latestBillSummary?.totalCost ?? 'Belum ada data'} note={dashboard.latestBillSummary?.period ?? 'Masukkan tagihan untuk memulai'} accent />
          <KpiCard icon="📅" label="Biaya per hari" value={dashboard.latestBillSummary?.dailyCost ?? 'Belum tersedia'} note={dashboard.billComparisonSummary?.dailyCostChange ?? 'Perlu satu periode tagihan'} />
          <KpiCard icon="💰" label="Pendapatan bulan sama" value={support.matchingRevenue ? rupiah.format(support.matchingRevenue.amountRupiah) : 'Belum dicatat'} note={support.matchingRevenue?.inputMode === 'ESTIMATE' ? 'Perkiraan pengguna' : 'Gunakan untuk konteks cash flow'} />
          <KpiCard icon="📌" label="Rasio listrik" value={support.ratio === null ? 'Belum tersedia' : `${decimal.format(support.ratio)}%`} note="Porsi biaya listrik terhadap omzet, bukan margin laba" />
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
          <SoftCard>
            <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">Riwayat biaya</p><h2 className="mt-1 text-xl font-black text-emerald-950">Tren tagihan tercatat</h2></div><Link href={`/bills${businessQuery}`} className="text-xs font-extrabold text-emerald-700">Lihat semua →</Link></div>
            {support.bills.length === 0 ? <p className="mt-6 rounded-2xl border border-dashed border-emerald-900/20 p-8 text-center text-sm text-slate-600">Belum ada tagihan untuk ditampilkan.</p> : <div className="mt-8"><div className="flex h-52 items-end gap-2 sm:gap-4" role="img" aria-label="Grafik tagihan bulanan">{[...support.bills].reverse().map((bill) => { const height = Math.max(12, Number(bill.totalAmountRupiah) / maxBill * 100); return <div key={bill.id} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="hidden text-[10px] font-bold text-emerald-700 group-hover:block sm:block">{rupiah.format(bill.totalAmountRupiah)}</span><div className="w-full max-w-14 rounded-t-xl bg-gradient-to-t from-emerald-700 to-emerald-400 transition hover:from-emerald-800" style={{ height: `${height}%` }} /><span className="max-w-full truncate text-[10px] font-bold text-slate-600">{formatMonth(bill.periodEnd).split(' ')[0].slice(0, 3)}</span></div>; })}</div><p className="mt-5 text-xs leading-5 text-slate-600">Grafik menggunakan total biaya yang dimasukkan pengguna. Bandingkan biaya per hari ketika panjang periode berbeda.</p></div>}
          </SoftCard>

          <SoftCard>
            <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">Akses cepat</p><h2 className="mt-1 text-xl font-black text-emerald-950">Kelola data usaha</h2></div><span aria-hidden="true" className="text-2xl">🧭</span></div>
            <div className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">{quickLinks.map(([href, icon, title, note]) => <Link key={href} href={`${href}${href.includes('?') ? '&' : '?'}businessId=${encodeURIComponent(selectedBusinessId)}`} className="flex items-center gap-3 rounded-2xl border border-emerald-900/10 p-3 transition hover:border-emerald-500/40 hover:bg-emerald-50"><span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-[#f7f9f4]">{icon}</span><span><strong className="block text-sm text-emerald-950">{title}</strong><span className="mt-0.5 block text-xs text-slate-500">{note}</span></span></Link>)}</div>
          </SoftCard>
        </section>

        <section className="grid gap-6 lg:grid-cols-2">
          <SoftCard>
            <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">Cek Kenaikan</p><h2 className="mt-1 text-xl font-black text-emerald-950">Bagian yang perlu dicek</h2></div><span aria-hidden="true" className="text-2xl">🔎</span></div>
            {dashboard.candidateSummaries.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-emerald-900/20 p-6 text-sm leading-6 text-slate-500">Belum ada kandidat. Jalankan Cek Kenaikan setelah dua periode tagihan tersedia.</p> : <ol className="mt-5 space-y-3">{dashboard.candidateSummaries.map((candidate) => <li key={`${candidate.rankLabel}-${candidate.title}`} className="rounded-2xl bg-[#f7f9f4] p-4"><div className="flex items-center justify-between gap-3"><span className="text-[10px] font-extrabold uppercase tracking-wide text-emerald-700">{candidate.rankLabel}</span><span className="text-[10px] font-bold text-slate-400">{candidate.inspectionStatusLabel}</span></div><h3 className="mt-2 font-extrabold text-emerald-950">{candidate.title}</h3><p className="mt-2 text-xs leading-5 text-slate-600">{candidate.explanation}</p></li>)}</ol>}
          </SoftCard>

          <SoftCard>
            <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">Tindakan berjalan</p><h2 className="mt-1 text-xl font-black text-emerald-950">Rencana Hemat</h2></div><span aria-hidden="true" className="text-2xl">✅</span></div>
            {dashboard.actionPlanSummaries.length === 0 ? <p className="mt-5 rounded-2xl border border-dashed border-emerald-900/20 p-6 text-sm leading-6 text-slate-500">Belum ada Rencana Hemat. Rencana dapat dibuat setelah pemeriksaan kandidat.</p> : <div className="mt-5 space-y-3">{dashboard.actionPlanSummaries.map((action) => <article key={action.title} className="rounded-2xl bg-emerald-50/60 p-4"><h3 className="font-extrabold text-emerald-950">{action.title}</h3><p className="mt-1 text-xs font-bold text-emerald-700">{action.statusLabel}</p><p className="mt-2 text-xs leading-5 text-slate-500">Mulai {action.plannedStartDate} · {action.reviewTarget}</p></article>)}</div>}
            {latestOutcome && <div className="mt-4 border-t border-emerald-900/10 pt-4"><p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Evaluasi hasil terakhir</p><p className="mt-2 font-extrabold text-emerald-950">{latestOutcome.overallOutcomeLabel}</p><p className="mt-2 text-xs leading-5 text-slate-600">{latestOutcome.baselinePeriod} → {latestOutcome.followUpPeriod} · {latestOutcome.costDirectionLabel}</p><p className="mt-2 text-[11px] leading-5 text-slate-500">{latestOutcome.caveat}</p></div>}
          </SoftCard>
        </section>

        <footer className="flex flex-col gap-3 border-t border-emerald-900/10 py-5 text-xs text-slate-600 sm:flex-row sm:items-center sm:justify-between"><p>Data terakhir diperbarui {dashboard.dataFreshness.updatedAt} · {dashboard.dataFreshness.label}</p><p>{businessSegmentLabel(support.business.segment)} · {dashboard.planSummary?.usageLabel ?? 'Paket aktif'}</p></footer>
      </div>
    </main>
  );
}
