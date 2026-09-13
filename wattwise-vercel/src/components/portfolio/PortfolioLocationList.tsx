'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronRight,
} from 'lucide-react';
import { businessSegmentLabel, rupiah } from '@/lib/format';
import type { PortfolioLocationRow, PortfolioHealthStatus } from '@/server/services/portfolio-intelligence.service';

interface PortfolioLocationListProps {
  locations: PortfolioLocationRow[];
}

export function PortfolioLocationList({ locations }: PortfolioLocationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const filteredLocations = locations.filter((loc) => {
    const matchesSearch =
      loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (loc.city && loc.city.toLowerCase().includes(searchQuery.toLowerCase())) ||
      businessSegmentLabel(loc.businessType).toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      selectedStatus === 'ALL' || loc.status === selectedStatus;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: PortfolioHealthStatus) => {
    switch (status) {
      case 'Aman':
        return (
          <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-400">
            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
            <span>Aman</span>
          </span>
        );
      case 'Perlu Dicek':
        return (
          <span className="inline-flex items-center gap-1 rounded-lg border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs font-bold text-blue-700 dark:text-blue-400">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            <span>Perlu Dicek</span>
          </span>
        );
      case 'Perlu Perhatian':
        return (
          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            <span>Perlu Perhatian</span>
          </span>
        );
      case 'Data Belum Lengkap':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-lg border border-zinc-500/20 bg-zinc-500/10 px-2 py-0.5 text-xs font-bold text-zinc-600 dark:text-zinc-400">
            <HelpCircle className="h-3 w-3" aria-hidden="true" />
            <span>Data Belum Lengkap</span>
          </span>
        );
    }
  };

  const getTrendBadge = (trend: 'Naik' | 'Stabil' | 'Turun' | null) => {
    if (!trend) return <span className="text-xs text-[var(--muted)]">—</span>;

    const TrendIcon =
      trend === 'Naik' ? TrendingUp : trend === 'Turun' ? TrendingDown : Minus;

    const color =
      trend === 'Naik'
        ? 'text-amber-600 dark:text-amber-400'
        : trend === 'Turun'
        ? 'text-emerald-600 dark:text-emerald-400'
        : 'text-[var(--muted)]';

    return (
      <span className={`inline-flex items-center gap-1 text-xs font-bold ${color}`}>
        <TrendIcon className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{trend}</span>
      </span>
    );
  };

  return (
    <section
      aria-labelledby="all-locations-heading"
      className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 text-[var(--foreground)] space-y-4"
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 border-b border-[var(--border)] pb-4">
        <div>
          <h2 id="all-locations-heading" className="text-base font-black tracking-tight">
            Semua Lokasi
          </h2>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Daftar lengkap seluruh unit usaha dengan status dan pergerakan pemakaian listrik.
          </p>
        </div>

        {/* Filter and Search controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[var(--muted)]"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Cari lokasi usaha..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full sm:w-56 rounded-xl border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--primary)] focus:outline-none"
            />
          </div>

          {/* Status Filter Dropdown */}
          <select
            value={selectedStatus}
            aria-label="Filter status usaha"
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="Perlu Perhatian">Perlu Perhatian</option>
            <option value="Perlu Dicek">Perlu Dicek</option>
            <option value="Aman">Aman</option>
            <option value="Data Belum Lengkap">Data Belum Lengkap</option>
          </select>
        </div>
      </div>

      {filteredLocations.length === 0 ? (
        <div className="text-center py-8 text-xs text-[var(--muted)]">
          Tidak ditemukan lokasi usaha yang sesuai dengan filter pencarian.
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[var(--border)] text-[var(--muted)] font-extrabold uppercase tracking-wider text-[10px]">
                  <th scope="col" className="py-3 px-4">Lokasi</th>
                  <th scope="col" className="py-3 px-3">Jenis Usaha</th>
                  <th scope="col" className="py-3 px-3">Pemakaian</th>
                  <th scope="col" className="py-3 px-3">Perubahan</th>
                  <th scope="col" className="py-3 px-3">Tren</th>
                  <th scope="col" className="py-3 px-3">Status</th>
                  <th scope="col" className="py-3 px-3">Biaya Listrik</th>
                  <th scope="col" className="py-3 px-4 text-right">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border)]">
                {filteredLocations.map((loc) => {
                  const usageDisplay =
                    loc.usageKwh !== null ? `${loc.usageKwh.toLocaleString('id-ID')} kWh` : '—';

                  const changeDisplay =
                    loc.usageChangePercent !== null
                      ? `${loc.usageChangePercent > 0 ? '+' : ''}${loc.usageChangePercent}%`
                      : '—';

                  const costDisplay =
                    loc.electricityCostIdr !== null ? rupiah.format(loc.electricityCostIdr) : '—';

                  return (
                    <tr
                      key={loc.id}
                      className="hover:bg-[var(--surface)] transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-bold text-[var(--foreground)]">
                        <div>{loc.name}</div>
                        {loc.city && <div className="text-[10px] text-[var(--muted)] font-normal">{loc.city}</div>}
                      </td>
                      <td className="py-3.5 px-3 text-[var(--muted)] font-medium">
                        {businessSegmentLabel(loc.businessType)}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-[var(--foreground)]">
                        {usageDisplay}
                      </td>
                      <td className="py-3.5 px-3 font-medium">
                        {loc.usageChangePercent !== null ? (
                          <span
                            className={
                              loc.usageChangePercent > 0
                                ? 'text-amber-600 dark:text-amber-400 font-bold'
                                : loc.usageChangePercent < 0
                                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                : 'text-[var(--muted)]'
                            }
                          >
                            {changeDisplay}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        {getTrendBadge(loc.trend)}
                      </td>
                      <td className="py-3.5 px-3">
                        {getStatusBadge(loc.status)}
                      </td>
                      <td className="py-3.5 px-3 font-semibold text-[var(--foreground)]">
                        {costDisplay}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={loc.ctaHref}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-xs font-bold text-[var(--primary)] hover:border-[var(--primary)] transition-all"
                        >
                          <span>{loc.ctaText}</span>
                          <ChevronRight className="h-3 w-3" aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredLocations.map((loc) => {
              const usageDisplay =
                loc.usageKwh !== null ? `${loc.usageKwh.toLocaleString('id-ID')} kWh` : '—';

              const changeDisplay =
                loc.usageChangePercent !== null
                  ? `${loc.usageChangePercent > 0 ? '+' : ''}${loc.usageChangePercent}%`
                  : '—';

              const costDisplay =
                loc.electricityCostIdr !== null ? rupiah.format(loc.electricityCostIdr) : '—';

              return (
                <article
                  key={loc.id}
                  className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-black text-[var(--foreground)]">{loc.name}</h3>
                      <p className="text-xs text-[var(--muted)]">
                        {businessSegmentLabel(loc.businessType)}
                        {loc.city ? ` · ${loc.city}` : ''}
                      </p>
                    </div>
                    <div>{getStatusBadge(loc.status)}</div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[var(--border)]">
                    <div>
                      <span className="text-[10px] text-[var(--muted)] uppercase font-bold">Pemakaian</span>
                      <p className="font-semibold text-[var(--foreground)]">{usageDisplay}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted)] uppercase font-bold">Biaya Listrik</span>
                      <p className="font-semibold text-[var(--foreground)]">{costDisplay}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted)] uppercase font-bold">Perubahan</span>
                      <p className="font-semibold">
                        {loc.usageChangePercent !== null ? (
                          <span
                            className={
                              loc.usageChangePercent > 0
                                ? 'text-amber-600 dark:text-amber-400 font-bold'
                                : loc.usageChangePercent < 0
                                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                                : 'text-[var(--muted)]'
                            }
                          >
                            {changeDisplay}
                          </span>
                        ) : (
                          <span className="text-[var(--muted)]">—</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--muted)] uppercase font-bold">Tren</span>
                      <div>{getTrendBadge(loc.trend)}</div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[var(--border)] flex justify-end">
                    <Link
                      href={loc.ctaHref}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[var(--primary)] hover:underline"
                    >
                      <span>{loc.ctaText}</span>
                      <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
