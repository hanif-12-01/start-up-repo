import Link from 'next/link';
import { businessSegmentLabel } from '@/lib/format';
import { WorkspacePage, secondaryButton } from './WorkspaceUI';

export function ActiveLocationSelection({ businesses }: {
  businesses: Array<{ id: string; name: string; segment: string; city?: string | null }>;
}) {
  return (
    <WorkspacePage>
      <h1 className="text-2xl font-bold">Pilih lokasi aktif</h1>
      <p className="text-sm text-[var(--muted)]">
        Anda memiliki beberapa lokasi. Pilih satu lokasi secara eksplisit agar ringkasan dan tautan berikutnya memakai
        ID yang sama. WattWise tidak memilih lokasi pertama secara diam-diam.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {businesses.map((item) => (
          <li key={item.id}>
            <Link
              href={`/dashboard?businessId=${encodeURIComponent(item.id)}`}
              className="block min-h-11 rounded-2xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-4 transition hover:border-[var(--primary)] hover:bg-[var(--primary-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)]"
            >
              <span className="block text-sm font-extrabold text-[var(--foreground)]">{item.name}</span>
              <span className="mt-1 block text-xs text-[var(--muted)]">
                {businessSegmentLabel(item.segment)}
                {item.city ? ` · ${item.city}` : ''}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <div><Link href="/businesses" className={secondaryButton}>Kelola Usaha</Link></div>
    </WorkspacePage>
  );
}
