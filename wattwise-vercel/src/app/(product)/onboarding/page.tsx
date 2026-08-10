import { redirect } from 'next/navigation';
import { getOptionalSession } from '@/server/auth/session';
import { resolveJourneyStep, getJourneyRedirect } from '@/server/services/journey.service';
import { completeOnboardingAction } from './actions';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { StaggerGroup } from '@/components/motion/StaggerGroup';
import { InteractiveMotion } from '@/components/motion/InteractiveMotion';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const sessionResult = await getOptionalSession();
  if (!sessionResult?.user) redirect('/login');

  const step = await resolveJourneyStep(sessionResult.user.id);
  if (step !== 'ONBOARDING') redirect(getJourneyRedirect(step));

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--surface)] text-[var(--foreground)] p-4">
      <PageReveal className="w-full max-w-lg bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl p-6 shadow-xl space-y-6">
        <Reveal direction="down">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--primary)]">Selamat Datang di WattWise</h1>
            <p className="text-sm text-[var(--muted)]">Sebelum mulai, beberapa hal penting yang perlu Anda ketahui.</p>
          </div>
        </Reveal>

        <StaggerGroup className="space-y-4 text-sm text-[var(--foreground)] leading-relaxed">
          <div className="p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)] space-y-2">
            <h3 className="font-semibold text-[var(--foreground)]">Mulai dari Tagihan</h3>
            <p>Anda cukup memasukkan jumlah tagihan listrik. Data kWh, meteran, dan daftar alat tidak wajib.</p>
          </div>

          <div className="p-4 bg-[var(--surface)] rounded-lg border border-[var(--border)] space-y-2">
            <h3 className="font-semibold text-[var(--foreground)]">Langkah Selanjutnya</h3>
            <p>Setelah ini, Anda akan membuat profil usaha singkat — nama, tipe, dan sistem listrik. Hanya beberapa field.</p>
          </div>

          <div className="p-4 bg-[var(--warning-surface)]/40 border border-[var(--warning-border)]/60 rounded-lg space-y-2">
            <h3 className="font-semibold text-[var(--warning)]">Penting</h3>
            <p className="text-[var(--warning)]/80">
              WattWise bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.
              Hasil analisis berdasarkan data yang Anda input dan bukan tagihan resmi PLN.
            </p>
          </div>
        </StaggerGroup>

        <Reveal direction="up" delay={0.25}>
          <form action={completeOnboardingAction}>
            <InteractiveMotion>
              <button
                type="submit"
                className="w-full py-2.5 bg-[var(--primary)] hover:bg-[var(--primary)] text-white font-semibold rounded-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] focus:ring-offset-2 focus:ring-offset-[var(--surface)]"
              >
                Saya Mengerti, Lanjutkan
              </button>
            </InteractiveMotion>
          </form>
        </Reveal>
      </PageReveal>
    </main>
  );
}
