import { notFound, redirect } from 'next/navigation';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { getOptionalSession } from '@/server/auth/session';
import { getBillById } from '@/server/services/bill.service';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';
import { BillEditForm } from './BillEditForm';

export const dynamic = 'force-dynamic';

export default async function EditBillPage({
  params,
}: {
  params: Promise<{ billId: string }>;
}) {
  const sessionResult = await getOptionalSession();
  if (!sessionResult?.user) redirect('/login');

  const userId = sessionResult.user.id;
  const step = await resolveJourneyStep(userId);
  if (step !== 'COMPLETE') redirect(getJourneyRedirect(step));

  const { billId } = await params;
  const bill = await getBillById(userId, billId);
  if (!bill) notFound();

  return (
    <main className="min-h-screen bg-[var(--background)] p-4 text-[var(--foreground)] md:p-10">
      <PageReveal className="mx-auto w-full max-w-2xl space-y-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-medium)]">
        <Reveal direction="down">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
              {bill.businessName}
            </p>
            <h1 className="text-2xl font-black tracking-tight">Edit tagihan listrik</h1>
            <p className="text-sm leading-relaxed text-[var(--muted)]">
              Perbarui data tagihan. Jika tagihan terhubung dengan riwayat Cek Kenaikan, perubahan akan dikunci demi konsistensi.
            </p>
          </div>
        </Reveal>

        <BillEditForm bill={bill} />
      </PageReveal>
    </main>
  );
}
