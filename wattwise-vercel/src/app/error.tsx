'use client';

import { useEffect } from 'react';
import { TriangleAlert } from 'lucide-react';

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
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--warning-surface)] text-[var(--warning)]">
        <TriangleAlert className="h-6 w-6" aria-hidden="true" />
      </div>
      <h2 className="mb-2 text-2xl font-bold text-[var(--foreground)]">Terjadi kendala sistem</h2>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Sistem mengalami gangguan sementara. Tidak ada data sensitif yang terpengaruh. Silakan coba muat ulang halaman.
      </p>
      <button
        onClick={() => reset()}
        className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
      >
        Coba Lagi
      </button>
    </main>
  );
}
