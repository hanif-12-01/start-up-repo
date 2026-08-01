import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { getOptionalSession } from '@/server/auth/session';
import { INSPECTION_ANSWER_LABELS } from '@/server/services/inspection-presentation';
import { getActionPlan } from '@/server/services/action-plan.service';
import {
  ACTION_PLAN_CANCELLATION_COPY,
  ACTION_PLAN_COMPLETION_COPY,
  ACTION_PLAN_DISCLAIMER,
  ACTION_PLAN_STATUS_LABELS,
} from '@/server/services/action-plan-presentation';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';
import { ActionPlanTransitionForm } from './ActionPlanTransitionForm';

export const dynamic = 'force-dynamic';

function formatDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatRupiah(value: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(BigInt(value));
}

function formatMilliKwh(value: string | null) {
  if (value === null) return null;
  const milli = BigInt(value);
  const whole = milli / 1000n;
  const fraction = (milli % 1000n)
    .toString()
    .padStart(3, '0')
    .replace(/0+$/, '');
  return fraction ? `${whole},${fraction} kWh` : `${whole} kWh`;
}

export default async function ActionPlanDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string; actionPlanId: string }>;
}) {
  const sessionResult = await getOptionalSession();
  if (!sessionResult?.user) redirect('/login');
  const userId = sessionResult.user.id;
  const journeyStep = await resolveJourneyStep(userId);
  if (journeyStep !== 'COMPLETE') redirect(getJourneyRedirect(journeyStep));
  const { sessionId, actionPlanId } = await params;
  const plan = await getActionPlan(userId, sessionId, actionPlanId);
  if (!plan) notFound();
  const inspectionPath = `/diagnostics/${encodeURIComponent(
    sessionId
  )}/inspections/${encodeURIComponent(plan.inspectionPlanId)}`;
  const baselineKwh = formatMilliKwh(plan.baseline.totalKwhMilliKwh);

  return (
    <main className="min-h-screen bg-slate-900 p-5 text-slate-100 md:p-10">
      <PageReveal className="mx-auto max-w-3xl space-y-6">
        <Reveal direction="down">
          <header className="border-b border-slate-800 pb-5">
            <Link href={inspectionPath} className="text-sm font-semibold text-cyan-300 hover:text-cyan-200 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-300">
              ← Kembali ke pemeriksaan
            </Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Rencana Hemat</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{plan.title}</h1>
            <p className="mt-3 text-sm text-slate-400">Sumber: {plan.candidateTitle}</p>
          </header>
        </Reveal>

        <Reveal direction="up">
          <section className="grid gap-4 rounded-xl border border-slate-700 bg-slate-800 p-6 sm:grid-cols-2">
            <div><p className="text-xs uppercase tracking-wide text-slate-500">Status Rencana</p><p className="mt-2 font-semibold text-cyan-200">{ACTION_PLAN_STATUS_LABELS[plan.status]}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-slate-500">Mulai direncanakan</p><p className="mt-2 text-slate-200">{formatDate(plan.plannedStartDate)}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-slate-500">Hasil pemeriksaan</p><p className="mt-2 text-slate-200">{INSPECTION_ANSWER_LABELS[plan.inspectionResult]}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-slate-500">Evaluasi</p><p className="mt-2 text-slate-200">Tagihan berikutnya yang eligible setelah tindakan dimulai</p></div>
          </section>
        </Reveal>

        <Reveal direction="up">
          <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h2 className="text-lg font-semibold">Alasan tindakan</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">{plan.reason}</p>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">{plan.description}</p>
          </section>
        </Reveal>

        <Reveal direction="up">
          <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h2 className="text-lg font-semibold">Langkah aman</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-300">
              {plan.steps.map((step) => <li key={step.stepCode}>{step.instruction}</li>)}
            </ol>
          </section>
        </Reveal>

        <Reveal direction="up">
          <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
            <h2 className="text-lg font-semibold">Kondisi Sebelum Tindakan</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><dt className="text-xs uppercase tracking-wide text-slate-500">Periode baseline</dt><dd className="mt-1 text-sm text-slate-200">{formatDate(plan.baseline.periodStart)}–{formatDate(plan.baseline.periodEnd)}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-slate-500">Total biaya</dt><dd className="mt-1 text-sm text-slate-200">{formatRupiah(plan.baseline.totalCostRupiah)}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-slate-500">Biaya per hari</dt><dd className="mt-1 text-sm text-slate-200">{formatRupiah(plan.baseline.costPerDayRupiah)}</dd></div>
              {baselineKwh && <div><dt className="text-xs uppercase tracking-wide text-slate-500">Pemakaian tercatat</dt><dd className="mt-1 text-sm text-slate-200">{baselineKwh}</dd></div>}
            </dl>
          </section>
        </Reveal>

        {plan.userNote && (
          <Reveal direction="up"><section className="rounded-xl border border-slate-700 bg-slate-800 p-6"><h2 className="text-lg font-semibold">Catatan</h2><p className="mt-3 whitespace-pre-wrap text-sm text-slate-300">{plan.userNote}</p></section></Reveal>
        )}

        {plan.status === 'COMPLETED' && (
          <Reveal direction="up"><section className="rounded-xl border border-emerald-800/70 bg-emerald-950/20 p-5"><p className="text-sm leading-relaxed text-emerald-100/80">{ACTION_PLAN_COMPLETION_COPY}</p></section></Reveal>
        )}
        {plan.status === 'CANCELLED' && (
          <Reveal direction="up"><section className="rounded-xl border border-amber-800/70 bg-amber-950/20 p-5"><p className="text-sm leading-relaxed text-amber-100/80">{ACTION_PLAN_CANCELLATION_COPY}</p></section></Reveal>
        )}

        {(plan.status === 'PLANNED' || plan.status === 'IN_PROGRESS') && (
          <Reveal direction="up">
            <section className="flex flex-wrap gap-3 rounded-xl border border-slate-700 bg-slate-800 p-6">
              {plan.status === 'PLANNED' && <ActionPlanTransitionForm sessionId={sessionId} actionPlanId={plan.id} transition="START" />}
              {plan.status === 'IN_PROGRESS' && <ActionPlanTransitionForm sessionId={sessionId} actionPlanId={plan.id} transition="COMPLETE" />}
              <ActionPlanTransitionForm sessionId={sessionId} actionPlanId={plan.id} transition="CANCEL" />
            </section>
          </Reveal>
        )}

        <Reveal direction="up">
          <section className="rounded-xl border border-cyan-900/80 bg-cyan-950/20 p-5">
            <h2 className="font-semibold text-cyan-200">Evaluasi Tagihan Berikutnya</h2>
            <p className="mt-2 text-sm leading-relaxed text-cyan-100/70">Dampak tindakan akan dibandingkan setelah tagihan berikutnya yang eligible tersedia. Hasil belum dapat dipastikan.</p>
            <p className="mt-3 text-sm leading-relaxed text-cyan-100/70">{ACTION_PLAN_DISCLAIMER}</p>
          </section>
        </Reveal>
      </PageReveal>
    </main>
  );
}
