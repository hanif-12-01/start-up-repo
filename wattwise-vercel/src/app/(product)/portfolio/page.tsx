import { redirect } from 'next/navigation';
import { getOptionalSession } from '@/server/auth/session';
import { resolveJourneyStep, getJourneyRedirect, type JourneyStep } from '@/server/services/journey.service';
import { getPortfolioOverview, isValidYearMonth } from '@/server/services/portfolio-intelligence.service';
import { PortfolioSummary } from '@/components/portfolio/PortfolioSummary';
import { PortfolioHealth } from '@/components/portfolio/PortfolioHealth';
import { PortfolioAttentionList } from '@/components/portfolio/PortfolioAttentionList';
import { PortfolioTopContributors } from '@/components/portfolio/PortfolioTopContributors';
import { PortfolioTrend } from '@/components/portfolio/PortfolioTrend';
import { PortfolioLocationList } from '@/components/portfolio/PortfolioLocationList';
import { PortfolioFilters } from '@/components/portfolio/PortfolioFilters';
import { getDb } from '@/server/db';
import * as schema from '@/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';

export interface PortfolioRouteDecision {
  action: 'redirect' | 'render';
  destination?: string;
}

export function resolvePortfolioRouteDecision(
  sessionUser: { id: string } | null | undefined,
  journeyStep: JourneyStep,
  ownedBusinesses: Array<{ id: string; name: string }>
): PortfolioRouteDecision {
  if (!sessionUser) {
    return { action: 'redirect', destination: '/login' };
  }
  if (journeyStep !== 'COMPLETE') {
    return { action: 'redirect', destination: getJourneyRedirect(journeyStep) };
  }
  if (ownedBusinesses.length === 0) {
    return { action: 'redirect', destination: '/onboarding' };
  }
  if (ownedBusinesses.length === 1) {
    return {
      action: 'redirect',
      destination: `/dashboard?businessId=${encodeURIComponent(ownedBusinesses[0].id)}`,
    };
  }
  return { action: 'render' };
}

export const dynamic = 'force-dynamic';

export default async function PortfolioPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string | string[] }>;
}) {
  const session = await getOptionalSession();
  if (!session?.user) redirect('/login');
  const userId = session.user.id;

  const journeyStep = await resolveJourneyStep(userId);
  if (journeyStep !== 'COMPLETE') {
    redirect(getJourneyRedirect(journeyStep));
  }

  // Check owned active businesses
  const db = getDb();
  const ownedBusinesses = await db
    .select({
      id: schema.business.id,
      name: schema.business.name,
    })
    .from(schema.business)
    .where(
      and(
        eq(schema.business.userId, userId),
        eq(schema.business.isActive, true),
        isNull(schema.business.archivedAt)
      )
    );

  const decision = resolvePortfolioRouteDecision(session.user, journeyStep, ownedBusinesses);
  if (decision.action === 'redirect' && decision.destination) {
    redirect(decision.destination);
  }

  const query = await searchParams;
  const rawMonth = typeof query.month === 'string' ? query.month : undefined;
  const requestedMonth = rawMonth && isValidYearMonth(rawMonth) ? rawMonth : undefined;

  const portfolio = await getPortfolioOverview(userId, requestedMonth);

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-10 lg:py-9">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header with Title & Month Selector */}
        <header className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-[var(--primary)]">
                Portfolio Listrik
              </span>
            </div>
            <h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              Semua Usaha
            </h1>
            <p className="mt-1 text-xs text-[var(--muted)] sm:text-sm">
              Pantau kondisi penggunaan listrik seluruh lokasi dari satu halaman.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <PortfolioFilters
              selectedMonth={portfolio.selectedMonth}
              availableMonths={portfolio.availableMonths}
            />
          </div>
        </header>

        {/* 1. Top Summary KPI Cards with Coverage Disclosure */}
        <PortfolioSummary
          coverage={portfolio.coverage}
          summary={portfolio.summary}
          comparison={portfolio.comparison}
          selectedMonth={portfolio.selectedMonth}
        />

        {/* 2. Kondisi Semua Usaha */}
        <PortfolioHealth
          health={portfolio.health}
          totalActiveLocations={portfolio.coverage.activeBusinessCount}
        />

        {/* 3. Yang Perlu Anda Perhatikan (Top 5 Prioritized Exceptions) */}
        <PortfolioAttentionList items={portfolio.attentionItems} />

        {/* 4. Kontributor Kenaikan Terbesar */}
        <PortfolioTopContributors contributors={portfolio.topIncreaseContributors} />

        {/* 5. Total Penggunaan Listrik Semua Lokasi (6-Month Trend) */}
        <PortfolioTrend trend={portfolio.trend} />

        {/* 6. Semua Lokasi (Responsive Table / Mobile Cards) */}
        <PortfolioLocationList locations={portfolio.locations} />
      </div>
    </main>
  );
}
