import Link from 'next/link';
import {
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
} from 'lucide-react';
import { businessSegmentLabel } from '@/lib/format';
import type { PortfolioAttentionItem } from '@/server/services/portfolio-intelligence.service';

interface PortfolioAttentionListProps {
  items: PortfolioAttentionItem[];
}

export function PortfolioAttentionList({ items }: PortfolioAttentionListProps) {
  if (items.length === 0) {
    return (
      <section
        aria-labelledby="portfolio-attention-heading"
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 text-[var(--foreground)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 id="portfolio-attention-heading" className="text-lg font-black tracking-tight">
              Yang Perlu Anda Perhatikan
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Semua lokasi usaha yang tercatat berada dalam batas wajar penggunaan listrik.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 self-start sm:self-auto">
            Semua lokasi aman
          </span>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="portfolio-attention-heading"
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 text-[var(--foreground)] space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--border)] pb-4">
        <div>
          <h2 id="portfolio-attention-heading" className="text-lg font-black tracking-tight">
            Yang Perlu Anda Perhatikan
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Daftar lokasi prioritas yang membutuhkan peninjauan berdasarkan perubahan pemakaian listrik.
          </p>
        </div>
        <span className="text-xs font-semibold text-[var(--muted)]">
          {items.length} lokasi membutuhkan perhatian
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {items.map((item) => {
          const isAttention = item.status === 'Perlu Perhatian';
          const isCheck = item.status === 'Perlu Dicek';

          const StatusIcon = isAttention ? AlertTriangle : isCheck ? AlertCircle : HelpCircle;

          const statusBadgeClass = isAttention
            ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
            : isCheck
            ? 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400'
            : 'border-zinc-500/30 bg-zinc-500/10 text-zinc-600 dark:text-zinc-400';

          const TrendIcon =
            item.trend === 'Naik'
              ? TrendingUp
              : item.trend === 'Turun'
              ? TrendingDown
              : Minus;

          const trendColor =
            item.trend === 'Naik'
              ? 'text-amber-600 dark:text-amber-400'
              : item.trend === 'Turun'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-[var(--muted)]';

          return (
            <article
              key={item.businessId}
              className="flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-all hover:border-[var(--primary)] hover:shadow-sm"
            >
              <div className="space-y-3">
                {/* Header: Title, Segment, Status & Trend Badges */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-extrabold tracking-tight text-[var(--foreground)]">
                      {item.businessName}
                    </h3>
                    <p className="text-xs text-[var(--muted)]">
                      {businessSegmentLabel(item.businessType)}
                      {item.city ? ` · ${item.city}` : ''}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {item.trend && (
                      <span
                        className={`inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2 py-0.5 text-[11px] font-bold ${trendColor}`}
                      >
                        <TrendIcon className="h-3 w-3" aria-hidden="true" />
                        <span>Tren: {item.trend}</span>
                      </span>
                    )}
                    <span
                      className={`inline-flex items-center gap-1 rounded-lg border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider ${statusBadgeClass}`}
                    >
                      <StatusIcon className="h-3 w-3" aria-hidden="true" />
                      <span>{item.status}</span>
                    </span>
                  </div>
                </div>

                {/* Primary Narrative */}
                <p className="text-xs leading-relaxed text-[var(--foreground)] font-medium">
                  {item.primaryReason}
                </p>

                {/* Diagnostic Hint (if available) */}
                {item.diagnosticHint && (
                  <div className="flex items-center gap-1.5 text-xs text-[var(--muted)] bg-[var(--surface-elevated)] px-2.5 py-1.5 rounded-lg border border-[var(--border)]">
                    <Search className="h-3.5 w-3.5 text-[var(--primary)] shrink-0" aria-hidden="true" />
                    <span>{item.diagnosticHint}</span>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
                <span className="text-[11px] text-[var(--muted)]">
                  {item.costImpactIdr !== null && item.costImpactIdr > 0
                    ? `Perkiraan selisih: +Rp${(item.costImpactIdr / 1000).toLocaleString('id-ID')} rb`
                    : 'Pemeriksaan lanjutan'}
                </span>
                <Link
                  href={item.ctaHref}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline"
                >
                  <span>{item.ctaText}</span>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
