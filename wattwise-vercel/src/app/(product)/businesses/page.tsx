import Link from 'next/link';
import { businessSegmentLabel, rupiah } from '@/lib/format';
import { EmptyState, SoftCard, WorkspaceHeader, WorkspacePage, primaryButton } from '@/components/product/WorkspaceUI';
import { requireWorkspacePage } from '@/server/services/workspace-page';
import { getPortfolio } from '@/server/services/workspace.service';
import { setBusinessStatusAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<{ notice?: string; updated?: string }> }) {
  const { userId } = await requireWorkspacePage();
  const query = await searchParams;
  const portfolio = await getPortfolio(userId);

  return (
    <WorkspacePage>
      <WorkspaceHeader
        eyebrow="Portofolio usaha"
        title="Semua lokasi dalam satu kendali"
        description="Kelola usaha atau properti, lihat tagihan terakhir, dan pilih lokasi yang ingin ditinjau. Data setiap lokasi tetap berada dalam akun Anda."
        actions={<Link href="/businesses/new" className={primaryButton}>+ Tambah Usaha</Link>}
      />

      {query.notice === 'keep-one-active' && <div role="alert" className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm font-semibold text-amber-900">Sisakan minimal satu usaha aktif agar perjalanan WattWise tetap dapat digunakan.</div>}
      {query.updated && <div role="status" className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">Status usaha berhasil diperbarui.</div>}

      {portfolio.length === 0 ? (
        <EmptyState icon="🏢" title="Belum ada usaha" description="Tambahkan usaha pertama untuk mulai mencatat tagihan dan menjalankan Cek Kenaikan." href="/businesses/new" action="Tambah Usaha" />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {portfolio.map((item) => (
            <SoftCard key={item.id} className={!item.isActive ? 'opacity-75' : ''}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-100 text-xl">🏢</span>
                  <div>
                    <h2 className="text-lg font-extrabold text-emerald-950">{item.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">{businessSegmentLabel(item.segment)}{item.city ? ` · ${item.city}` : ''}</p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${item.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'}`}>{item.isActive ? 'Aktif' : 'Diarsipkan'}</span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#f7f9f4] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Tagihan terakhir</p><p className="mt-2 font-extrabold text-slate-900">{item.latestBill ? rupiah.format(item.latestBill.totalAmountRupiah) : 'Belum ada data'}</p></div>
                <div className="rounded-2xl bg-[#f7f9f4] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Sistem listrik</p><p className="mt-2 font-extrabold text-slate-900">{item.electricalSystem.replaceAll('_', ' ')}</p></div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-emerald-900/10 pt-4">
                {item.isActive && <Link href={`/dashboard?businessId=${encodeURIComponent(item.id)}`} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-700">Buka Dashboard</Link>}
                <form action={setBusinessStatusAction}>
                  <input type="hidden" name="businessId" value={item.id} />
                  <input type="hidden" name="status" value={item.isActive ? 'archived' : 'active'} />
                  <button type="submit" className="rounded-xl border border-emerald-900/15 bg-white px-4 py-2 text-sm font-bold text-emerald-950 hover:bg-emerald-50">{item.isActive ? 'Arsipkan' : 'Pulihkan'}</button>
                </form>
              </div>
            </SoftCard>
          ))}
        </div>
      )}
    </WorkspacePage>
  );
}
