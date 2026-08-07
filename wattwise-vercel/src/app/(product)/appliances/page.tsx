import { decimal } from '@/lib/format';
import { BusinessSelector, EmptyState, SoftCard, WorkspaceHeader, WorkspacePage } from '@/components/product/WorkspaceUI';
import { readRequestedBusiness, requireWorkspacePage } from '@/server/services/workspace-page';
import { estimateMonthlyKwh, listAppliances } from '@/server/services/workspace.service';
import { addApplianceAction, applyTemplateAction, toggleApplianceAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function AppliancesPage({ searchParams }: { searchParams: Promise<{ businessId?: string | string[] }> }) {
  const requestedBusinessId = await readRequestedBusiness(searchParams);
  const { userId } = await requireWorkspacePage(requestedBusinessId);
  const data = await listAppliances(userId, requestedBusinessId);
  const activeEstimate = data.appliances.filter((item) => item.isActive).reduce((sum, item) => sum + (estimateMonthlyKwh(item) ?? 0), 0);

  return (
    <WorkspacePage>
      <WorkspaceHeader eyebrow="Profil operasional opsional" title="Peralatan listrik" description="Tambahkan alat secara manual atau gunakan template awal. Data alat membantu menyusun prioritas, tetapi tidak wajib untuk memulai dan bukan hasil pengukuran sensor." actions={<BusinessSelector businesses={data.businesses} selectedId={data.business.id} route="/appliances" />} />
      <div className="grid gap-6 xl:grid-cols-[0.76fr_1.24fr]">
        <div className="space-y-6">
          <SoftCard>
            <div className="flex items-start gap-3"><span aria-hidden="true" className="text-2xl">🧩</span><div><h2 className="font-extrabold text-emerald-950">Template cepat</h2><p className="mt-1 text-sm leading-6 text-slate-500">Preset mengikuti segmen {data.business.segment}. Setelah diterapkan, sesuaikan dengan kondisi usaha yang sebenarnya.</p></div></div>
            <form action={applyTemplateAction} className="mt-5"><input type="hidden" name="businessId" value={data.business.id} /><button className="w-full rounded-xl border border-emerald-700/20 bg-emerald-50 px-4 py-3 text-sm font-extrabold text-emerald-800 hover:bg-emerald-100">Gunakan Template Segmen</button></form>
          </SoftCard>
          <SoftCard>
            <h2 className="text-lg font-extrabold text-emerald-950">+ Tambah peralatan</h2>
            <form action={addApplianceAction} className="mt-5 grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="businessId" value={data.business.id} />
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold">Nama alat</span><input name="name" required minLength={2} placeholder="Contoh: Pompa air utama" className="w-full rounded-xl border border-emerald-900/15 bg-[#fbfcfa] px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500" /></label>
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold">Kategori</span><input name="category" required placeholder="Pendingin, pencahayaan, sistem air..." className="w-full rounded-xl border border-emerald-900/15 bg-[#fbfcfa] px-3 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500" /></label>
              <label><span className="mb-1 block text-xs font-bold">Daya (W) · opsional</span><input name="powerWatts" type="number" min="0" placeholder="Tidak tahu boleh kosong" className="w-full rounded-xl border border-emerald-900/15 bg-[#fbfcfa] px-3 py-2.5 text-sm" /></label>
              <label><span className="mb-1 block text-xs font-bold">Jam/hari · opsional</span><input name="dailyHours" type="number" min="0" max="24" step="0.5" placeholder="Contoh: 8" className="w-full rounded-xl border border-emerald-900/15 bg-[#fbfcfa] px-3 py-2.5 text-sm" /></label>
              <label><span className="mb-1 block text-xs font-bold">Jumlah</span><input name="quantity" type="number" min="1" defaultValue="1" className="w-full rounded-xl border border-emerald-900/15 bg-[#fbfcfa] px-3 py-2.5 text-sm" /></label>
              <label><span className="mb-1 block text-xs font-bold">Hari operasi/bulan</span><input name="operatingDays" type="number" min="1" max="31" defaultValue="30" className="w-full rounded-xl border border-emerald-900/15 bg-[#fbfcfa] px-3 py-2.5 text-sm" /></label>
              <button className="sm:col-span-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700">Simpan Peralatan</button>
            </form>
          </SoftCard>
        </div>

        <SoftCard>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-emerald-700">{data.business.name}</p><h2 className="mt-1 text-xl font-black text-emerald-950">Profil beban opsional</h2></div><div className="rounded-2xl bg-emerald-50 px-4 py-3 text-right"><p className="text-[10px] font-bold uppercase text-emerald-700">Estimasi profil terisi</p><p className="text-lg font-black text-emerald-900">{decimal.format(activeEstimate)} kWh/bln</p></div></div>
          {data.appliances.length === 0 ? <div className="mt-6"><EmptyState icon="🔌" title="Belum ada peralatan" description="Gunakan template atau tambah alat yang relevan. Watt dan jam pakai boleh dikosongkan jika tidak diketahui." /></div> : (
            <div className="mt-6 space-y-3">{data.appliances.map((item) => { const estimate = estimateMonthlyKwh(item); return <article key={item.id} className={`rounded-2xl border border-emerald-900/10 p-4 ${item.isActive ? 'bg-white' : 'bg-slate-50 opacity-65'}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><span aria-hidden="true" className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50">🔌</span><div><h3 className="font-extrabold text-emerald-950">{item.name}</h3><p className="mt-1 text-xs text-slate-500">{item.category} · {item.quantity} unit · {item.operatingDays} hari</p><div className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{item.powerWatts === null ? 'Watt tidak diisi' : `${item.powerWatts} W`}</span><span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-600">{item.dailyHours === null ? 'Jam tidak diisi' : `${item.dailyHours} jam/hari`}</span><span className="rounded-full bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-700">{item.dataSource === 'TEMPLATE' ? 'Preset · perlu verifikasi' : 'Data manual'}</span></div></div></div><div className="flex items-center gap-3 sm:text-right"><div><p className="text-[10px] font-bold uppercase text-slate-400">Estimasi profil</p><p className="font-extrabold text-emerald-700">{estimate === null ? 'Belum cukup data' : `${decimal.format(estimate)} kWh`}</p></div><form action={toggleApplianceAction}><input type="hidden" name="businessId" value={data.business.id} /><input type="hidden" name="applianceId" value={item.id} /><input type="hidden" name="active" value={String(!item.isActive)} /><button className="rounded-lg border border-emerald-900/15 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-50">{item.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button></form></div></div></article>; })}</div>
          )}
          <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-xs leading-5 text-amber-900">Estimasi profil dihitung dari watt × jam × jumlah × hari. Nilai label alat dapat berbeda dari pemakaian aktual dan tidak menggantikan pengukuran.</p>
        </SoftCard>
      </div>
    </WorkspacePage>
  );
}
