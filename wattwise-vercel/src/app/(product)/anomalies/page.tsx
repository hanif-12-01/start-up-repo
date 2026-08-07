import Link from 'next/link';
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
      {data.anomalies.length === 0 ? <SoftCard><EmptyState icon="🌿" title="Belum ada perubahan besar yang ditandai" description={data.bills.length < 2 ? 'Tambahkan minimal dua tagihan agar perbandingan biaya harian dapat dilakukan.' : 'Tidak ada kenaikan biaya harian di atas ambang tinjauan pada riwayat yang tersedia.'} href={`/bills${query}`} action="Lihat Tagihan" /></SoftCard> : (
        <div className="space-y-4">{data.anomalies.map((item) => { const change = item.changePercent ?? 0; const severity = change >= 30 ? 'Tinggi' : change >= 20 ? 'Sedang' : 'Ringan'; return <SoftCard key={item.current.id}><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div className="flex items-start gap-4"><span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-xl">⚠️</span><div><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-black text-emerald-950">{formatMonth(item.current.periodEnd)}</h2><span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-extrabold text-amber-800">Perhatian {severity}</span></div><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Biaya harian tercatat naik sekitar <strong>{decimal.format(change)}%</strong> dibanding periode sebelumnya. Periksa perbedaan hari, tarif, kegiatan, okupansi, dan kondisi operasional sebelum menilai kandidat alat.</p></div></div><div className="grid min-w-56 grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-[#f7f9f4] p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Periode ini</p><p className="mt-1 text-sm font-black text-slate-800">{rupiah.format(item.currentDaily)}/hari</p></div><div className="rounded-xl bg-[#f7f9f4] p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Sebelumnya</p><p className="mt-1 text-sm font-black text-slate-800">{rupiah.format(item.previousDaily)}/hari</p></div></div></div><div className="mt-5 flex flex-wrap gap-2 border-t border-emerald-900/10 pt-4"><Link href={`/bills${query}`} className={primaryButton}>Jalankan Cek Kenaikan</Link><Link href={`/reports/monthly${query}&month=${item.current.periodEnd.slice(0, 7)}`} className="rounded-xl border border-emerald-900/15 px-4 py-2.5 text-sm font-bold text-emerald-950 hover:bg-emerald-50">Buka Laporan Bulan Ini</Link></div></SoftCard>; })}</div>
      )}
      <aside className="rounded-2xl border border-cyan-200 bg-cyan-50 p-5 text-sm leading-6 text-cyan-950"><strong>Urutan pemeriksaan aman:</strong> pastikan periode dan input benar → periksa perubahan tarif atau daya → tinjau kegiatan/okupansi → baru lihat kandidat area atau alat. Jangan membuka panel atau menyentuh instalasi listrik.</aside>
    </WorkspacePage>
  );
}
