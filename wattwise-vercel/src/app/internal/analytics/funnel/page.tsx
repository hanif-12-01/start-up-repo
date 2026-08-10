import { notFound } from 'next/navigation';
import { LockKeyhole, TriangleAlert } from 'lucide-react';
import { isFunnelAnalyticsEnabled, isFunnelAnalyticsViewer } from '@/config/env';
import { getOptionalSession } from '@/server/auth/session';
import {
  getProductFunnelAnalyticsReadModel,
  FunnelSummary,
} from '@/server/services/funnel-analytics.service';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{
    from?: string;
    to?: string;
    segment?: string;
  }>;
}

export default async function InternalFunnelAnalyticsPage({ searchParams }: PageProps) {
  const session = await getOptionalSession();
  const userId = session?.user?.id;

  if (!session?.user || !isFunnelAnalyticsEnabled() || !isFunnelAnalyticsViewer(userId)) {
    notFound();
  }

  const params = await searchParams;
  let readModel;
  let errorMessage: string | null = null;

  try {
    readModel = await getProductFunnelAnalyticsReadModel({
      from: params.from,
      to: params.to,
      segment: params.segment,
    });
  } catch (err: unknown) {
    errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan saat memuat data analytics.';
    readModel = await getProductFunnelAnalyticsReadModel({});
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-[var(--primary)]/10 px-2.5 py-1 text-xs font-semibold text-[var(--primary)] border border-[var(--primary)]/20">
                Internal Analytics V1
              </span>
              <span className="text-xs text-[var(--muted)]">
                {readModel.timezone}
              </span>
            </div>
            <h1 className="mt-2 text-2xl font-bold text-[var(--foreground)] sm:text-3xl">
              Product Funnel Analytics
            </h1>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Analisis alur perjalanan pengguna dan usaha berbasis domain state terotorisasi.
            </p>
          </div>
          <div className="text-right text-xs text-[var(--muted)]">
            <p className="font-mono">{readModel.dataFreshness}</p>
          </div>
        </header>

        {/* Filter Bar */}
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/60 p-4 sm:p-6 backdrop-blur">
          <form method="GET" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <div>
              <label htmlFor="from" className="block text-xs font-medium text-[var(--foreground)]">
                Dari Tanggal (YYYY-MM-DD)
              </label>
              <input
                type="date"
                id="from"
                name="from"
                defaultValue={readModel.range.from}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
              />
            </div>
            <div>
              <label htmlFor="to" className="block text-xs font-medium text-[var(--foreground)]">
                Sampai Tanggal (YYYY-MM-DD)
              </label>
              <input
                type="date"
                id="to"
                name="to"
                defaultValue={readModel.range.to}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
              />
            </div>
            <div>
              <label htmlFor="segment" className="block text-xs font-medium text-[var(--foreground)]">
                Filter Segmen Usaha
              </label>
              <select
                id="segment"
                name="segment"
                defaultValue={readModel.selectedSegment}
                className="mt-1.5 w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)]"
              >
                {readModel.availableSegments.map((seg) => (
                  <option key={seg} value={seg}>
                    {seg === 'all' ? 'Semua Segmen (Overall)' : seg}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <button
                type="submit"
                className="w-full rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--background)] transition"
              >
                Terapkan Filter
              </button>
            </div>
          </form>

          {errorMessage && (
            <div className="mt-4 flex gap-2 rounded-lg border border-[var(--danger-border)] bg-[var(--danger-surface)] p-3 text-xs font-medium text-[var(--danger)]">
              <TriangleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{errorMessage} (Menampilkan rentang default 90 hari)</span>
            </div>
          )}
        </div>

        {/* Suppression Banner */}
        {readModel.suppressionState.suppressed && (
          <div className="rounded-xl border border-[var(--warning-border)] bg-[var(--warning-surface)] p-4 text-[var(--warning)]">
            <div className="flex items-center gap-2">
              <LockKeyhole className="h-5 w-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-semibold text-sm">Privasi Data Segmen Diaktifkan</p>
                <p className="mt-0.5 text-xs text-[var(--warning)]">
                  {readModel.suppressionState.message} (Jumlah cohort segmen {readModel.selectedSegment} &lt; 5).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Funnel Sections Grid */}
        <div className="grid grid-cols-1 gap-8">
          {/* User Activation Funnel */}
          <FunnelCard funnel={readModel.userActivationFunnel} />

          {/* Business Value Funnel */}
          <FunnelCard funnel={readModel.businessValueFunnel} suppressed={readModel.suppressionState.suppressed} />
        </div>

        {/* Methodology Notes & Caveats */}
        <footer className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/40 p-6 space-y-3 text-xs text-[var(--muted)]">
          <h3 className="font-semibold text-[var(--foreground)] text-sm">Catatan Metodologi & Privasi</h3>
          <ul className="list-disc list-inside space-y-1.5">
            {readModel.methodologyNotes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </footer>
      </div>
    </div>
  );
}

function FunnelCard({ funnel, suppressed }: { funnel: FunnelSummary; suppressed?: boolean }) {
  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/50 p-6 space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--border)] pb-4">
        <div>
          <span className="text-xs font-mono uppercase tracking-wider text-[var(--primary)]">
            {funnel.unitOfAnalysis} COHORT ({funnel.cohortSize})
          </span>
          <h2 className="text-xl font-bold text-[var(--foreground)]">{funnel.name}</h2>
        </div>

        {funnel.largestDropOff && !suppressed && (
          <div className="rounded-lg bg-[var(--surface-muted)]/80 px-3 py-2 text-xs border border-[var(--border)]">
            <span className="font-semibold text-[var(--warning)]">Penurunan Terbesar:</span>{' '}
            <span className="text-[var(--foreground)]">{funnel.largestDropOff.wording}</span>
          </div>
        )}
      </div>

      {suppressed ? (
        <div className="py-8 text-center text-sm text-[var(--muted)]">
          Detail tahapan disembunyikan untuk menjaga privasi segmen cohort kecil.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--foreground)]">
              <thead className="border-b border-[var(--border)] bg-[var(--background)]/50 text-[var(--muted)] uppercase tracking-wider font-mono">
                <tr>
                  <th className="py-3 px-4">#</th>
                  <th className="py-3 px-4">Tahapan Milestone</th>
                  <th className="py-3 px-4 text-right">Mencapai</th>
                  <th className="py-3 px-4 text-right">Konversi Cohort</th>
                  <th className="py-3 px-4 text-right">Konversi Tahap Lalu</th>
                  <th className="py-3 px-4 text-right">Drop-off</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]/60 font-medium">
                {funnel.stages.map((stg) => {
                  const pct = stg.cohortConversionDenominator > 0
                    ? (stg.cohortConversionNumerator / stg.cohortConversionDenominator) * 100
                    : 0;

                  return (
                    <tr key={stg.stageCode} className="hover:bg-[var(--surface-muted)]/30 transition-colors">
                      <td className="py-3 px-4 text-[var(--muted)] font-mono">{stg.order}</td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[var(--foreground)]">{stg.label}</div>
                        <div className="text-[10px] text-[var(--muted)] font-mono">{stg.stageCode}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[var(--foreground)]">
                        {stg.reachedCount.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="font-mono text-[var(--primary)]">{stg.cohortConversionRateLabel}</div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-[var(--surface-muted)] overflow-hidden">
                          <div
                            className="h-full bg-[var(--primary)] rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[var(--foreground)]">
                        {stg.previousStageConversionRateLabel}
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[var(--danger)]">
                        {stg.dropOffFromPreviousCount > 0 ? `-${stg.dropOffFromPreviousCount.toLocaleString()}` : '0'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {funnel.dataQualityAnomalyCount > 0 && (
            <p className="text-[11px] text-[var(--muted)] italic">
              * Terdeteksi {funnel.dataQualityAnomalyCount} anomali urutan historis yang dinormalisasi secara teratur.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
