'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Search, MapPin, ArrowRight, CheckCircle2, AlertTriangle, AlertOctagon, HelpCircle } from 'lucide-react';
import { decimal, rupiah, businessSegmentLabel } from '@/lib/format';
import type { PortfolioLocationRow, PortfolioHealthStatus } from '@/server/services/portfolio.service';

interface Props {
  locations: PortfolioLocationRow[];
}

export function PortfolioLocationList({ locations }: Props) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      const matchSearch =
        loc.name.toLowerCase().includes(search.toLowerCase()) ||
        (loc.city && loc.city.toLowerCase().includes(search.toLowerCase()));

      const matchStatus = statusFilter === 'ALL' || loc.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [locations, search, statusFilter]);

  const getStatusBadge = (status: PortfolioHealthStatus) => {
    switch (status) {
      case 'Aman':
        return (
          <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-3 w-3" />
            Aman
          </span>
        );
      case 'Perlu Dicek':
        return (
          <span className="inline-flex items-center gap-1 rounded-lg border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-xs font-bold text-amber-700 dark:text-amber-300">
            <AlertTriangle className="h-3 w-3" />
            Perlu Dicek
          </span>
        );
      case 'Perlu Perhatian':
        return (
          <span className="inline-flex items-center gap-1 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-700 dark:text-rose-300">
            <AlertOctagon className="h-3 w-3" />
            Perlu Perhatian
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] px-2 py-0.5 text-xs font-bold text-[var(--muted)]">
            <HelpCircle className="h-3 w-3" />
            Data Belum Lengkap
          </span>
        );
    }
  };

  return (
    <section aria-labelledby="locations-heading" className="space-y-4">
      {/* Header & Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 id="locations-heading" className="text-lg font-extrabold text-[var(--foreground)] sm:text-xl">
            Semua Lokasi
          </h2>
          <p className="text-xs text-[var(--muted)] sm:text-sm">
            Tinjau rincian pemakaian, biaya, dan omzet seluruh unit bisnis
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              placeholder="Cari lokasi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] pl-8 pr-3 text-xs text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] sm:w-48"
            />
          </div>

          {/* Status Filter */}
          <div className="flex flex-wrap gap-1">
            {[
              { label: 'Semua', val: 'ALL' },
              { label: 'Perlu Perhatian', val: 'Perlu Perhatian' },
              { label: 'Perlu Dicek', val: 'Perlu Dicek' },
              { label: 'Aman', val: 'Aman' },
            ].map((f) => (
              <button
                key={f.val}
                type="button"
                onClick={() => setStatusFilter(f.val)}
                className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
                  statusFilter === f.val
                    ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                    : 'border border-[var(--border)] bg-[var(--surface-elevated)] text-[var(--muted)] hover:text-[var(--foreground)]'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Table View (Hidden on mobile) */}
      <div className="hidden overflow-x-auto rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] shadow-xs md:block">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-[var(--border)] bg-[var(--surface-muted)] text-[11px] font-bold uppercase tracking-wider text-[var(--muted)]">
            <tr>
              <th scope="col" className="px-5 py-3.5">Lokasi</th>
              <th scope="col" className="px-4 py-3.5">Jenis Usaha</th>
              <th scope="col" className="px-4 py-3.5 text-right">Pemakaian</th>
              <th scope="col" className="px-4 py-3.5 text-right">Biaya Listrik</th>
              <th scope="col" className="px-4 py-3.5 text-right">Pendapatan</th>
              <th scope="col" className="px-4 py-3.5 text-center">Perubahan</th>
              <th scope="col" className="px-4 py-3.5 text-center">Status</th>
              <th scope="col" className="px-5 py-3.5 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {filteredLocations.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-sm text-[var(--muted)]">
                  Tidak ada lokasi yang cocok dengan kriteria filter.
                </td>
              </tr>
            ) : (
              filteredLocations.map((loc) => (
                <tr key={loc.id} className="transition-colors hover:bg-[var(--surface-muted)]/50">
                  <td className="px-5 py-4">
                    <div className="font-extrabold text-[var(--foreground)] sm:text-sm">
                      {loc.name}
                    </div>
                    {loc.city && (
                      <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--muted)]">
                        <MapPin className="h-3 w-3" />
                        {loc.city}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-[var(--muted)]">
                    {businessSegmentLabel(loc.businessType)}
                  </td>
                  <td className="px-4 py-4 text-right font-medium text-[var(--foreground)]">
                    {loc.usageKwh !== null ? `${decimal.format(loc.usageKwh)} kWh` : '—'}
                  </td>
                  <td className="px-4 py-4 text-right font-bold text-[var(--foreground)]">
                    {loc.electricityCostIdr !== null ? rupiah.format(loc.electricityCostIdr) : '—'}
                  </td>
                  <td className="px-4 py-4 text-right text-[var(--foreground)]">
                    {loc.revenueIdr !== null ? rupiah.format(loc.revenueIdr) : '—'}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {loc.costChangePercent !== null ? (
                      <span
                        className={`font-semibold ${
                          loc.costChangePercent > 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {loc.costChangePercent > 0 ? '+' : ''}
                        {decimal.format(loc.costChangePercent)}%
                      </span>
                    ) : (
                      <span className="text-[var(--muted)]">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center">
                    {getStatusBadge(loc.status)}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/dashboard?businessId=${encodeURIComponent(loc.id)}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface-elevated)] px-2.5 py-1.5 font-bold text-[var(--foreground)] transition-colors hover:border-[var(--primary)] hover:bg-[var(--primary-soft)]"
                    >
                      <span>Lihat</span>
                      <ArrowRight className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Stacked Cards View (Shown on mobile) */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredLocations.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6 text-center text-sm text-[var(--muted)]">
            Tidak ada lokasi yang cocok dengan filter.
          </div>
        ) : (
          filteredLocations.map((loc) => (
            <div
              key={loc.id}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-4 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-extrabold text-[var(--foreground)]">
                    {loc.name}
                  </h3>
                  <p className="text-xs text-[var(--muted)]">
                    {businessSegmentLabel(loc.businessType)} {loc.city ? `• ${loc.city}` : ''}
                  </p>
                </div>
                <div>{getStatusBadge(loc.status)}</div>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[var(--surface-muted)] p-2.5 text-xs">
                <div>
                  <span className="block text-[10px] text-[var(--muted)] uppercase">Biaya Listrik</span>
                  <span className="font-bold text-[var(--foreground)]">
                    {loc.electricityCostIdr !== null ? rupiah.format(loc.electricityCostIdr) : '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-[var(--muted)] uppercase">Pemakaian</span>
                  <span className="font-bold text-[var(--foreground)]">
                    {loc.usageKwh !== null ? `${decimal.format(loc.usageKwh)} kWh` : '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-[var(--muted)] uppercase">Pendapatan</span>
                  <span className="text-[var(--foreground)]">
                    {loc.revenueIdr !== null ? rupiah.format(loc.revenueIdr) : '—'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] text-[var(--muted)] uppercase">Perubahan Biaya</span>
                  {loc.costChangePercent !== null ? (
                    <span
                      className={`font-semibold ${
                        loc.costChangePercent > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {loc.costChangePercent > 0 ? '+' : ''}
                      {decimal.format(loc.costChangePercent)}%
                    </span>
                  ) : (
                    <span className="text-[var(--muted)]">—</span>
                  )}
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <Link
                  href={`/dashboard?businessId=${encodeURIComponent(loc.id)}`}
                  className="inline-flex items-center gap-1 rounded-xl bg-[var(--primary)] px-3 py-1.5 text-xs font-bold text-[var(--primary-foreground)]"
                >
                  <span>Lihat Lokasi</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
