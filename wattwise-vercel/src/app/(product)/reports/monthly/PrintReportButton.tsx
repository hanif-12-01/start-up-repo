'use client';

export function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="report-print-hide rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-emerald-400 focus:outline-2 focus:outline-offset-2 focus:outline-emerald-300"
    >
      Cetak Laporan
    </button>
  );
}
