"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { AlertCircle, CheckCircle2, Loader2, Save } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { createElectricityEntry } from "@/app/actions/electricity";

const inputSchema = z.object({
  month: z.number().min(1, "Bulan wajib diisi").max(12, "Bulan tidak valid"),
  year: z
    .number()
    .min(2020, "Tahun minimal 2020")
    .max(new Date().getFullYear() + 1, "Tahun tidak valid"),
  usageKwh: z.number().positive("Jumlah pemakaian kWh harus lebih dari 0"),
  costIdr: z.number().min(1, "Nominal tagihan harus lebih dari Rp0"),
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

export function ElectricityForm() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [warnings, setWarnings] = useState<string[]>([]);
  const [pendingData, setPendingData] = useState<InputFormData | null>(null);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InputFormData>({
    resolver: zodResolver(inputSchema),
    defaultValues: {
      month: currentMonth === 1 ? 12 : currentMonth - 1,
      year: currentMonth === 1 ? currentYear - 1 : currentYear,
    },
  });

  const saveData = async (data: InputFormData, confirmWarnings = false) => {
    setLoading(true);
    setSuccess(false);
    setErrorMsg("");

    if (!confirmWarnings) {
      setWarnings([]);
      setPendingData(null);
    }

    try {
      const res = await createElectricityEntry({ ...data, confirmWarnings });

      if (res.success) {
        setSuccess(true);
        setWarnings([]);
        setPendingData(null);
        reset({
          month: currentMonth,
          year: currentYear,
        });
        toast("Data listrik berhasil disimpan. Analisis baru telah dibuat.");
        return;
      }

      if (res.requiresConfirmation) {
        setWarnings(res.warnings);
        setPendingData(data);
        toast("Ada peringatan kualitas data. Periksa sebelum menyimpan.", "info");
        return;
      }

      setErrorMsg(res.error || "Gagal menyimpan data listrik.");
      toast(res.error || "Gagal menyimpan data listrik.", "error");
    } catch {
      setErrorMsg("Terjadi kesalahan koneksi.");
      toast("Terjadi kesalahan koneksi.", "error");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (data: InputFormData) => saveData(data);

  const clearWarnings = () => {
    setWarnings([]);
    setPendingData(null);
  };

  return (
    <>
      {success && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-green-100 bg-brand-greenSoft p-5 text-brand-greenDark shadow-card">
          <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-brand-green" />
          <div>
            <h2 className="font-bold">Data Berhasil Disimpan</h2>
            <p className="mt-1 text-sm leading-relaxed">
              Data listrik berhasil disimpan ke database. WattWise AI telah
              menghasilkan prediksi tagihan, deteksi anomali, dan rekomendasi
              efisiensi terbaru untuk usaha Anda. Silakan cek halaman Dashboard
              atau Rekomendasi.
            </p>
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 flex items-start gap-3 rounded-2xl border border-red-100 bg-red-50 p-5 text-red-700 shadow-card">
          <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            <h2 className="font-bold">Gagal Menyimpan Data</h2>
            <p className="mt-1 text-sm leading-relaxed">{errorMsg}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} onChange={clearWarnings} className="card space-y-7">
        <section>
          <h2 className="font-bold text-brand-ink">Periode Laporan</h2>
          <p className="mt-1 text-xs text-slate-500">
            Tentukan bulan dan tahun pemakaian listrik yang ingin dicatat.
          </p>

          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label">Bulan Pemakaian *</label>
              <select {...register("month", { valueAsNumber: true })} className="select">
                {MONTHS.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              {errors.month && (
                <p className="mt-1 text-xs text-red-500">{errors.month.message}</p>
              )}
            </div>

            <div>
              <label className="label">Tahun Pemakaian *</label>
              <input
                type="number"
                {...register("year", { valueAsNumber: true })}
                className="input"
                placeholder={`Contoh: ${currentYear}`}
              />
              {errors.year && (
                <p className="mt-1 text-xs text-red-500">{errors.year.message}</p>
              )}
            </div>
          </div>
        </section>

        <section className="border-t border-slate-100 pt-6">
          <h2 className="font-bold text-brand-ink">Rincian Penggunaan & Biaya</h2>
          <p className="mt-1 text-xs text-slate-500">
            Gunakan angka tanpa pemisah ribuan. Contoh: 1250000.
          </p>

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
              <p className="helper">
                Bisa dilihat di kWh meter atau riwayat token/tagihan PLN.
              </p>
              {errors.usageKwh && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.usageKwh.message}
                </p>
              )}
            </div>

            <div>
              <label className="label">Total Tagihan / Biaya Token (Rupiah) *</label>
              <input
                type="number"
                {...register("costIdr", { valueAsNumber: true })}
                className="input"
                placeholder="Contoh: 1250000"
              />
              <p className="helper">
                Nominal pembayaran bersih untuk tagihan atau pembelian token.
              </p>
              {errors.costIdr && (
                <p className="mt-1 text-xs text-red-500">
                  {errors.costIdr.message}
                </p>
              )}
            </div>
          </div>
        </section>

        {warnings.length > 0 && (
          <section className="border-t border-slate-100 pt-6">
            <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
              <div className="flex-1">
                <h2 className="font-bold">Periksa Kembali Data</h2>
                <p className="mt-1 text-sm leading-relaxed">
                  Data terlihat tidak biasa. Jika angka sudah benar, Anda tetap bisa
                  menyimpannya.
                </p>
                <ul className="mt-3 list-disc space-y-1 pl-5 text-sm leading-relaxed">
                  {warnings.map((warning) => (
                    <li key={warning}>{warning}</li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <button
                    type="button"
                    disabled={loading || !pendingData}
                    className="btn-primary flex items-center justify-center gap-2"
                    onClick={() => pendingData && saveData(pendingData, true)}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Menyimpan...
                      </>
                    ) : (
                      "Tetap Simpan Data"
                    )}
                  </button>
                  <button type="button" className="btn-outline" onClick={clearWarnings}>
                    Ubah Data
                  </button>
                </div>
              </div>
            </div>
          </section>
        )}

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
              clearWarnings();
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
    </>
  );
}