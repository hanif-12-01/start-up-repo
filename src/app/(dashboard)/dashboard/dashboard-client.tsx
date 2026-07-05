"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  BadgeDollarSign,
  ChevronRight,
  DollarSign,
  Info,
  Loader2,
  PiggyBank,
  Scale,
  TrendingUp,
  Zap,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { StatCard, StatusBadge } from "@/components/ui/common";
import { cn, formatKwh, formatRupiah } from "@/lib/utils";
import { generateAnalysisAction } from "@/app/actions/electricity";
import { useToast } from "@/components/ui/toast";

type AttentionStatus = "Efisien" | "Normal" | "Perlu Dicek" | "Boros" | "Sangat Boros";
type AttentionItem = {
  id: string;
  name: string;
  status: AttentionStatus;
  reason: string;
  practicalAdvice: string;
  estimatedMonthlySavingIdr: number | null;
};

interface DashboardClientProps {
  ringkasan: {
    tagihanBulanLalu: number;
    prediksiBulanIni: number;
    kwhBulanIni: number;
    potensiHemat: number;
    energyScore: number;
    statusPemakaian: "Aman" | "Perlu Perhatian" | "Boros" | "Belum Ada Data";
    kenaikanVsMingguLalu: number;
    hasAnomaly: boolean;
    anomalyDesc: string | null;
    businessName: string;
    hasElectricityData: boolean;
    isFirstMonthOnly: boolean;
    hasTrendComparison: boolean;
  };
  tagihanBulanan: {
    bulan: string;
    tagihan: number;
    kwh: number;
    prediksi: boolean;
  }[];
  pemakaianHarian: {
    hari: string;
    kwh: number;
    normal: number;
  }[];
  pemakaianPeralatan: {
    nama: string;
    kwh: number;
    warna: string;
  }[];
  efisiensiPeralatan: AttentionItem[];
  cashFlowAnalytics?: import("@/lib/cash-flow").CashFlowAnalytics | null;
  latestPrediction?: any | null;
}

export default function DashboardClient({
  ringkasan,
  tagihanBulanan,
  pemakaianHarian,
  pemakaianPeralatan,
  efisiensiPeralatan,
  cashFlowAnalytics = null,
  latestPrediction = null,
}: DashboardClientProps) {
  const [mounted, setMounted] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Compact Rupiah formatter untuk axis chart supaya tidak overflow.
  // Contoh: 15_000_000 → "Rp15jt", 2_500_000_000 → "Rp2,5M".
  const fmtRpShort = (v: number): string => {
    const abs = Math.abs(v);
    if (abs >= 1_000_000_000)
      return `Rp${(v / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}M`;
    if (abs >= 1_000_000)
      return `Rp${(v / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
    if (abs >= 1_000)
      return `Rp${Math.round(v / 1_000).toLocaleString("id-ID")}rb`;
    return `Rp${Math.round(v).toLocaleString("id-ID")}`;
  };

  const topPerluPerhatian = [...efisiensiPeralatan]
    .filter((item) => item.status !== "Efisien" && item.status !== "Normal")
    .sort((a, b) => statusRank[b.status] - statusRank[a.status])
    .slice(0, 3);

  useEffect(() => setMounted(true), []);

  const handleGenerateAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const res = await generateAnalysisAction();
      if (res.success) {
        toast("Analisis listrik berhasil diperbarui!", "success");
        router.refresh();
      } else {
        toast(res.error || "Gagal memperbarui analisis.", "error");
      }
    } catch (err: any) {
      toast("Terjadi kesalahan sistem saat menjalankan analisis.", "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const contributionLabel = ringkasan.hasElectricityData
    ? "Kontribusi terhadap pemakaian bulanan"
    : "Kontribusi terhadap estimasi total peralatan";

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-slate-200/40 pb-5 mb-8">
        <div className="flex-1">
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-800 md:text-3xl leading-tight font-display">
            Dashboard Pemantauan Listrik
          </h1>
          <p className="mt-1.5 max-w-3xl text-sm text-slate-400 font-medium leading-relaxed">
            Ringkasan pemakaian listrik {ringkasan.businessName}. Ringkasan berdasarkan data input manual yang tersimpan di database.
          </p>
        </div>
        <button
          onClick={handleGenerateAnalysis}
          disabled={isAnalyzing || !ringkasan.hasElectricityData}
          className="btn-primary self-start md:self-auto flex items-center gap-2 shadow-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Menganalisis...
            </>
          ) : (
            <>
              <Zap className="h-4 w-4" />
              Jalankan Analisis
            </>
          )}
        </button>
      </div>


      {/* Info banner for no electricity data */}
      {!ringkasan.hasElectricityData && (
        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5 shadow-sm backdrop-blur-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4 items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white border border-blue-100 text-blue-600 shadow-sm">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Mulai Analisis Listrik Anda</h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500 leading-relaxed">
                Masukkan data listrik bulanan pertama untuk mulai melihat analisis pemakaian.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/input"
            className="btn-primary py-2 px-4 shadow-sm text-xs font-bold shrink-0 self-start sm:self-auto"
          >
            Input Data Pertama
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Info banner for first month only */}
      {ringkasan.hasElectricityData && ringkasan.isFirstMonthOnly && (
        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5 shadow-sm backdrop-blur-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4 items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white border border-blue-100 text-blue-600 shadow-sm">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Data Pertama Tersimpan</h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500 leading-relaxed">
                Data bulan pertama tersimpan. Tambahkan data bulan berikutnya agar tren pemakaian bisa dianalisis.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/input"
            className="btn-primary py-2 px-4 shadow-sm text-xs font-bold shrink-0 self-start sm:self-auto"
          >
            Input Data Baru
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Warning Anomaly banner */}
      {ringkasan.hasElectricityData && ringkasan.hasAnomaly && (
        <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50/60 p-5 shadow-sm backdrop-blur-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4 items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white border border-rose-100 text-rose-600 shadow-sm animate-pulse-soft">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pemakaian Tidak Normal Terdeteksi</h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500 leading-relaxed">
                {ringkasan.anomalyDesc || "Terdeteksi adanya lonjakan atau ketidakwajaran pemakaian listrik."}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/anomali"
            className="btn bg-rose-600 text-white hover:bg-rose-700 py-2 px-4 shadow-sm text-xs font-bold shrink-0 self-start sm:self-auto"
          >
            Lihat Detail Anomali
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Fallback if no anomaly but general check needed (only show warning if enough data is available to compare) */}
      {ringkasan.hasElectricityData && ringkasan.hasTrendComparison && !ringkasan.hasAnomaly && ringkasan.statusPemakaian !== "Aman" && ringkasan.statusPemakaian !== "Belum Ada Data" && (
        <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm backdrop-blur-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4 items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white border border-amber-100 text-amber-600 shadow-sm">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pemakaian Perlu Perhatian</h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500 leading-relaxed">
                Peringatan: Pemakaian listrik Anda bulan ini cenderung naik dibandingkan bulan lalu. Silakan cek peralatan Anda.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/anomali"
            className="btn bg-amber-600 text-white hover:bg-amber-700 py-2 px-4 shadow-sm text-xs font-bold shrink-0 self-start sm:self-auto"
          >
            Lihat Analisis Tren
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Estimasi Tagihan Bulan Ini"
          value={ringkasan.hasElectricityData ? formatRupiah(ringkasan.prediksiBulanIni) : "-"}
          helper={ringkasan.hasElectricityData ? `Bulan lalu ${formatRupiah(ringkasan.tagihanBulanLalu)}` : "Masukkan data bulanan pertama"}
          tone="blue"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Pemakaian kWh Bulan Ini"
          value={ringkasan.hasElectricityData ? formatKwh(ringkasan.kwhBulanIni) : "-"}
          helper="Total pemakaian dari input data"
          tone="yellow"
          icon={<Zap className="h-5 w-5" />}
        />
        <StatCard
          label="Potensi Penghematan"
          value={formatRupiah(ringkasan.potensiHemat)}
          helper="Estimasi hemat jika saran dijalankan"
          tone="green"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          label="Energy Score"
          value={ringkasan.hasElectricityData ? `${ringkasan.energyScore}/100` : "-"}
          helper="Semakin tinggi semakin efisien"
          tone="slate"
          icon={<Award className="h-5 w-5" />}
        />
        <StatCard
          label="Status Pemakaian"
          value={
            ringkasan.statusPemakaian === "Belum Ada Data"
              ? "Belum Ada Data"
              : ringkasan.statusPemakaian === "Aman"
              ? "Efisien"
              : ringkasan.statusPemakaian === "Boros"
              ? "Boros"
              : "Perlu Perhatian"
          }
          helper="Status efisiensi pemakaian"
          tone={
            ringkasan.statusPemakaian === "Belum Ada Data"
              ? "slate"
              : ringkasan.statusPemakaian === "Boros"
              ? "red"
              : ringkasan.statusPemakaian === "Perlu Perhatian"
              ? "yellow"
              : "green"
          }
          icon={<AlertTriangle className="h-5 w-5" />}
          sub={
            <div className="mt-2">
              <StatusBadge status={ringkasan.statusPemakaian} />
            </div>
          }
        />
      </div>

      {/* WattWise Adaptive AI Insight Card */}
      {latestPrediction && (
        <div className="mt-8 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/50 p-6 shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
            <Zap className="h-32 w-32 text-indigo-600" />
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-indigo-100/50 pb-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
                  <Zap className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-md font-extrabold text-slate-800">
                    WattWise Adaptive AI Insight
                  </h3>
                  <p className="text-xs font-semibold text-indigo-600">
                    {latestPrediction.modelVersion || "Adaptive Model Routing v1.0"}
                  </p>
                </div>
              </div>
              <div className="self-start sm:self-auto">
                <span className={cn(
                  "inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold shadow-xs",
                  latestPrediction.confidenceLevel === "HIGH" 
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-100" 
                    : latestPrediction.confidenceLevel === "MEDIUM" 
                    ? "bg-amber-50 text-amber-700 border border-amber-100" 
                    : "bg-rose-50 text-rose-700 border border-rose-100"
                )}>
                  Akurasi: {latestPrediction.confidenceLevel || "MEDIUM"}
                </span>
              </div>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 md:grid-cols-3">
              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                  Estimasi Konsumsi Listrik
                </span>
                <p className="text-2xl font-black text-slate-800 mt-1">
                  {formatKwh(latestPrediction.predictedUsageKwh)}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className={cn(
                    "text-xs font-bold inline-flex items-center gap-0.5",
                    latestPrediction.trendDirection === "NAIK" 
                      ? "text-rose-600" 
                      : latestPrediction.trendDirection === "TURUN" 
                      ? "text-emerald-600" 
                      : "text-slate-600"
                  )}>
                    {latestPrediction.trendDirection === "NAIK" ? "▲" : latestPrediction.trendDirection === "TURUN" ? "▼" : "■"} {Math.abs(latestPrediction.trendPercent)}%
                  </span>
                  <span className="text-[10px] text-slate-400 font-semibold">
                    vs bulan terakhir
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                  Estimasi Biaya Listrik
                </span>
                <p className="text-2xl font-black text-indigo-600 mt-1">
                  {formatRupiah(latestPrediction.predictedCostIdr)}
                </p>
                <span className="text-[10px] text-slate-400 font-semibold mt-1 block">
                  Dihitung berdasarkan tarif rata-rata
                </span>
              </div>

              <div className="sm:col-span-2 md:col-span-1">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">
                  Status Perutean Model AI
                </span>
                <div className="mt-1.5">
                  {latestPrediction.method === "RULE_BASED" && (
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">Mode: Rule-Based Estimation</p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-relaxed">
                        Digunakan karena data historis masih terbatas.
                      </p>
                    </div>
                  )}
                  {(latestPrediction.method === "TABULAR_MODEL" || latestPrediction.method === "TABULAR_RIDGE" || latestPrediction.method === "TABULAR_UMKM_V1") && (
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">Mode: Tabular AI Model</p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-relaxed">
                        Digunakan karena data cukup untuk analisis fitur, tetapi belum cukup untuk LSTM.
                      </p>
                    </div>
                  )}
                  {latestPrediction.method === "LSTM_PROTOTYPE" && (
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">Mode: LSTM Sequence Model</p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-relaxed">
                        Digunakan karena tersedia minimal 6 bulan data historis.
                      </p>
                    </div>
                  )}
                  {latestPrediction.method === "HYBRID_FALLBACK" && (
                    <div>
                      <p className="text-xs font-extrabold text-slate-800">Mode: Hybrid Fallback</p>
                      <p className="text-[11px] font-semibold text-slate-500 mt-0.5 leading-relaxed">
                        Digunakan karena output model utama tidak stabil atau data mengandung anomali.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-2 bg-white/60 rounded-xl p-4 border border-indigo-100/30">
              <span className="text-[10px] uppercase tracking-wider font-extrabold text-indigo-600 block mb-1">
                Penjelasan Cerdas
              </span>
              <p className="text-xs font-medium text-slate-600 leading-relaxed">
                {latestPrediction.explanation}
              </p>
              {latestPrediction.confidenceReason && (
                <p className="text-xs font-semibold text-slate-500 mt-2 italic leading-relaxed border-t border-slate-100 pt-2">
                  Catatan AI: {latestPrediction.confidenceReason}
                </p>
              )}
            </div>

            <p className="text-[10px] font-semibold text-slate-400 mt-1 italic leading-relaxed">
              *Disclaimer: {latestPrediction.disclaimer || "Hasil ini adalah estimasi, bukan tagihan resmi PLN."}
            </p>
          </div>
        </div>
      )}

      {/* ─── Analitik Pendapatan & Listrik (Task 8) ─── */}
      <section className="mt-8">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">
              Analitik Pendapatan & Listrik
            </h2>
            <p className="text-xs font-medium text-slate-500">
              Dampak biaya listrik terhadap pendapatan usaha Anda.
            </p>
          </div>
          {cashFlowAnalytics?.hasRevenueData && (
            <Link
              href="/dashboard/pendapatan"
              className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 hover:underline"
            >
              Perbarui pendapatan
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>

        {!cashFlowAnalytics || !cashFlowAnalytics.hasRevenueData ? (
          <div className="card flex flex-col items-center justify-center border-dashed border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100 p-10 text-center">
            <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-emerald-100 text-emerald-700 shadow-sm">
              <BadgeDollarSign className="h-7 w-7" />
            </div>
            <h3 className="text-sm font-bold text-slate-800">
              Data pendapatan belum ada
            </h3>
            <p className="mt-2 max-w-md text-xs leading-relaxed text-slate-500">
              Tambahkan pendapatan bulanan untuk melihat dampak biaya listrik
              terhadap pendapatan.
            </p>
            <Link
              href="/dashboard/pendapatan"
              className="btn-primary mt-5 px-5 py-2.5 text-xs"
            >
              Input Pendapatan
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
              <StatCard
                label="Pendapatan Bulanan"
                value={
                  cashFlowAnalytics.revenueIdr !== null
                    ? formatRupiah(cashFlowAnalytics.revenueIdr)
                    : "-"
                }
                helper="Omzet bulan terakhir tersimpan"
                tone="green"
                icon={<BadgeDollarSign className="h-5 w-5" />}
              />
              <StatCard
                label="Estimasi Tagihan Listrik"
                value={
                  cashFlowAnalytics.electricityCostIdr !== null
                    ? formatRupiah(cashFlowAnalytics.electricityCostIdr)
                    : "-"
                }
                helper={
                  cashFlowAnalytics.electricityCostLabel ??
                  "Belum ada data listrik tersimpan"
                }
                tone="yellow"
                icon={<Zap className="h-5 w-5" />}
              />
              <StatCard
                label="Rasio Listrik terhadap Pendapatan"
                value={
                  cashFlowAnalytics.ratioPercent === null
                    ? "-"
                    : `${cashFlowAnalytics.ratioPercent.toFixed(1)}%`
                }
                helper={cashFlowAnalytics.ratioStatus.description}
                tone={
                  cashFlowAnalytics.ratioStatus.severity === 1
                    ? "green"
                    : cashFlowAnalytics.ratioStatus.severity === 2
                    ? "yellow"
                    : cashFlowAnalytics.ratioStatus.severity >= 3
                    ? "red"
                    : "slate"
                }
                icon={<Scale className="h-5 w-5" />}
                sub={
                  <div className="mt-2">
                    <span
                      className={cn(
                        "badge",
                        cashFlowAnalytics.ratioStatus.severity === 1 &&
                          "border-emerald-200/60 bg-emerald-50 text-emerald-700",
                        cashFlowAnalytics.ratioStatus.severity === 2 &&
                          "border-amber-200/60 bg-amber-50 text-amber-700",
                        (cashFlowAnalytics.ratioStatus.severity === 3 ||
                          cashFlowAnalytics.ratioStatus.severity === 4) &&
                          "border-rose-200/60 bg-rose-50 text-rose-700",
                        cashFlowAnalytics.ratioStatus.severity === 0 &&
                          "border-slate-200/60 bg-slate-50 text-slate-500",
                      )}
                    >
                      {cashFlowAnalytics.ratioStatus.label}
                    </span>
                  </div>
                }
              />
              <StatCard
                label="Sisa Pendapatan Setelah Listrik"
                value={
                  cashFlowAnalytics.remainingRevenueIdr !== null
                    ? formatRupiah(cashFlowAnalytics.remainingRevenueIdr)
                    : "-"
                }
                helper="Pendapatan − biaya listrik"
                tone={
                  cashFlowAnalytics.remainingRevenueIdr !== null &&
                  cashFlowAnalytics.remainingRevenueIdr < 0
                    ? "red"
                    : "blue"
                }
                icon={<PiggyBank className="h-5 w-5" />}
              />
              <StatCard
                label="Potensi Sisa Pendapatan Setelah Hemat"
                value={
                  cashFlowAnalytics.potentialRemainingRevenueIdr !== null
                    ? formatRupiah(cashFlowAnalytics.potentialRemainingRevenueIdr)
                    : "-"
                }
                helper={
                  cashFlowAnalytics.potentialRemainingRevenueIdr !== null
                    ? `Hemat bulanan: ${formatRupiah(
                        cashFlowAnalytics.potentialSavingsIdr,
                      )}`
                    : "Estimasi jika saran hemat dijalankan"
                }
                tone="green"
                icon={<DollarSign className="h-5 w-5" />}
              />
            </div>

            {cashFlowAnalytics.ratioPercent !== null && (
              <div className="mt-4 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-700">
                  <Info className="h-4 w-4" />
                </div>
                <p className="text-sm leading-relaxed text-blue-900">
                  Biaya listrik memakan{" "}
                  <strong>
                    {cashFlowAnalytics.ratioPercent.toFixed(1)}%
                  </strong>{" "}
                  dari pendapatan.
                </p>
              </div>
            )}

            {/* Progress bar — insight utama karena revenue biasanya >> listrik */}
            {cashFlowAnalytics.ratioPercent !== null && (
              <div className="card mt-4">
                <div className="mb-3 flex items-baseline justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Rasio Listrik terhadap Pendapatan
                    </p>
                    <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-800">
                      {cashFlowAnalytics.ratioPercent.toFixed(1)}%
                    </p>
                  </div>
                  <span
                    className={cn(
                      "badge shrink-0",
                      cashFlowAnalytics.ratioStatus.severity === 1 &&
                        "border-emerald-200/60 bg-emerald-50 text-emerald-700",
                      cashFlowAnalytics.ratioStatus.severity === 2 &&
                        "border-amber-200/60 bg-amber-50 text-amber-700",
                      (cashFlowAnalytics.ratioStatus.severity === 3 ||
                        cashFlowAnalytics.ratioStatus.severity === 4) &&
                        "border-rose-200/60 bg-rose-50 text-rose-700",
                      cashFlowAnalytics.ratioStatus.severity === 0 &&
                        "border-slate-200/60 bg-slate-50 text-slate-500",
                    )}
                  >
                    {cashFlowAnalytics.ratioStatus.label}
                  </span>
                </div>
                <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      cashFlowAnalytics.ratioStatus.severity === 1 &&
                        "bg-emerald-500",
                      cashFlowAnalytics.ratioStatus.severity === 2 &&
                        "bg-amber-500",
                      (cashFlowAnalytics.ratioStatus.severity === 3 ||
                        cashFlowAnalytics.ratioStatus.severity === 4) &&
                        "bg-rose-500",
                      cashFlowAnalytics.ratioStatus.severity === 0 &&
                        "bg-slate-300",
                    )}
                    style={{
                      width: `${Math.min(100, Math.max(0, cashFlowAnalytics.ratioPercent)).toFixed(1)}%`,
                    }}
                  />
                </div>
                <p className="mt-3 text-xs leading-relaxed text-slate-500">
                  {cashFlowAnalytics.ratioStatus.description}
                </p>
              </div>
            )}

            {/* Bar chart nominal + Line chart trend — dua kolom di layar besar */}
            {mounted && (
              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                {cashFlowAnalytics.revenueIdr !== null &&
                cashFlowAnalytics.electricityCostIdr !== null ? (
                  <div className="card">
                    <div className="mb-3">
                      <h3 className="text-sm font-bold text-slate-800">
                        Perbandingan Nominal (Periode Terakhir)
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Pendapatan vs tagihan listrik vs sisa pendapatan.
                      </p>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            {
                              label: "Pendapatan",
                              nominal: cashFlowAnalytics.revenueIdr,
                              fill: "#10b981",
                            },
                            {
                              label: "Tagihan Listrik",
                              nominal: cashFlowAnalytics.electricityCostIdr,
                              fill: "#eab308",
                            },
                            {
                              label: "Sisa Setelah Listrik",
                              nominal:
                                cashFlowAnalytics.remainingRevenueIdr ?? 0,
                              fill: "#3b82f6",
                            },
                          ]}
                          margin={{ top: 10, right: 10, left: -12, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            interval={0}
                            tick={{ fontSize: 10, fill: "#64748b" }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: "#94a3b8" }}
                            tickFormatter={fmtRpShort}
                          />
                          <Tooltip
                            formatter={(v: number) => [
                              formatRupiah(v),
                              "Nominal",
                            ]}
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid #e2e8f0",
                              boxShadow: "0 4px 20px -8px rgba(15,23,42,.18)",
                            }}
                          />
                          <Bar dataKey="nominal" radius={[8, 8, 0, 0]}>
                            <Cell fill="#10b981" />
                            <Cell fill="#eab308" />
                            <Cell
                              fill={
                                (cashFlowAnalytics.remainingRevenueIdr ?? 0) < 0
                                  ? "#ef4444"
                                  : "#3b82f6"
                              }
                            />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="card flex h-64 items-center justify-center border-dashed border-slate-200 bg-slate-50/40 text-xs font-medium text-slate-500">
                    Belum cukup data untuk grafik nominal.
                  </div>
                )}

                {cashFlowAnalytics.trend.length >= 2 ? (
                  <div className="card">
                    <div className="mb-3">
                      <h3 className="text-sm font-bold text-slate-800">
                        Tren Pendapatan vs Tagihan Listrik
                      </h3>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Perbandingan kronologis per bulan.
                      </p>
                    </div>
                    <div className="h-56">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={cashFlowAnalytics.trend}
                          margin={{ top: 10, right: 10, left: -12, bottom: 0 }}
                        >
                          <XAxis
                            dataKey="label"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: "#64748b" }}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fill: "#94a3b8" }}
                            tickFormatter={fmtRpShort}
                          />
                          <Tooltip
                            formatter={(v: number, name: string) => [
                              formatRupiah(v),
                              name,
                            ]}
                            contentStyle={{
                              borderRadius: 12,
                              border: "1px solid #e2e8f0",
                              boxShadow: "0 4px 20px -8px rgba(15,23,42,.18)",
                            }}
                          />
                          <Line
                            name="Pendapatan"
                            type="monotone"
                            dataKey="revenueIdr"
                            stroke="#10b981"
                            strokeWidth={3}
                            dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
                            activeDot={{ r: 5 }}
                          />
                          <Line
                            name="Tagihan Listrik"
                            type="monotone"
                            dataKey="electricityCostIdr"
                            stroke="#eab308"
                            strokeWidth={3}
                            dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
                            activeDot={{ r: 5 }}
                            connectNulls
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                ) : (
                  <div className="card flex h-64 items-center justify-center border-dashed border-slate-200 bg-slate-50/40 text-xs font-medium text-slate-500">
                    Butuh minimal 2 bulan data pendapatan untuk melihat tren.
                  </div>
                )}
              </div>
            )}

            {/* Line chart histori pemakaian kWh — pakai data existing prop */}
            {mounted && tagihanBulanan.length > 0 && (
              <div className="card mt-4">
                <div className="mb-3">
                  <h3 className="text-sm font-bold text-slate-800">
                    Histori Pemakaian kWh
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Tren energi bulanan dari data input Anda.
                  </p>
                </div>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={tagihanBulanan}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <XAxis
                        dataKey="bulan"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#64748b" }}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#94a3b8" }}
                      />
                      <Tooltip
                        formatter={(v: number) => [formatKwh(v), "Pemakaian"]}
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #e2e8f0",
                          boxShadow: "0 4px 20px -8px rgba(15,23,42,.18)",
                        }}
                      />
                      <Line
                        name="Pemakaian kWh"
                        type="monotone"
                        dataKey="kwh"
                        stroke="#8b5cf6"
                        strokeWidth={3}
                        dot={{ r: 3, strokeWidth: 2, fill: "#fff" }}
                        activeDot={{ r: 5 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            <div className="mt-3 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <div className="space-y-1.5 text-xs leading-relaxed text-slate-600">
                <p>
                  Sisa pendapatan setelah listrik belum memperhitungkan biaya
                  operasional lain seperti bahan baku, gaji, sewa, air, internet, dan biaya lainnya.
                </p>
                <p>
                  Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.
                </p>
              </div>
            </div>
          </>
        )}
      </section>

      {mounted && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Monthly usage history */}
          <section className="card lg:col-span-8">
            <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Tagihan Listrik Bulanan</h2>
                <p className="mt-0.5 text-xs text-slate-400 font-medium">Batang kuning adalah data bulan berjalan (prediksi berjalan).</p>
              </div>
            </div>
            {tagihanBulanan.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tagihanBulanan} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                    <XAxis dataKey="bulan" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }}
                      tickFormatter={(v: number) => `Rp${(v / 1_000_000).toFixed(1)}jt`}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(241, 245, 249, 0.4)" }}
                      formatter={(value: number) => [formatRupiah(value), "Tagihan"]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #f1f5f9", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}
                    />
                    <Bar dataKey="tagihan" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {tagihanBulanan.map((entry) => (
                        <Cell key={entry.bulan} fill={entry.prediksi ? "#f59e0b" : "#3b82f6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 text-xs font-semibold">
                Belum ada data bulanan. Masukkan data di menu Input Data.
              </div>
            )}
          </section>

          {/* Appliance breakdown */}
          <section className="card lg:col-span-4">
            <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Estimasi Pemakaian per Alat</h2>
                <p className="mt-0.5 text-xs text-slate-400 font-medium">Perkiraan pembagian kWh berdasarkan daya alat utama.</p>
              </div>
            </div>
            {pemakaianPeralatan.length > 0 ? (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pemakaianPeralatan} dataKey="kwh" innerRadius={55} outerRadius={78} paddingAngle={4}>
                        {pemakaianPeralatan.map((entry) => (
                          <Cell key={entry.nama} fill={entry.warna} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatKwh(value), "Pemakaian"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-2.5 max-h-40 overflow-y-auto pr-1">
                  {pemakaianPeralatan.map((item) => (
                    <div key={item.nama} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2 font-bold text-slate-600 truncate">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.warna }} />
                        <span className="truncate">{item.nama}</span>
                      </span>
                      <span className="text-slate-400 font-bold shrink-0">{formatKwh(item.kwh)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-52 flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 text-xs font-semibold">
                Belum ada data peralatan. Lengkapi profil usaha Anda.
              </div>
            )}
          </section>

          {/* Saved recommendations */}
          <section className="card lg:col-span-12">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Top 3 Rekomendasi Perlu Perhatian</h2>
                <p className="mt-0.5 text-xs text-slate-400 font-medium">Diambil dari hasil analisis tersimpan, bukan dihitung ulang saat dashboard dibuka.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500 border border-slate-200/50">Estimasi, bukan nilai resmi PLN</span>
            </div>
            {topPerluPerhatian.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {topPerluPerhatian.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 hover:bg-slate-50 hover:shadow-sm transition-all duration-300 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-800">{item.name}</h3>
                          <p className="mt-0.5 text-[11px] text-slate-400 font-semibold leading-relaxed">{contributionLabel}</p>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${statusClass(item.status)}`}>{item.status}</span>
                      </div>
                      <div className="mt-4 space-y-2 border-t border-slate-200/40 pt-3">
                        <p className="text-xs leading-relaxed text-slate-600"><strong className="text-slate-800">Analisis:</strong> {item.reason}</p>
                        <p className="text-xs leading-relaxed text-slate-600"><strong className="text-emerald-700">Saran:</strong> {item.practicalAdvice}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-200/40 text-xs font-bold text-slate-700 bg-slate-100/50 rounded-lg p-2.5 text-center">
                      Potensi hemat: <span className="text-emerald-600">{item.estimatedMonthlySavingIdr ? formatRupiah(item.estimatedMonthlySavingIdr) : "bervariasi"}/bln</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-sm text-slate-500 font-semibold text-center">
                Belum ada peralatan yang perlu perhatian khusus. Klasifikasi ini estimasi WattWise AI, bukan nilai resmi PLN.
              </div>
            )}
          </section>

          {/* Daily usage line chart */}
          <section className="card lg:col-span-12">
            <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Pemakaian Listrik Harian Bulan Ini (kWh)</h2>
                <p className="mt-0.5 text-xs text-slate-400 font-medium">Garis biru putus-putus menunjukkan pemakaian normal acuan efisiensi.</p>
              </div>
            </div>
            {pemakaianHarian.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pemakaianHarian} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                    <XAxis dataKey="hari" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatKwh(value),
                        name === "kwh" ? "Pemakaian aktual" : "Acuan normal",
                      ]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #f1f5f9", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}
                    />
                    <Line type="monotone" dataKey="normal" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                    <Line type="monotone" dataKey="kwh" stroke="#10b981" strokeWidth={3.5} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 text-xs font-semibold px-4 text-center">
                Belum ada data pemakaian harian. Masukkan data atau gunakan data bulanan untuk melihat ringkasan.
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modern Gradient CTA section */}
      <div className="mt-6 flex flex-col gap-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-6 shadow-md shadow-emerald-900/10 sm:flex-row sm:items-center sm:justify-between text-white border-0">
        <div>
          <h2 className="font-extrabold text-base tracking-wide text-white">Ingin mengurangi biaya listrik bulan ini?</h2>
          <p className="mt-1 text-xs text-emerald-100 font-medium">Lihat saran hemat yang dibuat khusus berdasarkan jenis usaha Anda.</p>
        </div>
        <Link href="/dashboard/rekomendasi" className="btn bg-white text-emerald-700 hover:bg-emerald-50 hover:scale-[1.02] shadow-sm py-2 px-5 text-xs font-bold shrink-0 self-start sm:self-auto border-0">
          Lihat Rekomendasi
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Disclaimers */}
      <div className="mt-8 flex gap-3.5 rounded-2xl border border-slate-200/50 bg-slate-100/40 p-5 shadow-xs">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        <div className="text-[11px] leading-relaxed text-slate-400 font-semibold">
          <p className="text-slate-500 font-bold">Pernyataan Penting (Disclaimer):</p>
          <ul className="list-disc pl-4 mt-1.5 space-y-1">
            <li>Estimasi tagihan dan analisis pemakaian listrik adalah proyeksi sistem WattWise AI.</li>
            <li>Hasil ini bukan merupakan lembar tagihan resmi PLN. Tagihan resmi diterbitkan oleh PLN di akhir periode.</li>
            <li>Layanan WattWise AI MVP 1 belum terhubung ke sistem pembacaan meteran otomatis (AMI) atau penagihan resmi PLN.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const statusRank: Record<AttentionStatus, number> = {
  Efisien: 0,
  Normal: 1,
  "Perlu Dicek": 2,
  Boros: 3,
  "Sangat Boros": 4,
};

function statusClass(status: AttentionStatus): string {
  if (status === "Sangat Boros") return "bg-rose-50 border-rose-200 text-rose-700";
  if (status === "Boros") return "bg-orange-50 border-orange-200 text-orange-700";
  if (status === "Perlu Dicek") return "bg-amber-50 border-amber-200 text-amber-700";
  if (status === "Efisien") return "bg-emerald-50 border-emerald-200 text-emerald-700";
  return "bg-blue-50 border-blue-200 text-blue-700";
}
