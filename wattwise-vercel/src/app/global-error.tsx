'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global critical error:', error.digest || error.message);
  }, [error]);

  return (
    <html lang="id">
      <body className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
        <div className="text-center max-w-md">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Terjadi Kendala Kritis</h1>
          <p className="text-slate-400 text-sm mb-6">
            Aplikasi mengalami masalah tingkat global. Silakan segarkan halaman.
          </p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-500 transition"
          >
            Segarkan Halaman
          </button>
        </div>
      </body>
    </html>
  );
}
