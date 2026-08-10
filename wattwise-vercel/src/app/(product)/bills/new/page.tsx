import { notFound, redirect } from 'next/navigation';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { getOptionalSession } from '@/server/auth/session';
import { getActiveBusinessById, getBusinessesByUser } from '@/server/services/business.service';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';
import { BillForm } from './BillForm';
import { getBillOverview } from '@/server/services/bill.service';

export const dynamic = 'force-dynamic';

export default async function NewBillPage({
  searchParams,
}: {
  searchParams: Promise<{ businessId?: string | string[] }>;
}) {
  const sessionResult = await getOptionalSession();
  if (!sessionResult?.user) redirect('/login');

  const userId = sessionResult.user.id;
  const step = await resolveJourneyStep(userId);
  if (step !== 'COMPLETE') redirect(getJourneyRedirect(step));

  const query = await searchParams;
  const requestedBusinessId =
    typeof query.businessId === 'string' && query.businessId.trim()
      ? query.businessId
      : undefined;
  const businesses = (await getBusinessesByUser(userId)).filter((item) => item.isActive);
  const currentBusiness = requestedBusinessId
    ? await getActiveBusinessById(userId, requestedBusinessId)
    : businesses[0];
  if (requestedBusinessId && !currentBusiness) notFound();
  if (!currentBusiness) redirect('/businesses/new');
  const overview = await getBillOverview(userId, currentBusiness.id);

  return (
    <main className="min-h-screen bg-[var(--background)] p-4 text-[var(--foreground)] md:p-10">
      <PageReveal className="mx-auto w-full max-w-2xl space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-medium)]">
        <Reveal direction="down">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">{currentBusiness.name}</p>
            <h1 className="text-2xl font-black tracking-tight">Masukkan tagihan listrik</h1>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Catat angka yang tercantum pada tagihan. Setelah ada dua periode terpisah, WattWise akan
              membandingkan biaya harian secara netral.
            </p>
          </div>
        </Reveal>

        <BillForm businessId={currentBusiness.id} previousMeterEnd={overview.current?.meterEnd} />
      </PageReveal>
    </main>
  );
}
