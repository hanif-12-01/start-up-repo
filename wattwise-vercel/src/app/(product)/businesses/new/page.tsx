import { redirect } from 'next/navigation';
import { getOptionalSession } from '@/server/auth/session';
import { resolveJourneyStep, getJourneyRedirect } from '@/server/services/journey.service';
import { BusinessForm } from './BusinessForm';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';

export const dynamic = 'force-dynamic';

export default async function NewBusinessPage() {
  const sessionResult = await getOptionalSession();
  if (!sessionResult?.user) redirect('/login');

  const step = await resolveJourneyStep(sessionResult.user.id);
  if (step !== 'BUSINESS' && step !== 'COMPLETE') redirect(getJourneyRedirect(step));

  return (
    <main className="min-h-screen bg-[var(--background)] p-4 py-10 text-[var(--foreground)]">
      <PageReveal className="mx-auto w-full max-w-4xl space-y-6 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow)] md:p-8">
        <Reveal direction="down">
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-[var(--primary)]">Profil Usaha</h1>
            <p className="text-sm text-[var(--muted)]">
              Buat profil usaha atau properti Anda. Data ini digunakan untuk analisis tagihan listrik.
            </p>
          </div>
        </Reveal>

        <BusinessForm />
      </PageReveal>
    </main>
  );
}
