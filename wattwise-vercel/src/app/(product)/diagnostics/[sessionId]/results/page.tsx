import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { getOptionalSession } from '@/server/auth/session';
import {
  DiagnosticCandidateGenerationNotReadyError,
  DiagnosticsUnavailableError,
  getDiagnosticCandidateResults,
} from '@/server/services/diagnostic.service';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';

export const dynamic = 'force-dynamic';

function formatDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export default async function DiagnosticResultsPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const sessionResult = await getOptionalSession();
  if (!sessionResult?.user) redirect('/login');
  const userId = sessionResult.user.id;
  const journeyStep = await resolveJourneyStep(userId);
  if (journeyStep !== 'COMPLETE') redirect(getJourneyRedirect(journeyStep));

  const { sessionId } = await params;
  let view;
  try {
    view = await getDiagnosticCandidateResults(userId, sessionId);
  } catch (error) {
    if (error instanceof DiagnosticCandidateGenerationNotReadyError) {
      redirect(`/diagnostics/${encodeURIComponent(sessionId)}`);
    }
    if (error instanceof DiagnosticsUnavailableError) {
      return (
        <main className="min-h-screen bg-slate-900 p-5 text-slate-100 md:p-10">
          <section className="mx-auto max-w-2xl rounded-xl border border-amber-800/70 bg-amber-950/30 p-6">
            <h1 className="text-xl font-semibold text-amber-300">
              Pemeriksaan belum tersedia
            </h1>
            <p className="mt-2 text-sm text-amber-100/80">{error.message}</p>
          </section>
        </main>
      );
    }
    throw error;
  }
  if (!view) notFound();

  const { session, candidates } = view;

  return (
    <main className="min-h-screen bg-slate-900 p-5 text-slate-100 md:p-10">
      <PageReveal className="mx-auto max-w-3xl space-y-6">
        <Reveal direction="down">
          <header className="border-b border-slate-800 pb-5">
            <Link
              href="/bills"
              className="text-sm font-semibold text-cyan-300 hover:text-cyan-200 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-300"
            >
              ← Kembali ke tagihan
            </Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              Hasil pemeriksaan konteks · Kos
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Bagian yang perlu dicek
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              Urutan ini disusun dari jawaban dan data dua periode yang tersimpan. Daftar ini
              bukan diagnosis, bukan kepastian penyebab, dan tidak memberikan langkah tindakan.
            </p>
          </header>
        </Reveal>

        <Reveal direction="up">
          <section
            aria-label="Periode yang dibandingkan"
            className="rounded-xl border border-slate-700 bg-slate-800 p-5"
          >
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Periode yang dibandingkan
            </p>
            <p className="mt-2 text-sm text-slate-200">
              {formatDate(session.comparisonBill.periodStart)}–{formatDate(session.comparisonBill.periodEnd)}
              {' '}dibandingkan dengan{' '}
              {formatDate(session.currentBill.periodStart)}–{formatDate(session.currentBill.periodEnd)}
            </p>
          </section>
        </Reveal>

        {candidates.length === 0 ? (
          <Reveal direction="up">
            <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              <h2 className="text-xl font-semibold">
                Belum ada bagian prioritas yang dapat ditentukan dari jawaban saat ini.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                Hasil kosong tidak berarti tidak ada perubahan. Data dan jawaban yang tersedia
                belum memberikan dukungan yang cukup untuk menampilkan kandidat.
              </p>
            </section>
          </Reveal>
        ) : (
          <ol className="space-y-4" aria-label="Daftar bagian yang perlu dicek">
            {candidates.map((candidate) => (
              <li key={candidate.id}>
                <Reveal direction="up">
                  <article className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
                      Prioritas {candidate.rank}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">{candidate.title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-slate-300">
                      {candidate.explanation}
                    </p>

                    {candidate.supportingFactors.length > 0 && (
                      <section className="mt-5">
                        <h3 className="text-sm font-semibold text-emerald-300">
                          Informasi yang mendukung pemeriksaan
                        </h3>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                          {candidate.supportingFactors.map((factor) => (
                            <li key={factor.factorCode}>{factor.displayLabel}</li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {candidate.contradictingFactors.length > 0 && (
                      <section className="mt-5">
                        <h3 className="text-sm font-semibold text-amber-300">
                          Informasi yang membatasi
                        </h3>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
                          {candidate.contradictingFactors.map((factor) => (
                            <li key={factor.factorCode}>{factor.displayLabel}</li>
                          ))}
                        </ul>
                      </section>
                    )}
                  </article>
                </Reveal>
              </li>
            ))}
          </ol>
        )}

        <Reveal direction="up">
          <section className="rounded-xl border border-cyan-900/80 bg-cyan-950/20 p-5">
            <h2 className="font-semibold text-cyan-200">Batas hasil</h2>
            <p className="mt-2 text-sm leading-relaxed text-cyan-100/70">
              Hasil ini hanya membantu mempersempit bagian yang perlu diperiksa. Jangan
              menganggap urutan sebagai tingkat kepastian atau bukti penyebab pasti.
            </p>
          </section>
        </Reveal>
      </PageReveal>
    </main>
  );
}
