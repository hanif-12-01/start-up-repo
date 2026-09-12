'use client';

import { useState } from 'react';
import { Zap, Receipt } from 'lucide-react';
import { rupiah } from '@/lib/format';
import type { PortfolioTrendPoint } from '@/server/services/portfolio-intelligence.service';

interface PortfolioTrendProps {
  trend: PortfolioTrendPoint[];
}

export function PortfolioTrend({ trend }: PortfolioTrendProps) {
  const [viewMode, setViewMode] = useState<'kwh' | 'cost'>('kwh');

  if (trend.length === 0) {
    return null;
  }

  // Determine max values for bar scaling
  const maxUsage = Math.max(...trend.map((p) => p.totalUsageKwh ?? 0), 1);
  const maxCost = Math.max(...trend.map((p) => p.totalElectricityCost ?? 0), 1);

  return (
    <section
      aria-labelledby="portfolio-trend-heading"
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 text-[var(--foreground)] space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h2 id="portfolio-trend-heading" className="text-base font-black tracking-tight">
            Total Penggunaan Listrik Semua Lokasi
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Tren historis 6 bulan terakhir beserta jumlah lokasi usaha yang tercatat.
          </p>
        </div>

        {/* Metric Switcher Toggle */}
        <div className="inline-flex rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode('kwh')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === 'kwh'
                ? 'bg-[var(--surface-elevated)] text-[var(--primary)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <Zap className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Pemakaian (kWh)</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('cost')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
              viewMode === 'cost'
                ? 'bg-[var(--surface-elevated)] text-[var(--primary)] shadow-xs'
                : 'text-[var(--muted)] hover:text-[var(--foreground)]'
            }`}
          >
            <Receipt className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Biaya Listrik (Rp)</span>
          </button>
        </div>
      </div>

      {/* Responsive Bar Visualization */}
      <div className="pt-2 overflow-x-auto pb-1">
        <div className="flex min-w-[520px] md:min-w-0 md:grid md:grid-cols-6 gap-3 items-end h-56 pt-8 pb-2">
          {trend.map((point) => {
            const val = viewMode === 'kwh' ? point.totalUsageKwh : point.totalElectricityCost;
            const maxVal = viewMode === 'kwh' ? maxUsage : maxCost;
            const heightPercent = val !== null && maxVal > 0 ? Math.round((val / maxVal) * 100) : 0;

            const displayValue =
              val !== null
                ? viewMode === 'kwh'
                  ? `${val.toLocaleString('id-ID')} kWh`
                  : rupiah.format(val)
                : '—';

            return (
              <div
                key={point.month}
                className="flex-1 flex flex-col items-center h-full justify-end group relative"
              >
                {/* Tooltip on hover */}
                <div className="absolute -top-6 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 bg-zinc-900 text-white text-[10px] px-2 py-1 rounded shadow-md whitespace-nowrap">
                  {point.label}: {point.businessCountWithData}/{point.activeBusinessCount} lokasi
                </div>

                {/* Value Label */}
                <span className="text-[11px] font-extrabold text-[var(--foreground)] mb-1 text-center truncate w-full px-1">
                  {displayValue}
                </span>

                {/* Bar Container */}
                <div className="w-full bg-[var(--surface)] rounded-t-lg h-36 flex items-end p-1 border-x border-t border-[var(--border)]">
                  <div
                    style={{ height: `${Math.max(heightPercent, 4)}%` }}
                    className={`w-full rounded-t-md transition-all duration-500 ${
                      val !== null
                        ? viewMode === 'kwh'
                          ? 'bg-amber-500/80 hover:bg-amber-500'
                          : 'bg-emerald-500/80 hover:bg-emerald-500'
                        : 'bg-zinc-200 dark:bg-zinc-800'
                    }`}
                  />
                </div>

                {/* X-axis Label & Coverage */}
                <div className="mt-2 text-center w-full">
                  <p className="text-xs font-bold text-[var(--foreground)]">{point.label}</p>
                  <p className="text-[10px] text-[var(--muted)]">
                    {point.businessCountWithData}/{point.activeBusinessCount} lokasi
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
