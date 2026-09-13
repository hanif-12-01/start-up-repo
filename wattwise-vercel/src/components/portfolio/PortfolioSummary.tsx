import React from 'react';
import { Building2, Zap, Receipt, TrendingUp } from 'lucide-react';
import { decimal, rupiah } from '@/lib/format';
import type { PortfolioSummary as SummaryType, PortfolioComparison } from '@/server/services/portfolio.service';

interface Props {
  summary: SummaryType;
  comparison: PortfolioComparison;
}

export function PortfolioSummary({ summary, comparison }: Props) {

  return (
    <section aria-labelledby="portfolio-summary-heading" className="space-y-3">
      <h2 id="portfolio-summary-heading" className="sr-only">
        Ringkasan Portofolio
      </h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Lokasi Aktif */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Lokasi Aktif</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--primary-soft)] text-[var(--primary)]">
              <Building2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
              {summary.activeLocations}
            </span>
            <span className="ml-1.5 text-sm font-medium text-[var(--muted)]">lokasi</span>
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            Seluruh cabang & usaha dalam pemantauan
          </p>
        </div>

        {/* Card 2: Total Pemakaian */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Total Pemakaian</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <Zap className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold tracking-tight text-[var(--foreground)]">
              {summary.totalUsageKwh !== null ? decimal.format(summary.totalUsageKwh) : '—'}
            </span>
            {summary.totalUsageKwh !== null && (
              <span className="ml-1.5 text-sm font-medium text-[var(--muted)]">kWh</span>
            )}
          </div>
          <p className="mt-2 text-xs text-[var(--muted)]">
            {summary.locationsWithElectricity} dari {summary.activeLocations} lokasi tercatat ({Math.round(summary.electricityCoveragePercent)}%)
          </p>
        </div>

        {/* Card 3: Total Biaya Listrik */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Total Biaya Listrik</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">
              {summary.totalElectricityCostIdr !== null ? rupiah.format(summary.totalElectricityCostIdr) : '—'}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            {comparison.comparableLocationCount > 0 && comparison.electricityCostChangePercent !== null ? (
              <span
                className={`font-semibold ${
                  comparison.electricityCostChangePercent > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {comparison.electricityCostChangePercent > 0 ? '+' : ''}
                {decimal.format(comparison.electricityCostChangePercent)}% MoM
              </span>
            ) : null}
            <span className="text-[var(--muted)]">
              ({summary.locationsWithElectricity}/{summary.activeLocations} lokasi tercatat)
            </span>
          </div>
        </div>

        {/* Card 4: Total Pendapatan */}
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">Total Pendapatan</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-extrabold tracking-tight text-[var(--foreground)] sm:text-3xl">
              {summary.totalRevenueIdr !== null ? rupiah.format(summary.totalRevenueIdr) : '—'}
            </span>
          </div>
          <div className="mt-2 text-xs text-[var(--muted)]">
            {summary.locationsWithRevenue > 0 ? (
              <span>{summary.locationsWithRevenue} dari {summary.activeLocations} lokasi mencatat omzet</span>
            ) : (
              <span>Belum ada omzet dicatat bulan ini</span>
            )}
          </div>
        </div>
      </div>

      {/* MoM Population disclosure banner if partial data */}
      {comparison.comparableLocationCount > 0 && comparison.comparableLocationCount < summary.activeLocations && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5 text-xs text-[var(--muted)]">
          ℹ️ Perbandingan MoM dihitung berdasarkan <strong>{comparison.comparableLocationCount} lokasi</strong> yang memiliki data lengkap di kedua bulan terpilih.
        </div>
      )}
    </section>
  );
}
