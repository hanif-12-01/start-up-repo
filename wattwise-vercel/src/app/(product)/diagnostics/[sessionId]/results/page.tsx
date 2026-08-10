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
import { INSPECTION_ANSWER_LABELS } from '@/server/services/inspection-presentation';
import { getCandidateInspectionAvailability } from '@/server/services/inspection.service';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';
import { StartInspectionForm } from './StartInspectionForm';

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
        <main className="min-h-screen bg-[var(--surface)] p-5 text-[var(--foreground)] md:p-10">
          <section className="mx-auto max-w-2xl rounded-xl border border-[var(--warning-border)]/70 bg-[var(--warning-surface)]/30 p-6">
            <h1 className="text-xl font-semibold text-[var(--warning)]">
              Pemeriksaan belum tersedia
            </h1>
            <p className="mt-2 text-sm text-[var(--warning)]/80">{error.message}</p>
          </section>
        </main>
      );
    }
    throw error;
  }
  if (!view) notFound();

  const { session, candidates } = view;
  const availability = await getCandidateInspectionAvailability(
    userId,
    sessionId,
    candidates
  );
  if (!availability) notFound();
  const inspectionByCandidate = new Map(
    availability.map((item) => [item.candidateId, item])
  );

  return (
    <main className="min-h-screen bg-[var(--surface)] p-5 text-[var(--foreground)] md:p-10">
      <PageReveal className="mx-auto max-w-3xl space-y-6">
        <Reveal direction="down">
          <header className="border-b border-[var(--border)] pb-5">
            <Link
              href="/bills"
              className="text-sm font-semibold text-[var(--info)] hover:text-[var(--info)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring)]"
            >
              ← Kembali ke tagihan
            </Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
              Hasil pemeriksaan konteks · Kos
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Bagian yang perlu dicek
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
              Urutan ini disusun dari jawaban dan data dua periode yang tersimpan. Daftar ini
              bukan diagnosis, bukan kepastian penyebab, dan tidak memberikan langkah tindakan.
            </p>
          </header>
        </Reveal>

        <Reveal direction="up">
          <section
            aria-label="Periode yang dibandingkan"
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-5"
          >
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
              Periode yang dibandingkan
            </p>
            <p className="mt-2 text-sm text-[var(--foreground)]">
              {formatDate(session.comparisonBill.periodStart)}–{formatDate(session.comparisonBill.periodEnd)}
              {' '}dibandingkan dengan{' '}
              {formatDate(session.currentBill.periodStart)}–{formatDate(session.currentBill.periodEnd)}
            </p>
          </section>
        </Reveal>

        {session.status === 'CLOSED' && (
          <Reveal direction="up">
            <section className="rounded-xl border border-[var(--border-strong)]/70 bg-[var(--primary-soft)]/20 p-5">
              <h2 className="font-semibold text-[var(--primary)]">Sesi Cek Kenaikan Selesai</h2>
              <p className="mt-2 text-sm text-[var(--muted)]/70">
                Hasil, pemeriksaan, dan Rencana Hemat tetap dapat dibaca. Sesi ini tidak menerima pemeriksaan baru.
              </p>
            </section>
          </Reveal>
        )}

        {candidates.length === 0 ? (
          <Reveal direction="up">
            <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6">
              <h2 className="text-xl font-semibold">
                Belum ada bagian prioritas yang dapat ditentukan dari jawaban saat ini.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
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
                  <article className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--info)]">
                      Prioritas {candidate.rank}
                    </p>
                    <h2 className="mt-2 text-xl font-semibold">{candidate.title}</h2>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]">
                      {candidate.explanation}
                    </p>

                    {candidate.supportingFactors.length > 0 && (
                      <section className="mt-5">
                        <h3 className="text-sm font-semibold text-[var(--primary)]">
                          Informasi yang mendukung pemeriksaan
                        </h3>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--foreground)]">
                          {candidate.supportingFactors.map((factor) => (
                            <li key={factor.factorCode}>{factor.displayLabel}</li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {candidate.contradictingFactors.length > 0 && (
                      <section className="mt-5">
                        <h3 className="text-sm font-semibold text-[var(--warning)]">
                          Informasi yang membatasi
                        </h3>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-[var(--foreground)]">
                          {candidate.contradictingFactors.map((factor) => (
                            <li key={factor.factorCode}>{factor.displayLabel}</li>
                          ))}
                        </ul>
                      </section>
                    )}

                    {candidate.candidateType === 'DATA_QUALITY' ? (
                      <section className="mt-5 rounded-lg border border-[var(--warning-border)]/70 bg-[var(--warning-surface)]/30 p-4">
                        <h3 className="text-sm font-semibold text-[var(--warning)]">
                          Tidak memerlukan pemeriksaan fisik
                        </h3>
                        <p className="mt-2 text-sm leading-relaxed text-[var(--warning)]/70">
                          Lengkapi informasi yang tersedia bila memungkinkan. Jangan
                          melakukan pemeriksaan perangkat atau instalasi untuk kandidat ini.
                        </p>
                      </section>
                    ) : (() => {
                        const inspection = inspectionByCandidate.get(candidate.id);
                        if (!inspection?.inspectable) {
                          return (
                            <p className="mt-5 text-sm text-[var(--muted)]">
                              Panduan observasi aman belum tersedia untuk bagian ini.
                            </p>
                          );
                        }
                        if (inspection.planId) {
                          const path = `/diagnostics/${encodeURIComponent(
                            sessionId
                          )}/inspections/${encodeURIComponent(inspection.planId)}`;
                          return (
                            <div className="mt-5">
                              <Link
                                href={path}
                                className="inline-flex rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring)]"
                              >
                                {inspection.planStatus === 'COMPLETED'
                                  ? 'Lihat hasil pemeriksaan'
                                  : 'Lanjutkan pemeriksaan'}
                              </Link>
                              {inspection.resultCode && (
                                <p className="mt-2 text-xs text-[var(--muted)]">
                                  Hasil tercatat:{' '}
                                  {INSPECTION_ANSWER_LABELS[inspection.resultCode]}
                                </p>
                              )}
                            </div>
                          );
                        }
                        return session.status === 'CLOSED' ? (
                          <p className="mt-5 text-sm text-[var(--muted)]">
                            Sesi sudah ditutup; pemeriksaan baru tidak dapat dimulai.
                          </p>
                        ) : (
                          <StartInspectionForm candidateId={candidate.id} />
                        );
                      })()}
                  </article>
                </Reveal>
              </li>
            ))}
          </ol>
        )}

        <Reveal direction="up">
          <section className="rounded-xl border border-[var(--info-border)]/80 bg-[var(--info-surface)]/20 p-5">
            <h2 className="font-semibold text-[var(--info)]">Batas hasil</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Hasil ini hanya membantu mempersempit bagian yang perlu diperiksa. Jangan
              menganggap urutan sebagai tingkat kepastian atau bukti penyebab pasti.
            </p>
          </section>
        </Reveal>
      </PageReveal>
    </main>
  );
}
