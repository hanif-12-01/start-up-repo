import { redirect } from 'next/navigation';
import { getOptionalSession } from '@/server/auth/session';
import { resolveJourneyStep, getJourneyRedirect } from '@/server/services/journey.service';
import { PlanChoiceForm } from './PlanChoiceForm';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';

export const dynamic = 'force-dynamic';

export default async function PlanPage() {
  const sessionResult = await getOptionalSession();
  if (!sessionResult?.user) redirect('/login');

  const step = await resolveJourneyStep(sessionResult.user.id);
  if (step !== 'PLAN') redirect(getJourneyRedirect(step));

  return (
    <main className="min-h-screen flex items-center justify-center bg-[var(--surface)] text-[var(--foreground)] p-4">
      <PageReveal className="w-full max-w-lg bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl p-6 shadow-xl space-y-6">
        <Reveal direction="down">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--primary)]">Pilih Paket</h1>
            <p className="text-sm text-[var(--muted)]">
              Pilih cara memulai WattWise. Anda bisa langsung menggunakan versi gratis atau mencoba fitur lengkap selama 30 hari.
            </p>
          </div>
        </Reveal>

        <PlanChoiceForm />

        <Reveal direction="up" delay={0.2}>
          <p className="text-xs text-[var(--muted)] text-center leading-relaxed">
            WattWise bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.
          </p>
        </Reveal>
      </PageReveal>
    </main>
  );
}
