"use client";

export default function ErrorPeralatan({ reset }: { reset: () => void }) {
  return (
    <div className="card text-center">
      <h2 className="text-lg font-bold text-slate-800">Data peralatan gagal dimuat.</h2>
      <p className="mt-2 text-sm text-slate-400">Coba muat ulang halaman. Estimasi ini bukan tagihan resmi PLN.</p>
      <button onClick={reset} className="btn-primary mx-auto mt-5">Coba Lagi</button>
    </div>
  );
}