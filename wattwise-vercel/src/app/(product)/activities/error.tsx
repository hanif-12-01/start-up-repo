'use client';

import { WorkspacePage, Surface, primaryButton } from '@/components/product/WorkspaceUI';

export default function ActivitiesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <WorkspacePage>
      <Surface variant="muted">
        <h2 className="text-xl font-bold text-[var(--foreground)]">Aktivitas usaha belum dapat dimuat</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Terjadi kendala saat memuat data operasional. Periksa koneksi Anda dan coba muat ulang halaman.
        </p>
        <button type="button" onClick={() => reset()} className={`${primaryButton} mt-4`}>
          Muat ulang
        </button>
      </Surface>
    </WorkspacePage>
  );
}
