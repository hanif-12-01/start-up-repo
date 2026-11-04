import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { WorkspacePage, BusinessSelector, Surface, primaryButton } from '@/components/product/WorkspaceUI';
import { getOptionalSession } from '@/server/auth/session';
import { getActiveBusinessById, getBusinessesByUser } from '@/server/services/business.service';
import { listEnergyMeasurements, listMeasurementSources } from '@/server/services/measurement.service';
import { isMeasurementPilotAllowed } from '@/server/services/measurement-access';
import { SourceForm } from './SourceForm';
import { ManualForm } from './ManualForm';
import { History } from './History';
import { historyQuery } from '@/lib/energy-history';
import { sourceLabels, boundaryLabels } from '@/lib/energy-input';
import { CsvForm } from './CsvForm';

export const dynamic = 'force-dynamic';

export default async function EnergyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await getOptionalSession();
  if (!session?.user) redirect('/login');
  const query = await searchParams;
  const businesses = (await getBusinessesByUser(session.user.id)).filter(b => b.isActive);
  const requested = typeof query.businessId === 'string' ? query.businessId : undefined;
  const business = requested ? await getActiveBusinessById(session.user.id, requested) : businesses[0];
  if (requested && !business) notFound();
  if (!business) return <WorkspacePage><h1 className="text-3xl font-extrabold">Data Energi</h1><p>Daftarkan usaha sebelum mencatat energi.</p><Link href="/businesses/new" className={primaryButton}>Tambah usaha</Link></WorkspacePage>;
  const filters = historyQuery(business.id, query);
  const [sources, history] = await Promise.all([listMeasurementSources(business.id), filters.success ? listEnergyMeasurements(filters.data) : Promise.resolve({ ok: false as const, error: { code: 'VALIDATION_ERROR', message: 'Filter tidak valid' } })]);
  const canWrite = isMeasurementPilotAllowed(session.user.id, business.id);
  return <WorkspacePage>
    <header className="space-y-3 border-b border-[var(--border)] pb-6"><h1 className="text-3xl font-black tracking-tight sm:text-4xl">Data Energi</h1><p className="max-w-2xl text-sm leading-6 text-[var(--muted)]">Catat energi terpakai dari sumber yang jelas. Data ini terpisah dari tagihan listrik dan tidak dijumlahkan otomatis.</p></header>
    <BusinessSelector businesses={businesses} selectedId={business.id} route="/energy" />
    <p className="font-semibold">Usaha: {business.name}</p>
    <p className="text-sm leading-6 text-[var(--muted)]">Baru mulai? <Link href={`/bills?businessId=${encodeURIComponent(business.id)}`} className="inline-flex min-h-11 items-center font-semibold underline underline-offset-4">Catat tagihan listrik</Link>. Catatan kWh di halaman ini bersifat tambahan; jangan isi kWh dari nominal rupiah saja.</p>
    {!canWrite && <Surface variant="muted"><h2 className="font-bold">Pencatatan belum tersedia</h2><p className="mt-2 text-sm leading-6">Fitur pencatatan listrik belum tersedia untuk akun ini. Riwayat tetap dapat dilihat. Hubungi pengelola untuk memeriksa akses.</p></Surface>}
    <Surface aria-labelledby="sources-title"><h2 id="sources-title" className="text-xl font-extrabold">Sumber data listrik</h2>
      {!sources.ok ? <p role="alert" className="mt-3">Sumber belum dapat dimuat. Muat ulang halaman untuk mencoba kembali.</p> : !sources.data.length ? <p className="mt-3 text-sm text-[var(--muted)]">Belum ada sumber. Daftarkan meter, dokumen, atau sumber estimasi sebelum mencatat energi.</p> : <ul className="mt-4 divide-y divide-[var(--border)]">{sources.data.map(s => <li key={s.id} className="break-words py-3"><strong>{s.name}</strong><p className="text-sm text-[var(--muted)]">{sourceLabels[s.sourceType]} · {boundaryLabels[s.measurementBoundary]} · {s.provenanceKey}{!s.isActive && ' · Tidak aktif'}</p></li>)}</ul>}
      {canWrite && <SourceForm key={business.id} businessId={business.id} />}
    </Surface>
    {canWrite && sources.ok && <Surface aria-labelledby="manual-title"><h2 id="manual-title" className="text-xl font-extrabold">Catat pemakaian listrik</h2><details className="mt-3"><summary className="w-fit min-h-11 cursor-pointer rounded-lg py-2 font-bold focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]">Masukkan satu catatan</summary><ManualForm key={business.id} businessId={business.id} sources={sources.data.filter(s => s.isActive).map(s => ({ id: s.id, name: s.name, sourceType: s.sourceType }))} /></details></Surface>}
    {canWrite && sources.ok && <Surface aria-labelledby="csv-title"><h2 id="csv-title" className="text-xl font-extrabold">Punya banyak catatan? (opsional)</h2><CsvForm key={business.id} businessId={business.id} sources={sources.data.filter(s => s.isActive).map(s => ({ id: s.id, name: s.name }))} /></Surface>}
    <History key={JSON.stringify(query)} businessId={business.id} sources={sources.ok ? sources.data : []} result={history} query={query} filterError={filters.success ? undefined : 'Filter tidak valid. Periksa rentang waktu dan nomor halaman (1–5001).'} />
  </WorkspacePage>;
}
