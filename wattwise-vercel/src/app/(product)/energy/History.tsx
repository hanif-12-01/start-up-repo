import Link from 'next/link';
import { Surface, secondaryButton } from '@/components/product/WorkspaceUI';
import type { EnergyMeasurementRecord, MeasurementSourceRecord } from '@/server/repositories/measurement.repository';
import type { MeasurementResult } from '@/server/services/measurement.service';
import { boundaryLabels, sourceLabels, zoneLabels, control } from '@/lib/energy-input';
import { historyHref, historyPageSize, sourceTime } from '@/lib/energy-history';

export function History({ businessId, sources, result, query, filterError }: {
  businessId: string; sources: MeasurementSourceRecord[]; result: MeasurementResult<EnergyMeasurementRecord[]>;
  query: Record<string, string | string[] | undefined>; filterError?: string;
}) {
  const value = (key: string) => typeof query[key] === 'string' ? query[key] : '';
  const page = Math.floor((Number(value('page') || 1) - 1)) + 1;
  return <Surface aria-labelledby="history-title">
    <h2 id="history-title" className="text-xl font-extrabold">Riwayat catatan listrik</h2>
    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">Data ini belum diperiksa untuk dijumlahkan. Meter utama dan meter bagian dapat mencatat pemakaian yang sama.</p>
    <form className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4" action="/energy">
      <input type="hidden" name="businessId" value={businessId} />
      <label className="space-y-2 text-sm font-semibold">Sumber<select name="source" defaultValue={value('source')} className={control}><option value="">Semua sumber</option>{sources.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
      <label className="space-y-2 text-sm font-semibold">Awal rentang<input name="from" type="datetime-local" step="1" defaultValue={value('from')} className={control} /></label>
      <label className="space-y-2 text-sm font-semibold">Akhir rentang<input name="to" type="datetime-local" step="1" defaultValue={value('to')} className={control} /></label>
      <label className="space-y-2 text-sm font-semibold">Waktu dalam catatan<select name="zone" defaultValue={value('zone')} className={control}><option value="">Pilih jika memfilter waktu</option>{Object.entries(zoneLabels).map(([zone, label]) => <option key={zone} value={zone}>{label}</option>)}</select></label>
      <div className="flex flex-wrap gap-3 sm:col-span-2 lg:col-span-4"><button className={secondaryButton}>Terapkan filter</button><Link className={secondaryButton} href={`/energy?businessId=${encodeURIComponent(businessId)}#history-title`}>Hapus filter</Link></div>
    </form>
    <p className="mt-3 text-sm text-[var(--muted)]">Menampilkan periode yang bersinggungan dengan rentang filter; akhir rentang tidak termasuk. Urutan waktu paling awal.</p>
    {filterError ? <p role="alert" className="mt-4 text-sm text-[var(--danger)]">{filterError}</p> : !result.ok ? <p role="alert" className="mt-4">Riwayat belum dapat dimuat. Muat ulang halaman untuk mencoba kembali.</p> : <>
      {!result.data.length ? <p className="mt-5">Belum ada catatan listrik pada pilihan ini. Ubah filter atau masukkan catatan pertama.</p> : <ul className="mt-5 divide-y divide-[var(--border)]">{result.data.slice(0, historyPageSize).map(m => <li key={m.id} className="grid min-w-0 gap-3 py-5 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0 space-y-2 break-words"><h3 className="font-bold">{sources.find(s => s.id === m.measurementSourceId)?.name ?? 'Sumber pengukuran'}</h3>
          <p className="text-sm"><time dateTime={m.periodStart.toISOString()}>{sourceTime(m.periodStart, m.sourceTimezone)}</time> – <time dateTime={m.periodEnd.toISOString()}>{sourceTime(m.periodEnd, m.sourceTimezone)}</time><span className="block text-[var(--muted)]">{zoneLabels[m.sourceTimezone]} · Akhir periode tidak termasuk pemakaian berikutnya</span></p>
          <p className="text-sm">{m.consumptionBasis === 'ESTIMATED' ? 'Perkiraan penggunaan — bukan pembacaan meter' : 'Hasil pembacaan meter'} · {({ MANUAL: 'Dicatat langsung', CSV_IMPORT: 'Dari file', SENSOR: 'Sensor' })[m.measurementMethod]} · {m.qualityStatus === 'NEEDS_REVIEW' ? 'Perlu diperiksa' : 'Tercatat'}</p>
          <p className="text-sm text-[var(--muted)]">{sourceLabels[m.sourceType] ?? m.sourceType} · {boundaryLabels[m.measurementBoundary] ?? m.measurementBoundary}</p>
          <p className="text-sm">Nomor catatan atau dokumen: {m.provenanceReference}</p>
          {m.notes && <p className="text-sm">Catatan: {m.notes}</p>}
          <details className="text-sm"><summary className="w-fit min-h-11 cursor-pointer rounded-lg py-2 font-semibold focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)]">Detail sumber</summary><p>Nomor atau kode sumber: {m.provenanceKey}</p><p className="text-[var(--muted)]">Belum diperiksa untuk dijumlahkan dengan catatan lain.</p></details>
        </div><p className="font-bold tabular-nums sm:text-right">{m.energyKwh} kWh</p>
      </li>)}</ul>}
      <nav aria-label="Halaman riwayat" className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4">
        {page > 1 && <Link href={historyHref(businessId, query, page - 1)} className={secondaryButton}>Sebelumnya</Link>}<span className="text-sm">Halaman {page}</span>
        {result.data.length > historyPageSize && page < 5001 && <Link href={historyHref(businessId, query, page + 1)} className={secondaryButton}>Berikutnya</Link>}
      </nav>
    </>}
  </Surface>;
}
