"use client";

import { useState, type ComponentType } from "react";
import {
  BookOpen,
  Calculator,
  CheckCircle2,
  Clock,
  Droplets,
  Lightbulb,
  Zap,
} from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui/common";
import { useToast } from "@/components/ui/toast";
import { rekomendasi, ringkasan } from "@/lib/mock-data";
import { formatRupiah } from "@/lib/utils";

const iconMap: Record<string, ComponentType<{ className?: string }>> = {
  clock: Clock,
  lightbulb: Lightbulb,
  zap: Zap,
  droplets: Droplets,
  notebook: BookOpen,
};

export default function RekomendasiPage() {
  const { toast } = useToast();
  const [tagihan, setTagihan] = useState(ringkasan.prediksiBulanIni);
  const [targetPersen, setTargetPersen] = useState(15);

  const estimasiHematBulan = Math.max(0, (tagihan * targetPersen) / 100);
  const estimasiHematTahun = estimasiHematBulan * 12;

  return (
    <div>
      <PageHeader
        title="Rekomendasi Hemat Listrik"
        subtitle="Saran praktis untuk Laundry Berkah. Mulai dari yang paling mudah untuk menurunkan tagihan bulan ini."
      />

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <section className="space-y-4 lg:col-span-8">
          <h2 className="text-lg font-bold">Saran Hemat Khusus Usaha Anda</h2>

          {rekomendasi.map((rek) => {
            const Icon = iconMap[rek.ikon] ?? Lightbulb;

            return (
              <div key={rek.id} className="card transition hover:shadow-soft">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-greenSoft text-brand-greenDark">
                      <Icon className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-ink">{rek.judul}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-slate-500">{rek.penjelasan}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        {rek.hemat ? (
                          <span className="badge bg-green-50 text-green-700">
                            Hemat {formatRupiah(rek.hemat)}/bulan
                          </span>
                        ) : (
                          <span className="badge bg-blue-50 text-blue-700">{rek.hematLabel}</span>
                        )}
                        <StatusBadge status={rek.kesulitan} />
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      toast(
                        `Saran "${rek.judul}" ditandai sebagai sedang diterapkan. WattWise AI akan memantau dampaknya minggu depan.`
                      )
                    }
                    className="btn-outline shrink-0"
                  >
                    <CheckCircle2 className="h-4 w-4 text-brand-green" />
                    Terapkan
                  </button>
                </div>
              </div>
            );
          })}
        </section>

        <aside className="card sticky top-24 lg:col-span-4">
          <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-blueSoft text-brand-blue">
              <Calculator className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold">Simulasi Penghematan</h2>
              <p className="text-xs text-slate-500">Hitung potensi hemat dalam Rupiah.</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="label">Tagihan Bulanan Sekarang</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-medium text-slate-400">
                  Rp
                </span>
                <input
                  type="number"
                  min="0"
                  className="input pl-10 font-semibold"
                  value={tagihan}
                  onChange={(e) => setTagihan(Number(e.target.value))}
                />
              </div>
              <p className="helper">Ubah angka ini sesuai perkiraan tagihan usaha Anda.</p>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="label !mb-0">Target Penghematan</label>
                <span className="font-bold text-brand-blue">{targetPersen}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={targetPersen}
                onChange={(e) => setTargetPersen(Number(e.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-blue"
              />
              <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                <span>5% mudah</span>
                <span>15% sedang</span>
                <span>30% agresif</span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-4 text-center">
              <p className="text-xs text-slate-500">Estimasi Hemat Bulanan</p>
              <p className="mt-1 text-2xl font-extrabold text-brand-green">
                {formatRupiah(estimasiHematBulan)}
              </p>
              <div className="my-3 border-t border-slate-200/60" />
              <p className="text-[10px] uppercase tracking-wider text-slate-400">
                Estimasi Hemat Tahunan
              </p>
              <p className="mt-1 font-bold text-brand-ink">{formatRupiah(estimasiHematTahun)}</p>
            </div>

            <p className="rounded-xl border border-yellow-100 bg-brand-yellowSoft p-3 text-xs leading-relaxed text-yellow-800">
              Simulasi ini adalah perkiraan sederhana, bukan jaminan tagihan resmi.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}