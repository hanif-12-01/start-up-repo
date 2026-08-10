import Link from 'next/link';
import { decimal } from '@/lib/format';
import { notFound, redirect } from 'next/navigation';
import {
  Building2,
  CalendarDays,
  Download,
  LayoutDashboard,
} from 'lucide-react';
import { getOptionalSession } from '@/server/auth/session';
import {
  MonthlyReportBusinessNotFoundError,
  MonthlyReportHistoryGatedError,
  MonthlyReportMonthError,
  MonthlyReportsUnavailableError,
  getMonthlyReportReadModel,
} from '@/server/services/monthly-report.service';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';
import { PrintReportButton } from './PrintReportButton';

export const dynamic = 'force-dynamic';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-black tracking-tight text-[var(--foreground)]">{children}</h2>;
}

function EmptySection({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-5 text-sm leading-relaxed text-[var(--muted)]">
      {children}
    </p>
  );
}

export default async function MonthlyReportPage({
  searchParams,
}: {
  searchParams: Promise<{
    businessId?: string | string[];
    month?: string | string[];
  }>;
}) {
  const sessionResult = await getOptionalSession();
  if (!sessionResult?.user) redirect('/login');
  const userId = sessionResult.user.id;
  const journeyStep = await resolveJourneyStep(userId);
  if (journeyStep !== 'COMPLETE') redirect(getJourneyRedirect(journeyStep));

  const query = await searchParams;
  const requestedBusinessId =
    typeof query.businessId === 'string' && query.businessId.trim()
      ? query.businessId
      : undefined;
  if (Array.isArray(query.businessId) || Array.isArray(query.month)) notFound();
  const requestedMonth =
    typeof query.month === 'string' && query.month.trim() ? query.month : undefined;

  let report;
  try {
    report = await getMonthlyReportReadModel(
      userId,
      requestedBusinessId,
      requestedMonth
    );
  } catch (error) {
    if (error instanceof MonthlyReportsUnavailableError) {
      redirect(
        requestedBusinessId
          ? `/dashboard?businessId=${encodeURIComponent(requestedBusinessId)}`
          : '/dashboard'
      );
    }
    if (
      error instanceof MonthlyReportBusinessNotFoundError ||
      error instanceof MonthlyReportMonthError
    ) {
      notFound();
    }
    if (error instanceof MonthlyReportHistoryGatedError) {
      return (
        <main className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4 text-[var(--foreground)]">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 text-center shadow-[var(--shadow-medium)]">
            <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--primary)]">
              WattWise AI · Entitlement
            </p>
            <h1 className="text-xl font-black text-[var(--foreground)]">Akses Laporan Dibatasi</h1>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Laporan untuk bulan ini berada di luar riwayat paket Anda.
            </p>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Data tagihan tetap tersimpan.<br />
              Pilih bulan yang tersedia atau lihat pilihan paket.
            </p>
            <div className="pt-2 flex justify-center">
              <Link
                href="/reports/monthly"
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-extrabold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
              >
                Lihat Bulan Tersedia
              </Link>
            </div>
          </div>
        </main>
      );
    }
    throw error;
  }

  const selectedBusinessId = report.businessSummary.options.find(
    (option) => option.selected
  )?.id;
  if (!selectedBusinessId) notFound();

  const selectedMonthIsAvailable = report.availableMonths.some(
    (month) => month.value === report.reportMonth
  );

  return (
    <main className="report-page min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] md:px-8 lg:py-10">
      <article className="report-print-root mx-auto max-w-5xl overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] shadow-[var(--shadow-medium)] print:rounded-none print:border-none print:shadow-none">
        {/* Header */}
        <header className="border-b border-[var(--border)] bg-[var(--surface)] px-6 py-7 md:px-9 print:bg-white print:text-slate-900 print:border-slate-300">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--primary)] print:text-emerald-700">
                WattWise AI
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--foreground)] md:text-4xl print:text-slate-900">
                Laporan Listrik Usaha
              </h1>
              <p className="mt-3 text-lg font-extrabold text-[var(--foreground)] print:text-slate-900">
                {report.businessSummary.name}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)] print:text-slate-600">
                {report.businessSummary.segment} · {report.monthLabel}
              </p>
              <span className="mt-4 inline-flex rounded-full border border-[var(--success-border)] bg-[var(--success-surface)] px-3 py-1 text-xs font-extrabold text-[var(--success)] print:border-emerald-700 print:bg-emerald-50 print:text-emerald-800">
                {report.reportCompleteness.label}
              </span>
            </div>

            {/* Screen Toolbar */}
            <div className="report-print-hide flex flex-wrap items-center gap-3">
              <PrintReportButton />
              <a
                href={`/api/reports/monthly.csv?businessId=${encodeURIComponent(selectedBusinessId)}&month=${encodeURIComponent(report.reportMonth)}`}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5 text-sm font-extrabold text-[var(--foreground)] transition-colors hover:border-[var(--border-strong)] hover:bg-[var(--primary-soft)]"
              >
                <Download className="h-4 w-4 text-[var(--primary)]" />
                <span>Unduh CSV</span>
              </a>
              <Link
                href={`/dashboard?businessId=${encodeURIComponent(selectedBusinessId)}`}
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-4 py-2.5 text-sm font-extrabold text-[var(--foreground)] hover:bg-[var(--surface-muted)]"
              >
                <LayoutDashboard className="h-4 w-4 text-[var(--muted)]" />
                <span>Dashboard</span>
              </Link>
            </div>
          </div>
        </header>

        {/* Filters */}
        <div className="report-print-hide grid gap-4 border-b border-[var(--border)] bg-[var(--surface-muted)] p-5 md:grid-cols-2 md:px-9">
          {report.businessSummary.options.length > 1 && (
            <form action="/reports/monthly" method="get" className="flex items-end gap-2">
              <input type="hidden" name="month" value={report.reportMonth} />
              <label className="min-w-0 flex-1 text-xs font-extrabold uppercase text-[var(--muted)]">
                <span className="mb-1.5 flex items-center gap-1.5 text-[var(--foreground)]">
                  <Building2 className="h-4 w-4 text-[var(--primary)]" />
                  Pilih Usaha
                </span>
                <select
                  name="businessId"
                  defaultValue={selectedBusinessId}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm font-bold text-[var(--foreground)] focus:ring-2 focus:ring-[var(--focus)]"
                >
                  {report.businessSummary.options.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="submit"
                className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-extrabold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
              >
                Tampilkan
              </button>
            </form>
          )}
          <form action="/reports/monthly" method="get" className="flex items-end gap-2">
            <input type="hidden" name="businessId" value={selectedBusinessId} />
            <label className="min-w-0 flex-1 text-xs font-extrabold uppercase text-[var(--muted)]">
              <span className="mb-1.5 flex items-center gap-1.5 text-[var(--foreground)]">
                <CalendarDays className="h-4 w-4 text-[var(--primary)]" />
                Bulan Laporan
              </span>
              <select
                name="month"
                defaultValue={report.reportMonth}
                className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] px-3 py-2.5 text-sm font-bold text-[var(--foreground)] focus:ring-2 focus:ring-[var(--focus)]"
              >
                {!selectedMonthIsAvailable && (
                  <option value={report.reportMonth}>{report.monthLabel}</option>
                )}
                {report.availableMonths.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              className="rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-extrabold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
            >
              Tampilkan
            </button>
          </form>
        </div>

        {/* Content Body */}
        <div className="space-y-8 p-6 md:p-9">
          {/* Section 1 */}
          <section className="report-section space-y-4" aria-labelledby="monthly-summary-title">
            <SectionTitle>Ringkasan Tagihan</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <p className="text-xs uppercase font-extrabold tracking-wide text-[var(--muted)]">Jumlah tagihan</p>
                <p className="mt-2 text-2xl font-black">{report.monthSummary.billCount}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <p className="text-xs uppercase font-extrabold tracking-wide text-[var(--muted)]">Total biaya</p>
                <p className="mt-2 text-lg font-black text-[var(--primary)] print:text-emerald-800">
                  {report.monthSummary.totalCost}
                </p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <p className="text-xs uppercase font-extrabold tracking-wide text-[var(--muted)]">Periode tercatat</p>
                <p className="mt-2 text-2xl font-black">{report.monthSummary.recordedPeriods}</p>
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <p className="text-xs uppercase font-extrabold tracking-wide text-[var(--muted)]">Total kWh</p>
                <p className="mt-2 text-lg font-black">
                  {report.monthSummary.totalKwh ?? 'Belum lengkap'}
                </p>
              </div>
            </div>
            <p className="text-xs text-[var(--muted)]">{report.monthSummary.dataCompletenessNote}</p>
          </section>

          {/* Section 2 */}
          <section className="report-section space-y-4">
            <SectionTitle>Dampak ke Cash Flow</SectionTitle>
            {report.revenueSummary ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                  <p className="text-xs uppercase font-extrabold tracking-wide text-[var(--muted)]">Pendapatan bulan ini</p>
                  <p className="mt-2 text-lg font-black text-[var(--primary)] print:text-emerald-800">{report.revenueSummary.amountRupiahFormatted}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{report.revenueSummary.inputModeLabel}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                  <p className="text-xs uppercase font-extrabold tracking-wide text-[var(--muted)]">Rasio listrik</p>
                  <p className="mt-2 text-lg font-black">{report.revenueSummary.ratioPercent === null ? 'Belum tersedia' : `${decimal.format(report.revenueSummary.ratioPercent)}%`}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Porsi biaya listrik terhadap omzet</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                  <p className="text-xs uppercase font-extrabold tracking-wide text-[var(--muted)]">Sisa setelah listrik</p>
                  <p className="mt-2 text-lg font-black">{report.revenueSummary.remainingRupiahFormatted ?? 'Belum tersedia'}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Bukan laba bersih</p>
                </div>
              </div>
            ) : (
              <EmptySection>Tambahkan pendapatan untuk {report.monthLabel} agar konteks cash flow dapat ditampilkan.</EmptySection>
            )}
            <p className="text-xs leading-5 text-[var(--muted)]">Sisa pendapatan setelah listrik belum memperhitungkan bahan baku, gaji, sewa, air, internet, pajak, dan biaya operasional lain.</p>
          </section>

          {/* Section 3 */}
          <section className="report-section space-y-4">
            <SectionTitle>Daftar Tagihan</SectionTitle>
            {report.billSummaries.length === 0 ? (
              <EmptySection>
                Belum ada tagihan yang berakhir pada {report.monthLabel}. Tidak ada perjalanan Cek
                Kenaikan yang direkonstruksi untuk bulan ini.
              </EmptySection>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead className="bg-[var(--surface-muted)] text-xs font-extrabold uppercase tracking-wide text-[var(--muted)]">
                    <tr>
                      <th className="p-3.5">Periode</th>
                      <th className="p-3.5">Hari</th>
                      <th className="p-3.5">Biaya</th>
                      <th className="p-3.5">Biaya/hari</th>
                      <th className="p-3.5">kWh</th>
                      <th className="p-3.5">Tarif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)] bg-[var(--surface-elevated)]">
                    {report.billSummaries.map((bill) => (
                      <tr key={`${bill.period}-${bill.totalCost}`}>
                        <td className="p-3.5 font-bold">
                          {bill.period}
                          {bill.isPrimary && (
                            <span className="ml-2 inline-flex rounded-full bg-[var(--success-surface)] px-2.5 py-0.5 text-xs font-extrabold text-[var(--success)] print:bg-emerald-100 print:text-emerald-800">
                              Tagihan utama laporan
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">{bill.inclusiveDays}</td>
                        <td className="p-3.5 font-semibold">{bill.totalCost}</td>
                        <td className="p-3.5">{bill.costPerDay}</td>
                        <td className="p-3.5">{bill.kwh ?? 'Tidak diisi'}</td>
                        <td className="p-3.5">{bill.tariff ?? 'Tidak diisi'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Section 4 */}
          <section className="report-section space-y-4">
            <SectionTitle>Perbandingan Tagihan Utama</SectionTitle>
            {report.billComparisonSummary ? (
              <div className="rounded-2xl border border-[var(--success-border)] bg-[var(--success-surface)] p-5">
                <h3 className="font-extrabold text-[var(--foreground)]">{report.billComparisonSummary.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  {report.billComparisonSummary.detail}
                </p>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-[var(--muted)]">Biaya harian tagihan utama</dt><dd className="font-bold">{report.billComparisonSummary.currentDailyCost}</dd></div>
                  <div><dt className="text-xs text-[var(--muted)]">Biaya harian sebelumnya</dt><dd className="font-bold">{report.billComparisonSummary.previousDailyCost}</dd></div>
                  <div><dt className="text-xs text-[var(--muted)]">Pemakaian</dt><dd className="font-bold">{report.billComparisonSummary.usageDirection ?? 'Data kWh belum lengkap'}</dd></div>
                  <div><dt className="text-xs text-[var(--muted)]">Konteks tarif</dt><dd className="font-bold">{report.billComparisonSummary.tariffContext}</dd></div>
                </dl>
              </div>
            ) : (
              <EmptySection>
                {report.primaryBillSummary
                  ? 'Perbandingan belum tersedia karena belum ada tagihan sebelumnya yang memenuhi urutan periode.'
                  : 'Perbandingan belum tersedia karena tidak ada tagihan utama laporan.'}
              </EmptySection>
            )}
          </section>

          {/* Section 5 */}
          <section className="report-section space-y-4">
            <SectionTitle>Perjalanan Cek Kenaikan</SectionTitle>
            {report.diagnosticSummary ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
                <p className="font-extrabold">{report.diagnosticSummary.statusLabel}</p>
                <p className="mt-2 text-sm text-[var(--muted)]">
                  Dimulai {report.diagnosticSummary.startedAt} · Tagihan sumber{' '}
                  {report.diagnosticSummary.sourcePeriod}
                  {report.diagnosticSummary.closedAt
                    ? ` · Selesai ${report.diagnosticSummary.closedAt}`
                    : ''}
                </p>
              </div>
            ) : (
              <EmptySection>
                {report.primaryBillSummary
                  ? 'Belum ada Cek Kenaikan untuk tagihan ini.'
                  : 'Belum ada perjalanan yang dapat ditampilkan.'}
              </EmptySection>
            )}
          </section>

          {/* Section 6 */}
          <section className="report-section space-y-4">
            <SectionTitle>Bagian yang Perlu Dicek</SectionTitle>
            {report.candidateSummaries.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-3">
                {report.candidateSummaries.map((candidate) => (
                  <article key={`${candidate.rankLabel}-${candidate.title}`} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <p className="text-xs font-extrabold uppercase tracking-wide text-[var(--primary)]">{candidate.rankLabel}</p>
                    <h3 className="mt-1 font-extrabold">{candidate.title}</h3>
                    <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{candidate.explanation}</p>
                    <p className="mt-3 text-xs font-bold text-[var(--foreground)]">{candidate.inspectionState}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptySection>Belum ada bagian yang perlu dicek untuk tagihan utama laporan.</EmptySection>
            )}
          </section>

          {/* Section 7 */}
          <section className="report-section space-y-4">
            <SectionTitle>Pemeriksaan</SectionTitle>
            {report.inspectionSummaries.length > 0 ? (
              <div className="space-y-3">
                {report.inspectionSummaries.map((inspection) => (
                  <article key={inspection.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <h3 className="font-extrabold">{inspection.title}</h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">
                      {inspection.statusLabel}
                      {inspection.resultLabel ? ` · ${inspection.resultLabel}` : ''}
                      {inspection.completedAt ? ` · ${inspection.completedAt}` : ''}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptySection>Belum ada pemeriksaan yang tersimpan.</EmptySection>
            )}
          </section>

          {/* Section 8 */}
          <section className="report-section space-y-4">
            <SectionTitle>Rencana Hemat</SectionTitle>
            {report.actionPlanSummaries.length > 0 ? (
              <div className="space-y-3">
                {report.actionPlanSummaries.map((action) => (
                  <article key={action.title} className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <h3 className="font-extrabold">{action.title}</h3>
                    <p className="mt-1 text-xs font-extrabold text-[var(--primary)]">{action.statusLabel}</p>
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Rencana mulai {action.plannedStartDate}
                      {action.startedAt ? ` · Dimulai ${action.startedAt}` : ''}
                      {action.finishedAt ? ` · Diperbarui ${action.finishedAt}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-[var(--muted)]">Evaluasi: {action.reviewTarget}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptySection>Belum ada Rencana Hemat yang tersimpan.</EmptySection>
            )}
          </section>

          {/* Section 9 */}
          <section className="report-section space-y-4">
            <SectionTitle>Evaluasi Hasil</SectionTitle>
            {report.outcomeSummaries.length > 0 ? (
              <div className="space-y-3">
                {report.outcomeSummaries.map((outcome) => (
                  <article key={`${outcome.baselinePeriod}-${outcome.followUpPeriod}`} className="rounded-2xl border border-[var(--success-border)] bg-[var(--success-surface)] p-5">
                    <h3 className="font-extrabold text-[var(--foreground)]">{outcome.overallOutcomeLabel}</h3>
                    <p className="mt-1 text-xs text-[var(--muted)]">{outcome.safeExplanation}</p>
                    <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-3">
                      <div><dt className="text-[var(--muted)]">Periode</dt><dd className="font-bold">{outcome.baselinePeriod} → {outcome.followUpPeriod}</dd></div>
                      <div><dt className="text-[var(--muted)]">Biaya</dt><dd className="font-bold">{outcome.costDirection}</dd></div>
                      <div><dt className="text-[var(--muted)]">Pemakaian</dt><dd className="font-bold">{outcome.usageDirection ?? 'Data belum tersedia'}</dd></div>
                      <div><dt className="text-[var(--muted)]">Tarif</dt><dd className="font-bold">{outcome.tariffDirection ?? 'Data belum tersedia'}</dd></div>
                      <div><dt className="text-[var(--muted)]">Kelengkapan data</dt><dd className="font-bold">{outcome.dataQualityLabel}</dd></div>
                      <div><dt className="text-[var(--muted)]">Dicatat</dt><dd className="font-bold">{outcome.evaluatedAt}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <EmptySection>Belum ada evaluasi hasil yang tersimpan.</EmptySection>
            )}
          </section>

          {/* Section 10 */}
          <aside className="report-section rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-surface)] p-5 text-[var(--foreground)]" aria-label="Catatan laporan">
            <h2 className="font-black text-[var(--warning)]">Catatan penting</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-xs leading-relaxed text-[var(--muted)]">
              {report.safeCaveats.map((caveat) => <li key={caveat}>{caveat}</li>)}
            </ul>
          </aside>
        </div>

        {/* Footer */}
        <footer className="border-t border-[var(--border)] px-6 py-5 text-xs text-[var(--muted)] md:px-9">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <p>{report.generatedAtPresentation} · Zona waktu {report.timezoneLabel}</p>
            <p>Ringkasan data tercatat · bukan audit energi resmi</p>
          </div>
          <nav aria-label="Navigasi laporan" className="report-print-hide mt-3 flex flex-wrap gap-4">
            {report.navigationLinks.map((link) => (
              <Link key={link.label} href={link.href} className="font-extrabold text-[var(--primary)] underline underline-offset-4 hover:opacity-80">
                {link.label}
              </Link>
            ))}
          </nav>
        </footer>
      </article>
    </main>
  );
}
