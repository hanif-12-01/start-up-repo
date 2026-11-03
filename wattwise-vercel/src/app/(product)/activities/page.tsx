import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { WorkspacePage, BusinessSelector, Surface, primaryButton } from '@/components/product/WorkspaceUI';
import { getOptionalSession } from '@/server/auth/session';
import { getActiveBusinessById, getBusinessesByUser } from '@/server/services/business.service';
import { listOperationalProcesses, listProductionRecords } from '@/server/services/operational.service';
import { getEnergyNormalization } from '@/server/services/energy-normalization.service';
import { isMeasurementPilotAllowed } from '@/server/services/measurement-access';
import { ProcessForm } from './ProcessForm';
import { ProductionForm } from './ProductionForm';
import { NormalizationCard } from './NormalizationCard';
import { RecordHistory } from './RecordHistory';

export const dynamic = 'force-dynamic';

export default async function ActivitiesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await getOptionalSession();
  if (!session?.user) redirect('/login');

  const query = await searchParams;
  const businesses = (await getBusinessesByUser(session.user.id)).filter((b) => b.isActive);
  const requestedBiz = typeof query.businessId === 'string' ? query.businessId : undefined;
  const business = requestedBiz ? await getActiveBusinessById(session.user.id, requestedBiz) : businesses[0];

  if (requestedBiz && !business) notFound();
  if (!business) {
    return (
      <WorkspacePage>
        <h1 className="text-3xl font-extrabold text-[var(--foreground)]">Aktivitas Usaha</h1>
        <p className="mt-2 text-[var(--muted)]">Daftarkan usaha terlebih dahulu sebelum mencatat aktivitas operasional.</p>
        <Link href="/businesses/new" className={`${primaryButton} mt-4`}>
          Tambah usaha
        </Link>
      </WorkspacePage>
    );
  }

  const [processesRes, recordsRes] = await Promise.all([
    listOperationalProcesses(business.id),
    listProductionRecords({ businessId: business.id, limit: 50 }),
  ]);

  const processes = processesRes.ok ? processesRes.data : [];
  const records = recordsRes.ok ? recordsRes.data : [];

  const requestedRecordId = typeof query.recordId === 'string' ? query.recordId : undefined;
  const targetRecordId = requestedRecordId || records[0]?.id;

  const normalizationRes = targetRecordId ? await getEnergyNormalization(targetRecordId) : null;
  const canWrite = isMeasurementPilotAllowed(session.user.id, business.id);

  return (
    <WorkspacePage>
      <header className="space-y-3 border-b border-[var(--border)] pb-6">
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl text-[var(--foreground)]">Aktivitas Usaha</h1>
        <p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">
          Hubungkan hasil kegiatan operasional (seperti cucian atau produksi barang) dengan pemakaian listrik pada periode yang sama untuk melihat efisiensi penggunaan energi.
        </p>
      </header>

      <BusinessSelector businesses={businesses} selectedId={business.id} route="/activities" />
      <p className="font-semibold text-[var(--foreground)]">Usaha: {business.name}</p>

      {!canWrite && (
        <Surface variant="muted">
          <h2 className="font-bold text-[var(--foreground)]">Pencatatan belum tersedia</h2>
          <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
            Fitur pencatatan operasional belum tersedia untuk akun ini. Riwayat dan analisis tetap dapat dilihat. Hubungi pengelola untuk memeriksa akses.
          </p>
        </Surface>
      )}

      {/* Energy per Output Analysis Card */}
      {normalizationRes?.ok && (
        <section aria-labelledby="analysis-section-title">
          <h2 id="analysis-section-title" className="sr-only">
            Ringkasan Pemakaian Listrik per Hasil Produksi
          </h2>
          <NormalizationCard result={normalizationRes.data} />
        </section>
      )}

      {/* Production Record Form */}
      {canWrite && (
        <Surface aria-labelledby="form-section-title">
          <h2 id="form-section-title" className="text-xl font-extrabold text-[var(--foreground)]">
            Catat hasil produksi
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Masukkan jumlah output operasional dan rentang waktu pengerjaan untuk dihubungkan dengan data listrik.
          </p>
          <ProductionForm
            key={business.id}
            businessId={business.id}
            processes={processes.filter((p) => p.isActive).map((p) => ({ id: p.id, name: p.name, outputUnit: p.outputUnit }))}
          />
          <ProcessForm key={`process-${business.id}`} businessId={business.id} />
        </Surface>
      )}

      {/* History of production records */}
      <Surface aria-labelledby="history-section-title">
        <h2 id="history-section-title" className="text-xl font-extrabold text-[var(--foreground)]">
          Riwayat catatan aktivitas
        </h2>
        <p className="mt-1 text-xs text-[var(--muted)]">
          Daftar periode pencatatan hasil produksi. Pilih salah satu untuk melihat rasio listrik per hasil.
        </p>
        <RecordHistory businessId={business.id} records={records} selectedId={targetRecordId} />
      </Surface>
    </WorkspacePage>
  );
}
