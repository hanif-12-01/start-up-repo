import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { decimal, rupiah } from '@/lib/format';
import { getOptionalSession } from '@/server/auth/session';
import {
  MonthlyReportBusinessNotFoundError,
  MonthlyReportHistoryGatedError,
  MonthlyReportMonthError,
  MonthlyReportsUnavailableError,
  getMonthlyReportReadModel,
} from '@/server/services/monthly-report.service';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';
import { getDecisionSupport } from '@/server/services/workspace.service';
import { PrintReportButton } from './PrintReportButton';

export const dynamic = 'force-dynamic';

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-slate-950">{children}</h2>;
}

function EmptySection({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-relaxed text-slate-600">
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
        <main className="min-h-screen flex items-center justify-center bg-slate-950 p-4 text-slate-100">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 text-center shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
              WattWise AI · Entitlement
            </p>
            <h1 className="text-xl font-bold text-slate-100">Akses Laporan Dibatasi</h1>
            <p className="text-sm leading-relaxed text-slate-300">
              Laporan untuk bulan ini berada di luar riwayat paket Anda.
            </p>
            <p className="text-sm leading-relaxed text-slate-400">
              Data tagihan tetap tersimpan.<br />
              Pilih bulan yang tersedia atau lihat pilihan paket.
            </p>
            <div className="pt-2">
              <Link
                href="/reports/monthly"
                className="inline-block rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                Lihat Bulan Yang Tersedia
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
  const support = await getDecisionSupport(userId, selectedBusinessId);
  const reportRevenue = support.revenues.find(
    (entry) => entry.periodMonth === `${report.reportMonth}-01`
  ) ?? null;
  const reportBill = support.bills.find(
    (bill) => bill.periodEnd.slice(0, 7) === report.reportMonth
  ) ?? null;
  const reportRatio = reportRevenue && reportBill && reportRevenue.amountRupiah > 0n
    ? (Number(reportBill.totalAmountRupiah) / Number(reportRevenue.amountRupiah)) * 100
    : null;
  const remainingRevenue = reportRevenue && reportBill
    ? reportRevenue.amountRupiah - reportBill.totalAmountRupiah
    : null;
  const selectedMonthIsAvailable = report.availableMonths.some(
    (month) => month.value === report.reportMonth
  );

  return (
    <main className="report-page min-h-screen bg-slate-100 px-4 py-6 text-slate-900 md:px-8 lg:py-10">
      <article className="report-print-root mx-auto max-w-5xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl print:shadow-none">
        <header className="border-b border-slate-200 bg-slate-950 px-5 py-7 text-white md:px-9">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300">
                WattWise AI
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                Laporan Listrik Usaha
              </h1>
              <p className="mt-3 text-lg font-semibold text-slate-100">
                {report.businessSummary.name}
              </p>
              <p className="mt-1 text-sm text-slate-300">
                {report.businessSummary.segment} · {report.monthLabel}
              </p>
              <span className="mt-4 inline-flex rounded-full border border-emerald-700 bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-200">
                {report.reportCompleteness.label}
              </span>
            </div>
            <div className="report-print-hide flex flex-wrap gap-3">
              <PrintReportButton />
              <Link
                href={`/dashboard?businessId=${encodeURIComponent(selectedBusinessId)}`}
                className="rounded-md border border-white bg-white px-4 py-2.5 text-sm font-semibold text-emerald-950 hover:bg-emerald-50 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-300"
              >
                Dashboard
              </Link>
            </div>
          </div>
        </header>

        <div className="report-print-hide grid gap-4 border-b border-slate-200 bg-slate-50 p-5 md:grid-cols-2 md:px-9">
          {report.businessSummary.options.length > 1 && (
            <form action="/reports/monthly" method="get" className="flex items-end gap-2">
              <input type="hidden" name="month" value={report.reportMonth} />
              <label className="min-w-0 flex-1 text-sm font-semibold text-slate-700">
                Pilih usaha
                <select
                  name="businessId"
                  defaultValue={selectedBusinessId}
                  className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal focus:outline-2 focus:outline-offset-1 focus:outline-emerald-600"
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
                className="rounded-md border border-slate-400 px-3 py-2.5 text-sm font-semibold hover:bg-slate-200 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600"
              >
                Tampilkan
              </button>
            </form>
          )}
          <form action="/reports/monthly" method="get" className="flex items-end gap-2">
            <input type="hidden" name="businessId" value={selectedBusinessId} />
            <label className="min-w-0 flex-1 text-sm font-semibold text-slate-700">
              Bulan laporan
              <select
                name="month"
                defaultValue={report.reportMonth}
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 font-normal focus:outline-2 focus:outline-offset-1 focus:outline-emerald-600"
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
              className="rounded-md border border-slate-400 px-3 py-2.5 text-sm font-semibold hover:bg-slate-200 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600"
            >
              Tampilkan
            </button>
          </form>
        </div>

        <div className="space-y-8 p-5 md:p-9">
          <section className="report-section space-y-4" aria-labelledby="monthly-summary-title">
            <SectionTitle>Ringkasan Tagihan</SectionTitle>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Jumlah tagihan</p>
                <p className="mt-2 text-2xl font-bold">{report.monthSummary.billCount}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total biaya</p>
                <p className="mt-2 text-lg font-bold text-emerald-700">
                  {report.monthSummary.totalCost}
                </p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Periode tercatat</p>
                <p className="mt-2 text-2xl font-bold">{report.monthSummary.recordedPeriods}</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total kWh</p>
                <p className="mt-2 text-lg font-bold">
                  {report.monthSummary.totalKwh ?? 'Belum lengkap'}
                </p>
              </div>
            </div>
            <p className="text-sm text-slate-600">{report.monthSummary.dataCompletenessNote}</p>
          </section>

          <section className="report-section space-y-4">
            <SectionTitle>Dampak ke Cash Flow</SectionTitle>
            {reportRevenue ? (
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Pendapatan bulan ini</p>
                  <p className="mt-2 text-lg font-bold text-emerald-700">{rupiah.format(reportRevenue.amountRupiah)}</p>
                  <p className="mt-1 text-xs text-slate-500">{reportRevenue.inputMode === 'EXACT' ? 'Angka tercatat' : 'Perkiraan pengguna'}</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Rasio listrik</p>
                  <p className="mt-2 text-lg font-bold">{reportRatio === null ? 'Belum tersedia' : `${decimal.format(reportRatio)}%`}</p>
                  <p className="mt-1 text-xs text-slate-500">Porsi biaya listrik terhadap omzet</p>
                </div>
                <div className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Sisa setelah listrik</p>
                  <p className="mt-2 text-lg font-bold">{remainingRevenue === null ? 'Belum tersedia' : rupiah.format(remainingRevenue)}</p>
                  <p className="mt-1 text-xs text-slate-500">Bukan laba bersih</p>
                </div>
              </div>
            ) : (
              <EmptySection>Tambahkan pendapatan untuk {report.monthLabel} agar konteks cash flow dapat ditampilkan.</EmptySection>
            )}
            <p className="text-xs leading-5 text-slate-500">Sisa pendapatan setelah listrik belum memperhitungkan bahan baku, gaji, sewa, air, internet, pajak, dan biaya operasional lain.</p>
          </section>

          <section className="report-section space-y-4">
            <SectionTitle>Daftar Tagihan</SectionTitle>
            {report.billSummaries.length === 0 ? (
              <EmptySection>
                Belum ada tagihan yang berakhir pada {report.monthLabel}. Tidak ada perjalanan Cek
                Kenaikan yang direkonstruksi untuk bulan ini.
              </EmptySection>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                  <thead className="bg-slate-100 text-xs uppercase tracking-wide text-slate-600">
                    <tr>
                      <th className="p-3">Periode</th>
                      <th className="p-3">Hari</th>
                      <th className="p-3">Biaya</th>
                      <th className="p-3">Biaya/hari</th>
                      <th className="p-3">kWh</th>
                      <th className="p-3">Tarif</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {report.billSummaries.map((bill) => (
                      <tr key={`${bill.period}-${bill.totalCost}`}>
                        <td className="p-3 font-semibold">
                          {bill.period}
                          {bill.isPrimary && (
                            <span className="ml-2 inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">
                              Tagihan utama laporan
                            </span>
                          )}
                        </td>
                        <td className="p-3">{bill.inclusiveDays}</td>
                        <td className="p-3">{bill.totalCost}</td>
                        <td className="p-3">{bill.costPerDay}</td>
                        <td className="p-3">{bill.kwh ?? 'Tidak diisi'}</td>
                        <td className="p-3">{bill.tariff ?? 'Tidak diisi'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="report-section space-y-4">
            <SectionTitle>Perbandingan Tagihan Utama</SectionTitle>
            {report.billComparisonSummary ? (
              <div className="rounded-xl border border-cyan-200 bg-cyan-50 p-5">
                <h3 className="font-bold text-cyan-950">{report.billComparisonSummary.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">
                  {report.billComparisonSummary.detail}
                </p>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-slate-500">Biaya harian tagihan utama</dt><dd className="font-semibold">{report.billComparisonSummary.currentDailyCost}</dd></div>
                  <div><dt className="text-slate-500">Biaya harian sebelumnya</dt><dd className="font-semibold">{report.billComparisonSummary.previousDailyCost}</dd></div>
                  <div><dt className="text-slate-500">Pemakaian</dt><dd className="font-semibold">{report.billComparisonSummary.usageDirection ?? 'Data kWh belum lengkap'}</dd></div>
                  <div><dt className="text-slate-500">Konteks tarif</dt><dd className="font-semibold">{report.billComparisonSummary.tariffContext}</dd></div>
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

          <section className="report-section space-y-4">
            <SectionTitle>Perjalanan Cek Kenaikan</SectionTitle>
            {report.diagnosticSummary ? (
              <div className="rounded-xl border border-slate-200 p-5">
                <p className="font-bold">{report.diagnosticSummary.statusLabel}</p>
                <p className="mt-2 text-sm text-slate-600">
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

          <section className="report-section space-y-4">
            <SectionTitle>Bagian yang Perlu Dicek</SectionTitle>
            {report.candidateSummaries.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-3">
                {report.candidateSummaries.map((candidate) => (
                  <article key={`${candidate.rankLabel}-${candidate.title}`} className="rounded-xl border border-slate-200 p-4">
                    <p className="text-xs font-bold uppercase tracking-wide text-cyan-700">{candidate.rankLabel}</p>
                    <h3 className="mt-1 font-bold">{candidate.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-slate-600">{candidate.explanation}</p>
                    <p className="mt-3 text-xs font-semibold text-slate-700">{candidate.inspectionState}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptySection>Belum ada bagian yang perlu dicek untuk tagihan utama laporan.</EmptySection>
            )}
          </section>

          <section className="report-section space-y-4">
            <SectionTitle>Pemeriksaan</SectionTitle>
            {report.inspectionSummaries.length > 0 ? (
              <div className="space-y-3">
                {report.inspectionSummaries.map((inspection) => (
                  <article key={inspection.title} className="rounded-xl border border-slate-200 p-4">
                    <h3 className="font-bold">{inspection.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">
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

          <section className="report-section space-y-4">
            <SectionTitle>Rencana Hemat</SectionTitle>
            {report.actionPlanSummaries.length > 0 ? (
              <div className="space-y-3">
                {report.actionPlanSummaries.map((action) => (
                  <article key={action.title} className="rounded-xl border border-slate-200 p-4">
                    <h3 className="font-bold">{action.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-emerald-700">{action.statusLabel}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Rencana mulai {action.plannedStartDate}
                      {action.startedAt ? ` · Dimulai ${action.startedAt}` : ''}
                      {action.finishedAt ? ` · Diperbarui ${action.finishedAt}` : ''}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">Evaluasi: {action.reviewTarget}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptySection>Belum ada Rencana Hemat yang tersimpan.</EmptySection>
            )}
          </section>

          <section className="report-section space-y-4">
            <SectionTitle>Evaluasi Hasil</SectionTitle>
            {report.outcomeSummaries.length > 0 ? (
              <div className="space-y-3">
                {report.outcomeSummaries.map((outcome) => (
                  <article key={`${outcome.baselinePeriod}-${outcome.followUpPeriod}`} className="rounded-xl border border-cyan-200 bg-cyan-50 p-5">
                    <h3 className="font-bold text-cyan-950">{outcome.overallOutcomeLabel}</h3>
                    <p className="mt-1 text-sm text-slate-600">{outcome.safeExplanation}</p>
                    <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                      <div><dt className="text-slate-500">Periode</dt><dd className="font-semibold">{outcome.baselinePeriod} → {outcome.followUpPeriod}</dd></div>
                      <div><dt className="text-slate-500">Biaya</dt><dd className="font-semibold">{outcome.costDirection}</dd></div>
                      <div><dt className="text-slate-500">Pemakaian</dt><dd className="font-semibold">{outcome.usageDirection ?? 'Data belum tersedia'}</dd></div>
                      <div><dt className="text-slate-500">Tarif</dt><dd className="font-semibold">{outcome.tariffDirection ?? 'Data belum tersedia'}</dd></div>
                      <div><dt className="text-slate-500">Kelengkapan data</dt><dd className="font-semibold">{outcome.dataQualityLabel}</dd></div>
                      <div><dt className="text-slate-500">Dicatat</dt><dd className="font-semibold">{outcome.evaluatedAt}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <EmptySection>Belum ada evaluasi hasil yang tersimpan.</EmptySection>
            )}
          </section>

          <aside className="report-section rounded-xl border border-amber-200 bg-amber-50 p-5" aria-label="Catatan laporan">
            <h2 className="font-bold text-amber-950">Catatan penting</h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-amber-950/80">
              {report.safeCaveats.map((caveat) => <li key={caveat}>{caveat}</li>)}
            </ul>
          </aside>
        </div>

        <footer className="border-t border-slate-200 px-5 py-5 text-xs text-slate-500 md:px-9">
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
            <p>{report.generatedAtPresentation} · Zona waktu {report.timezoneLabel}</p>
            <p>Ringkasan data tercatat · bukan audit energi resmi</p>
          </div>
          <nav aria-label="Navigasi laporan" className="report-print-hide mt-3 flex flex-wrap gap-4">
            {report.navigationLinks.map((link) => (
              <Link key={link.label} href={link.href} className="font-semibold text-emerald-700 underline underline-offset-4 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-600">
                {link.label}
              </Link>
            ))}
          </nav>
        </footer>
      </article>
    </main>
  );
}
