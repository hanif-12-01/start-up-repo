import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { getOptionalSession } from '@/server/auth/session';
import { ACTION_PLAN_STATUS_LABELS } from '@/server/services/action-plan-presentation';
import {
  OUTCOME_DATA_QUALITY_LABELS,
  OUTCOME_DIRECTION_LABELS,
  OVERALL_OUTCOME_LABELS,
} from '@/server/services/outcome-presentation';
import { getOutcomeEvaluationState } from '@/server/services/outcome.service';
import { getSessionClosureState } from '@/server/services/session-closure.service';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';
import type { NormalizedRationalSnapshot } from '@/server/services/outcome-evaluation';
import { CloseSessionForm } from './CloseSessionForm';

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

function divideRound(value: bigint, divisor: bigint) {
  return (value + divisor / 2n) / divisor;
}

function formatDailyRupiah(value: NormalizedRationalSnapshot) {
  return formatRupiah(divideRound(BigInt(value.numerator), BigInt(value.denominatorDays)).toString());
}

function formatMilliKwh(value: string | null) {
  if (value === null) return 'Data belum tersedia';
  const milli = BigInt(value);
  const whole = milli / 1000n;
  const fraction = (milli % 1000n).toString().padStart(3, '0').replace(/0+$/, '');
  return fraction ? `${whole},${fraction} kWh` : `${whole} kWh`;
}

function formatDailyKwh(value: NormalizedRationalSnapshot | null) {
  if (!value) return 'Data belum tersedia';
  return `${formatMilliKwh(
    divideRound(BigInt(value.numerator), BigInt(value.denominatorDays)).toString()
  )} per hari`;
}

function formatTariff(value: string | null) {
  return value === null ? 'Data belum tersedia' : `Rp${value.replace('.', ',')} per kWh`;
}

export default async function OutcomeEvaluationPage({
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
  const state = await getOutcomeEvaluationState(userId, sessionId, actionPlanId);
  if (!state) notFound();
  if (state.kind !== 'EVALUATED') {
    redirect(
      `/diagnostics/${encodeURIComponent(sessionId)}/actions/${encodeURIComponent(actionPlanId)}`
    );
  }
  const { plan, outcome } = state;
  const closure = await getSessionClosureState(userId, sessionId);
  if (!closure) notFound();
  const actionPath = `/diagnostics/${encodeURIComponent(sessionId)}/actions/${encodeURIComponent(actionPlanId)}`;

  return (
    <main className="min-h-screen bg-[var(--surface)] p-5 text-[var(--foreground)] md:p-10">
      <PageReveal className="mx-auto max-w-4xl space-y-6">
        <Reveal direction="down">
          <header className="border-b border-[var(--border)] pb-5">
            <Link href={actionPath} className="text-sm font-semibold text-[var(--info)] hover:text-[var(--info)] focus:outline-2 focus:outline-offset-2 focus:outline-[var(--focus-ring)]">
              ← Kembali ke Rencana Hemat
            </Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">Evaluasi Hasil</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{plan.title}</h1>
            <p className="mt-3 text-sm text-[var(--muted)]">Status Rencana Hemat: {ACTION_PLAN_STATUS_LABELS[plan.status]}</p>
          </header>
        </Reveal>

        <Reveal direction="up">
          <section className="rounded-xl border border-[var(--border-strong)]/70 bg-[var(--primary-soft)]/20 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">Ringkasan Perubahan</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--muted)]">{OVERALL_OUTCOME_LABELS[outcome.overallOutcomeCode]}</h2>
            {outcome.explanation.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-3 text-sm leading-relaxed text-[var(--muted)]/75">{paragraph}</p>
            ))}
          </section>
        </Reveal>

        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal direction="up">
            <section className="h-full rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6">
              <h2 className="text-lg font-semibold">Kondisi Sebelum Tindakan</h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div><dt className="text-[var(--muted)]">Periode</dt><dd className="mt-1 text-[var(--foreground)]">{formatDate(outcome.baseline.periodStart)}–{formatDate(outcome.baseline.periodEnd)}</dd></div>
                <div><dt className="text-[var(--muted)]">Total biaya</dt><dd className="mt-1 text-[var(--foreground)]">{formatRupiah(outcome.baseline.totalCostRupiah)}</dd></div>
                <div><dt className="text-[var(--muted)]">Biaya per hari</dt><dd className="mt-1 text-[var(--foreground)]">{formatDailyRupiah(outcome.comparison.baselineNormalizedCost)}</dd></div>
                <div><dt className="text-[var(--muted)]">Total pemakaian</dt><dd className="mt-1 text-[var(--foreground)]">{formatMilliKwh(outcome.baseline.totalKwhMilliKwh)}</dd></div>
                <div><dt className="text-[var(--muted)]">Pemakaian per hari</dt><dd className="mt-1 text-[var(--foreground)]">{formatDailyKwh(outcome.comparison.baselineNormalizedUsage)}</dd></div>
                <div><dt className="text-[var(--muted)]">Tarif tercatat</dt><dd className="mt-1 text-[var(--foreground)]">{formatTariff(outcome.baseline.tariffRupiahPerKwh)}</dd></div>
              </dl>
            </section>
          </Reveal>
          <Reveal direction="up">
            <section className="h-full rounded-xl border border-[var(--info-border)]/70 bg-[var(--info-surface)]/20 p-6">
              <h2 className="text-lg font-semibold">Tagihan Evaluasi</h2>
              <dl className="mt-4 space-y-4 text-sm">
                <div><dt className="text-[var(--foreground)]/50">Periode</dt><dd className="mt-1 text-[var(--foreground)]">{formatDate(outcome.followUp.periodStart)}–{formatDate(outcome.followUp.periodEnd)}</dd></div>
                <div><dt className="text-[var(--foreground)]/50">Total biaya</dt><dd className="mt-1 text-[var(--foreground)]">{formatRupiah(outcome.followUp.totalCostRupiah)}</dd></div>
                <div><dt className="text-[var(--foreground)]/50">Biaya per hari</dt><dd className="mt-1 text-[var(--foreground)]">{formatDailyRupiah(outcome.followUp.costPerDay)}</dd></div>
                <div><dt className="text-[var(--foreground)]/50">Total pemakaian</dt><dd className="mt-1 text-[var(--foreground)]">{formatMilliKwh(outcome.followUp.totalKwhMilliKwh)}</dd></div>
                <div><dt className="text-[var(--foreground)]/50">Pemakaian per hari</dt><dd className="mt-1 text-[var(--foreground)]">{formatDailyKwh(outcome.followUp.kwhPerDay)}</dd></div>
                <div><dt className="text-[var(--foreground)]/50">Tarif tercatat</dt><dd className="mt-1 text-[var(--foreground)]">{formatTariff(outcome.followUp.tariffRupiahPerKwh)}</dd></div>
              </dl>
            </section>
          </Reveal>
        </div>

        <Reveal direction="up">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6">
            <h2 className="text-lg font-semibold">Arah Perubahan</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-3">
              <div><dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Perubahan Biaya per Hari</dt><dd className="mt-2 font-semibold text-[var(--foreground)]">{OUTCOME_DIRECTION_LABELS[outcome.costDirection]}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Perubahan Pemakaian per Hari</dt><dd className="mt-2 font-semibold text-[var(--foreground)]">{OUTCOME_DIRECTION_LABELS[outcome.usageDirection]}</dd></div>
              <div><dt className="text-xs uppercase tracking-wide text-[var(--muted)]">Konteks Tarif</dt><dd className="mt-2 font-semibold text-[var(--foreground)]">{OUTCOME_DIRECTION_LABELS[outcome.tariffDirection]}</dd></div>
            </dl>
            <p className="mt-5 rounded-lg bg-[var(--surface)]/60 p-4 text-sm text-[var(--foreground)]">Kelengkapan Data Evaluasi: {OUTCOME_DATA_QUALITY_LABELS[outcome.dataQualityCode]}</p>
          </section>
        </Reveal>

        <Reveal direction="up">
          <section className="rounded-xl border border-[var(--warning-border)]/70 bg-[var(--warning-surface)]/20 p-5">
            <h2 className="font-semibold text-[var(--warning)]">Batas Evaluasi</h2>
            <p className="mt-2 text-sm leading-relaxed text-[var(--warning)]/75">{outcome.explanation.disclaimer}</p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--warning)]/75">Perubahan biaya dapat dipengaruhi oleh okupansi, jam operasional, tarif, cuaca, penggunaan alat, dan kondisi lainnya.</p>
          </section>
        </Reveal>

        <Reveal direction="up">
          <section className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-6">
            {closure.context.status === 'CLOSED' ? (
              <><h2 className="text-lg font-semibold text-[var(--primary)]">Sesi Cek Kenaikan Selesai</h2><p className="mt-2 text-sm text-[var(--muted)]">Hasil, pemeriksaan, dan Rencana Hemat tetap dapat dibaca.</p></>
            ) : closure.eligibility.eligible ? (
              <><h2 className="text-lg font-semibold">Tutup sesi</h2><p className="mt-2 text-sm text-[var(--muted)]">Menutup sesi tidak menghapus data. Hasil, pemeriksaan, dan Rencana Hemat tetap dapat dibaca.</p><CloseSessionForm sessionId={sessionId} /></>
            ) : (
              <><h2 className="text-lg font-semibold">Sesi belum dapat ditutup</h2><p className="mt-2 text-sm text-[var(--muted)]">{closure.eligibility.reason}</p></>
            )}
          </section>
        </Reveal>
      </PageReveal>
    </main>
  );
}
