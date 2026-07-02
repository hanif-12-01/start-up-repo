"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/ui/common";

export default function LaporanError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Laporan] Error:", error);
  }, [error]);

  return (
    <div className="max-w-5xl">
      <PageHeader title="Laporan Bulanan Listrik" subtitle="Terjadi masalah saat memuat pratinjau laporan." />
      <div className="card flex min-h-[400px] flex-col items-center justify-center text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl border border-red-100 bg-red-50 text-red-500">
          <AlertCircle className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-bold text-brand-ink">Laporan Tidak Dapat Dimuat</h2>
        <p className="mt-1 max-w-md text-sm leading-relaxed text-slate-500">
          Terjadi kesalahan saat mengambil data dari database. Silakan muat ulang halaman ini.
        </p>
        <button onClick={reset} className="btn-primary mt-6 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" />
          Coba Lagi
        </button>
      </div>
    </div>
  );
}