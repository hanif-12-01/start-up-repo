'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log non-sensitive error metadata
    console.error('System error digest:', error.digest || error.message);
  }, [error]);

  return (
    <main className="flex-1 flex flex-col justify-center items-center px-4 py-16 text-center max-w-lg mx-auto">
      <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xl mb-4">
        !
      </div>
      <h2 className="text-2xl font-bold text-slate-100 mb-2">Terjadi Kendala Sistem</h2>
      <p className="text-sm text-slate-400 mb-6">
        Sistem mengalami gangguan sementara. Tidak ada data sensitif yang terpengaruh. Silakan coba muat ulang halaman.
      </p>
      <button
        onClick={() => reset()}
        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-semibold transition"
      >
        Coba Lagi
      </button>
    </main>
  );
}
