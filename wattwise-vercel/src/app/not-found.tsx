import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="flex-1 flex flex-col justify-center items-center px-4 py-16 text-center max-w-lg mx-auto">
      <div className="mb-2 text-6xl font-extrabold text-[var(--primary)]">404</div>
      <h2 className="mb-2 text-2xl font-bold text-[var(--foreground)]">Halaman tidak ditemukan</h2>
      <p className="mb-6 text-sm text-[var(--muted)]">
        Halaman atau rute yang Anda cari tidak tersedia atau telah dipindahkan.
      </p>
      <Link
        href="/"
        className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-muted)]"
      >
        Kembali ke Beranda
      </Link>
    </main>
  );
}
