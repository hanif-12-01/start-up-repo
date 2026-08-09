import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getOptionalSession } from '@/server/auth/session';
import { resolveJourneyStep, getJourneyRedirect, getUserPlan } from '@/server/services/journey.service';
import { getBusinessesByUser } from '@/server/services/business.service';
import { LogoutButton } from '@/components/LogoutButton';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { StaggerGroup } from '@/components/motion/StaggerGroup';

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
    <main className="min-h-screen bg-[var(--surface)] text-[var(--foreground)] p-6 md:p-12">
      <PageReveal className="max-w-3xl mx-auto space-y-8">
        <Reveal direction="down">
          <header className="flex items-center justify-between border-b border-[var(--border)] pb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-[var(--primary)]">WattWise AI</h1>
              <p className="text-sm text-[var(--muted)]">Setup selesai — siap digunakan</p>
            </div>
            <LogoutButton />
          </header>
        </Reveal>

        <Reveal direction="up" delay={0.1}>
          <section className="bg-[var(--primary-soft)] border border-[var(--primary)]/50 rounded-xl p-6 space-y-2">
            <h2 className="text-xl font-semibold text-[var(--primary)]">Profil usaha berhasil dibuat</h2>
            <p className="text-sm text-[var(--foreground)]">Semua langkah awal telah selesai. Anda siap menggunakan WattWise.</p>
          </section>
        </Reveal>

        <Reveal direction="up" delay={0.15}>
          <section className="bg-[var(--surface-muted)] border border-[var(--border)] rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-[var(--foreground)]">Ringkasan Setup</h2>
            <StaggerGroup className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-[var(--surface)] rounded-md border border-[var(--border)]">
                <span className="block text-xs font-semibold text-[var(--muted)] uppercase">Paket</span>
                <span className="text-[var(--foreground)] font-medium">{planLabel}</span>
                {trialEnd && <span className="block text-xs text-[var(--muted)] mt-1">Berakhir: {trialEnd}</span>}
              </div>
              <div className="p-3 bg-[var(--surface)] rounded-md border border-[var(--border)]">
                <span className="block text-xs font-semibold text-[var(--muted)] uppercase">Onboarding</span>
                <span className="text-[var(--primary)] font-medium">Selesai</span>
              </div>
              {biz && (
                <>
                  <div className="p-3 bg-[var(--surface)] rounded-md border border-[var(--border)]">
                    <span className="block text-xs font-semibold text-[var(--muted)] uppercase">Nama Usaha</span>
                    <span className="text-[var(--foreground)] font-medium">{biz.name}</span>
                  </div>
                  <div className="p-3 bg-[var(--surface)] rounded-md border border-[var(--border)]">
                    <span className="block text-xs font-semibold text-[var(--muted)] uppercase">Tipe</span>
                    <span className="text-[var(--foreground)] font-medium">{biz.businessType}</span>
                  </div>
                  <div className="p-3 bg-[var(--surface)] rounded-md border border-[var(--border)]">
                    <span className="block text-xs font-semibold text-[var(--muted)] uppercase">Segmen</span>
                    <span className="text-[var(--foreground)] font-medium">{biz.segment}</span>
                  </div>
                  <div className="p-3 bg-[var(--surface)] rounded-md border border-[var(--border)]">
                    <span className="block text-xs font-semibold text-[var(--muted)] uppercase">Sistem Listrik</span>
                    <span className="text-[var(--foreground)] font-medium">{biz.electricalSystem}</span>
                  </div>
                </>
              )}
            </StaggerGroup>
          </section>
        </Reveal>

        <Reveal direction="up" delay={0.25}>
          <section className="space-y-4 rounded-xl border border-[var(--border-strong)]/80 bg-[var(--primary-soft)] p-6">
            <h2 className="text-lg font-semibold text-[var(--primary)]">Mulai dari tagihan listrik Anda</h2>
            <p className="text-sm leading-relaxed text-[var(--muted)]/80">
              Masukkan total tagihan dan periodenya. kWh, tarif, dan catatan dapat ditambahkan bila tersedia.
              Setelah ada dua periode terpisah, WattWise membandingkan biaya harian tanpa mengklaim penyebabnya.
            </p>
            <Link
              href="/bills/new"
              className="inline-block rounded-md bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary)]"
            >
              Masukkan Tagihan Pertama
            </Link>
          </section>
        </Reveal>
      </PageReveal>
    </main>
  );
}
