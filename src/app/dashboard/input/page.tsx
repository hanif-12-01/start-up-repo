"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/common";
import { useToast } from "@/components/ui/toast";
import { createElectricityEntry } from "@/app/actions/electricity";

const inputSchema = z.object({
  month: z.number().min(1, "Bulan wajib diisi").max(12, "Bulan tidak valid"),
  year: z.number().min(2020, "Tahun minimal 2020").max(new Date().getFullYear() + 1, "Tahun tidak valid"),
  usageKwh: z.number().min(1, "Jumlah pemakaian kWh minimal 1 kWh"),
  costIdr: z.number().min(1000, "Nominal tagihan minimal Rp 1.000"),
});

type InputFormData = {
  month: number;
  year: number;
  usageKwh: number;
  costIdr: number;
};

const MONTHS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" },
];

export default function InputDataPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1; // 1-based

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InputFormData>({
    resolver: zodResolver(inputSchema),
    defaultValues: {
      month: currentMonth === 1 ? 12 : currentMonth - 1, // default to last month
      year: currentMonth === 1 ? currentYear - 1 : currentYear,
    },
  });

  const onSubmit = async (data: InputFormData) => {
    setLoading(true);
    setSuccess(false);
    setErrorMsg("");

    try {
      const res = await createElectricityEntry(data);
      if (res.success) {
        setSuccess(true);
        reset({
          month: currentMonth,
          year: currentYear,
        });
        toast("Data listrik berhasil disimpan. Analisis baru telah dibuat.");
      } else {
        setErrorMsg(res.error || "Gagal menyimpan data listrik.");
        toast(res.error || "Gagal menyimpan data listrik.", "error");
      }
    } catch (e: any) {
      setErrorMsg("Terjadi kesalahan koneksi.");
      toast("Terjadi kesalahan koneksi.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Input Data Listrik Usaha"
        subtitle="Masukkan data pemakaian listrik bulanan Anda. WattWise AI akan menganalisis tren, mendeteksi anomali, dan menyusun rekomendasi penghematan khusus."
      />

      {success && (
        <div className="mb-6 rounded-2xl border border-green-100 bg-brand-greenSoft p-5 text-brand-greenDark shadow-card flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-brand-green mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="font-bold">Data Berhasil Disimpan</h2>
            <p className="mt-1 text-sm leading-relaxed">
              Data listrik berhasil disimpan ke database. WattWise AI telah menghasilkan prediksi tagihan, deteksi anomali, dan rekomendasi efisiensi terbaru untuk usaha Anda. Silakan cek halaman Dashboard atau Rekomendasi.
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700 shadow-card flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <h2 className="font-bold">Gagal Menyimpan Data</h2>
            <p className="mt-1 text-sm leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="card space-y-7">
        <section>
          <h2 className="font-bold text-brand-ink">Periode Laporan</h2>
          <p className="mt-1 text-xs text-slate-500">Tentukan bulan dan tahun pemakaian listrik yang ingin dicatat.</p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label">Bulan Pemakaian *</label>
              <select {...register("month", { valueAsNumber: true })} className="select">
                {MONTHS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              {errors.month && <p className="text-red-500 text-xs mt-1">{errors.month.message}</p>}
            </div>

            <div>
              <label className="label">Tahun Pemakaian *</label>
              <input
                type="number"
                {...register("year", { valueAsNumber: true })}
                className="input"
                placeholder={`Contoh: ${currentYear}`}
              />
              {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year.message}</p>}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100 pt-6">
          <h2 className="font-bold text-brand-ink">Rincian Penggunaan & Biaya</h2>
          <p className="mt-1 text-xs text-slate-500">Gunakan angka tanpa pemisah ribuan. Contoh: 1250000.</p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label">Total Penggunaan Listrik (kWh) *</label>
              <input
                type="number"
                step="any"
                {...register("usageKwh", { valueAsNumber: true })}
                className="input"
                placeholder="Contoh: 868"
              />
              <p className="helper">Bisa dilihat di kWh meter atau riwayat token/tagihan PLN.</p>
              {errors.usageKwh && <p className="text-red-500 text-xs mt-1">{errors.usageKwh.message}</p>}
            </div>

            <div>
              <label className="label">Total Tagihan / Biaya Token (Rupiah) *</label>
              <input
                type="number"
                {...register("costIdr", { valueAsNumber: true })}
                className="input"
                placeholder="Contoh: 1250000"
              />
              <p className="helper">Nominal pembayaran bersih untuk tagihan atau pembelian token.</p>
              {errors.costIdr && <p className="text-red-500 text-xs mt-1">{errors.costIdr.message}</p>}
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end">
          <button
            type="button"
            className="btn-outline"
            onClick={() => {
              reset({
                month: currentMonth,
                year: currentYear,
              });
              setSuccess(false);
              setErrorMsg("");
            }}
          >
            Kosongkan Form
          </button>
          <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Menganalisis...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Simpan & Analisis Listrik
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}