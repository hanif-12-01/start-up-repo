"use client";

import { useEffect } from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Dashboard error boundary:", error);
  }, [error]);

  return (
    <div className="max-w-md mx-auto my-16 p-8 rounded-2xl border border-slate-200 bg-white text-center shadow-soft relative overflow-hidden animate-fade-in">
      {/* Red accent line */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-red-500 to-rose-600" />
      
      <div className="mx-auto w-12 h-12 rounded-full bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center mb-5">
        <AlertCircle className="h-6 w-6" />
      </div>

      <h2 className="text-lg font-bold text-slate-800 mb-2 font-display">
        Dashboard belum bisa dimuat.
      </h2>
      
      <p className="text-xs text-slate-500 leading-relaxed mb-6 font-semibold">
        Coba muat ulang halaman atau klik tombol di bawah untuk mencoba kembali.
      </p>

      <button
        onClick={() => reset()}
        className="w-full btn bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2.5 font-bold flex items-center justify-center gap-1.5 rounded-xl shadow-md transition-all"
      >
        <RotateCcw className="h-4 w-4" /> Coba Lagi
      </button>
    </div>
  );
}
