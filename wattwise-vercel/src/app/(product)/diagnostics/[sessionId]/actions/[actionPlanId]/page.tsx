import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { env } from '@/config/env';
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
import { getOutcomeEvaluationState } from '@/server/services/outcome.service';
import { ActionPlanTransitionForm } from './ActionPlanTransitionForm';
import { EvaluateOutcomeForm } from './EvaluateOutcomeForm';

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
  const outcomeState =
    plan.status === 'COMPLETED' && env.OUTCOME_TRACKING_ENABLED
      ? await getOutcomeEvaluationState(userId, sessionId, actionPlanId)
      : null;
  const inspectionPath = `/diagnostics/${encodeURIComponent(
    sessionId
  )}/inspections/${encodeURIComponent(plan.inspectionPlanId)}`;
  const baselineKwh = formatMilliKwh(plan.baseline.totalKwhMilliKwh);

  return (
    <main className="min-h-screen bg-[var(--surface)] p-5 text-[var(--foreground)] md:p-10">
      <PageReveal className="mx-auto max-w-3xl space-y-6">
        <Reveal direction="down">
          <header className="border-b border-[var(--border)] pb-5">
            <Link href={inspectionPath} className="text-sm font-semibold text-[var(--info)] hover:text-[var(--info)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring)]">
              ← Kembali ke pemeriksaan
            </Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Rencana Hemat</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{plan.title}</h1>
            <p className="mt-3 text-sm text-[var(--muted)]">Sumber: {plan.candidateTitle}</p>
          </header>
        </Reveal>

        <Reveal direction="up">
          <section className="grid gap-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6 sm:grid-cols-2">
            <div><p className="text-xs uppercase tracking-wide text-[var(--muted)]">Status Rencana</p><p className="mt-2 font-semibold text-[var(--info)]">{ACTION_PLAN_STATUS_LABELS[plan.status]}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-[var(--muted)]">Mulai direncanakan</p><p className="mt-2 text-[var(--foreground)]">{formatDate(plan.plannedStartDate)}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-[var(--muted)]">Hasil pemeriksaan</p><p className="mt-2 text-[var(--foreground)]">{INSPECTION_ANSWER_LABELS[plan.inspectionResult]}</p></div>
            <div><p className="text-xs uppercase tracking-wide text-[var(--muted)]">Evaluasi</p><p className="mt-2 text-[var(--foreground)]">Tagihan berikutnya yang periodenya dimulai setelah tindakan selesai</p></div>
          </section>
        </Reveal>

        <Reveal direction="up">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6">
            <h2 className="text-lg font-semibold">Alasan tindakan</h2>
            <p className="mt-3 text-sm leading-relaxed text-[var(--foreground)]">{plan.reason}</p>
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{plan.description}</p>
          </section>
        </Reveal>

        <Reveal direction="up">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6">
            <h2 className="text-lg font-semibold">Langkah aman</h2>
            <ol className="mt-4 list-decimal space-y-3 pl-5 text-sm leading-relaxed text-[var(--foreground)]">
              {plan.steps.map((step) => <li key={step.stepCode}>{step.instruction}</li>)}
            </ol>
          </section>
        </Reveal>

        <Reveal direction="up">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6">
            <h2 className="text-lg font-semibold">Kondisi Sebelum Tindakan</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div><dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Periode baseline</dt><dd className="mt-1 text-sm text-[var(--foreground)]">{formatDate(plan.baseline.periodStart)}–{formatDate(plan.baseline.periodEnd)}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Total biaya</dt><dd className="mt-1 text-sm text-[var(--foreground)]">{formatRupiah(plan.baseline.totalCostRupiah)}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Biaya per hari</dt><dd className="mt-1 text-sm text-[var(--foreground)]">{formatRupiah(plan.baseline.costPerDayRupiah)}</dd></div>
              {baselineKwh && <div><dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Pemakaian tercatat</dt><dd className="mt-1 text-sm text-[var(--foreground)]">{baselineKwh}</dd></div>}
            </dl>
          </section>
        </Reveal>

        {plan.userNote && (
          <Reveal direction="up"><section className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6"><h2 className="text-lg font-semibold">Catatan</h2><p className="mt-3 whitespace-pre-wrap text-sm text-[var(--foreground)]">{plan.userNote}</p></section></Reveal>
        )}

        {plan.status === 'COMPLETED' && (
          <Reveal direction="up"><section className="rounded-xl border border-[var(--border-strong)]/70 bg-[var(--primary-soft)]/20 p-5"><p className="text-sm leading-relaxed text-[var(--muted)]/80">{ACTION_PLAN_COMPLETION_COPY}</p></section></Reveal>
        )}
        {plan.status === 'CANCELLED' && (
          <Reveal direction="up"><section className="rounded-xl border border-[var(--warning-border)]/70 bg-[var(--warning-surface)]/20 p-5"><p className="text-sm leading-relaxed text-[var(--warning)]/80">{ACTION_PLAN_CANCELLATION_COPY}</p></section></Reveal>
        )}

        {(plan.status === 'PLANNED' || plan.status === 'IN_PROGRESS') && (
          <Reveal direction="up">
            <section className="flex flex-wrap gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6">
              {plan.status === 'PLANNED' && <ActionPlanTransitionForm sessionId={sessionId} actionPlanId={plan.id} transition="START" />}
              {plan.status === 'IN_PROGRESS' && <ActionPlanTransitionForm sessionId={sessionId} actionPlanId={plan.id} transition="COMPLETE" />}
              <ActionPlanTransitionForm sessionId={sessionId} actionPlanId={plan.id} transition="CANCEL" />
            </section>
          </Reveal>
        )}

        <Reveal direction="up">
          <section className="rounded-xl border border-[var(--info-border)]/80 bg-[var(--info-surface)]/20 p-5">
            {outcomeState?.kind === 'EVALUATED' ? (
              <>
                <h2 className="font-semibold text-[var(--info)]">Evaluasi Hasil tersedia</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">Perbandingan menggunakan snapshot yang tersimpan dan tidak berubah otomatis.</p>
                <Link href={`/diagnostics/${encodeURIComponent(sessionId)}/actions/${encodeURIComponent(actionPlanId)}/outcome`} className="mt-4 inline-flex rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring)]">Lihat Evaluasi Hasil</Link>
              </>
            ) : outcomeState?.kind === 'WAITING_FOR_BILL' ? (
              <>
                <h2 className="font-semibold text-[var(--info)]">Menunggu Tagihan Evaluasi</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">Belum ada tagihan evaluasi yang memenuhi syarat.</p>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">Tambahkan tagihan dengan periode yang dimulai setelah tindakan selesai pada {formatDate(outcomeState.eligibleAfterDate)}.</p>
                <Link href="/bills/new" className="mt-4 inline-flex rounded-md border border-[var(--info-border)] px-5 py-2.5 text-sm font-semibold text-[var(--info)] hover:bg-[var(--info-surface)]/50 focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring)]">Tambah tagihan</Link>
              </>
            ) : outcomeState?.kind === 'READY' ? (
              <>
                <h2 className="font-semibold text-[var(--info)]">Evaluasi Hasil</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">Tagihan Evaluasi dipilih otomatis untuk periode {formatDate(outcomeState.followUpBill.periodStart)}–{formatDate(outcomeState.followUpBill.periodEnd)}. Pilihan ini tidak dapat diganti manual.</p>
                <div className="mt-4"><EvaluateOutcomeForm actionPlanId={plan.id} /></div>
              </>
            ) : (
              <>
                <h2 className="font-semibold text-[var(--info)]">Evaluasi Tagihan Berikutnya</h2>
                <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">Evaluasi tersedia setelah tindakan ditandai selesai dan tagihan berikutnya memenuhi syarat.</p>
              </>
            )}
            <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">{ACTION_PLAN_DISCLAIMER}</p>
          </section>
        </Reveal>
      </PageReveal>
    </main>
  );
}
