import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LogoutButton } from '@/components/LogoutButton';
import { PageReveal } from '@/components/motion/PageReveal';
import { Reveal } from '@/components/motion/Reveal';
import { getOptionalSession } from '@/server/auth/session';
import type { BillRecord } from '@/server/repositories/bill.repository';
import { getBillOverview } from '@/server/services/bill.service';
import { getJourneyRedirect, resolveJourneyStep } from '@/server/services/journey.service';

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

export default async function BillsPage() {
  const sessionResult = await getOptionalSession();
  if (!sessionResult?.user) redirect('/login');

  const userId = sessionResult.user.id;
  const step = await resolveJourneyStep(userId);
  if (step !== 'COMPLETE') redirect(getJourneyRedirect(step));

  const { bills, current, previous, comparison } = await getBillOverview(userId);

  return (
    <main className="min-h-screen bg-slate-900 p-5 text-slate-100 md:p-10">
      <PageReveal className="mx-auto max-w-5xl space-y-8">
        <Reveal direction="down">
          <header className="flex flex-col gap-5 border-b border-slate-800 pb-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">WattWise AI</p>
              <h1 className="mt-1 text-3xl font-bold tracking-tight">Tagihan listrik</h1>
              <p className="mt-2 text-sm text-slate-400">Perbandingan berbasis data yang Anda masukkan.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link
                href="/bills/new"
                className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500"
              >
                Tambah Tagihan
              </Link>
              <LogoutButton />
            </div>
          </header>
        </Reveal>

        {!current && (
          <Reveal direction="up">
            <section className="rounded-xl border border-emerald-800/70 bg-emerald-950/30 p-8 text-center">
              <h2 className="text-xl font-semibold text-emerald-300">Belum ada tagihan</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
                Masukkan tagihan pertama untuk menyimpan baseline biaya. WattWise tidak akan menebak kWh,
                tarif, atau penyebab perubahan.
              </p>
              <Link
                href="/bills/new"
                className="mt-5 inline-block rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold hover:bg-emerald-500"
              >
                Masukkan Tagihan Pertama
              </Link>
            </section>
          </Reveal>
        )}

        {current && (
          <Reveal direction="up">
            <section className="grid gap-4 rounded-xl border border-slate-700 bg-slate-800 p-6 md:grid-cols-3">
              <div className="md:col-span-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Periode terbaru</p>
                <h2 className="mt-1 text-xl font-semibold">{periodLabel(current)}</h2>
                <p className="mt-1 text-sm text-slate-400">{current.businessName}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
                <p className="text-xs uppercase text-slate-500">Total tagihan</p>
                <p className="mt-2 text-xl font-semibold">{rupiah.format(current.totalAmountRupiah)}</p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
                <p className="text-xs uppercase text-slate-500">Pemakaian</p>
                <p className="mt-2 text-xl font-semibold">
                  {current.kwh === null ? 'Tidak diisi' : `${formatDecimal(current.kwh)} kWh`}
                </p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
                <p className="text-xs uppercase text-slate-500">Tarif per kWh</p>
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
            <section className="rounded-xl border border-amber-800/70 bg-amber-950/30 p-6">
              <h2 className="font-semibold text-amber-300">Satu periode sudah tersimpan</h2>
              <p className="mt-2 text-sm leading-relaxed text-amber-100/80">
                Tambahkan periode berikutnya yang tidak bertumpang tindih agar perbandingan biaya harian tersedia.
              </p>
            </section>
          </Reveal>
        )}

        {comparison && previous && (
          <Reveal direction="up">
            <section className="space-y-5 rounded-xl border border-cyan-800/70 bg-cyan-950/20 p-6">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">Dibanding periode sebelumnya</p>
                <h2 className="mt-1 text-xl font-semibold">{comparison.wording.title}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-300">{comparison.wording.detail}</p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
                  <p className="text-xs uppercase text-slate-500">Total biaya</p>
                  <p className="mt-2 text-lg font-semibold">{rupiah.format(comparison.totalCost.current)}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Sebelumnya {rupiah.format(comparison.totalCost.previous)} ·{' '}
                    {rupiahChangeLabel(comparison.totalCost.difference, comparison.totalCost.percentage, 'Rupiah')}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
                  <p className="text-xs uppercase text-slate-500">Biaya per hari</p>
                  <p className="mt-2 text-lg font-semibold">{rupiah.format(comparison.dailyCost.current)}</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Sebelumnya {rupiah.format(comparison.dailyCost.previous)} ·{' '}
                    {rupiahChangeLabel(comparison.dailyCost.difference, comparison.dailyCost.percentage, 'Rupiah/hari')}
                  </p>
                  <p className="mt-2 text-xs text-slate-500">
                    Dinormalisasi dari {comparison.currentDays} hari dan {comparison.previousDays} hari.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
                  <p className="text-xs uppercase text-slate-500">Total kWh</p>
                  {comparison.totalKwh ? (
                    <>
                      <p className="mt-2 text-lg font-semibold">{formatDecimal(comparison.totalKwh.current)} kWh</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Sebelumnya {formatDecimal(comparison.totalKwh.previous)} kWh ·{' '}
                        {decimalChangeLabel(
                          comparison.totalKwh.difference,
                          comparison.totalKwh.percentage,
                          'kWh'
                        )}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-300">
                      Tidak tersedia karena salah satu periode tidak memiliki data kWh.
                    </p>
                  )}
                </div>
                <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-4">
                  <p className="text-xs uppercase text-slate-500">kWh per hari</p>
                  {comparison.dailyKwh ? (
                    <>
                      <p className="mt-2 text-lg font-semibold">{formatDecimal(comparison.dailyKwh.current)} kWh</p>
                      <p className="mt-1 text-sm text-slate-400">
                        Sebelumnya {formatDecimal(comparison.dailyKwh.previous)} kWh ·{' '}
                        {decimalChangeLabel(comparison.dailyKwh.difference, comparison.dailyKwh.percentage, 'kWh/hari')}
                      </p>
                    </>
                  ) : (
                    <p className="mt-2 text-sm text-slate-300">
                      Tidak tersedia karena salah satu periode tidak memiliki data kWh.
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-500">Periode pembanding: {periodLabel(previous)}</p>
            </section>
          </Reveal>
        )}

        {bills.length > 0 && (
          <Reveal direction="up">
            <section className="space-y-3">
              <h2 className="text-lg font-semibold">Riwayat tagihan</h2>
              <div className="divide-y divide-slate-700 overflow-hidden rounded-xl border border-slate-700 bg-slate-800">
                {bills.map((bill) => (
                  <article key={bill.id} className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{periodLabel(bill)}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {bill.kwh === null ? 'kWh tidak diisi' : `${formatDecimal(bill.kwh)} kWh`}
                      </p>
                    </div>
                    <p className="font-semibold text-emerald-300">{rupiah.format(bill.totalAmountRupiah)}</p>
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
