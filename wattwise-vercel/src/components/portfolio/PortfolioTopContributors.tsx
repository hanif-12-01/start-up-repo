import Link from 'next/link';
import { ArrowUpRight, TrendingUp } from 'lucide-react';
import { businessSegmentLabel, rupiah } from '@/lib/format';
import type { PortfolioIncreaseContributor } from '@/server/services/portfolio-intelligence.service';

interface PortfolioTopContributorsProps {
  contributors: PortfolioIncreaseContributor[];
}

export function PortfolioTopContributors({ contributors }: PortfolioTopContributorsProps) {
  if (contributors.length === 0) {
    return (
      <section
        aria-labelledby="top-contributors-heading"
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 text-[var(--foreground)]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 id="top-contributors-heading" className="text-base font-black tracking-tight">
              Kontributor Kenaikan Terbesar
            </h2>
            <p className="mt-1 text-xs text-[var(--muted)]">
              Tidak ada lokasi usaha yang mengalami kenaikan pemakaian listrik pada bulan ini dibanding bulan sebelumnya.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 dark:text-emerald-400 self-start sm:self-auto">
            Stabil / Menurun
          </span>
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="top-contributors-heading"
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 text-[var(--foreground)] space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-[var(--border)] pb-4">
        <div>
          <h2 id="top-contributors-heading" className="text-base font-black tracking-tight">
            Kontributor Kenaikan Terbesar
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Lokasi yang menyumbang kenaikan pemakaian listrik terbesar dibanding bulan lalu di antara lokasi yang sebanding.
          </p>
        </div>
        <span className="text-xs font-semibold text-[var(--muted)]">
          {contributors.length} lokasi tercatat naik
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {contributors.map((c, idx) => {
          return (
            <article
              key={c.businessId}
              className="flex flex-col justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-all hover:border-[var(--primary)]"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-[var(--muted)]">
                    Peringkat #{idx + 1}
                  </span>
                  {c.contributionPercent !== null && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-extrabold text-amber-700 dark:text-amber-400 border border-amber-500/20">
                      <TrendingUp className="h-3 w-3" aria-hidden="true" />
                      {c.contributionPercent}% dari total kenaikan
                    </span>
                  )}
                </div>

                <h3 className="mt-2 text-sm font-black tracking-tight text-[var(--foreground)]">
                  {c.businessName}
                </h3>
                <p className="text-xs text-[var(--muted)]">
                  {businessSegmentLabel(c.businessType)}
                  {c.city ? ` · ${c.city}` : ''}
                </p>

                <div className="mt-3 flex items-baseline gap-2">
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400">
                    +{c.increaseKwh.toLocaleString('id-ID')} kWh
                  </span>
                  {c.increaseCostIdr > 0 && (
                    <span className="text-xs text-[var(--muted)]">
                      (+{rupiah.format(c.increaseCostIdr)})
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-[var(--border)] flex justify-end">
                <Link
                  href={c.ctaHref}
                  className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline"
                >
                  <span>Lihat Lokasi</span>
                  <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Link>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
