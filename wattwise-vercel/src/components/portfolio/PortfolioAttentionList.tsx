import React from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin } from 'lucide-react';
import { rupiah, businessSegmentLabel } from '@/lib/format';
import type { PortfolioAttentionItem } from '@/server/services/portfolio.service';

interface Props {
  items: PortfolioAttentionItem[];
}

export function PortfolioAttentionList({ items }: Props) {
  if (items.length === 0) {
    return (
      <section aria-labelledby="attention-heading" className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 shadow-xs">
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <span className="text-xl font-black">✓</span>
          </div>
          <h2 id="attention-heading" className="mt-3 text-lg font-bold text-[var(--foreground)]">
            Semua Lokasi Berjalan Normal
          </h2>
          <p className="mt-1 max-w-md text-sm text-[var(--muted)]">
            Tidak ada lonjakan pemakaian yang signifikan atau data tertunda pada periode terpilih.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-labelledby="attention-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 id="attention-heading" className="text-lg font-extrabold text-[var(--foreground)] sm:text-xl">
            Yang Perlu Anda Perhatikan
          </h2>
          <p className="text-xs text-[var(--muted)] sm:text-sm">
            Daftar lokasi dengan deviasi pemakaian atau kelengkapan data yang memerlukan tindakan
          </p>
        </div>
        <span className="rounded-full bg-[var(--primary-soft)] px-2.5 py-0.5 text-xs font-bold text-[var(--primary)]">
          {items.length} lokasi
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => {
          const isAttention = item.status === 'Perlu Perhatian';
          const isCheck = item.status === 'Perlu Dicek';

          return (
            <div
              key={item.businessId}
              className={`flex flex-col justify-between rounded-2xl border p-5 shadow-xs transition-shadow hover:shadow-md ${
                isAttention
                  ? 'border-rose-500/30 bg-rose-500/5'
                  : isCheck
                  ? 'border-amber-500/30 bg-amber-500/5'
                  : 'border-[var(--border)] bg-[var(--surface-elevated)]'
              }`}
            >
              <div>
                {/* Header: Location & Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-[var(--foreground)] sm:text-base">
                      {item.businessName}
                    </h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-[var(--muted)]">
                      <span>{businessSegmentLabel(item.businessType)}</span>
                      {item.city && (
                        <>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3" />
                            {item.city}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <span
                    className={`shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                      isAttention
                        ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                        : isCheck
                        ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                        : 'bg-[var(--surface-muted)] text-[var(--muted)]'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Main reason */}
                <p className="mt-3 text-sm font-medium text-[var(--foreground)]">
                  {item.primaryReason}
                </p>

                {/* Cost impact */}
                {item.costImpactIdr !== null && item.costImpactIdr > 0 && (
                  <div className="mt-2 rounded-xl bg-white/50 p-2.5 dark:bg-black/20">
                    <span className="block text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
                      Perkiraan Dampak Biaya Listrik
                    </span>
                    <span className="text-sm font-extrabold text-rose-600 dark:text-rose-400">
                      +{rupiah.format(item.costImpactIdr)}
                    </span>
                  </div>
                )}

                {/* Cost vs revenue insight */}
                {item.revenueContext && (
                  <p className="mt-2 text-xs text-[var(--muted)] italic">
                    💡 {item.revenueContext}
                  </p>
                )}
              </div>

              {/* Action Button */}
              <div className="mt-4 pt-3 border-t border-[var(--border)]/60">
                <Link
                  href={item.ctaHref}
                  className={`inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                    isAttention
                      ? 'bg-rose-600 text-white hover:bg-rose-700'
                      : isCheck
                      ? 'bg-amber-600 text-white hover:bg-amber-700'
                      : 'bg-[var(--primary)] text-[var(--primary-foreground)] hover:opacity-90'
                  }`}
                >
                  <span>{item.ctaText}</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
