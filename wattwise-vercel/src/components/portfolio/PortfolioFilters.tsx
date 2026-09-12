'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar } from 'lucide-react';
import { formatMonthLabel } from '@/lib/format';

interface PortfolioFiltersProps {
  selectedMonth: string;
  availableMonths: string[];
}

export function PortfolioFilters({
  selectedMonth,
  availableMonths,
}: PortfolioFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = e.target.value;
    const params = new URLSearchParams(searchParams?.toString() ?? '');
    params.set('month', newMonth);
    router.push(`/portfolio?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="month-select" className="sr-only">
        Pilih Periode Bulan
      </label>
      <div className="relative inline-flex items-center">
        <Calendar
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted)] pointer-events-none"
          aria-hidden="true"
        />
        <select
          id="month-select"
          value={selectedMonth}
          onChange={handleMonthChange}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] pl-9 pr-8 py-2 text-xs font-bold text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none shadow-xs"
        >
          {availableMonths.map((ym) => (
            <option key={ym} value={ym}>
              {formatMonthLabel(ym)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
