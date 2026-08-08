import { decimal } from '@/lib/format';
import { BusinessSelector, EmptyState, SoftCard, WorkspaceHeader, WorkspacePage } from '@/components/product/WorkspaceUI';
import { readRequestedBusiness, requireWorkspacePage } from '@/server/services/workspace-page';
import { estimateMonthlyKwh, listAppliances } from '@/server/services/workspace.service';
import { addApplianceAction, applyTemplateAction, deleteApplianceAction, toggleApplianceAction, updateApplianceAction } from './actions';

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
            <div className="flex items-start gap-3"><span aria-hidden="true" className="text-2xl">🧩</span><div><h2 className="font-extrabold text-[var(--foreground)]">Template cepat</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Preset mengikuti segmen {data.business.segment}. Setelah diterapkan, sesuaikan dengan kondisi usaha yang sebenarnya.</p></div></div>
            <form action={applyTemplateAction} className="mt-5"><input type="hidden" name="businessId" value={data.business.id} /><button className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-3 text-sm font-extrabold text-[var(--primary)] hover:bg-[var(--primary-soft)]">Gunakan Template Segmen</button></form>
          </SoftCard>
          <SoftCard>
            <h2 className="text-lg font-extrabold text-[var(--foreground)]">+ Tambah peralatan</h2>
            <form action={addApplianceAction} className="mt-5 grid gap-4 sm:grid-cols-2">
              <input type="hidden" name="businessId" value={data.business.id} />
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold text-[var(--foreground)]">Nama alat</span><input name="name" required minLength={2} placeholder="Contoh: Pompa air utama" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-emerald-500" /></label>
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold text-[var(--foreground)]">Kategori</span><input name="category" required placeholder="Pendingin, pencahayaan, sistem air..." className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:ring-2 focus:ring-emerald-500" /></label>
              <label><span className="mb-1 block text-xs font-bold text-[var(--foreground)]">Daya (W) · opsional</span><input name="powerWatts" type="number" min="0" placeholder="Tidak tahu boleh kosong" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--foreground)]" /></label>
              <label><span className="mb-1 block text-xs font-bold text-[var(--foreground)]">Jam/hari · opsional</span><input name="dailyHours" type="number" min="0" max="24" step="0.5" placeholder="Contoh: 8" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--foreground)]" /></label>
              <label><span className="mb-1 block text-xs font-bold text-[var(--foreground)]">Jumlah</span><input name="quantity" type="number" min="1" defaultValue="1" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--foreground)]" /></label>
              <label><span className="mb-1 block text-xs font-bold text-[var(--foreground)]">Hari operasi/bulan</span><input name="operatingDays" type="number" min="1" max="31" defaultValue="30" className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--foreground)]" /></label>
              <label className="sm:col-span-2"><span className="mb-1 block text-xs font-bold text-[var(--foreground)]">Catatan opsional</span><textarea name="notes" rows={2} className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-sm text-[var(--foreground)]" /></label>
              <button className="sm:col-span-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-emerald-700">Simpan Peralatan</button>
            </form>
          </SoftCard>
        </div>

        <SoftCard>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">{data.business.name}</p><h2 className="mt-1 text-xl font-black text-[var(--foreground)]">Profil beban opsional</h2></div><div className="rounded-2xl bg-[var(--primary-soft)] px-4 py-3 text-right"><p className="text-[10px] font-bold uppercase text-[var(--primary)]">Estimasi profil terisi</p><p className="text-lg font-black text-[var(--primary)]">{decimal.format(activeEstimate)} kWh/bln</p></div></div>
          {data.appliances.length === 0 ? <div className="mt-6"><EmptyState icon="🔌" title="Belum ada peralatan" description="Gunakan template atau tambah alat yang relevan. Watt dan jam pakai boleh dikosongkan jika tidak diketahui." /></div> : (
            <div className="mt-6 space-y-3">{data.appliances.map((item) => { const estimate = estimateMonthlyKwh(item); return <article key={item.id} className={`rounded-2xl border border-[var(--border)] p-4 ${item.isActive ? 'bg-[var(--surface)]' : 'bg-[var(--surface-muted)] opacity-65'}`}><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h3 className="font-extrabold text-[var(--foreground)]">{item.name}</h3><p className="mt-1 text-xs text-[var(--muted)]">{item.category} · {item.quantity} unit · {item.operatingDays} hari</p><p className="mt-2 text-sm font-extrabold text-[var(--primary)]">{estimate === null ? 'Belum cukup data' : `${decimal.format(estimate)} kWh/bulan`}</p></div><form action={toggleApplianceAction}><input type="hidden" name="businessId" value={data.business.id}/><input type="hidden" name="applianceId" value={item.id}/><input type="hidden" name="active" value={String(!item.isActive)}/><button className="rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--primary-soft)]">{item.isActive ? 'Nonaktifkan' : 'Aktifkan'}</button></form></div><details className="mt-4 border-t border-[var(--border)] pt-4"><summary className="cursor-pointer text-sm font-bold text-[var(--primary)]">Edit detail</summary><form action={updateApplianceAction} className="mt-4 grid gap-3 sm:grid-cols-2"><input type="hidden" name="businessId" value={data.business.id}/><input type="hidden" name="applianceId" value={item.id}/><input name="name" defaultValue={item.name} required className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-2.5 text-[var(--foreground)]"/><input name="category" defaultValue={item.category} required className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-2.5 text-[var(--foreground)]"/><input name="powerWatts" type="number" min="0" defaultValue={item.powerWatts ?? ''} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-2.5 text-[var(--foreground)]"/><input name="dailyHours" type="number" min="0" max="24" step="0.25" defaultValue={item.dailyHours ?? ''} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-2.5 text-[var(--foreground)]"/><input name="quantity" type="number" min="1" defaultValue={item.quantity} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-2.5 text-[var(--foreground)]"/><input name="operatingDays" type="number" min="1" max="31" defaultValue={item.operatingDays} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-2.5 text-[var(--foreground)]"/><textarea name="notes" defaultValue={item.notes ?? ''} className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-2.5 text-[var(--foreground)] sm:col-span-2"/><div className="flex gap-2 sm:col-span-2"><button className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Simpan Perubahan</button><button formAction={deleteApplianceAction} className="rounded-xl border border-rose-500/30 px-4 py-2 text-sm font-bold text-rose-600 dark:text-rose-400">Hapus</button></div></form></details></article>; })}</div>
          )}
          <p className="mt-6 rounded-2xl bg-amber-500/10 p-4 text-xs leading-5 text-amber-700 dark:text-amber-300">Estimasi profil dihitung dari watt × jam × jumlah × hari. Nilai label alat dapat berbeda dari pemakaian aktual dan tidak menggantikan pengukuran.</p>
        </SoftCard>
      </div>
    </WorkspacePage>
  );
}
