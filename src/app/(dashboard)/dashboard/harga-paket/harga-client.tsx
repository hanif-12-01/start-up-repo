"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, AlertCircle, Sparkles, Lock, FileText, Activity, Layers, PhoneCall } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { changeSubscriptionPlanAction } from "@/actions/billing";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceIdr: number;
  billingCycle: string;
  features: string[];
}

export default function HargaClient({
  plans,
  currentPlanCode,
}: {
  plans: Plan[];
  currentPlanCode: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loadingCode, setLoadingCode] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    if (val === 0) return "Rp 0";
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);
  };

  const handleSelectPlan = async (code: string) => {
    if (code === currentPlanCode) {
      toast("Anda sudah menggunakan paket ini.", "info");
      return;
    }

    setLoadingCode(code);
    try {
      const res = await changeSubscriptionPlanAction(code);
      if (res.ok) {
        const planName = code === "FREE" ? "Gratis" : code === "PRO_UMKM" ? "Pro UMKM" : "Business";
        toast(`Berhasil beralih ke paket ${planName}!`, "success");
        router.refresh();
      } else {
        toast(res.error || "Gagal mengubah paket.", "error");
      }
    } catch (e: any) {
      toast("Terjadi kesalahan koneksi.", "error");
    } finally {
      setLoadingCode(null);
    }
  };

  return (
    <div className="space-y-12">
      {/* Current Plan Indicator / Info Panel */}
      {currentPlanCode === "FREE" && (
        <div className="card border-emerald-500/20 bg-emerald-50/10 p-6 md:p-8 space-y-6 shadow-soft">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-100/50 pb-6">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-brand-green p-3 text-white shadow-lg shadow-brand-green/20">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-bold text-brand-green uppercase tracking-wider">Status Paket Saat Ini</p>
                  <span className="badge bg-emerald-100 border-emerald-200 text-emerald-800 text-[10px] font-bold py-0.5 px-2.5 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    Aktif
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-800">Gratis</h2>
                <p className="text-sm text-slate-500">
                  Paket ini cocok untuk mencoba fitur-fitur dasar WattWise AI dan simulasi sistem kami.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-start md:items-end justify-center">
              <span className="text-xs text-slate-400 font-semibold uppercase">Biaya Langganan</span>
              <span className="text-3xl font-extrabold text-slate-800">Rp0<span className="text-sm font-semibold text-slate-400">/bulan</span></span>
            </div>
          </div>

          <div className="grid gap-8 grid-cols-1 lg:grid-cols-2 pt-2">
            {/* Left Column: Available Features */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-green"></span> Fitur yang Tersedia (Gratis)
              </h3>
              <ul className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-1">
                {[
                  "1 usaha",
                  "dashboard dasar",
                  "input data listrik manual",
                  "rekomendasi dasar",
                  "estimasi pemakaian dasar"
                ].map((fitur, index) => (
                  <li key={index} className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                    <span>{fitur}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Column: Locked Premium Features (Soft Lock Cards) */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-300"></span> Fitur Premium Terkunci
              </h3>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                {[
                  "Appliance Efficiency Classifier lanjutan",
                  "Prediksi tagihan lanjutan",
                  "Deteksi anomali",
                  "Simulasi penghematan",
                  "Laporan PDF",
                  "Multi-cabang lanjutan"
                ].map((fitur, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 text-slate-400 select-none transition-all duration-200 hover:bg-slate-50"
                  >
                    <span className="text-[11px] font-semibold leading-tight text-slate-500 pr-2">{fitur}</span>
                    <Lock className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upgrade CTAs & Simulation Note */}
          <div className="border-t border-emerald-100/50 pt-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-3 bg-amber-50/60 border border-amber-100 rounded-xl p-4 max-w-xl">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-amber-800">Simulasi Tagihan & Pembayaran</p>
                <p className="text-[11px] leading-relaxed text-amber-700">
                  Ini adalah halaman simulasi paket. Tidak ada pembayaran riil atau transaksi uang sungguhan yang diproses. Anda bebas mencoba alur upgrade paket secara gratis untuk melihat fitur premium aktif.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
              <button
                onClick={() => handleSelectPlan("PRO_UMKM")}
                disabled={loadingCode !== null}
                className="btn btn-primary text-xs font-bold py-3 px-6 shadow-md shadow-brand-green/20"
              >
                {loadingCode === "PRO_UMKM" ? (
                  <span className="inline-block animate-pulse">Memproses...</span>
                ) : (
                  "Upgrade ke Pro UMKM"
                )}
              </button>
              <button
                onClick={() => handleSelectPlan("BUSINESS")}
                disabled={loadingCode !== null}
                className="btn btn-secondary text-xs font-bold py-3 px-6"
              >
                {loadingCode === "BUSINESS" ? (
                  <span className="inline-block animate-pulse">Memproses...</span>
                ) : (
                  "Upgrade ke Business"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentPlanCode === "PRO_UMKM" && (
        <div className="card border-emerald-500/20 bg-emerald-50/10 p-6 md:p-8 space-y-6 shadow-soft">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-emerald-100/50 pb-6">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-brand-green p-3 text-white shadow-lg shadow-brand-green/20">
                <Sparkles className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-bold text-brand-green uppercase tracking-wider">Status Paket Saat Ini</p>
                  <span className="badge bg-emerald-100 border-emerald-200 text-emerald-800 text-[10px] font-bold py-0.5 px-2.5 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                    Aktif
                  </span>
                </div>
                <h2 className="text-2xl font-black text-slate-800">Pro UMKM</h2>
                <p className="text-sm font-semibold text-brand-green">
                  Pembayaran demo berhasil. Paket Pro UMKM Anda sekarang aktif.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col items-start md:items-end justify-center">
              <span className="text-xs text-slate-400 font-semibold uppercase">Biaya Langganan</span>
              <span className="text-3xl font-extrabold text-slate-800">Rp150.000<span className="text-sm font-semibold text-slate-400">/bulan</span></span>
            </div>
          </div>

          <div className="grid gap-8 grid-cols-1 lg:grid-cols-2 pt-2">
            {/* Left Column: Available Features */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand-green"></span> Fitur Aktif (Pro UMKM)
              </h3>
              <ul className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                {[
                  "semua fitur Gratis",
                  "multi-usaha sederhana",
                  "appliance efficiency classifier",
                  "prediksi tagihan lanjutan",
                  "deteksi anomali",
                  "rekomendasi hemat berbasis peralatan",
                  "simulasi penghematan",
                  "laporan PDF",
                  "export CSV"
                ].map((fitur, index) => (
                  <li key={index} className="flex items-start gap-2.5 text-xs text-slate-600 font-medium">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                    <span>{fitur}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right Column: Locked Business Features */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-300"></span> Fitur Premium Terkunci (Butuh Business)
              </h3>
              <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                {[
                  "multi-cabang lanjutan",
                  "ringkasan performa antar usaha",
                  "laporan manajemen",
                  "prioritas support"
                ].map((fitur, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50/50 text-slate-400 select-none transition-all duration-200 hover:bg-slate-50"
                  >
                    <span className="text-[11px] font-semibold leading-tight text-slate-500 pr-2">{fitur}</span>
                    <Lock className="h-3.5 w-3.5 text-slate-300 shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Upgrade CTAs & Simulation Note */}
          <div className="border-t border-emerald-100/50 pt-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-start gap-3 bg-amber-50/60 border border-amber-100 rounded-xl p-4 max-w-xl">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              <div className="space-y-0.5">
                <p className="text-xs font-bold text-amber-800">Simulasi Tagihan & Pembayaran</p>
                <p className="text-[11px] leading-relaxed text-amber-700">
                  Ini adalah simulasi paket. Pembayaran dilakukan secara virtual untuk mencoba aktivasi fitur premium secara instan.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
              <button
                onClick={() => handleSelectPlan("BUSINESS")}
                disabled={loadingCode !== null}
                className="btn btn-primary text-xs font-bold py-3 px-6 shadow-md shadow-brand-green/20"
              >
                {loadingCode === "BUSINESS" ? (
                  <span className="inline-block animate-pulse">Memproses...</span>
                ) : (
                  "Upgrade ke Business"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentPlanCode !== "FREE" && currentPlanCode !== "PRO_UMKM" && (
        /* Regular Banner for other paid plans (e.g. Business) */
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-brand-green p-2 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paket Aktif Anda</p>
              <div className="flex items-center gap-2">
                <p className="text-base font-bold text-slate-800">
                  {plans.find((p) => p.code === currentPlanCode)?.name || currentPlanCode}
                </p>
                <span className="badge bg-emerald-100 border-emerald-200 text-emerald-800 text-[10px] font-bold py-0.5 px-2">
                  Aktif
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={() => router.push("/dashboard/billing")}
            className="btn btn-outline text-xs self-start sm:self-auto py-1.5 px-3 bg-white"
          >
            Lihat Riwayat Tagihan <ChevronRight className="ml-1 h-3 w-3" />
          </button>
        </div>
      )}

      {/* Grid of plan cards */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.code === currentPlanCode;
          const isPopular = plan.code === "PRO_UMKM";
          const isFree = plan.code === "FREE";

          return (
            <div
              key={plan.id}
              className={cn(
                "card relative flex flex-col justify-between transition-all duration-300 hover:shadow-md border p-6",
                isPopular ? "border-emerald-500 ring-2 ring-emerald-500/10 lg:scale-105" : "border-slate-200/80",
                isCurrent && "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.02),transparent_50%)]",
                isPopular && "shadow-sm"
              )}
            >
              {isPopular && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-emerald-500 px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-sm">
                  Paling Populer
                </div>
              )}

              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-slate-800">{plan.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 min-h-[32px]">{plan.description}</p>
                  </div>
                  {isCurrent && (
                    <span className="rounded-full bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wide">
                      Aktif
                    </span>
                  )}
                </div>

                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold tracking-tight text-slate-800">
                    {formatCurrency(plan.priceIdr)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    /{plan.billingCycle === "monthly" ? "bulan" : plan.billingCycle}
                  </span>
                </div>

                <div className="my-6 border-t border-slate-100" />

                <ul className="space-y-3.5">
                  {plan.features.map((fitur) => (
                    <li key={fitur} className="flex items-start gap-2.5 text-xs text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span>{fitur}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8">
                <button
                  onClick={() => handleSelectPlan(plan.code)}
                  disabled={isCurrent || loadingCode !== null}
                  className={cn(
                    "w-full btn text-xs font-bold py-2.5",
                    isCurrent
                      ? "bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed"
                      : isPopular
                      ? "btn-primary hover:bg-emerald-600"
                      : "btn-outline border-slate-300 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {loadingCode === plan.code ? (
                    <span className="inline-block animate-pulse">Memproses...</span>
                  ) : isCurrent ? (
                    "Paket Aktif Anda"
                  ) : isFree ? (
                    "Kembali ke Paket Gratis"
                  ) : (
                    `Langganan ${plan.name}`
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison & disclaimer footnote */}
      <div className="rounded-lg border border-slate-100 bg-slate-50/50 p-4 text-xs text-slate-500 flex items-start gap-2.5">
        <AlertCircle className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold text-slate-600">Catatan Simulasi Transaksi:</p>
          <p className="mt-0.5 leading-relaxed">
            Pembayaran untuk Pro UMKM dan Business disimulasikan menggunakan Virtual Account. Setelah checkout, Anda akan dialihkan ke halaman detail invoice di mana Anda dapat memicu simulasi bayar sukses untuk mencoba fitur-fitur berbayar secara langsung.
          </p>
        </div>
      </div>

      {/* Feature Unlock Preview Section */}
      <div className="border-t border-slate-200/60 pt-10 space-y-6">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-emerald-500" /> Fitur yang Terbuka di Paket Ini
        </h2>
        
        <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
          {/* FREE Features */}
          <div className={cn(
            "rounded-xl border p-5 space-y-4 transition-all bg-white",
            currentPlanCode === "FREE" ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-xs" : "border-slate-100 opacity-75"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Gratis (FREE)</span>
              {currentPlanCode === "FREE" && (
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Aktif</span>
              )}
            </div>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Dashboard dasar
              </li>
              <li className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Input data listrik manual
              </li>
              <li className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Rekomendasi dasar
              </li>
            </ul>
          </div>

          {/* PRO_UMKM Features */}
          <div className={cn(
            "rounded-xl border p-5 space-y-4 transition-all bg-white",
            currentPlanCode === "PRO_UMKM" ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-xs" : "border-slate-100 opacity-75"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Pro UMKM (Premium)</span>
              {currentPlanCode === "PRO_UMKM" && (
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Aktif</span>
              )}
            </div>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Appliance efficiency classifier
              </li>
              <li className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Prediksi tagihan lanjutan
              </li>
              <li className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Deteksi anomali &amp; hemat
              </li>
              <li className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Laporan PDF bulanan
              </li>
            </ul>
          </div>

          {/* BUSINESS Features */}
          <div className={cn(
            "rounded-xl border p-5 space-y-4 transition-all bg-white",
            currentPlanCode === "BUSINESS" ? "border-emerald-500 ring-2 ring-emerald-500/10 shadow-xs" : "border-slate-100 opacity-75"
          )}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Business</span>
              {currentPlanCode === "BUSINESS" && (
                <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[9px] font-bold text-emerald-700">Aktif</span>
              )}
            </div>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Multi-cabang lanjutan
              </li>
              <li className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Ringkasan performa antar usaha
              </li>
              <li className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Laporan bulanan manajemen
              </li>
              <li className="flex items-center gap-2 font-medium">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" /> Prioritas support 24/7
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Dashboard State Simulation Section */}
      <div className="border-t border-slate-200/60 pt-10 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Simulasi Tampilan Setelah Upgrade</h2>
            <p className="text-xs text-slate-500 mt-1">Pratinjau fitur premium berdasarkan status paket aktif Anda saat ini.</p>
          </div>
          <span className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-1 text-[10px] font-bold text-slate-600 uppercase tracking-wide self-start sm:self-auto">
            Mode Demo
          </span>
        </div>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {/* Card 1: Analisis Peralatan Lanjutan */}
          {renderSimCard(
            "Analisis Peralatan Lanjutan",
            "Mendeteksi dan mengklasifikasikan efisiensi pemakaian alat listrik elektronik Anda.",
            <Activity className="h-5 w-5" />,
            currentPlanCode !== "FREE"
          )}

          {/* Card 2: Laporan PDF */}
          {renderSimCard(
            "Laporan PDF Bulanan",
            "Unduh ringkasan performa dan rekomendasi hemat listrik resmi dalam format PDF.",
            <FileText className="h-5 w-5" />,
            currentPlanCode !== "FREE"
          )}

          {/* Card 3: Simulasi Penghematan */}
          {renderSimCard(
            "Simulasi Penghematan",
            "Gunakan kalkulator simulasi hemat energi untuk skenario peralatan baru.",
            <Sparkles className="h-5 w-5" />,
            currentPlanCode !== "FREE"
          )}

          {/* Card 4: Ringkasan Multi-Cabang */}
          {renderSimCard(
            "Ringkasan Multi-Cabang",
            "Konsolidasikan data listrik dari berbagai lokasi usaha Anda secara realtime.",
            <Layers className="h-5 w-5" />,
            currentPlanCode !== "FREE"
          )}

          {/* Card 5: Laporan Manajemen */}
          {renderSimCard(
            "Laporan Manajemen Eksekutif",
            "Mendapatkan business insights dan rekomendasi cost reduction untuk operasional skala besar.",
            <FileText className="h-5 w-5" />,
            currentPlanCode !== "FREE"
          )}

          {/* Card 6: Prioritas Support */}
          {renderSimCard(
            "Prioritas Support 24/7",
            "Jalur bantuan khusus dari tim ahli WattWise AI untuk kelancaran integrasi sistem.",
            <PhoneCall className="h-5 w-5" />,
            currentPlanCode !== "FREE"
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to render preview cards
function renderSimCard(title: string, desc: string, icon: React.ReactNode, isUnlocked: boolean) {
  return (
    <div className={cn(
      "rounded-xl border p-4.5 flex gap-3.5 transition-all bg-white relative overflow-hidden",
      isUnlocked 
        ? "border-slate-200/80 shadow-xs text-slate-800" 
        : "border-slate-100 bg-slate-50/50 text-slate-400 select-none"
    )}>
      <div className={cn(
        "rounded-lg p-2.5 shrink-0 h-10 w-10 flex items-center justify-center",
        isUnlocked ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-300"
      )}>
        {icon}
      </div>
      <div className="space-y-1 pr-6">
        <h4 className={cn("text-xs font-bold", isUnlocked ? "text-slate-800" : "text-slate-500")}>
          {title}
        </h4>
        <p className="text-[11px] leading-relaxed text-slate-400">{desc}</p>
      </div>

      <div className="absolute top-3 right-3">
        {isUnlocked ? (
          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        ) : (
          <Lock className="h-4 w-4 text-slate-300" />
        )}
      </div>
    </div>
  );
}
