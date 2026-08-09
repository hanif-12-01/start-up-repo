import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { getOptionalSession } from '@/server/auth/session';
import { INSPECTION_ANSWER_LABELS } from '@/server/services/inspection-presentation';
import {
  ActionPlansUnavailableError,
  getActionPlanOptions,
} from '@/server/services/action-plan.service';
import { ACTION_PLAN_DISCLAIMER } from '@/server/services/action-plan-presentation';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';
import { CreateActionPlanForm } from './CreateActionPlanForm';

export const dynamic = 'force-dynamic';

export default async function ActionSelectionPage({
  params,
}: {
  params: Promise<{ sessionId: string; inspectionPlanId: string }>;
}) {
  const sessionResult = await getOptionalSession();
  if (!sessionResult?.user) redirect('/login');
  const userId = sessionResult.user.id;
  const journeyStep = await resolveJourneyStep(userId);
  if (journeyStep !== 'COMPLETE') redirect(getJourneyRedirect(journeyStep));
  const { sessionId, inspectionPlanId } = await params;
  let view;
  try {
    view = await getActionPlanOptions(userId, sessionId, inspectionPlanId);
  } catch (error) {
    if (error instanceof ActionPlansUnavailableError) notFound();
    throw error;
  }
  if (!view) notFound();
  if (view.existingPlan) {
    redirect(
      `/diagnostics/${encodeURIComponent(sessionId)}/actions/${encodeURIComponent(view.existingPlan.id)}`
    );
  }
  const inspectionPath = `/diagnostics/${encodeURIComponent(
    sessionId
  )}/inspections/${encodeURIComponent(inspectionPlanId)}`;
  const resultsPath = `/diagnostics/${encodeURIComponent(sessionId)}/results`;

  return (
    <main className="min-h-screen bg-[var(--surface)] p-5 text-[var(--foreground)] md:p-10">
      <PageReveal className="mx-auto max-w-3xl space-y-6">
        <Reveal direction="down">
          <header className="border-b border-[var(--border)] pb-5">
            <Link href={inspectionPath} className="text-sm font-semibold text-[var(--info)] hover:text-[var(--info)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring)]">
              ← Kembali ke hasil pemeriksaan
            </Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Rencana Hemat</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Pilih tindakan yang aman</h1>
            <p className="mt-3 text-sm text-[var(--muted)]">Sumber: {view.context.candidateTitle}</p>
          </header>
        </Reveal>

        <Reveal direction="up">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-5">
            <p className="text-xs uppercase tracking-wide text-[var(--muted)]">Hasil pemeriksaan</p>
            <p className="mt-2 font-semibold text-[var(--foreground)]">
              {view.context.inspectionResult
                ? INSPECTION_ANSWER_LABELS[view.context.inspectionResult]
                : ''}
            </p>
          </section>
        </Reveal>

        {view.options.length === 0 ? (
          <Reveal direction="up">
            <section className="rounded-xl border border-[var(--warning-border)]/70 bg-[var(--warning-surface)]/30 p-6">
              <h2 className="font-semibold text-[var(--warning)]">Tanda yang diperiksa belum ditemukan.</h2>
              <p className="mt-2 text-sm text-[var(--warning)]/80">
                Pertimbangkan untuk memeriksa kandidat lain sebelum membuat Rencana Hemat.
              </p>
              <Link href={resultsPath} className="mt-4 inline-flex text-sm font-semibold text-[var(--info)] hover:text-[var(--info)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring)]">
                Periksa Kandidat Lain
              </Link>
            </section>
          </Reveal>
        ) : (
          <Reveal direction="up">
            <CreateActionPlanForm
              sessionId={sessionId}
              inspectionPlanId={inspectionPlanId}
              options={view.options}
              minimumDate={view.minimumPlannedStartDate}
            />
          </Reveal>
        )}

        <Reveal direction="up">
          <section className="rounded-xl border border-[var(--info-border)]/80 bg-[var(--info-surface)]/20 p-5">
            <h2 className="font-semibold text-[var(--info)]">Batas Rencana Hemat</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{ACTION_PLAN_DISCLAIMER}</p>
          </section>
        </Reveal>
      </PageReveal>
    </main>
  );
}
