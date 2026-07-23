import { redirect } from 'next/navigation';
import { getOptionalSession } from '@/server/auth/session';
import { resolveJourneyStep, getJourneyRedirect } from '@/server/services/journey.service';
import { PlanChoiceForm } from './PlanChoiceForm';

export const dynamic = 'force-dynamic';

export default async function PlanPage() {
  const sessionResult = await getOptionalSession();
  if (!sessionResult?.user) redirect('/login');

  const step = await resolveJourneyStep(sessionResult.user.id);
  if (step !== 'PLAN') redirect(getJourneyRedirect(step));

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4">
      <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-400">Pilih Paket</h1>
          <p className="text-sm text-slate-400">
            Pilih cara memulai WattWise. Anda bisa langsung menggunakan versi gratis atau mencoba fitur lengkap selama 30 hari.
          </p>
        </div>

        <PlanChoiceForm />

        <p className="text-xs text-slate-500 text-center leading-relaxed">
          WattWise bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.
        </p>
      </div>
    </main>
  );
}
