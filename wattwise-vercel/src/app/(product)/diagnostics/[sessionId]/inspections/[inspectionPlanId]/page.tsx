import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { getOptionalSession } from '@/server/auth/session';
import {
  INSPECTION_ANSWER_LABELS,
  INSPECTION_RESULT_COPY,
  INSPECTION_SAFETY_LABELS,
} from '@/server/services/inspection-presentation';
import { getInspectionPlan } from '@/server/services/inspection.service';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';
import { env } from '@/config/env';
import { CompleteInspectionForm } from './CompleteInspectionForm';
import { InspectionItemForm } from './InspectionItemForm';

export const dynamic = 'force-dynamic';

export default async function GuidedInspectionPage({
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
  const view = await getInspectionPlan(userId, sessionId, inspectionPlanId);
  if (!view) notFound();

  const { plan, definition, answeredCount, totalCount, completed } = view;
  const resultsPath = `/diagnostics/${encodeURIComponent(sessionId)}/results`;
  const actionsPath = `/diagnostics/${encodeURIComponent(
    sessionId
  )}/inspections/${encodeURIComponent(plan.id)}/actions`;

  return (
    <main className="min-h-screen bg-slate-900 p-5 text-slate-100 md:p-10">
      <PageReveal className="mx-auto max-w-3xl space-y-6">
        <Reveal direction="down">
          <header className="border-b border-slate-800 pb-5">
            <Link
              href={resultsPath}
              className="text-sm font-semibold text-cyan-300 hover:text-cyan-200 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-300"
            >
              ← Kembali ke bagian yang perlu dicek
            </Link>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
              Panduan observasi aman
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">{plan.title}</h1>
            <p className="mt-3 text-sm leading-relaxed text-slate-400">
              {definition.introduction}
            </p>
          </header>
        </Reveal>

        <Reveal direction="up">
          <section className="rounded-xl border border-rose-800/80 bg-rose-950/30 p-5">
            <h2 className="font-semibold text-rose-200">Utamakan keselamatan</h2>
            <p className="mt-2 text-sm leading-relaxed text-rose-100/80">
              Jangan menyentuh, membongkar, membuka panel atau casing, mencabut kabel,
              maupun mendekati air di sekitar instalasi listrik. Jika terlihat bahaya,
              hentikan pemeriksaan dan minta bantuan teknisi yang kompeten.
            </p>
          </section>
        </Reveal>

        <Reveal direction="up">
          <section
            aria-label="Kemajuan pemeriksaan"
            className="rounded-xl border border-slate-700 bg-slate-800 p-5"
          >
            <div className="flex items-center justify-between gap-4 text-sm">
              <span className="font-semibold text-slate-200">Kemajuan</span>
              <span className="text-cyan-300">
                {answeredCount} dari {totalCount} langkah
              </span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
              <div
                className="h-full rounded-full bg-cyan-500"
                style={{
                  width: `${totalCount === 0 ? 0 : (answeredCount / totalCount) * 100}%`,
                }}
              />
            </div>
          </section>
        </Reveal>

        {completed ? (
          <Reveal direction="up">
            <section className="rounded-xl border border-emerald-800/80 bg-emerald-950/20 p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-400">
                Pemeriksaan selesai
              </p>
              <h2 className="mt-2 text-2xl font-semibold">
                {plan.resultCode ? INSPECTION_ANSWER_LABELS[plan.resultCode] : ''}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-emerald-100/80">
                {plan.resultCode ? INSPECTION_RESULT_COPY[plan.resultCode] : ''}
              </p>
              <p className="mt-3 text-sm leading-relaxed text-slate-400">
                {definition.completionCopy}
              </p>
              {env.ACTION_PLANS_ENABLED && plan.resultCode === 'FOUND' && (
                <Link
                  href={actionsPath}
                  className="mt-5 inline-flex rounded-md bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-300"
                >
                  Buat Rencana Hemat
                </Link>
              )}
              {env.ACTION_PLANS_ENABLED && plan.resultCode === 'NEEDS_HELP' && (
                <Link
                  href={actionsPath}
                  className="mt-5 inline-flex rounded-md bg-amber-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-amber-400 focus:outline-2 focus:outline-offset-2 focus:outline-amber-300"
                >
                  Buat Rencana Minta Bantuan
                </Link>
              )}
              {env.ACTION_PLANS_ENABLED && plan.resultCode === 'UNKNOWN' && (
                <Link
                  href={actionsPath}
                  className="mt-5 inline-flex rounded-md bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-400 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-300"
                >
                  Buat Rencana Lengkapi Informasi
                </Link>
              )}
              {plan.resultCode === 'NOT_FOUND' && (
                <div className="mt-5 rounded-lg border border-slate-700 bg-slate-900/50 p-4">
                  <p className="text-sm text-slate-200">
                    Tanda yang diperiksa belum ditemukan.
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    Pertimbangkan untuk memeriksa kandidat lain sebelum membuat Rencana Hemat.
                  </p>
                  <Link
                    href={resultsPath}
                    className="mt-4 inline-flex text-sm font-semibold text-cyan-300 hover:text-cyan-200 focus:outline-2 focus:outline-offset-2 focus:outline-cyan-300"
                  >
                    Periksa Kandidat Lain
                  </Link>
                </div>
              )}
            </section>
          </Reveal>
        ) : (
          <ol className="space-y-5" aria-label="Langkah observasi aman">
            {plan.items.map((item, index) => (
              <li key={item.id}>
                <Reveal direction="up">
                  <article className="rounded-xl border border-slate-700 bg-slate-800 p-6">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
                        Langkah {index + 1}
                      </p>
                      <span
                        className={
                          item.safetyLevel === 'PROFESSIONAL_REQUIRED'
                            ? 'rounded-full bg-rose-950 px-3 py-1 text-xs font-semibold text-rose-200'
                            : 'rounded-full bg-emerald-950 px-3 py-1 text-xs font-semibold text-emerald-200'
                        }
                      >
                        {INSPECTION_SAFETY_LABELS[item.safetyLevel]}
                      </span>
                    </div>
                    <p className="mt-3 text-sm leading-relaxed text-slate-200">
                      {item.instruction}
                    </p>
                    <InspectionItemForm
                      sessionId={sessionId}
                      planId={plan.id}
                      itemId={item.id}
                      resultOptions={item.resultOptions}
                      initialAnswer={item.answerCode}
                      initialNote={item.note}
                    />
                  </article>
                </Reveal>
              </li>
            ))}
          </ol>
        )}

        {!completed && (
          <Reveal direction="up">
            <section className="rounded-xl border border-slate-700 bg-slate-800 p-6">
              {answeredCount === totalCount && totalCount > 0 ? (
                <>
                  <h2 className="font-semibold">Semua langkah sudah dijawab</h2>
                  <p className="mb-4 mt-2 text-sm text-slate-400">
                    Setelah diselesaikan, jawaban dan catatan tidak dapat diubah.
                  </p>
                  <CompleteInspectionForm sessionId={sessionId} planId={plan.id} />
                </>
              ) : (
                <>
                  <h2 className="font-semibold">Pemeriksaan dapat dilanjutkan nanti</h2>
                  <p className="mt-2 text-sm text-slate-400">
                    Jawaban yang sudah disimpan akan tetap tersedia saat halaman dibuka kembali.
                  </p>
                </>
              )}
            </section>
          </Reveal>
        )}

        <Reveal direction="up">
          <section className="rounded-xl border border-cyan-900/80 bg-cyan-950/20 p-5">
            <h2 className="font-semibold text-cyan-200">Batas pemeriksaan</h2>
            <p className="mt-2 text-sm leading-relaxed text-cyan-100/70">
              Panduan ini hanya mencatat observasi yang aman. Hasilnya bukan diagnosis,
              bukan instruksi perbaikan, dan bukan kepastian penyebab perubahan tagihan.
            </p>
          </section>
        </Reveal>
      </PageReveal>
    </main>
  );
}
