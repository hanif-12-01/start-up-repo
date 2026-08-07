import Link from 'next/link';
import { decimal } from '@/lib/format';
import { BusinessSelector, EmptyState, SoftCard, WorkspaceHeader, WorkspacePage, primaryButton } from '@/components/product/WorkspaceUI';
import { readRequestedBusiness, requireWorkspacePage } from '@/server/services/workspace-page';
import { getDecisionSupport } from '@/server/services/workspace.service';

export const dynamic = 'force-dynamic';

function actionFor(category: string) {
  const key = category.toLowerCase();
  if (key.includes('pendingin') || key.includes('ac')) return 'Tinjau jadwal operasi, kebersihan area sirkulasi, dan perubahan durasi pemakaian secara visual.';
  if (key.includes('air') || key.includes('pompa')) return 'Amati apakah pompa lebih sering menyala dan periksa tanda kebocoran yang terlihat tanpa menyentuh instalasi.';
  if (key.includes('cahaya') || key.includes('lampu')) return 'Periksa jadwal nyala dan area yang tetap menyala ketika tidak diperlukan.';
  if (key.includes('pemanas')) return 'Tinjau durasi pemanasan, antrean kerja, dan kebiasaan alat dibiarkan aktif.';
  return 'Bandingkan jam operasi aktual dengan kebiasaan periode sebelumnya dan catat perubahan yang terlihat.';
}

export default async function RecommendationsPage({ searchParams }: { searchParams: Promise<{ businessId?: string | string[] }> }) {
  const requestedBusinessId = await readRequestedBusiness(searchParams);
  const { userId } = await requireWorkspacePage(requestedBusinessId);
  const data = await getDecisionSupport(userId, requestedBusinessId);
  const candidates = data.applianceEstimates.slice(0, 3);
  const query = `?businessId=${encodeURIComponent(data.business.id)}`;
  return (
    <WorkspacePage>
      <WorkspaceHeader eyebrow="Bantuan pengambilan keputusan" title="Rekomendasi yang bisa ditindaklanjuti" description="Prioritas disusun dari data alat, tagihan, dan konteks yang tersedia. Rekomendasi tidak menjamin penghematan dan perlu diverifikasi di lokasi." actions={<BusinessSelector businesses={data.businesses} selectedId={data.business.id} route="/recommendations" />} />
      {candidates.length === 0 ? <SoftCard><EmptyState icon="💡" title="Lengkapi konteks untuk rekomendasi yang lebih relevan" description="Tambahkan peralatan secara opsional atau jalankan Cek Kenaikan. WattWise tetap dapat dimulai dari tagihan." href={`/appliances${query}`} action="Tambah Peralatan Opsional" /></SoftCard> : (
        <div className="grid gap-5 lg:grid-cols-3">{candidates.map((item, index) => <SoftCard key={item.appliance.id} className="flex flex-col"><div className="flex items-center justify-between"><span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100 text-xl">{index === 0 ? '💡' : index === 1 ? '🔎' : '📝'}</span><span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-extrabold uppercase text-emerald-800">Prioritas {index + 1}</span></div><h2 className="mt-5 text-lg font-black text-emerald-950">Tinjau {item.appliance.name}</h2><p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-400">{item.appliance.category}</p><p className="mt-4 flex-1 text-sm leading-6 text-slate-600">{actionFor(item.appliance.category)}</p><div className="mt-5 rounded-2xl bg-[#f7f9f4] p-4"><p className="text-[10px] font-bold uppercase text-slate-400">Dasar prioritas</p><p className="mt-1 text-sm font-extrabold text-slate-800">{item.monthlyKwh === null ? 'Profil belum lengkap · perlu observasi' : `Estimasi profil ${decimal.format(item.monthlyKwh)} kWh/bulan`}</p></div><p className="mt-4 text-xs leading-5 text-slate-500">Prioritas berdasarkan profil input, bukan pembacaan pemakaian aktual per alat.</p></SoftCard>)}</div>
      )}
      <SoftCard><div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center"><div><h2 className="text-xl font-black text-emerald-950">Butuh alur pemeriksaan yang lebih terarah?</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Cek Kenaikan menggabungkan perbandingan tagihan, pertanyaan konteks, maksimal tiga kandidat, checklist aman, Rencana Hemat, dan evaluasi periode berikutnya.</p></div><Link href={`/bills${query}`} className={primaryButton}>Mulai dari Tagihan</Link></div></SoftCard>
    </WorkspacePage>
  );
}
