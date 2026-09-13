import { Building2, Zap, Receipt, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { formatMonth, rupiah } from '@/lib/format';
import type { PortfolioCoverage, PortfolioSummary as PortfolioSummaryType, PortfolioComparison } from '@/server/services/portfolio-intelligence.service';

interface PortfolioSummaryProps {
  coverage: PortfolioCoverage;
  summary: PortfolioSummaryType;
  comparison: PortfolioComparison;
  selectedMonth: string;
}

export function PortfolioSummary({
  coverage,
  summary,
  comparison,
  selectedMonth,
}: PortfolioSummaryProps) {
  const monthName = formatMonth(selectedMonth);

  // Card 1: Lokasi Aktif
  const activeLocationsText = `${coverage.activeBusinessCount} Lokasi Aktif`;
  const coverageText = `${coverage.businessesWithElectricityData} dari ${coverage.activeBusinessCount} lokasi memiliki data pemakaian ${monthName}.`;

  // Card 2: Total Pemakaian
  const usageText =
    summary.totalUsageKwh !== null
      ? `${summary.totalUsageKwh.toLocaleString('id-ID')} kWh`
      : 'Belum ada data';

  // Card 3: Total Biaya Listrik
  const costText =
    summary.totalElectricityCostIdr !== null
      ? rupiah.format(summary.totalElectricityCostIdr)
      : 'Belum ada data';

  // Card 4: Perubahan vs Bulan Sebelumnya
  const pctChange = comparison.usageDifferencePercent;
  let changeBadgeText = 'Tidak ada perubahan';
  let ChangeIcon = Minus;
  let changeColor = 'text-[var(--muted)]';

  if (pctChange !== null) {
    if (pctChange > 0) {
      changeBadgeText = `+${pctChange}% vs bulan lalu`;
      ChangeIcon = TrendingUp;
      changeColor = 'text-amber-600 dark:text-amber-400';
    } else if (pctChange < 0) {
      changeBadgeText = `${pctChange}% vs bulan lalu`;
      ChangeIcon = TrendingDown;
      changeColor = 'text-emerald-600 dark:text-emerald-400';
    } else {
      changeBadgeText = '0% vs bulan lalu';
      ChangeIcon = Minus;
      changeColor = 'text-[var(--muted)]';
    }
  }

  const comparisonNote =
    comparison.usageComparableBusinessCount > 0
      ? `Berdasarkan ${comparison.usageComparableBusinessCount} dari ${coverage.activeBusinessCount} lokasi yang memiliki data sebanding.`
      : 'Belum cukup data di kedua bulan untuk perbandingan pemakaian.';

  return (
    <section aria-labelledby="portfolio-summary-heading" className="space-y-3">
      <h2 id="portfolio-summary-heading" className="sr-only">
        Ringkasan Metrik Portfolio
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {/* 1. Lokasi Aktif */}
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 text-[var(--foreground)] shadow-xs">
          <div className="flex items-center justify-between">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--primary-soft)] text-[var(--primary)]"
            >
              <Building2 className="h-5 w-5" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
              Cakupan Lokasi
            </span>
          </div>
          <p className="mt-4 text-2xl font-black tracking-tight">{activeLocationsText}</p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{coverageText}</p>
        </article>

        {/* 2. Total Pemakaian */}
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 text-[var(--foreground)] shadow-xs">
          <div className="flex items-center justify-between">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400"
            >
              <Zap className="h-5 w-5" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
              Total Pemakaian
            </span>
          </div>
          <p className="mt-4 text-2xl font-black tracking-tight">{usageText}</p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            Tercatat untuk {monthName}.
          </p>
        </article>

        {/* 3. Total Biaya Listrik */}
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 text-[var(--foreground)] shadow-xs">
          <div className="flex items-center justify-between">
            <span
              aria-hidden="true"
              className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
            >
              <Receipt className="h-5 w-5" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
              Total Biaya Listrik
            </span>
          </div>
          <p className="mt-4 text-2xl font-black tracking-tight">{costText}</p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
            Biaya tagihan tercatat {monthName}.
          </p>
        </article>

        {/* 4. Perubahan vs Bulan Sebelumnya */}
        <article className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 text-[var(--foreground)] shadow-xs">
          <div className="flex items-center justify-between">
            <span
              aria-hidden="true"
              className={`grid h-10 w-10 place-items-center rounded-2xl bg-blue-500/10 ${changeColor}`}
            >
              <ChangeIcon className="h-5 w-5" />
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
              Perubahan Pemakaian
            </span>
          </div>
          <p className={`mt-4 text-2xl font-black tracking-tight ${changeColor}`}>
            {comparison.usageDifferencePercent !== null ? changeBadgeText : '—'}
          </p>
          <p className="mt-2 text-xs leading-5 text-[var(--muted)]">{comparisonNote}</p>
        </article>
      </div>
    </section>
  );
}
