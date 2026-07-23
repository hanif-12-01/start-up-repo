import { redirect } from 'next/navigation';
import { getOptionalSession } from '@/server/auth/session';
import { resolveJourneyStep, getJourneyRedirect } from '@/server/services/journey.service';
import { completeOnboardingAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const sessionResult = await getOptionalSession();
  if (!sessionResult?.user) redirect('/login');

  const step = await resolveJourneyStep(sessionResult.user.id);
  if (step !== 'ONBOARDING') redirect(getJourneyRedirect(step));

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4">
      <div className="w-full max-w-lg bg-slate-800 border border-slate-700 rounded-xl p-6 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-emerald-400">Selamat Datang di WattWise</h1>
          <p className="text-sm text-slate-400">Sebelum mulai, beberapa hal penting yang perlu Anda ketahui.</p>
        </div>

        <div className="space-y-4 text-sm text-slate-300 leading-relaxed">
          <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 space-y-2">
            <h3 className="font-semibold text-slate-100">Mulai dari Tagihan</h3>
            <p>Anda cukup memasukkan jumlah tagihan listrik. Data kWh, meteran, dan daftar alat tidak wajib.</p>
          </div>

          <div className="p-4 bg-slate-900 rounded-lg border border-slate-700 space-y-2">
            <h3 className="font-semibold text-slate-100">Langkah Selanjutnya</h3>
            <p>Setelah ini, Anda akan membuat profil usaha singkat — nama, tipe, dan sistem listrik. Hanya beberapa field.</p>
          </div>

          <div className="p-4 bg-amber-950/40 border border-amber-800/60 rounded-lg space-y-2">
            <h3 className="font-semibold text-amber-300">Penting</h3>
            <p className="text-amber-200/80">
              WattWise bukan aplikasi resmi PLN, bukan pengganti PLN Mobile, dan bukan alat ukur listrik resmi.
              Hasil analisis berdasarkan data yang Anda input dan bukan tagihan resmi PLN.
            </p>
          </div>
        </div>

        <form action={completeOnboardingAction}>
          <button
            type="submit"
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-md transition duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-slate-800"
          >
            Saya Mengerti, Lanjutkan
          </button>
        </form>
      </div>
    </main>
  );
}
