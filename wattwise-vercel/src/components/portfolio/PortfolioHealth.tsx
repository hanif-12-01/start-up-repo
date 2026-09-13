import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';
import type { PortfolioHealth as HealthType } from '@/server/services/portfolio.service';

interface Props {
  health: HealthType;
}

export function PortfolioHealth({ health }: Props) {
  return (
    <section aria-labelledby="portfolio-health-heading" className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5 shadow-xs sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="portfolio-health-heading" className="text-base font-bold text-[var(--foreground)] sm:text-lg">
            Kondisi Semua Usaha
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {health.summaryText}
          </p>
        </div>

        {/* Status badges */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" />
            <span>{health.safeCount} Aman</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-4 w-4" />
            <span>{health.checkCount} Perlu Dicek</span>
          </div>

          <div className="flex items-center gap-1.5 rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-bold text-rose-700 dark:text-rose-300">
            <AlertOctagon className="h-4 w-4" />
            <span>{health.attentionCount} Perlu Perhatian</span>
          </div>

          {health.incompleteCount > 0 && (
            <div className="flex items-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1.5 text-xs font-bold text-[var(--muted)]">
              <HelpCircle className="h-4 w-4" />
              <span>{health.incompleteCount} Data Belum Lengkap</span>
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 border-t border-[var(--border)] pt-3 text-[11px] text-[var(--muted)]">
        Indikasi ini berdasarkan data yang dicatat di WattWise dan bukan diagnosis teknis instalasi listrik.
      </p>
    </section>
  );
}
