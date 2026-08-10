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
      <body className="flex min-h-screen flex-col items-center justify-center bg-[var(--background)] p-4 text-[var(--foreground)]">
        <div className="text-center max-w-md">
          <h1 className="mb-2 text-3xl font-bold">Aplikasi belum dapat dimuat</h1>
          <p className="mb-6 text-sm text-[var(--muted)]">
            Aplikasi mengalami masalah tingkat global. Silakan segarkan halaman.
          </p>
          <button
            onClick={() => reset()}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
          >
            Segarkan Halaman
          </button>
        </div>
      </body>
    </html>
  );
}
