import { BusinessSelector, SoftCard, WorkspaceHeader, WorkspacePage } from '@/components/product/WorkspaceUI';
import { readRequestedBusiness, requireWorkspacePage } from '@/server/services/workspace-page';
import { getDecisionSupport } from '@/server/services/workspace.service';
import { Simulator } from './Simulator';

export const dynamic = 'force-dynamic';

export default async function PredictionsPage({ searchParams }: { searchParams: Promise<{ businessId?: string | string[] }> }) {
  const requestedBusinessId = await readRequestedBusiness(searchParams);
  const { userId } = await requireWorkspacePage(requestedBusinessId);
  const data = await getDecisionSupport(userId, requestedBusinessId);
  const tariff = data.latestBill?.tariffRupiahPerKwh ? Number(data.latestBill.tariffRupiahPerKwh) : 1444.7;
  const applianceOptions = data.appliances.filter((item) => item.powerWatts !== null).map((item) => ({ name: item.name, powerWatts: item.powerWatts as number }));

  return (
    <WorkspacePage>
      <WorkspaceHeader eyebrow="What-if simulator" title="Coba skenario sebelum menambah alat" description="Ubah jumlah, daya, dan jam pakai untuk melihat ilustrasi dampak biaya. Perhitungan berlangsung di browser dan tidak mengubah data usaha Anda." actions={<BusinessSelector businesses={data.businesses} selectedId={data.business.id} route="/predictions" />} />
      <SoftCard><div className="mb-6 flex items-start gap-3"><span aria-hidden="true" className="text-2xl">🧮</span><div><h2 className="text-xl font-black text-emerald-950">Simulator tambahan peralatan</h2><p className="mt-1 text-sm text-slate-500">Acuan: {data.business.name} · {data.latestBill ? 'tagihan terakhir tersedia' : 'belum ada tagihan acuan'}.</p></div></div><Simulator baseBill={data.latestBill ? Number(data.latestBill.totalAmountRupiah) : null} defaultTariff={tariff} applianceOptions={applianceOptions} /></SoftCard>
      <div className="grid gap-4 md:grid-cols-3"><SoftCard><span aria-hidden="true">1️⃣</span><h2 className="mt-3 font-extrabold text-emerald-950">Atur asumsi</h2><p className="mt-2 text-sm leading-6 text-slate-600">Gunakan angka label alat atau nilai yang paling masuk akal bagi operasional Anda.</p></SoftCard><SoftCard><span aria-hidden="true">2️⃣</span><h2 className="mt-3 font-extrabold text-emerald-950">Bandingkan skenario</h2><p className="mt-2 text-sm leading-6 text-slate-600">Naik-turunkan jam atau jumlah unit untuk melihat sensitivitas biaya.</p></SoftCard><SoftCard><span aria-hidden="true">3️⃣</span><h2 className="mt-3 font-extrabold text-emerald-950">Verifikasi setelah berjalan</h2><p className="mt-2 text-sm leading-6 text-slate-600">Gunakan tagihan periode berikutnya untuk melihat perubahan yang benar-benar tercatat.</p></SoftCard></div>
    </WorkspacePage>
  );
}
