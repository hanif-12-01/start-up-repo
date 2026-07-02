"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, ChevronRight, AlertCircle, Sparkles } from "lucide-react";
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
      <div className="grid gap-6 md:grid-cols-3">
        {plans.map((plan) => {
          const isCurrent = plan.code === currentPlanCode;
          const isPopular = plan.code === "PRO_UMKM";
          const isFree = plan.code === "FREE";

          return (
            <div
              key={plan.id}
              className={cn(
                "card relative flex flex-col justify-between transition-all duration-300 hover:shadow-md border",
                isPopular ? "border-emerald-500 ring-2 ring-emerald-500/10 scale-105 md:scale-100 lg:scale-105" : "border-slate-200/80",
                isCurrent && "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.02),transparent_50%)]"
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
    </div>
  );
}
