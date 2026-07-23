import { redirect } from 'next/navigation';
import { getOptionalSession } from '@/server/auth/session';
import { resolveJourneyStep, getJourneyRedirect } from '@/server/services/journey.service';
import { BusinessForm } from './BusinessForm';

export const dynamic = 'force-dynamic';

export default async function NewBusinessPage() {
  const sessionResult = await getOptionalSession();
  if (!sessionResult?.user) redirect('/login');

  const step = await resolveJourneyStep(sessionResult.user.id);
  if (step !== 'BUSINESS') redirect(getJourneyRedirect(step));

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4">
      <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-400">Profil Usaha</h1>
          <p className="text-sm text-slate-400">
            Buat profil usaha atau properti Anda. Data ini digunakan untuk analisis tagihan listrik.
          </p>
        </div>

        <BusinessForm />
      </div>
    </main>
  );
}
