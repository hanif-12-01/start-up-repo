import Link from 'next/link';
import { Leaf, TriangleAlert } from 'lucide-react';
import { decimal, formatMonth, rupiah } from '@/lib/format';
import { BusinessSelector, EmptyState, SoftCard, WorkspaceHeader, WorkspacePage, primaryButton } from '@/components/product/WorkspaceUI';
import { readRequestedBusiness, requireWorkspacePage } from '@/server/services/workspace-page';
import { getDecisionSupport } from '@/server/services/workspace.service';

export const dynamic = 'force-dynamic';

export default async function AnomaliesPage({ searchParams }: { searchParams: Promise<{ businessId?: string | string[] }> }) {
  const requestedBusinessId = await readRequestedBusiness(searchParams);
  const { userId } = await requireWorkspacePage(requestedBusinessId);
  const data = await getDecisionSupport(userId, requestedBusinessId);
  const query = `?businessId=${encodeURIComponent(data.business.id)}`;
  return (
    <WorkspacePage>
      <WorkspaceHeader eyebrow="Indikasi perubahan" title="Periode yang perlu ditinjau" description="WattWise membandingkan biaya per hari dan menandai perubahan di atas 15% sebagai sinyal awal. Tanda ini bukan diagnosis penyebab." actions={<BusinessSelector businesses={data.businesses} selectedId={data.business.id} route="/anomalies" />} />
      {data.anomalies.length === 0 ? <SoftCard><EmptyState icon={Leaf} title="Belum ada perubahan besar yang ditandai" description={data.bills.length < 2 ? 'Tambahkan minimal dua tagihan agar perbandingan biaya harian dapat dilakukan.' : 'Tidak ada kenaikan biaya harian di atas ambang tinjauan pada riwayat yang tersedia.'} href={`/bills${query}`} action="Lihat Tagihan" /></SoftCard> : (
        <div className="space-y-4">{data.anomalies.map((item) => { const change = item.changePercent ?? 0; const severity = change >= 30 ? 'Tinggi' : change >= 20 ? 'Sedang' : 'Ringan'; return <SoftCard key={item.current.id}><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div className="flex items-start gap-4"><span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400"><TriangleAlert className="h-6 w-6"/></span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black text-[var(--foreground)]">{formatMonth(item.current.periodEnd)}</h2><span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-[10px] font-extrabold text-amber-600 dark:text-amber-400">Perhatian {severity}</span></div><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">Biaya harian tercatat naik sekitar <strong>{decimal.format(change)}%</strong> dibanding periode sebelumnya. Periksa perbedaan hari, tarif, kegiatan, okupansi, dan kondisi operasional sebelum menilai kandidat alat.</p></div></div><div className="grid min-w-56 grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-[var(--surface-muted)] p-3"><p className="text-[10px] font-bold uppercase text-[var(--muted)]">Periode ini</p><p className="mt-1 text-sm font-black text-[var(--foreground)]">{rupiah.format(item.currentDaily)}/hari</p></div><div className="rounded-xl bg-[var(--surface-muted)] p-3"><p className="text-[10px] font-bold uppercase text-[var(--muted)]">Sebelumnya</p><p className="mt-1 text-sm font-black text-[var(--foreground)]">{rupiah.format(item.previousDaily)}/hari</p></div></div></div><div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border)] pt-4"><Link href={`/bills${query}`} className={primaryButton}>Jalankan Cek Kenaikan</Link><Link href={`/reports/monthly${query}&month=${item.current.periodEnd.slice(0, 7)}`} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-bold text-[var(--foreground)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]">Buka Laporan Bulan Ini</Link></div></SoftCard>; })}</div>
      )}
      <aside className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-5 text-sm leading-6 text-cyan-700 dark:text-cyan-300"><strong>Urutan pemeriksaan aman:</strong> pastikan periode dan input benar → periksa perubahan tarif atau daya → tinjau kegiatan/okupansi → baru lihat kandidat area atau alat. Jangan membuka panel atau menyentuh instalasi listrik.</aside>
    </WorkspacePage>
  );
}
