import { redirect } from 'next/navigation';
import { getOptionalSession } from '@/server/auth/session';
import { LogoutButton } from '@/components/LogoutButton';

export const dynamic = 'force-dynamic';

export default async function ProtectedSetupPage() {
  const sessionResult = await getOptionalSession();

  if (!sessionResult || !sessionResult.session || !sessionResult.user) {
    redirect('/login');
  }

  const { user } = sessionResult;

  return (
    <main className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12">
      <div className="max-w-3xl mx-auto space-y-8">
        <header className="flex items-center justify-between border-b border-slate-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-emerald-400">WattWise AI</h1>
            <p className="text-sm text-slate-400">Protected Setup Shell — Auth Foundation</p>
          </div>
          <LogoutButton />
        </header>

        <section className="bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-200">Status Autentikasi Pengguna</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-slate-900 rounded-md border border-slate-700">
              <span className="block text-xs font-semibold text-slate-400 uppercase">Nama</span>
              <span className="text-slate-100 font-medium">{user.name}</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-md border border-slate-700">
              <span className="block text-xs font-semibold text-slate-400 uppercase">Email</span>
              <span className="text-slate-100 font-medium">{user.email}</span>
            </div>
            <div className="p-3 bg-slate-900 rounded-md border border-slate-700 md:col-span-2">
              <span className="block text-xs font-semibold text-slate-400 uppercase">User ID (Authoritative Session)</span>
              <span className="text-emerald-400 font-mono text-xs">{user.id}</span>
            </div>
          </div>
        </section>

        <section className="bg-amber-950/40 border border-amber-800/80 rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-amber-300">Batas Batas Fitur (Journey Boundary)</h2>
          <p className="text-sm text-amber-200/90 leading-relaxed">
            Fase ini (<strong>IT-DIAG-00C</strong>) membangun fondasi Database dan Autentikasi. Fitur berikut belum aktif pada fase ini:
          </p>
          <ul className="list-disc list-inside text-sm text-amber-200/80 space-y-1 font-mono text-xs">
            <li>Plan Choice / Pilihan Paket Produk</li>
            <li>Aktivasi Pro Trial 30 Hari & Entitlement</li>
            <li>Onboarding Bisnis / Properti</li>
            <li>Dashboard Produk, Diagnosis AI, Tagihan, & Action Plan</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
