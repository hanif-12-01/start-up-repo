"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  DollarSign,
  HelpCircle,
  Info,
  TrendingDown,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui/common";
import { formatKwh, formatRupiah } from "@/lib/utils";

interface PrediksiClientProps {
  prediksi: {
    hasPrediction: boolean;
    businessId: string;
    latestMonth?: number;
    latestYear?: number;
    prediksiTagihan: number;
    tagihanBulanLalu: number;
    kenaikanPersen: number;
    risikoLevel: string;
    alasanUtama: string;
    penjelasan: string;
    modelVersion?: string;
    method?: string;
    confidenceLevel?: string;
    confidenceReason?: string;
  };
  proyeksiBulanIni: {
    hari: string;
    aktual: number | null;
    proyeksi: number | null;
  }[];
}

export default function PrediksiClient({ prediksi, proyeksiBulanIni }: PrediksiClientProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const { getOrGeneratePredictionAction } = await import("@/app/actions/prediction");
      const res = await getOrGeneratePredictionAction(
        prediksi.businessId,
        prediksi.latestMonth,
        prediksi.latestYear
      );
      if (!res.success) {
        setError(res.error || "Gagal membuat prediksi.");
      }
    } catch {
      // Server action selalu return {success,error} tanpa throw. Jika tetap
      // sampai ke catch (mis. dynamic import fail / RPC framework error),
      // JANGAN tampilkan err.message mentah — bisa berupa teks internal Next.js.
      setError("Terjadi kesalahan saat memproses prediksi.");
    } finally {
      setLoading(false);
    }
  };

  if (!prediksi.hasPrediction) {
    return (
      <div>
        <PageHeader
          title="Prediksi Tagihan Listrik"
          subtitle="Perkiraan biaya listrik bulan ini agar Anda bisa merencanakan kas usaha lebih baik."
        />
        
        <div className="card flex flex-col items-center justify-center p-12 text-center border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 rounded-3xl">
          <div className="h-16 w-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 shadow-md hover:scale-105 transition-all">
            <DollarSign className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Dapatkan Prediksi WattWise AI</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-md leading-relaxed">
            Gunakan model AI cerdas kami untuk memproyeksikan penggunaan dan biaya listrik Anda berdasarkan data historis usaha.
          </p>
          
          {error && (
            <p className="mt-4 text-xs font-semibold text-rose-500 bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
              {error}
            </p>
          )}

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="mt-6 flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold px-6 py-3 shadow-lg hover:shadow-blue-500/25 transition-all cursor-pointer"
          >
            {loading ? "Memproses Prediksi..." : "Generate Prediksi Sekarang"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-2">
        <div className="flex-1">
          <PageHeader
            title="Prediksi Tagihan Listrik"
            subtitle="Perkiraan biaya listrik bulan ini agar Anda bisa merencanakan kas usaha lebih baik."
          />
        </div>
        <div className="sm:-mt-6 mb-6">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 disabled:bg-blue-50 text-blue-700 font-semibold px-4 py-2 text-xs shadow-sm transition-all cursor-pointer"
          >
            {loading ? "Memproses..." : "Perbarui Prediksi"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Prediksi Tagihan Bulan Ini"
          value={formatRupiah(prediksi.prediksiTagihan)}
          helper="Estimasi biaya hingga akhir bulan"
          tone="blue"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          label="Tagihan Bulan Lalu"
          value={formatRupiah(prediksi.tagihanBulanLalu)}
          helper="Untuk perbandingan"
          tone="slate"
          icon={<TrendingDown className="h-5 w-5" />}
        />
        <StatCard
          label="Perbandingan Bulan Lalu"
          value={prediksi.kenaikanPersen >= 0 ? `+${prediksi.kenaikanPersen}%` : `${prediksi.kenaikanPersen}%`}
          helper="Kenaikan estimasi bulan ini"
          tone={prediksi.kenaikanPersen > 0 ? "red" : "green"}
          icon={<ArrowUpRight className="h-5 w-5" />}
        />
        <StatCard
          label="Tingkat Risiko"
          value={prediksi.risikoLevel}
          helper="Risiko pemborosan listrik"
          tone={prediksi.risikoLevel === "HIGH" || prediksi.risikoLevel === "Tinggi" ? "red" : prediksi.risikoLevel === "MEDIUM" || prediksi.risikoLevel === "Sedang" ? "yellow" : "green"}
          icon={<AlertTriangle className="h-5 w-5" />}
          badge={prediksi.risikoLevel}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <section className="card flex flex-col justify-between lg:col-span-4">
          <div>
            <h2 className="flex items-center gap-2 font-bold">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Penyebab Utama Kenaikan
            </h2>
            <p className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-600">
              “{prediksi.alasanUtama}”
            </p>
            <div className="mt-4">
              <StatusBadge status={prediksi.risikoLevel} />
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Info className="h-4 w-4" />
              Penjelasan Sederhana
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{prediksi.penjelasan}</p>
            {prediksi.modelVersion && (
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 space-y-1">
                <div><span className="font-semibold text-slate-600">Model Version:</span> {prediksi.modelVersion}</div>
                <div><span className="font-semibold text-slate-600">Metode Prediksi:</span> {prediksi.method}</div>
                <div><span className="font-semibold text-slate-600">Kepercayaan (Confidence):</span> {prediksi.confidenceLevel} ({prediksi.confidenceReason})</div>
              </div>
            )}
          </div>
        </section>

        <section className="card lg:col-span-8">
          <div className="mb-5">
            <h2 className="font-bold">Proyeksi Pemakaian Listrik</h2>
            <p className="mt-1 text-xs text-slate-500">
              Garis hijau adalah pemakaian aktual harian. Garis kuning putus-putus adalah prediksi proyeksi ke depan.
            </p>
          </div>

          {mounted && proyeksiBulanIni.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={proyeksiBulanIni} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="hari"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickFormatter={(v: string) => `Tgl ${v}`}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickFormatter={(v: number) => `${v} kWh`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatKwh(value),
                      name === "Aktual" ? "Pemakaian Aktual" : "Prediksi/Proyeksi",
                    ]}
                    contentStyle={{
                      borderRadius: 14,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 20px -8px rgba(15,23,42,.18)",
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    name="Aktual"
                    type="monotone"
                    dataKey="aktual"
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 7 }}
                    connectNulls
                  />
                  <Line
                    name="Proyeksi"
                    type="monotone"
                    dataKey="proyeksi"
                    stroke="#eab308"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 7 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
              <p className="text-slate-400 text-xs">Belum ada data pemakaian harian untuk proyeksi grafik.</p>
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-green-100 bg-brand-greenSoft p-5">
        <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-greenDark" />
        <div>
          <h4 className="text-sm font-bold text-brand-greenDark">Saran Singkat WattWise AI</h4>
          <p className="mt-1 text-xs leading-relaxed text-green-800">
            Anda dapat menurunkan proyeksi biaya ini sekitar <strong>10-15%</strong> jika membagi
            waktu penggunaan alat berdaya besar di luar jam operasional sore.
          </p>
        </div>
      </div>

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        <div>
          <h4 className="text-sm font-bold text-slate-700">Disclaimer / Penafian Penting</h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Prediksi tagihan dan proyeksi ini dibuat untuk tujuan estimasi perencanaan dan didasarkan pada data input pengguna. Hasil ini <strong>bukan merupakan tagihan resmi PLN</strong>. Layanan WattWise AI tidak berafiliasi atau terhubung secara resmi dengan PT PLN (Persero).
          </p>
        </div>
      </div>
    </div>
  );
}
