import React from 'react';
import { decimal, rupiah } from '@/lib/format';
import type { PortfolioTrendPoint } from '@/server/services/portfolio.service';

interface Props {
  trend: PortfolioTrendPoint[];
}

export function PortfolioTrend({ trend }: Props) {
  if (trend.length === 0) return null;

  // Find max value to scale bars
  const maxCost = Math.max(...trend.map((t) => t.totalCostIdr ?? 0), 1000);

  return (
    <section aria-labelledby="portfolio-trend-heading" className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 shadow-xs sm:p-6">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="portfolio-trend-heading" className="text-base font-bold text-[var(--foreground)] sm:text-lg">
            Tren Biaya Seluruh Usaha
          </h2>
          <p className="text-xs text-[var(--muted)] sm:text-sm">
            Total pengeluaran listrik gabungan selama 6 bulan terakhir dengan status kelengkapan data
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs text-[var(--muted)]">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-xs bg-[var(--primary)]" />
            <span>Biaya Listrik</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-6 gap-2 sm:gap-4">
        {trend.map((point) => {
          const cost = point.totalCostIdr ?? 0;
          const heightPct = maxCost > 0 ? Math.max(8, Math.round((cost / maxCost) * 100)) : 8;
          const hasData = point.businessCountWithData > 0;

          return (
            <div key={point.periodMonth} className="flex flex-col items-center justify-end">
              {/* Cost value label above bar */}
              <div className="mb-2 text-center">
                {hasData && cost > 0 ? (
                  <span className="text-[10px] font-bold text-[var(--foreground)] sm:text-xs">
                    {cost >= 1_000_000
                      ? `${decimal.format(cost / 1_000_000)} jt`
                      : rupiah.format(cost)}
                  </span>
                ) : (
                  <span className="text-[10px] text-[var(--muted)]">—</span>
                )}
              </div>

              {/* Bar Container */}
              <div className="relative flex h-32 w-full max-w-[48px] items-end justify-center rounded-xl bg-[var(--surface-muted)] p-1 sm:h-40">
                <div
                  className={`w-full rounded-lg transition-all ${
                    hasData
                      ? 'bg-[var(--primary)] hover:opacity-90'
                      : 'bg-transparent'
                  }`}
                  style={{ height: hasData ? `${heightPct}%` : '0%' }}
                  title={`${point.label}: ${hasData ? rupiah.format(cost) : 'Belum ada data'} (${point.businessCountWithData}/${point.totalActiveBusinesses} lokasi tercatat)`}
                />
              </div>

              {/* Month label and coverage under bar */}
              <span className="mt-2 text-center text-xs font-semibold text-[var(--foreground)]">
                {point.label}
              </span>
              <span className="text-center text-[10px] text-[var(--muted)]">
                {point.businessCountWithData}/{point.totalActiveBusinesses} lokasi
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
