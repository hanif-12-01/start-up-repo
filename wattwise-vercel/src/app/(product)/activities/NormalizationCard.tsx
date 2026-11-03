import Link from 'next/link';
import type { NormalizationOutput } from '@/server/services/energy-normalization.service';
import { formatDateTimeId } from '@/lib/operational-input';

export function NormalizationCard({ result }: { result: NormalizationOutput }) {
  const { status, statusLabel, production, energy, intensity, boundaryNote, caveats, guidance } = result;

  const statusColors = {
    VALID: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
    NEEDS_REVIEW: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30',
    INSUFFICIENT_DATA: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30',
  }[status];

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-xs">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] p-4 sm:p-5">
        <div>
          <span className="text-xs font-semibold tracking-wider uppercase text-[var(--muted)]">
            Analisis Intensitas Energi
          </span>
          <h3 className="text-xl font-black text-[var(--foreground)]">{production.processName}</h3>
          <p className="text-xs text-[var(--muted)]">
            Periode: {formatDateTimeId(production.periodStart)} — {formatDateTimeId(production.periodEnd)} ({production.durationDays} hari)
          </p>
        </div>
        <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-bold ${statusColors}`}>
          {statusLabel}
        </span>
      </div>

      {/* Main KPI metrics */}
      <div className="grid grid-cols-1 divide-y divide-[var(--border)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
        <div className="p-4 sm:p-5">
          <p className="text-xs font-semibold text-[var(--muted)]">Pemakaian Listrik</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-[var(--foreground)]">
            {energy ? `${energy.totalKwh} kWh` : '—'}
          </p>
          {energy && (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Sumber: {energy.sourceName} ({energy.coveragePercent}% tercakup)
            </p>
          )}
        </div>

        <div className="p-4 sm:p-5">
          <p className="text-xs font-semibold text-[var(--muted)]">Jumlah Hasil Produksi</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-[var(--foreground)]">
            {production.outputQuantity} {production.outputUnit}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">Berdasarkan catatan operasional</p>
        </div>

        <div className="p-4 sm:p-5 bg-[var(--surface-muted)]/40">
          <p className="text-xs font-semibold text-[var(--muted)]">Listrik per {production.outputUnit}</p>
          <p className="mt-1 text-3xl font-black tracking-tight text-[var(--foreground)]">
            {intensity ? `${intensity.formatted} ${intensity.unitLabel}` : '—'}
          </p>
          <p className="mt-1 text-xs text-[var(--muted)]">
            {intensity ? 'Rasio pemakaian per satuan' : 'Data belum cukup dihitung'}
          </p>
        </div>
      </div>

      {/* Boundary and Caveat Section */}
      <div className="space-y-3 border-t border-[var(--border)] bg-[var(--surface-muted)]/20 p-4 sm:p-5 text-sm">
        {boundaryNote && (
          <p className="text-[var(--foreground)]">
            <strong>Cakupan Pengukuran:</strong> {boundaryNote}
          </p>
        )}

        {caveats.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-xs leading-5 text-amber-800 dark:text-amber-300">
            <strong>Catatan Kehati-hatian:</strong>
            <ul className="mt-1 list-disc pl-4 space-y-0.5">
              {caveats.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          </div>
        )}

        {result.availableSources && result.availableSources.length > 1 && (
          <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-5">
            <strong className="block text-[var(--foreground)] mb-1.5">Pilih Sumber Listrik:</strong>
            <div className="flex flex-wrap gap-2">
              {result.availableSources.map((s) => {
                const isSelected = result.energy?.sourceName === s.name;
                const bizQuery = result.production.businessId ? `businessId=${result.production.businessId}&` : '';
                // ponytail: accessible 44px touch target on mobile; upgrade to segmented control if sources > 5
                return (
                  <Link
                    key={s.id}
                    href={`/activities?${bizQuery}recordId=${result.production.id}&sourceId=${s.id}`}
                    className={`min-h-11 inline-flex items-center rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-[var(--focus-ring)] ${
                      isSelected
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]'
                        : 'border-[var(--border)] bg-[var(--surface-muted)]/50 text-[var(--foreground)] hover:border-[var(--primary)]'
                    }`}
                  >
                    {s.name} ({s.boundary === 'WHOLE_SITE' ? 'Meter Utama' : 'Submeter'}) · {s.recordCount} data
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {guidance && (
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-3 text-xs leading-5 text-blue-700 dark:text-blue-300">
            <strong>Langkah Selanjutnya:</strong> {guidance}
          </div>
        )}
      </div>
    </div>
  );
}
