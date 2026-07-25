import { redirect } from 'next/navigation';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { getOptionalSession } from '@/server/auth/session';
import { getBusinessesByUser } from '@/server/services/business.service';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';
import { BillForm } from './BillForm';

export const dynamic = 'force-dynamic';

export default async function NewBillPage() {
  const sessionResult = await getOptionalSession();
  if (!sessionResult?.user) redirect('/login');

  const userId = sessionResult.user.id;
  const step = await resolveJourneyStep(userId);
  if (step !== 'COMPLETE') redirect(getJourneyRedirect(step));

  const businesses = await getBusinessesByUser(userId);
  const currentBusiness = businesses[0];
  if (!currentBusiness) redirect('/businesses/new');

  return (
    <main className="min-h-screen bg-slate-900 p-4 text-slate-100 md:p-10">
      <PageReveal className="mx-auto w-full max-w-2xl space-y-6 rounded-xl border border-slate-700 bg-slate-800 p-6 shadow-xl">
        <Reveal direction="down">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">{currentBusiness.name}</p>
            <h1 className="text-2xl font-bold tracking-tight">Masukkan tagihan listrik</h1>
            <p className="text-sm leading-relaxed text-slate-400">
              Catat angka yang tercantum pada tagihan. Setelah ada dua periode terpisah, WattWise akan
              membandingkan biaya harian secara netral.
            </p>
          </div>
        </Reveal>

        <BillForm />
      </PageReveal>
    </main>
  );
}

