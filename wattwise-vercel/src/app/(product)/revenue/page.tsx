import { BookOpen, WalletCards } from 'lucide-react';
import { formatMonth, rupiah } from '@/lib/format';
import { BusinessSelector, EmptyState, fieldClass, labelClass, primaryButton, SoftCard, WorkspaceHeader, WorkspacePage } from '@/components/product/WorkspaceUI';
import { readRequestedBusiness, requireWorkspacePage } from '@/server/services/workspace-page';
import { listRevenueEntries } from '@/server/services/workspace.service';
import { DeleteRevenueButton } from './DeleteRevenueButton';
import { saveRevenueAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function RevenuePage({ searchParams }: { searchParams: Promise<{ businessId?: string | string[]; saved?: string }> }) {
  const requestedBusinessId = await readRequestedBusiness(searchParams);
  const { userId } = await requireWorkspacePage(requestedBusinessId);
  const data = await listRevenueEntries(userId, requestedBusinessId);

  return (
    <WorkspacePage>
      <WorkspaceHeader eyebrow="Keuangan usaha" title="Pendapatan bulanan" description="Catat omzet untuk melihat porsi biaya listrik terhadap pendapatan. Angka ini membantu konteks cash flow, bukan perhitungan laba bersih." actions={<BusinessSelector businesses={data.businesses} selectedId={data.business.id} route="/revenue" />} />
      <div className="grid gap-6 xl:grid-cols-[0.82fr_1.18fr]">
        <SoftCard>
          <div className="flex items-start gap-3"><WalletCards className="mt-0.5 h-6 w-6 shrink-0 text-[var(--primary)]" aria-hidden="true"/><div><h2 className="text-lg font-extrabold text-[var(--foreground)]">Catat atau perbarui pendapatan</h2><p className="mt-1 text-sm leading-6 text-[var(--muted)]">Entri pada bulan yang sama akan diperbarui, bukan diduplikasi.</p></div></div>
          <form action={saveRevenueAction} className="mt-6 space-y-4">
            <input type="hidden" name="businessId" value={data.business.id} />
            <label className="block"><span className={labelClass}>Bulan</span><input type="month" name="month" required className={fieldClass} /></label>
            <label className="block"><span className={labelClass}>Pendapatan/omzet (Rp)</span><input type="number" name="amount" min="0" step="1000" required placeholder="Contoh: 25000000" className={fieldClass} /></label>
            <label className="block"><span className={labelClass}>Jenis angka</span><select name="inputMode" className={fieldClass}><option value="EXACT">Angka tercatat</option><option value="ESTIMATE">Perkiraan pengguna</option></select></label>
            <label className="block"><span className={labelClass}>Catatan opsional</span><textarea name="notes" rows={3} placeholder="Konteks omzet atau kegiatan khusus" className={fieldClass} /></label>
            <button type="submit" className={`${primaryButton} w-full`}>Simpan Pendapatan</button>
          </form>
        </SoftCard>

        <SoftCard>
          <div className="flex items-center justify-between"><div><p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">{data.business.name}</p><h2 className="mt-1 text-xl font-black text-[var(--foreground)]">Riwayat pendapatan</h2></div><BookOpen className="h-6 w-6 text-[var(--primary)]" aria-hidden="true"/></div>
          {data.entries.length === 0 ? <div className="mt-6"><EmptyState icon={WalletCards} title="Belum ada pendapatan" description="Tambahkan pendapatan pada bulan yang sama dengan tagihan untuk melihat rasio biaya listrik." /></div> : (
            <div className="mt-6 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm"><thead><tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-[var(--muted)]"><th className="pb-3">Bulan</th><th className="pb-3">Pendapatan</th><th className="pb-3">Status</th><th className="pb-3">Catatan</th><th className="pb-3 text-right">Tindakan</th></tr></thead><tbody className="divide-y divide-[var(--border)]">{data.entries.map((entry) => <tr key={entry.id}><td className="py-4 font-bold text-[var(--foreground)]">{formatMonth(entry.periodMonth)}</td><td className="py-4 font-extrabold text-[var(--primary)]">{rupiah.format(entry.amountRupiah)}</td><td className="py-4"><span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-1 text-[10px] font-extrabold text-[var(--primary)]">{entry.inputMode === 'EXACT' ? 'Tercatat' : 'Perkiraan'}</span></td><td className="max-w-xs py-4 text-[var(--muted)]">{entry.notes || '—'}</td><td className="py-4 text-right"><DeleteRevenueButton revenueId={entry.id} monthLabel={formatMonth(entry.periodMonth)} /></td></tr>)}</tbody></table></div>
          )}
          <p className="mt-6 rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-surface)] p-4 text-xs leading-5 text-[var(--warning)]">Sisa pendapatan setelah listrik belum memperhitungkan bahan baku, gaji, sewa, air, internet, pajak, dan biaya operasional lain.</p>
        </SoftCard>
      </div>
    </WorkspacePage>
  );
}
