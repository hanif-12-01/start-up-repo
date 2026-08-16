import Link from 'next/link';
import { Building2 } from 'lucide-react';
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

      {query.notice === 'keep-one-active' && <div role="alert" className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-surface)] p-4 text-sm font-semibold text-[var(--warning)]">Sisakan minimal satu usaha aktif agar perjalanan WattWise tetap dapat digunakan.</div>}
      {query.updated && <div role="status" className="rounded-2xl border border-[var(--success-border)] bg-[var(--success-surface)] p-4 text-sm font-semibold text-[var(--success)]">Status usaha berhasil diperbarui.</div>}

      {portfolio.length === 0 ? (
        <EmptyState icon={Building2} title="Belum ada usaha" description="Tambahkan usaha pertama untuk mulai mencatat tagihan dan menjalankan Cek Kenaikan." href="/businesses/new" action="Tambah Usaha" />
      ) : (
        <div data-tour-id="business-list" className="grid gap-5 lg:grid-cols-2">
          {portfolio.map((item) => (
            <SoftCard key={item.id} className={!item.isActive ? 'opacity-75' : ''}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="grid h-11 w-11 place-items-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]"><Building2 className="h-5 w-5" /></span>
                  <div>
                    <h2 className="text-lg font-extrabold text-[var(--foreground)]">{item.name}</h2>
                    <p className="mt-1 text-sm text-[var(--muted)]">{businessSegmentLabel(item.segment)}{item.city ? ` · ${item.city}` : ''}</p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide ${item.isActive ? 'bg-[var(--primary-soft)] text-[var(--primary)]' : 'bg-[var(--surface-muted)] text-[var(--muted)]'}`}>{item.isActive ? 'Aktif' : 'Diarsipkan'}</span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[var(--surface-muted)] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Tagihan terakhir</p><p className="mt-2 font-extrabold text-[var(--foreground)]">{item.latestBill ? rupiah.format(item.latestBill.totalAmountRupiah) : 'Belum ada data'}</p></div>
                <div className="rounded-2xl bg-[var(--surface-muted)] p-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[var(--muted)]">Sistem listrik</p><p className="mt-2 font-extrabold text-[var(--foreground)]">{item.electricalSystem.replaceAll('_', ' ')}</p></div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[var(--border)] pt-4">
                {item.isActive && <Link href={`/dashboard?businessId=${encodeURIComponent(item.id)}`} className={primaryButton}>Buka Dashboard</Link>}
                {item.isActive && <Link href={`/businesses/${encodeURIComponent(item.id)}/edit`} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--foreground)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]">Edit Profil</Link>}
                <form action={setBusinessStatusAction}>
                  <input type="hidden" name="businessId" value={item.id} />
                  <input type="hidden" name="status" value={item.isActive ? 'archived' : 'active'} />
                  <button type="submit" className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-bold text-[var(--foreground)] hover:bg-[var(--primary-soft)] hover:text-[var(--primary)]">{item.isActive ? 'Arsipkan' : 'Pulihkan'}</button>
                </form>
              </div>
            </SoftCard>
          ))}
        </div>
      )}
    </WorkspacePage>
  );
}
