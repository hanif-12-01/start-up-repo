import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import type { PortfolioHealth as PortfolioHealthType } from '@/server/services/portfolio-intelligence.service';

interface PortfolioHealthProps {
  health: PortfolioHealthType;
  totalActiveLocations: number;
}

export function PortfolioHealth({ health, totalActiveLocations }: PortfolioHealthProps) {
  return (
    <section
      aria-labelledby="portfolio-health-heading"
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-[var(--foreground)]"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 id="portfolio-health-heading" className="text-base font-black tracking-tight">
              Kondisi Semua Usaha
            </h2>
            <span className="rounded-full bg-[var(--surface-elevated)] px-2.5 py-0.5 text-xs font-semibold text-[var(--muted)] border border-[var(--border)]">
              {totalActiveLocations} lokasi aktif
            </span>
          </div>
          <p className="mt-1 text-xs text-[var(--muted)]">{health.summaryText}</p>
        </div>

        {/* Status Breakdown Pills */}
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Ringkasan Status Usaha">
          {/* Aman */}
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{health.safeCount} Aman</span>
          </div>

          {/* Perlu Dicek */}
          <div className="flex items-center gap-1.5 rounded-xl border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-xs font-bold text-blue-700 dark:text-blue-400">
            <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{health.checkCount} Perlu Dicek</span>
          </div>

          {/* Perlu Perhatian */}
          <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{health.attentionCount} Perlu Perhatian</span>
          </div>

          {/* Data Belum Lengkap */}
          {health.incompleteCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-zinc-500/20 bg-zinc-500/10 px-3 py-1.5 text-xs font-bold text-zinc-600 dark:text-zinc-400">
              <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>{health.incompleteCount} Data Belum Lengkap</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
