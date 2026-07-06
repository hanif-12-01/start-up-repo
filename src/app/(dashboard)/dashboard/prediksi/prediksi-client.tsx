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
  Zap,
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
import { cn, formatKwh, formatRupiah } from "@/lib/utils";
import { UpgradeCta } from "@/components/subscription/UpgradeCta";

interface PrediksiClientProps {
  prediksi: {
    hasPrediction: boolean;
    businessId: string;
    latestMonth?: number;
    latestYear?: number;
    prediksiTagihan: number;
    predictedUsageKwh: number;
    tagihanBulanLalu: number;
    kenaikanPersen: number;
    risikoLevel: string;
    alasanUtama: string;
    penjelasan: string;
    explanation: string;
    modelVersion?: string;
    method?: string;
    confidenceLevel?: string;
    confidenceReason?: string;
    isFreePlan?: boolean;
    
    // AI Factors
    latestUsageKwh: number;
    previousUsageKwh: number;
    avg3: number;
    avg6: number | null;
    trend1: number;
    trend3: number;
    businessType: string;
    avgTariff: number;
    historyMonths: number;
  };
  proyeksiBulanIni: {
    hari: string;
    aktual: number | null;
    proyeksi: number | null;
  }[];
}

export default function PrediksiClient({ prediksi, proyeksiBulanIni }: PrediksiClientProps) {
  const formatMethod = (m?: string) => {
    if (m === "LSTM_PROTOTYPE") return "LSTM Sequence Model";
    if (m === "RULE_BASED") return "Rule-Based Estimation";
    if (m === "HYBRID_FALLBACK") return "Hybrid Fallback";
    if (m === "TABULAR_MODEL" || m === "TABULAR_RIDGE" || m === "TABULAR_UMKM_V1") return "Tabular AI Model";
    return m || "-";
  };

  const getModelInfo = (m?: string) => {
    if (m === "LSTM_PROTOTYPE") {
      return "Model menggunakan 6 bulan histori pemakaian listrik untuk memprediksi pemakaian bulan berikutnya.";
    }
    if (m === "RULE_BASED") {
      return "Prediksi menggunakan pendekatan rule-based karena data historis belum cukup untuk LSTM.";
    }
    if (m === "HYBRID_FALLBACK") {
      return "Sistem mencoba LSTM, tetapi menggunakan fallback karena data atau output model tidak memenuhi batas keamanan.";
    }
    return null;
  };
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
          title="Prediksi Pemakaian & Estimasi Tagihan Listrik"
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
            title="Prediksi Pemakaian & Estimasi Tagihan Listrik"
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

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          label="Prediksi Pemakaian Listrik"
          value={formatKwh(prediksi.predictedUsageKwh)}
          helper="Proyeksi pemakaian kWh bulan depan"
          tone="blue"
          icon={<Zap className="h-5 w-5" />}
        />
        <StatCard
          label="Estimasi Tagihan Listrik"
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
                <div><span className="font-semibold text-slate-600">Metode Prediksi:</span> {formatMethod(prediksi.method)}</div>
                <div><span className="font-semibold text-slate-600">Kepercayaan (Confidence):</span> {prediksi.confidenceLevel === "HIGH" ? "Tinggi" : prediksi.confidenceLevel === "MEDIUM" ? "Sedang" : "Rendah"} ({prediksi.confidenceReason})</div>
                {getModelInfo(prediksi.method) && (
                  <div className="mt-2 pt-2 border-t border-slate-200 text-slate-600 font-medium">
                    {getModelInfo(prediksi.method)}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="card lg:col-span-8 relative">
          <div className="mb-5">
            <h2 className="font-bold">Proyeksi Pemakaian Listrik</h2>
            <p className="mt-1 text-xs text-slate-500">
              Garis hijau adalah pemakaian aktual harian. Garis kuning putus-putus adalah prediksi proyeksi ke depan.
            </p>
          </div>

          {prediksi.isFreePlan ? (
            <div className="relative h-80 flex items-center justify-center">
              <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10 rounded-2xl">
                <UpgradeCta 
                  title="Grafik Proyeksi Terkunci"
                  description="Grafik proyeksi harian dinamis dan model AI mendalam hanya tersedia pada paket Pro."
                  href="/dashboard/paket-demo"
                  buttonText="Mulai Uji Coba Pro"
                />
              </div>
              <div className="filter blur-xs opacity-40 select-none pointer-events-none h-full w-full">
                {mounted && proyeksiBulanIni.length > 0 && (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={proyeksiBulanIni} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="hari" />
                      <YAxis />
                      <Line type="monotone" dataKey="aktual" stroke="#16a34a" strokeWidth={3} connectNulls />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          ) : (
            mounted && proyeksiBulanIni.length > 0 ? (
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
            )
          )}
        </section>
      </div>

      {/* ─── Penjelasan & Faktor AI Section ─── */}
      {prediksi.isFreePlan ? (
        <div className="mt-6 p-8 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/10 via-white to-sky-50/10 text-center relative overflow-hidden">
          <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10">
            <UpgradeCta 
              title="Faktor Analisis AI Terkunci"
              description="Analisis mendalam routing model AI (LSTM/GB), tren bulanan lengkap, dan rata-rata 6 bulan hanya tersedia pada paket Pro."
              href="/dashboard/paket-demo"
              buttonText="Mulai Pro Trial"
            />
          </div>
          <div className="grid gap-6 md:grid-cols-2 opacity-30 select-none pointer-events-none filter blur-xs">
            <div className="card p-6">Panel Estimasi AI Terpilih</div>
            <div className="card p-6">Faktor yang dibaca AI (Riwayat, Tren)</div>
          </div>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <section className="card bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/30 border border-indigo-100 p-6 rounded-2xl shadow-xs">
            <h3 className="text-md font-extrabold text-slate-800 flex items-center gap-2 mb-4">
              <Zap className="h-5 w-5 text-indigo-600 animate-pulse" />
              Mengapa AI memilih model ini?
            </h3>
            <div className="space-y-4">
              <div className="bg-white/80 border border-indigo-100/50 rounded-xl p-4">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-600 block mb-1">
                  Model Pilihan
                </span>
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  {prediksi.modelVersion || "unknown"} ({formatMethod(prediksi.method)})
                </p>
                {getModelInfo(prediksi.method) && (
                  <p className="text-xs text-slate-500 mt-0.5 leading-relaxed font-semibold">
                    {getModelInfo(prediksi.method)}
                  </p>
                )}
              </div>
              
              <div className="bg-white/80 border border-indigo-100/50 rounded-xl p-4">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-600 block mb-1">
                  Alasan Routing & Analisis
                </span>
                <p className="text-xs font-semibold leading-relaxed text-slate-600">
                  {prediksi.explanation || prediksi.alasanUtama}
                </p>
                {prediksi.confidenceReason && (
                  <p className="text-xs font-semibold text-slate-500 mt-2 italic leading-relaxed border-t border-slate-100 pt-2">
                    Catatan Keandalan: {prediksi.confidenceReason}
                  </p>
                )}
              </div>
            </div>
          </section>
  
          <section className="card bg-slate-50/50 border border-slate-200 p-6 rounded-2xl shadow-xs">
            <h3 className="text-md font-extrabold text-slate-800 flex items-center gap-2 mb-4">
              <Info className="h-5 w-5 text-slate-500" />
              Faktor yang dibaca AI
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="bg-white border border-slate-200/50 rounded-xl p-3.5 shadow-2xs">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-0.5">
                  Pemakaian Bulan Terakhir
                </span>
                <p className="text-lg font-black text-slate-800">{formatKwh(prediksi.latestUsageKwh)}</p>
              </div>
  
              <div className="bg-white border border-slate-200/50 rounded-xl p-3.5 shadow-2xs">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-0.5">
                  Pemakaian Bulan Sebelumnya
                </span>
                <p className="text-lg font-black text-slate-800">{formatKwh(prediksi.previousUsageKwh)}</p>
              </div>
  
              <div className="bg-white border border-slate-200/50 rounded-xl p-3.5 shadow-2xs">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-0.5">
                  Rata-rata 3 Bulan
                </span>
                <p className="text-lg font-black text-slate-800">{formatKwh(prediksi.avg3)}</p>
              </div>
  
              <div className="bg-white border border-slate-200/50 rounded-xl p-3.5 shadow-2xs">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-0.5">
                  Rata-rata 6 Bulan
                </span>
                <p className="text-lg font-black text-slate-800">
                  {prediksi.avg6 !== null ? formatKwh(prediksi.avg6) : "Belum cukup data"}
                </p>
              </div>
  
              <div className="bg-white border border-slate-200/50 rounded-xl p-3.5 shadow-2xs">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-0.5">
                  Tren 1 Bulan
                </span>
                <p className={cn(
                  "text-lg font-black",
                  prediksi.trend1 > 0 ? "text-rose-600" : prediksi.trend1 < 0 ? "text-emerald-600" : "text-slate-800"
                )}>
                  {prediksi.trend1 >= 0 ? "+" : ""}{(prediksi.trend1 * 100).toFixed(1)}%
                </p>
              </div>
  
              <div className="bg-white border border-slate-200/50 rounded-xl p-3.5 shadow-2xs">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-0.5">
                  Tren 3 Bulan
                </span>
                <p className={cn(
                  "text-lg font-black",
                  prediksi.trend3 > 0 ? "text-rose-600" : prediksi.trend3 < 0 ? "text-emerald-600" : "text-slate-800"
                )}>
                  {prediksi.trend3 >= 0 ? "+" : ""}{(prediksi.trend3 * 100).toFixed(1)}%
                </p>
              </div>
  
              <div className="bg-white border border-slate-200/50 rounded-xl p-3.5 shadow-2xs">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-0.5">
                  Jenis Usaha
                </span>
                <p className="text-sm font-black text-slate-800 mt-1">{prediksi.businessType}</p>
              </div>
  
              <div className="bg-white border border-slate-200/50 rounded-xl p-3.5 shadow-2xs">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 block mb-0.5">
                  Estimasi Tarif Listrik
                </span>
                <p className="text-sm font-black text-indigo-600 mt-1">{formatRupiah(prediksi.avgTariff)} / kWh</p>
              </div>
            </div>
          </section>
        </div>
      )}

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
            Estimasi tagihan listrik dan proyeksi ini dibuat untuk tujuan estimasi perencanaan dan didasarkan pada data input pengguna. Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN. Layanan WattWise AI tidak berafiliasi atau terhubung secara resmi dengan PT PLN (Persero).
          </p>
        </div>
      </div>
    </div>
  );
}
