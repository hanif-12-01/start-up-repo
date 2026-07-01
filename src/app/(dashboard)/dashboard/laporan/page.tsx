"use client";

import { useState } from "react";
import { Download, FileText, Info } from "lucide-react";
import { Modal, PageHeader } from "@/components/ui/common";
import { useToast } from "@/components/ui/toast";
import { laporan, profilUsaha, ringkasan } from "@/lib/mock-data";
import { formatRupiah } from "@/lib/utils";

export default function LaporanPage() {
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Laporan Bulanan Listrik"
        subtitle="Ringkasan pemakaian, deteksi anomali, dan rekomendasi hemat untuk evaluasi usaha."
      />

      <div className="mb-6 flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-brand-green">
            Laporan Tersedia
          </span>
          <h2 className="text-lg font-bold text-brand-ink">Laporan Periode {laporan.periode}</h2>
          <p className="text-xs text-slate-500">Dibuat otomatis pada {laporan.dibuatPada}</p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary">
          <Download className="h-4 w-4" />
          Unduh Laporan PDF
        </button>
      </div>

      <section className="card space-y-8 !p-8 md:!p-10">
        <div className="flex flex-col justify-between gap-6 border-b border-slate-100 pb-6 sm:flex-row sm:items-center">
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 place-items-center rounded-xl bg-brand-green text-white">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Laporan Analisis Listrik</h1>
              <p className="text-xs text-slate-500">WattWise AI — Laporan Kinerja Energi</p>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-bold uppercase text-slate-400">Periode Laporan</p>
            <p className="text-sm font-bold text-brand-ink">{laporan.periode}</p>
          </div>
        </div>

        <section className="grid gap-6 sm:grid-cols-2">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Profil Usaha</h3>
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-slate-500">
                Nama Usaha: <strong className="text-brand-ink">{profilUsaha.namaUsaha}</strong>
              </p>
              <p className="text-slate-500">
                Jenis Usaha: <strong className="text-brand-ink">{profilUsaha.jenisUsaha}</strong>
              </p>
              <p className="text-slate-500">
                Lokasi: <strong className="text-brand-ink">{profilUsaha.lokasi}</strong>
              </p>
            </div>
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Spesifikasi Listrik</h3>
            <div className="mt-3 space-y-2 text-sm">
              <p className="text-slate-500">
                Daya Terpasang: <strong className="text-brand-ink">{profilUsaha.dayaListrik}</strong>
              </p>
              <p className="text-slate-500">
                Tarif Listrik: <strong className="text-brand-ink">{profilUsaha.tarif}</strong>
              </p>
              <p className="text-slate-500">
                Jam Operasional: <strong className="text-brand-ink">{profilUsaha.jamOperasional}</strong>
              </p>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100 pt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Ringkasan Listrik Bulanan
          </h3>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Tagihan Bulan Lalu</p>
              <p className="mt-1 text-lg font-bold text-brand-ink">
                {formatRupiah(ringkasan.tagihanBulanLalu)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Prediksi Tagihan Bulan Ini</p>
              <p className="mt-1 text-lg font-bold text-brand-ink">
                {formatRupiah(ringkasan.prediksiBulanIni)}
              </p>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">Status Pemakaian</p>
              <p className="mt-1 text-sm font-bold text-yellow-700">Perlu Perhatian</p>
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100 pt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Deteksi Pemakaian Tidak Normal
          </h3>
          <div className="mt-3 rounded-xl border border-red-100 bg-red-50/50 p-4">
            <p className="text-sm font-medium leading-relaxed text-red-900">
              {laporan.ringkasanAnomali}
            </p>
            <p className="mt-1 text-xs text-red-700">
              Pemakaian meningkat tajam pada pukul 18.00-21.00 akibat penggunaan alat berdaya besar
              bersamaan.
            </p>
          </div>
        </section>

        <section className="border-t border-slate-100 pt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Rekomendasi Utama & Potensi Hemat
          </h3>
          <div className="mt-3 space-y-3">
            {laporan.topRekomendasi.map((item, i) => (
              <div key={item} className="flex items-start gap-3 text-sm">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-greenSoft text-xs font-bold text-brand-greenDark">
                  {i + 1}
                </span>
                <span className="font-medium text-slate-600">{item}</span>
              </div>
            ))}
          </div>
          <div className="mt-5 rounded-xl bg-brand-greenSoft p-4 text-brand-greenDark">
            <div className="flex items-center justify-between gap-4 text-sm font-bold">
              <span>Potensi Hemat Bulanan</span>
              <span>{formatRupiah(laporan.totalEstimasiHemat)}/bulan</span>
            </div>
          </div>
        </section>

        <footer className="flex gap-2 border-t border-slate-100 pt-6 text-[10px] leading-relaxed text-slate-400">
          <Info className="h-4 w-4 shrink-0 text-slate-400" />
          <p>{laporan.catatanPenutup}</p>
        </footer>
      </section>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Unduh Laporan PDF">
        <p className="leading-relaxed">Fitur unduh PDF akan tersedia pada versi berikutnya.</p>
        <div className="mt-5 flex justify-end">
          <button
            onClick={() => {
              setModalOpen(false);
              toast("Fitur unduh PDF akan tersedia pada versi berikutnya.", "info");
            }}
            className="btn-primary"
          >
            Tutup
          </button>
        </div>
      </Modal>
    </div>
  );
}