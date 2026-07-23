import { redirect } from 'next/navigation';
import { getOptionalSession } from '@/server/auth/session';
import { resolveJourneyStep, getJourneyRedirect, getUserPlan } from '@/server/services/journey.service';
import { getBusinessesByUser } from '@/server/services/business.service';
import { LogoutButton } from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function SetupPage() {
  const sessionResult = await getOptionalSession();
  if (!sessionResult?.user) redirect('/login');

  const userId = sessionResult.user.id;
  const step = await resolveJourneyStep(userId);
  if (step !== 'COMPLETE') redirect(getJourneyRedirect(step));

  const plan = await getUserPlan(userId);
  const businesses = await getBusinessesByUser(userId);
  const biz = businesses[0];

  const planLabel = plan?.plan === 'PRO_TRIAL' ? 'Pro Trial 30 Hari' : 'Gratis';
  const trialEnd = plan?.trialEndsAt ? new Date(plan.trialEndsAt).toLocaleDateString('id-ID') : null;

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-emerald-400">WattWise AI</h1>
            <p className="text-sm text-slate-400">Setup selesai — siap digunakan</p>
          </div>
          <LogoutButton />
        </header>

        <section className="bg-emerald-950/30 border border-emerald-700/50 rounded-xl p-6 space-y-2">
          <h2 className="text-xl font-semibold text-emerald-400">Profil usaha berhasil dibuat</h2>
          <p className="text-sm text-slate-300">Semua langkah awal telah selesai. Anda siap menggunakan WattWise.</p>
        </section>

        <section className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
          <h2 className="text-lg font-semibold text-slate-200">Ringkasan Setup</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-slate-900 rounded-md border border-slate-700">
              <span className="block text-xs font-semibold text-slate-400 uppercase">Paket</span>
              <span className="text-slate-100 font-medium">{planLabel}</span>
              {trialEnd && <span className="block text-xs text-slate-500 mt-1">Berakhir: {trialEnd}</span>}
            </div>
            <div className="p-3 bg-slate-900 rounded-md border border-slate-700">
              <span className="block text-xs font-semibold text-slate-400 uppercase">Onboarding</span>
              <span className="text-emerald-400 font-medium">Selesai</span>
            </div>
            {biz && (
              <>
                <div className="p-3 bg-slate-900 rounded-md border border-slate-700">
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Nama Usaha</span>
                  <span className="text-slate-100 font-medium">{biz.name}</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-md border border-slate-700">
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Tipe</span>
                  <span className="text-slate-100 font-medium">{biz.businessType}</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-md border border-slate-700">
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Segmen</span>
                  <span className="text-slate-100 font-medium">{biz.segment}</span>
                </div>
                <div className="p-3 bg-slate-900 rounded-md border border-slate-700">
                  <span className="block text-xs font-semibold text-slate-400 uppercase">Sistem Listrik</span>
                  <span className="text-slate-100 font-medium">{biz.electricalSystem}</span>
                </div>
              </>
            )}
          </div>
        </section>

        <section className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-amber-300">Langkah Berikutnya</h2>
          <p className="text-sm text-amber-200/90 leading-relaxed">
            Fitur input tagihan listrik akan tersedia pada fase berikutnya (IT-DIAG-01B).
            Setelah tagihan dimasukkan, WattWise dapat membantu menganalisis perubahan biaya dan mempersempit bagian yang perlu diperiksa.
          </p>
        </section>
      </div>
    </main>
  );
}
