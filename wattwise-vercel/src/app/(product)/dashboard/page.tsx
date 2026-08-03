import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { LogoutButton } from '@/components/LogoutButton';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { getOptionalSession } from '@/server/auth/session';
import {
  DashboardBusinessNotFoundError,
  DashboardUnavailableError,
  getDashboardReadModel,
} from '@/server/services/dashboard.service';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';
import { StartDiagnosticButton } from '../diagnostics/StartDiagnosticButton';

export const dynamic = 'force-dynamic';

function SectionTitle({ eyebrow, title }: { eyebrow: string; title: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-400">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-semibold text-slate-100">{title}</h2>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string | string[] }>;
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
  let dashboard;
  try {
    dashboard = await getDashboardReadModel(userId, requestedBusinessId);
  } catch (error) {
    if (error instanceof DashboardUnavailableError) redirect('/setup');
    if (error instanceof DashboardBusinessNotFoundError) notFound();
    throw error;
  }

  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-8 lg:p-10">
      <PageReveal className="mx-auto max-w-6xl space-y-6">
        <Reveal direction="down">
          <header className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow-xl md:p-7">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
                  WattWise AI · Dashboard Tindakan
                </p>
                <h1 className="mt-2 text-3xl font-bold tracking-tight md:text-4xl">
                  {dashboard.businessSummary.name}
                </h1>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                  <span className="rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-slate-300">
                    Segmen {dashboard.businessSummary.segment}
                  </span>
                  <span className="rounded-full border border-emerald-800 bg-emerald-950/60 px-3 py-1 text-emerald-300">
                    {dashboard.businessSummary.activeLabel}
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                {dashboard.businessSummary.options.length > 1 && (
                  <form action="/dashboard" method="get" className="flex items-end gap-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Pilih usaha
                      </span>
                      <select
                        name="businessId"
                        defaultValue={
                          dashboard.businessSummary.options.find((option) => option.selected)?.id
                        }
                        className="min-w-52 rounded-md border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        {dashboard.businessSummary.options.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      type="submit"
                      className="rounded-md border border-slate-600 px-3 py-2.5 text-sm font-semibold text-slate-200 hover:bg-slate-800 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-400"
                    >
                      Tampilkan
                    </button>
                  </form>
                )}
                <LogoutButton />
              </div>
            </div>
          </header>
        </Reveal>

        <Reveal direction="up">
          <section
            aria-labelledby="next-action-title"
            className="rounded-2xl border border-emerald-700/70 bg-gradient-to-br from-emerald-950/80 to-slate-900 p-6 md:p-8"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
              Langkah berikutnya
            </p>
            <h2 id="next-action-title" className="mt-2 text-2xl font-bold md:text-3xl">
              {dashboard.nextAction.label}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
              Satu langkah utama dipilih dari status data dan perjalanan Cek Kenaikan yang sudah
              tersimpan. Dashboard tidak membuat prediksi atau menetapkan penyebab.
            </p>
            {dashboard.nextAction.kind === 'START_DIAGNOSTIC' ? (
              <StartDiagnosticButton
                electricityBillId={dashboard.nextAction.electricityBillId}
                resumable={false}
              />
            ) : (
              <Link
                href={dashboard.nextAction.href}
                className="mt-5 inline-flex rounded-md bg-emerald-500 px-5 py-3 text-sm font-bold text-slate-950 hover:bg-emerald-400 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-300"
              >
                {dashboard.nextAction.label}
              </Link>
            )}
            <nav aria-label="Tautan pendukung" className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-emerald-900/70 pt-4">
              {dashboard.secondaryLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className="text-sm font-semibold text-slate-300 underline decoration-slate-600 underline-offset-4 hover:text-white focus:outline-2 focus:outline-offset-2 focus:outline-emerald-400"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </section>
        </Reveal>

        <div className="grid gap-6 lg:grid-cols-2">
          <Reveal direction="up">
            <section className="h-full space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <SectionTitle eyebrow="Tagihan terbaru" title="Ringkasan biaya tercatat" />
              {dashboard.latestBillSummary ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 sm:col-span-2">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Periode</p>
                      <p className="mt-2 font-semibold">{dashboard.latestBillSummary.period}</p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Total biaya</p>
                      <p className="mt-2 text-lg font-semibold text-emerald-300">
                        {dashboard.latestBillSummary.totalCost}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <p className="text-xs uppercase tracking-wide text-slate-500">Biaya per hari</p>
                      <p className="mt-2 font-semibold">{dashboard.latestBillSummary.dailyCost}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Periode {dashboard.latestBillSummary.days} hari
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-400">
                    Pemakaian: {dashboard.latestBillSummary.kwh ?? 'kWh tidak diisi'}
                  </p>
                  {dashboard.billComparisonSummary && (
                    <div className="rounded-xl border border-cyan-900/80 bg-cyan-950/20 p-4">
                      <h3 className="font-semibold text-cyan-200">
                        {dashboard.billComparisonSummary.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">
                        {dashboard.billComparisonSummary.detail}
                      </p>
                      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                        <div>
                          <dt className="text-slate-500">Perubahan biaya harian</dt>
                          <dd className="font-semibold text-slate-200">
                            {dashboard.billComparisonSummary.dailyCostChange}
                          </dd>
                        </div>
                        {dashboard.billComparisonSummary.dailyKwhChange && (
                          <div>
                            <dt className="text-slate-500">Perubahan kWh harian</dt>
                            <dd className="font-semibold text-slate-200">
                              {dashboard.billComparisonSummary.dailyKwhChange}
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                  )}
                </>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">
                  Belum ada tagihan untuk usaha ini. WattWise tidak mengisi angka yang belum Anda
                  masukkan.
                </p>
              )}
            </section>
          </Reveal>

          <Reveal direction="up">
            <section className="h-full space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <SectionTitle eyebrow="Cek Kenaikan" title="Perjalanan diagnostik" />
              {dashboard.latestDiagnosticSummary ? (
                <div className="rounded-xl border border-slate-800 bg-slate-950 p-5">
                  <p className="font-semibold text-cyan-200">
                    {dashboard.latestDiagnosticSummary.statusLabel}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Dimulai {dashboard.latestDiagnosticSummary.startedAt}
                    {dashboard.latestDiagnosticSummary.closedAt
                      ? ` · Selesai ${dashboard.latestDiagnosticSummary.closedAt}`
                      : ''}
                  </p>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">
                  Belum ada sesi Cek Kenaikan untuk usaha ini.
                </p>
              )}

              {dashboard.candidateSummaries.length > 0 && (
                <ol className="space-y-3" aria-label="Bagian yang perlu dicek">
                  {dashboard.candidateSummaries.map((candidate) => (
                    <li key={`${candidate.rankLabel}-${candidate.title}`} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
                        {candidate.rankLabel}
                      </p>
                      <h3 className="mt-1 font-semibold">{candidate.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-400">
                        {candidate.explanation}
                      </p>
                      <p className="mt-3 text-xs font-semibold text-slate-300">
                        {candidate.inspectionStatusLabel}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </Reveal>
        </div>

        {(dashboard.inspectionSummaries.length > 0 || dashboard.actionPlanSummaries.length > 0) && (
          <div className="grid gap-6 lg:grid-cols-2">
            <Reveal direction="up">
              <section className="h-full space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <SectionTitle eyebrow="Pemeriksaan" title="Observasi yang tersimpan" />
                {dashboard.inspectionSummaries.map((inspection) => (
                  <article key={inspection.title} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <h3 className="font-semibold">{inspection.title}</h3>
                    <p className="mt-2 text-sm text-cyan-200">{inspection.statusLabel}</p>
                    {inspection.resultLabel && (
                      <p className="mt-1 text-sm text-slate-400">
                        Hasil tercatat: {inspection.resultLabel}
                      </p>
                    )}
                  </article>
                ))}
              </section>
            </Reveal>
            <Reveal direction="up">
              <section className="h-full space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <SectionTitle eyebrow="Rencana Hemat" title="Tindakan aman yang dipilih" />
                {dashboard.actionPlanSummaries.map((action) => (
                  <article key={action.title} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                    <h3 className="font-semibold">{action.title}</h3>
                    <p className="mt-2 text-sm font-semibold text-emerald-300">
                      {action.statusLabel}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      Mulai direncanakan {action.plannedStartDate} · Evaluasi: {action.reviewTarget}
                    </p>
                  </article>
                ))}
              </section>
            </Reveal>
          </div>
        )}

        {dashboard.outcomeSummaries.length > 0 && (
          <Reveal direction="up">
            <section className="space-y-4 rounded-2xl border border-cyan-900/80 bg-cyan-950/20 p-6">
              <SectionTitle eyebrow="Evaluasi Hasil" title="Perbandingan sebelum dan sesudah" />
              {dashboard.outcomeSummaries.map((outcome) => (
                <article key={`${outcome.baselinePeriod}-${outcome.followUpPeriod}`} className="rounded-xl border border-cyan-900/70 bg-slate-950/70 p-5">
                  <h3 className="text-lg font-semibold text-cyan-200">
                    {outcome.overallOutcomeLabel}
                  </h3>
                  <p className="mt-2 text-sm text-slate-300">
                    {outcome.baselinePeriod} dibandingkan dengan {outcome.followUpPeriod}
                  </p>
                  <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
                    <div><dt className="text-slate-500">Biaya</dt><dd className="font-semibold">{outcome.costDirectionLabel}</dd></div>
                    {outcome.usageDirectionLabel && <div><dt className="text-slate-500">Pemakaian</dt><dd className="font-semibold">{outcome.usageDirectionLabel}</dd></div>}
                    <div><dt className="text-slate-500">Kelengkapan data</dt><dd className="font-semibold">{outcome.dataQualityLabel}</dd></div>
                  </dl>
                  <p className="mt-4 text-xs leading-relaxed text-slate-500">{outcome.caveat}</p>
                </article>
              ))}
            </section>
          </Reveal>
        )}

        <footer className="flex flex-col gap-2 border-t border-slate-800 py-5 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
          <p>{dashboard.dataFreshness.label}</p>
          <p>Data tersimpan · tanpa prediksi, estimasi penghematan, atau klaim penyebab</p>
        </footer>
      </PageReveal>
    </main>
  );
}
