'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { formatMonth } from '@/lib/format';

interface Props {
  selectedMonth: string;
  availableMonths: string[];
}

export function PortfolioFilters({ selectedMonth, availableMonths }: Props) {
  const router = useRouter();

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextMonth = e.target.value;
    router.push(`/portfolio?month=${encodeURIComponent(nextMonth)}`);
  };

  return (
    <div className="flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-1.5 shadow-xs">
      <div className="flex items-center gap-1.5 pl-2 text-xs font-bold text-[var(--muted)]">
        <Calendar className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Periode:</span>
      </div>
      <select
        value={selectedMonth}
        onChange={handleMonthChange}
        className="h-8 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 text-xs font-bold text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
      >
        {availableMonths.map((ym) => (
          <option key={ym} value={ym}>
            {formatMonth(ym)}
          </option>
        ))}
      </select>
    </div>
  );
}
