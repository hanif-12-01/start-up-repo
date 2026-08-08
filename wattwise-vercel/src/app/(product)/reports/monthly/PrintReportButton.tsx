'use client';

import { Printer } from 'lucide-react';

export function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="report-print-hide inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2.5 text-sm font-extrabold text-white transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--focus)]"
    >
      <Printer className="h-4 w-4" />
      <span>Cetak / Simpan PDF</span>
    </button>
  );
}
