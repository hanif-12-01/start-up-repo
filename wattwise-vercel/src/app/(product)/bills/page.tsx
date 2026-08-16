import Link from 'next/link';
import { Edit3, Plus } from 'lucide-react';
import { DeleteBillButton } from './DeleteBillButton';
import { notFound, redirect } from 'next/navigation';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { getOptionalSession } from '@/server/auth/session';
import type { BillRecord } from '@/server/repositories/bill.repository';
import { getBillOverview } from '@/server/services/bill.service';
import { getActiveBusinessById, getBusinessesByUser } from '@/server/services/business.service';
import { getDiagnosticEntryState } from '@/server/services/diagnostic.service';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';
import { StartDiagnosticButton } from '../diagnostics/StartDiagnosticButton';
import { primaryButton, secondaryButton } from '@/components/product/WorkspaceUI';

export const dynamic = 'force-dynamic';

const rupiah = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});
const integer = new Intl.NumberFormat('id-ID');

function formatDecimal(value: string) {
  const negative = value.startsWith('-');
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction] = unsigned.split('.');
  return `${negative ? '-' : ''}${integer.format(BigInt(whole))}${fraction ? `,${fraction}` : ''}`;
}

function formatTariff(value: string) {
  return `Rp${formatDecimal(value)}`;
}

function formatDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function periodLabel(bill: BillRecord) {
  return `${formatDate(bill.periodStart)} - ${formatDate(bill.periodEnd)}`;
}

function percentageLabel(percentage: string | null) {
  if (percentage === null) return 'persentase tidak tersedia karena nilai sebelumnya 0';
  return `${percentage.startsWith('-') || percentage === '0' ? '' : '+'}${formatDecimal(percentage)}%`;
}

function rupiahChangeLabel(difference: bigint, percentage: string | null, unit: string) {
  const sign = difference > 0n ? '+' : '';
  return `${sign}${integer.format(difference)} ${unit} (${percentageLabel(percentage)})`;
}

function decimalChangeLabel(difference: string, percentage: string | null, unit: string) {
  const sign = !difference.startsWith('-') && difference !== '0' ? '+' : '';
  return `${sign}${formatDecimal(difference)} ${unit} (${percentageLabel(percentage)})`;
}

export default async function BillsPage({
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
  const selectedBusiness = requestedBusinessId
    ? await getActiveBusinessById(userId, requestedBusinessId)
    : businesses[0];
  if (requestedBusinessId && !selectedBusiness) notFound();
  if (!selectedBusiness) redirect('/businesses/new');

  const businessQuery = `?businessId=${encodeURIComponent(selectedBusiness.id)}`;
  const { bills, current, previous, comparison } = await getBillOverview(
    userId,
    selectedBusiness.id
  );
  const diagnosticEntry = current
    ? await getDiagnosticEntryState(userId, current.id)
    : null;

  return (
    <main className="min-h-screen bg-[var(--background)] p-4 text-[var(--foreground)] sm:p-6 lg:p-10">
      <PageReveal className="mx-auto max-w-7xl space-y-7">
        <Reveal direction="down">
          <header className="flex flex-col gap-5 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--primary)]">Data biaya listrik</p>
              <h1 className="mt-2 text-3xl font-black tracking-[-0.035em] sm:text-4xl">Tagihan listrik</h1>
              <p className="mt-3 text-sm text-[var(--muted)]">Catat periode dan bandingkan biaya berdasarkan data yang Anda masukkan.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                data-tour-id="add-bill"
                href={`/bills/new${businessQuery}`}
                className={primaryButton}
              >
                <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                Tambah Tagihan
              </Link>
              <Link
                href={`/dashboard${businessQuery}`}
                className={secondaryButton}
              >
                Dashboard
              </Link>
            </div>
          </header>
        </Reveal>

        {!current && (
          <Reveal direction="up">
            <section className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface-muted)] p-8 text-center">
              <h2 className="text-xl font-extrabold">Belum ada tagihan</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
                Masukkan tagihan pertama untuk menyimpan baseline biaya. WattWise tidak akan menebak kWh,
                tarif, atau penyebab perubahan.
              </p>
              <Link
                data-tour-id="add-bill"
                href={`/bills/new${businessQuery}`}
                className={`${primaryButton} mt-5`}
              >
                Masukkan Tagihan Pertama
              </Link>
            </section>
          </Reveal>
        )}

        {current && (
          <Reveal direction="up">
            <section className="grid gap-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 md:grid-cols-3">
              <div className="md:col-span-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">Periode terbaru</p>
                <h2 className="mt-1 text-xl font-semibold">{periodLabel(current)}</h2>
                <p className="mt-1 text-sm text-[var(--muted)]">{current.businessName}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <p className="text-xs uppercase text-[var(--muted)]">Total tagihan</p>
                <p className="mt-2 text-xl font-semibold">{rupiah.format(current.totalAmountRupiah)}</p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <p className="text-xs uppercase text-[var(--muted)]">Pemakaian</p>
                <p className="mt-2 text-xl font-semibold">
                  {current.kwh === null ? 'Tidak diisi' : `${formatDecimal(current.kwh)} kWh`}
                </p>
              </div>
              <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                <p className="text-xs uppercase text-[var(--muted)]">Tarif per kWh</p>
                <p className="mt-2 text-xl font-semibold">
                  {current.tariffRupiahPerKwh === null
                    ? 'Tidak diisi'
                    : formatTariff(current.tariffRupiahPerKwh)}
                </p>
              </div>
            </section>
          </Reveal>
        )}

        {current && !previous && (
          <Reveal direction="up">
            <section className="rounded-2xl border border-[var(--warning-border)] bg-[var(--warning-surface)] p-6">
              <h2 className="font-semibold text-[var(--warning)]">Satu periode sudah tersimpan</h2>
              <p className="mt-2 text-sm leading-relaxed text-[var(--warning)]">
                Tambahkan periode berikutnya yang tidak bertumpang tindih agar perbandingan biaya
                harian tersedia. Anda memerlukan satu periode pembanding sebelum dapat memilih Cek
                Kenaikan.
              </p>
            </section>
          </Reveal>
        )}

        {comparison && previous && (
          <Reveal direction="up">
            <section className="space-y-5 rounded-2xl border border-[var(--info-border)] bg-[var(--info-surface)] p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[var(--info)]">Dibanding periode sebelumnya</p>
                <h2 className="mt-1 text-xl font-semibold">{comparison.wording.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">{comparison.wording.detail}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-xs uppercase text-[var(--muted)]">Total biaya</p>
                  <p className="mt-2 text-lg font-semibold">{rupiah.format(comparison.totalCost.current)}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Sebelumnya {rupiah.format(comparison.totalCost.previous)} ·{' '}
                    {rupiahChangeLabel(comparison.totalCost.difference, comparison.totalCost.percentage, 'Rupiah')}
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-xs uppercase text-[var(--muted)]">Biaya per hari</p>
                  <p className="mt-2 text-lg font-semibold">{rupiah.format(comparison.dailyCost.current)}</p>
                  <p className="mt-1 text-sm text-[var(--muted)]">
                    Sebelumnya {rupiah.format(comparison.dailyCost.previous)} ·{' '}
                    {rupiahChangeLabel(comparison.dailyCost.difference, comparison.dailyCost.percentage, 'Rupiah/hari')}
                  </p>
                  <p className="mt-2 text-xs text-[var(--muted)]">
                    Dinormalisasi dari {comparison.currentDays} hari dan {comparison.previousDays} hari.
                  </p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-xs uppercase text-[var(--muted)]">Total kWh</p>
                  {comparison.totalKwh ? (
                    <>
                      <p className="mt-2 text-lg font-semibold">{formatDecimal(comparison.totalKwh.current)} kWh</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Sebelumnya {formatDecimal(comparison.totalKwh.previous)} kWh ·{' '}
                        {decimalChangeLabel(
                          comparison.totalKwh.difference,
                          comparison.totalKwh.percentage,
                          'kWh'
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Tidak tersedia karena salah satu periode tidak memiliki data kWh.
                    </p>
                  )}
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-xs uppercase text-[var(--muted)]">kWh per hari</p>
                  {comparison.dailyKwh ? (
                    <>
                      <p className="mt-2 text-lg font-semibold">{formatDecimal(comparison.dailyKwh.current)} kWh</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        Sebelumnya {formatDecimal(comparison.dailyKwh.previous)} kWh ·{' '}
                        {decimalChangeLabel(comparison.dailyKwh.difference, comparison.dailyKwh.percentage, 'kWh/hari')}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-[var(--muted)]">
                      Tidak tersedia karena salah satu periode tidak memiliki data kWh.
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-[var(--muted)]">Periode pembanding: {periodLabel(previous)}</p>
              {diagnosticEntry?.kind === 'READY' && (
                <div className="border-t border-[var(--info-border)] pt-1">
                  <p className="mt-4 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
                    Jawab questionnaire singkat untuk menyimpan konteks perubahan pada periode terbaru.
                    Tahap ini tidak menetapkan diagnosis.
                  </p>
                  <StartDiagnosticButton
                    electricityBillId={current.id}
                    resumable={diagnosticEntry.sessionId !== null}
                  />
                </div>
              )}
              {diagnosticEntry?.kind === 'UNSUPPORTED_SEGMENT' && (
                <p className="border-t border-[var(--info-border)] pt-4 text-sm text-[var(--warning)]">
                  {diagnosticEntry.message}
                </p>
              )}
              {diagnosticEntry?.kind === 'DISABLED' && (
                <p className="border-t border-[var(--info-border)] pt-4 text-sm text-[var(--muted)]">
                  {diagnosticEntry.message}
                </p>
              )}
            </section>
          </Reveal>
        )}

        {bills.length > 0 && (
          <Reveal direction="up">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Riwayat tagihan</h2>
              <div className="divide-y divide-[var(--border)] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                {bills.map((bill) => (
                  <article key={bill.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{periodLabel(bill)}</p>
                      <p className="mt-1 text-xs text-[var(--muted)]">
                        {bill.kwh === null ? 'kWh tidak diisi' : `${formatDecimal(bill.kwh)} kWh`}
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <p className="font-semibold text-[var(--primary)]">{rupiah.format(bill.totalAmountRupiah)}</p>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/bills/${bill.id}/edit`}
                          className="rounded-lg p-2 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
                          title="Edit tagihan"
                          aria-label={`Edit tagihan ${periodLabel(bill)}`}
                        >
                          <Edit3 className="h-4 w-4" />
                        </Link>
                        <DeleteBillButton billId={bill.id} periodLabel={periodLabel(bill)} />
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </Reveal>
        )}
      </PageReveal>
    </main>
  );
}
