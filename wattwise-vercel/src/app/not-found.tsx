import Link from 'next/link';

export default function NotFoundPage() {
  return (
    <main className="flex-1 flex flex-col justify-center items-center px-4 py-16 text-center max-w-lg mx-auto">
      <div className="text-6xl font-extrabold text-emerald-400 mb-2">404</div>
      <h2 className="text-2xl font-bold text-slate-100 mb-2">Halaman Tidak Ditemukan</h2>
      <p className="text-sm text-slate-400 mb-6">
        Halaman atau rute yang Anda cari tidak tersedia atau telah dipindahkan.
      </p>
      <Link
        href="/"
        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-lg text-sm font-semibold transition"
      >
        Kembali ke Beranda
      </Link>
    </main>
  );
}
