import { redirect } from 'next/navigation';
import { getOptionalSession } from '@/server/auth/session';
import { resolveJourneyStep, getJourneyRedirect } from '@/server/services/journey.service';
import { getPortfolioOverview } from '@/server/services/portfolio.service';
import { PortfolioSummary } from '@/components/portfolio/PortfolioSummary';
import { PortfolioHealth } from '@/components/portfolio/PortfolioHealth';
import { PortfolioAttentionList } from '@/components/portfolio/PortfolioAttentionList';
import { PortfolioTrend } from '@/components/portfolio/PortfolioTrend';
import { PortfolioLocationList } from '@/components/portfolio/PortfolioLocationList';
import { PortfolioFilters } from '@/components/portfolio/PortfolioFilters';

export const dynamic = 'force-dynamic';

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PortfolioPage({ searchParams }: PageProps) {
  const session = await getOptionalSession();
  if (!session?.user) {
    redirect('/login');
  }

  const userId = session.user.id;

  // Journey & business count check
  const journeyStep = await resolveJourneyStep(userId);
  if (journeyStep !== 'COMPLETE') {
    redirect(getJourneyRedirect(journeyStep));
  }

  const query = await searchParams;
  const requestedMonth = typeof query.month === 'string' && /^\d{4}-\d{2}$/.test(query.month)
    ? query.month
    : undefined;

  const overview = await getPortfolioOverview(userId, requestedMonth);

  // Section 5 Requirement: If user has 0 businesses, onboarding.
  // If user has exactly 1 business, redirect safely to /dashboard.
  if (overview.summary.activeLocations === 0) {
    redirect('/onboarding');
  }

  if (overview.summary.activeLocations === 1) {
    redirect('/dashboard');
  }

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Executive Header */}
        <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--primary)]">
              Command Center Portofolio
            </p>
            <h1 className="mt-1.5 text-2xl font-black tracking-[-0.04em] text-[var(--foreground)] sm:text-3xl lg:text-4xl">
              Semua Usaha ({overview.summary.activeLocations} Lokasi)
            </h1>
            <p className="mt-2 text-xs text-[var(--muted)] sm:text-sm">
              Pantau seluruh lokasi dalam satu layar untuk mengetahui unit bisnis yang memerlukan perhatian.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <PortfolioFilters
              selectedMonth={overview.selectedMonth}
              availableMonths={overview.availableMonths}
            />
          </div>
        </header>

        {/* 1. Summary Cards */}
        <PortfolioSummary summary={overview.summary} comparison={overview.comparison} />

        {/* 2. Health Breakdown Banner */}
        <PortfolioHealth health={overview.health} />

        {/* 3. "Yang Perlu Anda Perhatikan" Exception Cards */}
        <PortfolioAttentionList items={overview.attentionItems} />

        {/* 4. 6-Month Historical Trend */}
        <PortfolioTrend trend={overview.trend} />

        {/* 5. "Semua Lokasi" Comparison Table / Cards */}
        <PortfolioLocationList locations={overview.locations} />
      </div>
    </main>
  );
}
