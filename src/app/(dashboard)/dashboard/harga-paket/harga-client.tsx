"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, AlertCircle, Sparkles, Lock, FileText, Activity, Layers, PhoneCall } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { checkoutPlanAction } from "@/actions/billing";
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
      toast("Anda sudah berlangganan paket ini.", "info");
      return;
    }

    if (code === "FREE") {
      toast("Untuk kembali ke paket Gratis, harap hubungi Customer Support kami.", "info");
      return;
    }

    setLoadingCode(code);
    try {
      const res = await checkoutPlanAction(code);
      if (res.ok) {
        toast("Checkout berhasil! Silakan selesaikan pembayaran Anda.", "success");
        router.push(`/dashboard/billing/${res.paymentId}`);
      } else {
        toast(res.error || "Gagal melakukan checkout.", "error");
      }
    } catch (e: any) {
      toast("Terjadi kesalahan koneksi.", "error");
    } finally {
      setLoadingCode(null);
    }
  };

  return (
    <div className="space-y-12">
      {/* Current Plan Indicator Banner */}
      <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-500 p-2 text-white">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Paket Aktif Anda</p>
            <p className="text-base font-bold text-slate-800">
              {plans.find((p) => p.code === currentPlanCode)?.name || currentPlanCode}
            </p>
          </div>
        </div>
        <button
          onClick={() => router.push("/dashboard/billing")}
          className="btn btn-outline text-xs self-start sm:self-auto py-1.5 px-3 bg-white"
        >
          Lihat Riwayat Tagihan <ChevronRight className="ml-1 h-3 w-3" />
        </button>
      </div>

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
                    "Hubungi Support"
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
            currentPlanCode === "BUSINESS"
          )}

          {/* Card 5: Laporan Manajemen */}
          {renderSimCard(
            "Laporan Manajemen Eksekutif",
            "Mendapatkan business insights dan rekomendasi cost reduction untuk operasional skala besar.",
            <FileText className="h-5 w-5" />,
            currentPlanCode === "BUSINESS"
          )}

          {/* Card 6: Prioritas Support */}
          {renderSimCard(
            "Prioritas Support 24/7",
            "Jalur bantuan khusus dari tim ahli WattWise AI untuk kelancaran integrasi sistem.",
            <PhoneCall className="h-5 w-5" />,
            currentPlanCode === "BUSINESS"
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
