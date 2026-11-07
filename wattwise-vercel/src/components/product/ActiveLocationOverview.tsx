import Link from 'next/link';
import {
  Gauge,
  MapPin,
  PlugZap,
  ReceiptText,
  Search,
  WalletCards,
  type LucideIcon,
} from 'lucide-react';
import {
  BusinessSelector,
  DataNotice,
  SoftCard,
  StatusBadge,
  WorkspaceHeader,
  WorkspacePage,
  primaryButton,
  secondaryButton,
} from '@/components/product/WorkspaceUI';
import { businessSegmentLabel, decimal, formatMonth, rupiah } from '@/lib/format';
import { getOwnerFacingTariffLabel, resolveTariffContext } from '@/lib/tariff';
import { withBusinessId } from '@/lib/business-query';
import {
  OPERATIONAL_AGE_NOT_RECORDED,
  buildActiveLocationOverview,
  describeAddress,
  describeDiagnosticsExposure,
  describeElectricalSystem,
  type OverviewBillInput,
  type OverviewBusinessInput,
  type DiagnosticsReason,
  type MetricChange,
} from '@/lib/active-location-overview';

function changeLabel(change: MetricChange, unit: 'rupiah' | 'kwh'): string {
  if (change.state === 'MISSING') return unit === 'kwh' ? 'kWh belum diisi' : 'Biaya belum tersedia';
  if (change.state === 'NO_PREVIOUS') return 'Perlu satu periode pembanding';
  if (change.state === 'ZERO_PREVIOUS') return 'Periode pembanding bernilai 0 — persentase tidak dihitung';
  const sign = (change.percent ?? 0) > 0 ? '+' : '';
  return `${sign}${decimal.format(change.percent ?? 0)}% dibanding periode sebelumnya`;
}

function MetricTile({
  Icon,
  label,
  value,
  note,
}: {
  Icon: LucideIcon;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">{label}</span>
        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--primary)]" />
      </div>
      <p className="mt-3 text-lg font-black tracking-tight text-[var(--foreground)] tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] leading-5 text-[var(--muted)]">{note}</p>
    </article>
  );
}

export function ActiveLocationOverview({
  business,
  businesses,
  bills,
  diagnostics,
  comparisonCount,
  costIncreaseDetected,
  heading = 'Ringkasan lokasi belum diaktifkan',
}: {
  business: OverviewBusinessInput;
  businesses: Array<{ id: string; name: string }>;
  bills: OverviewBillInput[];
  diagnostics: { available: boolean; reason: DiagnosticsReason };
  comparisonCount: number;
  costIncreaseDetected: boolean;
  heading?: string;
}) {
  const model = buildActiveLocationOverview(business, bills);
  const tariffContext = resolveTariffContext({
    businessTariff: business.tariffRupiahPerKwh,
    latestBillTariff: model.latest?.tariff,
  });
  const diagnosticsExposure = describeDiagnosticsExposure({
    available: diagnostics.available,
    reason: diagnostics.reason,
    costIncreaseDetected,
    comparisonCount,
  });

  return (
    <WorkspacePage>
      <WorkspaceHeader
        eyebrow="Lokasi aktif"
        title={heading}
        description="Dashboard operasional belum diaktifkan. Ringkasan ini hanya membaca profil usaha dan tagihan yang sudah Anda catat, tanpa menjalankan pemeriksaan lanjutan."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <BusinessSelector businesses={businesses} selectedId={business.id} route="/dashboard" />
            <Link href={withBusinessId('/businesses', business.id)} className={secondaryButton}>
              Kelola Usaha
            </Link>
          </div>
        }
      />

      <SoftCard>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">Profil lokasi</p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-[var(--foreground)]">{business.name}</h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              {businessSegmentLabel(business.segment)} · {describeElectricalSystem(business.electricalSystem)}
            </p>
          </div>
          <StatusBadge variant="info">Dashboard OFF</StatusBadge>
        </div>

        <dl className="mt-5 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/60 p-3">
            <dt className="font-bold text-[var(--muted)]">Jenis listrik</dt>
            <dd className="mt-1 font-extrabold text-[var(--foreground)]">
              {describeElectricalSystem(business.electricalSystem)}
              {business.powerVa ? ` · ${business.powerVa} VA` : ''}
            </dd>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/60 p-3">
            <dt className="font-bold text-[var(--muted)]">Tarif listrik</dt>
            <dd className="mt-1 font-extrabold text-[var(--foreground)]">{getOwnerFacingTariffLabel(tariffContext)}</dd>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/60 p-3">
            <dt className="flex items-center gap-1 font-bold text-[var(--muted)]">
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" /> Alamat
            </dt>
            <dd className="mt-1 font-extrabold text-[var(--foreground)]">{describeAddress(business)}</dd>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/60 p-3">
            <dt className="font-bold text-[var(--muted)]">Umur usaha operasional</dt>
            <dd className="mt-1 font-extrabold text-[var(--foreground)]">{OPERATIONAL_AGE_NOT_RECORDED}</dd>
            <dd className="mt-0.5 text-[11px] text-[var(--muted)]">
              WattWise belum mencatat tanggal mulai operasional. Tanggal akun tidak dipakai sebagai umur usaha.
            </dd>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/60 p-3">
            <dt className="font-bold text-[var(--muted)]">Jumlah kamar / karyawan</dt>
            <dd className="mt-1 font-extrabold text-[var(--foreground)]">
              {business.roomCount ?? OPERATIONAL_AGE_NOT_RECORDED}
              {business.occupiedRoomCount !== null && business.occupiedRoomCount !== undefined
                ? ` terisi ${business.occupiedRoomCount}`
                : ''}
              {business.employeeCount !== null && business.employeeCount !== undefined
                ? ` · ${business.employeeCount} karyawan`
                : ''}
            </dd>
          </div>
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/60 p-3">
            <dt className="font-bold text-[var(--muted)]">Hari operasional</dt>
            <dd className="mt-1 font-extrabold text-[var(--foreground)]">
              {business.operatingDaysPerMonth !== null && business.operatingDaysPerMonth !== undefined
                ? `${business.operatingDaysPerMonth} hari/bulan`
                : OPERATIONAL_AGE_NOT_RECORDED}
            </dd>
          </div>
        </dl>
      </SoftCard>

      <section aria-label="Ringkasan tagihan terbaru" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricTile
          Icon={ReceiptText}
          label="Biaya terbaru"
          value={model.latest?.cost !== null && model.latest?.cost !== undefined ? rupiah.format(model.latest.cost) : 'Belum ada data'}
          note={model.latest ? `Periode ${formatMonth(model.latest.periodEnd)}` : 'Tambahkan tagihan pertama'}
        />
        <MetricTile
          Icon={Gauge}
          label="Pemakaian terbaru"
          value={
            model.latest?.usageKwh !== null && model.latest?.usageKwh !== undefined
              ? `${decimal.format(model.latest.usageKwh)} kWh`
              : 'Belum diisi'
          }
          note={model.latest?.usageKwh === null ? 'Lengkapi kWh pada tagihan' : 'Berdasarkan data yang Anda masukkan'}
        />
        <MetricTile
          Icon={WalletCards}
          label="Perubahan biaya"
          value={model.costChange.state === 'CHANGE' ? changeLabel(model.costChange, 'rupiah') : 'Belum bisa dibandingkan'}
          note={
            model.costChange.state === 'CHANGE'
              ? `Periode pembanding ${model.previous ? formatMonth(model.previous.periodEnd) : '-'}`
              : changeLabel(model.costChange, 'rupiah')
          }
        />
        <MetricTile
          Icon={PlugZap}
          label="Perubahan pemakaian"
          value={model.kwhChange.state === 'CHANGE' ? changeLabel(model.kwhChange, 'kwh') : 'Belum bisa dibandingkan'}
          note={
            model.kwhChange.state === 'CHANGE'
              ? `Periode pembanding ${model.previous ? formatMonth(model.previous.periodEnd) : '-'}`
              : changeLabel(model.kwhChange, 'kwh')
          }
        />
      </section>

      <SoftCard>
        <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-[var(--primary)]">Riwayat data</p>
            <h2 className="mt-1 text-lg font-black text-[var(--foreground)]">Tagihan yang tercatat</h2>
          </div>
          <p className="text-[11px] text-[var(--muted)]">
            {model.completeness.periodCount} periode · {model.completeness.uniqueMonthCount} bulan unik
            {model.hasShortHistory ? ' · histori masih pendek' : ''}
          </p>
        </div>
        <p className="mt-2 text-xs text-[var(--muted)]">Data dibatasi hingga 12 periode terbaru.</p>
        <p className="mt-2 text-sm text-[var(--foreground)]">
          Rata-rata pemakaian: {model.averageKwh === null ? 'Belum tersedia' : `${decimal.format(model.averageKwh)} kWh/periode`}.
          {' '}Cakupan: {model.completeness.withKwh} dari {model.completeness.periodCount} periode berisi kWh valid, bukan rata-rata bulanan bila durasi periode berbeda.
        </p>
        <p className="mt-2 text-xs text-[var(--muted)]">
          Setup awal selesai. {model.completeness.gaps.length ? 'Data tagihan belum lengkap; lengkapi biaya, kWh, atau tarif yang ditandai sebelum membandingkan.' : 'Biaya, kWh, dan tarif tersedia pada seluruh periode yang ditampilkan.'}
          {model.hasShortHistory ? ' Histori masih pendek; catat periode berikutnya untuk memperluas pembanding.' : ' Tinjau perubahan antarperiode sebelum mengambil tindakan.'}
        </p>

        {model.bills.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-dashed border-[var(--border)] p-6 text-sm text-[var(--muted)]">
            Belum ada tagihan yang tercatat untuk lokasi ini.
          </p>
        ) : (
          <details className="mt-4 rounded-2xl border border-[var(--border)]">
            <summary className="cursor-pointer rounded-2xl px-4 py-3 text-xs font-black text-[var(--foreground)] hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]">
              Lihat tabel riwayat ({model.bills.length} periode)
            </summary>
            <div className="overflow-x-auto border-t border-[var(--border)]">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead className="text-[var(--muted)]">
                  <tr className="border-b border-[var(--border)]">
                    <th scope="col" className="px-4 py-2.5 font-bold">Periode</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Biaya</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Pemakaian</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Tarif</th>
                    <th scope="col" className="px-4 py-2.5 font-bold">Perubahan biaya / kWh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {model.bills.map((bill) => (
                    <tr key={bill.id}>
                      <td className="px-4 py-2.5 font-bold text-[var(--foreground)]">{formatMonth(bill.periodEnd)}<span className="block text-[11px] font-normal">{bill.periodStart} – {bill.periodEnd}</span></td>
                      <td className="px-4 py-2.5 tabular-nums font-extrabold text-[var(--foreground)]">
                        {bill.cost === null ? 'Tidak tersedia' : rupiah.format(bill.cost)}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-[var(--muted)]">
                        {bill.usageKwh === null ? 'Belum diisi' : `${decimal.format(bill.usageKwh)} kWh`}
                      </td>
                      <td className="px-4 py-2.5 tabular-nums text-[var(--muted)]">
                        {bill.tariff === null ? 'Tarif belum tersedia' : `${rupiah.format(bill.tariff)}/kWh`}
                      </td>
                      <td className="px-4 py-2.5 text-[var(--muted)]">
                        {changeLabel(bill.costChange, 'rupiah')} / {changeLabel(bill.kwhChange, 'kwh')}
                        {bill.costChange.previousPeriod && <span className="block">vs {formatMonth(bill.costChange.previousPeriod)} ({bill.costChange.previousPeriod})</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        )}

        <dl className="mt-4 grid gap-2 text-[11px] text-[var(--muted)] sm:grid-cols-3">
          <div>
            <dt className="font-bold">Periode tercatat</dt>
            <dd className="mt-0.5 font-extrabold text-[var(--foreground)] tabular-nums">
              {model.completeness.periodCount}
            </dd>
          </div>
          <div>
            <dt className="font-bold">Periode berisi kWh</dt>
            <dd className="mt-0.5 font-extrabold text-[var(--foreground)] tabular-nums">
              {model.completeness.withKwh} dari {model.completeness.periodCount}
            </dd>
          </div>
          <div>
            <dt className="font-bold">Periode bertarif valid</dt>
            <dd className="mt-0.5 font-extrabold text-[var(--foreground)] tabular-nums">
              {model.completeness.withTariff} dari {model.completeness.periodCount}
            </dd>
          </div>
        </dl>
        {model.completeness.gaps.length > 0 && (
          <ul className="mt-3 space-y-1 text-[11px] leading-5 text-[var(--muted)]">
            {model.completeness.gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        )}

        <p className="mt-4 text-[11px] leading-5 text-[var(--muted)]">
          Biaya dan kWh dibandingkan secara terpisah. Perubahan angka tidak otomatis berarti pemborosan, kerusakan alat,
          atau penyebab kelistrikan tertentu.
        </p>
      </SoftCard>

      <nav aria-label="Lanjutan lokasi aktif" className="flex flex-wrap gap-3">
        <Link href={withBusinessId('/analysis', business.id)} className={primaryButton}>
          Lihat Analisis
        </Link>
        <Link href={withBusinessId('/bills', business.id)} className={secondaryButton}>
          Kelola Tagihan
        </Link>
        <Link href={withBusinessId('/energy', business.id)} className={secondaryButton}>
          Data Energi
        </Link>
        <Link href={withBusinessId('/businesses', business.id)} className={secondaryButton}>
          Kelola Usaha
        </Link>
        {diagnosticsExposure.showLink && (
          <Link href={withBusinessId('/diagnostics', business.id)} className={secondaryButton}>
            <Search className="mr-1.5 h-4 w-4" aria-hidden="true" />
            Cek Kenaikan
          </Link>
        )}
      </nav>

      <p className="text-[11px] leading-5 text-[var(--muted)]">{diagnosticsExposure.note}</p>

      <DataNotice title="Batas ringkasan ini">
        Ringkasan dibuat dari profil usaha dan tagihan yang Anda masukkan. Ini bukan data resmi PLN, bukan pengukuran
        perangkat, dan bukan diagnosis teknis. Ketersediaan Cek Kenaikan mengikuti pengaturan fitur dan segmen usaha yang
        didukung; tautan tidak ditampilkan bila fitur tersebut tidak aktif.
      </DataNotice>
    </WorkspacePage>
  );
}
