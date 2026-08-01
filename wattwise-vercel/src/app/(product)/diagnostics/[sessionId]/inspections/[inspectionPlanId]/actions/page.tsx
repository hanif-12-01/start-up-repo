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
    <main className="min-h-screen bg-slate-900 p-5 text-slate-100 md:p-10">
      <PageReveal className="mx-auto max-w-3xl space-y-6">
        <Reveal direction="down">
          <header className="border-b border-slate-800 pb-5">
            <Link href={inspectionPath} className="text-sm font-semibold text-cyan-300 hover:text-cyan-200 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-300">
              ← Kembali ke hasil pemeriksaan
            </Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Rencana Hemat</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">Pilih tindakan yang aman</h1>
            <p className="mt-3 text-sm text-slate-400">Sumber: {view.context.candidateTitle}</p>
          </header>
        </Reveal>

        <Reveal direction="up">
          <section className="rounded-xl border border-slate-700 bg-slate-800 p-5">
            <p className="text-xs uppercase tracking-wide text-slate-500">Hasil pemeriksaan</p>
            <p className="mt-2 font-semibold text-slate-100">
              {view.context.inspectionResult
                ? INSPECTION_ANSWER_LABELS[view.context.inspectionResult]
                : ''}
            </p>
          </section>
        </Reveal>

        {view.options.length === 0 ? (
          <Reveal direction="up">
            <section className="rounded-xl border border-amber-800/70 bg-amber-950/30 p-6">
              <h2 className="font-semibold text-amber-200">Tanda yang diperiksa belum ditemukan.</h2>
              <p className="mt-2 text-sm text-amber-100/80">
                Pertimbangkan untuk memeriksa kandidat lain sebelum membuat Rencana Hemat.
              </p>
              <Link href={resultsPath} className="mt-4 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-300">
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
          <section className="rounded-xl border border-cyan-900/80 bg-cyan-950/20 p-5">
            <h2 className="font-semibold text-cyan-200">Batas Rencana Hemat</h2>
            <p className="mt-2 text-sm leading-relaxed text-cyan-100/70">{ACTION_PLAN_DISCLAIMER}</p>
          </section>
        </Reveal>
      </PageReveal>
    </main>
  );
}
