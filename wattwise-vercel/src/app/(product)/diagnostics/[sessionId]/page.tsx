import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { getOptionalSession } from '@/server/auth/session';
import {
  DiagnosticsUnavailableError,
  getDiagnosticQuestionnaire,
} from '@/server/services/diagnostic.service';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';
import { AnswerForm } from './AnswerForm';
import { GenerateCandidatesForm } from './GenerateCandidatesForm';

export const dynamic = 'force-dynamic';

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

function formatDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function periodLabel(bill: { periodStart: string; periodEnd: string }) {
  return `${formatDate(bill.periodStart)} - ${formatDate(bill.periodEnd)}`;
}

export default async function DiagnosticSessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const sessionResult = await getOptionalSession();
  if (!sessionResult?.user) redirect('/login');
  const userId = sessionResult.user.id;
  const step = await resolveJourneyStep(userId);
  if (step !== 'COMPLETE') redirect(getJourneyRedirect(step));

  const { sessionId } = await params;
  let view;
  try {
    view = await getDiagnosticQuestionnaire(userId, sessionId);
  } catch (error) {
    if (error instanceof DiagnosticsUnavailableError) {
      return (
        <main className="min-h-screen bg-[var(--surface)] p-5 text-[var(--foreground)] md:p-10">
          <section className="mx-auto max-w-2xl rounded-xl border border-[var(--warning-border)]/70 bg-[var(--warning-surface)]/30 p-6">
            <h1 className="text-xl font-semibold text-[var(--warning)]">Pemeriksaan belum tersedia</h1>
            <p className="mt-2 text-sm text-[var(--warning)]/80">{error.message}</p>
            <Link href="/bills" className="mt-5 inline-block text-sm font-semibold text-[var(--info)]">
              Kembali ke tagihan
            </Link>
          </section>
        </main>
      );
    }
    throw error;
  }
  if (!view) notFound();

  const { session, nextQuestion } = view;

  return (
    <main className="min-h-screen bg-[var(--surface)] p-5 text-[var(--foreground)] md:p-10">
      <PageReveal className="mx-auto max-w-3xl space-y-6">
        <Reveal direction="down">
          <header className="border-b border-[var(--border)] pb-5">
            <Link href="/bills" className="text-sm font-semibold text-[var(--info)] hover:text-[var(--info)]">
              ← Kembali ke tagihan
            </Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
              Cek kenaikan · Kos
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Kumpulkan konteks periode</h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
              Jawaban Anda membantu menyusun konteks. Tahap ini belum menetapkan penyebab atau diagnosis.
            </p>
          </header>
        </Reveal>

        <Reveal direction="up">
          <section className="grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-5 sm:grid-cols-2">
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Periode yang diperiksa</p>
              <p className="mt-2 font-semibold">{periodLabel(session.currentBill)}</p>
              <p className="mt-1 text-sm text-[var(--primary)]">
                {rupiah.format(session.currentBill.totalAmountRupiah)}
              </p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Periode pembanding</p>
              <p className="mt-2 font-semibold">{periodLabel(session.comparisonBill)}</p>
              <p className="mt-1 text-sm text-[var(--foreground)]">
                {rupiah.format(session.comparisonBill.totalAmountRupiah)}
              </p>
            </div>
          </section>
        </Reveal>

        {view.completed ? (
          <Reveal direction="up">
            <section className="rounded-xl border border-[var(--primary)] bg-[var(--primary-soft)] p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">
                Konteks tersimpan
              </p>
              <h2 className="mt-2 text-2xl font-semibold">Questionnaire selesai</h2>
              <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]/80">
                Jawaban Anda sudah tersimpan. WattWise dapat menyusun maksimal tiga bagian
                prioritas berdasarkan jawaban dan data tagihan yang tersedia.
              </p>
              {session.status === 'CLOSED' ? (
                <div className="mt-5">
                  <p className="font-semibold text-[var(--primary)]">Sesi Cek Kenaikan Selesai</p>
                  <p className="mt-2 text-sm text-[var(--muted)]/70">
                    Data tersimpan dan tetap dapat dibaca. Sesi ini tidak menerima perubahan baru.
                  </p>
                  <Link
                    href={`/diagnostics/${encodeURIComponent(session.id)}/results`}
                    className="mt-4 inline-flex rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring)]"
                  >
                    Lihat hasil tersimpan
                  </Link>
                </div>
              ) : (
                <GenerateCandidatesForm sessionId={session.id} />
              )}
            </section>
          </Reveal>
        ) : (
          nextQuestion && (
            <Reveal direction="up">
              <section className="rounded-xl border border-[var(--info-border)]/70 bg-[var(--info-surface)]/20 p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--info)]">
                  {view.answeredCount + 1} dari maksimal {view.maximumQuestionCount} pertanyaan
                </p>
                <h2 className="mt-3 text-xl font-semibold leading-relaxed">{nextQuestion.prompt}</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
                  {nextQuestion.helpText}
                </p>
                <AnswerForm
                  key={`${nextQuestion.code}:${nextQuestion.version}`}
                  sessionId={session.id}
                  questionCode={nextQuestion.code}
                  questionVersion={nextQuestion.version}
                />
              </section>
            </Reveal>
          )
        )}
      </PageReveal>
    </main>
  );
}
