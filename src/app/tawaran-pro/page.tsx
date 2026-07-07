"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Zap,
  Sparkles,
  ArrowRight,
  Check,
  Crown,
  TrendingUp,
  BarChart3,
  FileText,
  Shield,
  Loader2,
  X,
} from "lucide-react";
import { checkIsNewUserForTrialOffer } from "@/app/actions/auth";
import { activateProTrialAction } from "@/app/actions/subscription";

export default function TawaranProPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [activated, setActivated] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    if (status === "authenticated") {
      checkIsNewUserForTrialOffer().then((res) => {
        if (!res.isNew) {
          // Not a new user → skip directly to dashboard/onboarding
          router.replace("/onboarding");
        } else {
          setIsEligible(true);
        }
      });
    }
  }, [status, router]);

  const handleActivateTrial = async () => {
    setLoading(true);
    try {
      const res = await activateProTrialAction();
      if (res.success) {
        setActivated(true);
        setTimeout(() => {
          router.push("/onboarding");
        }, 1500);
      } else {
        // If trial activation fails, still go to onboarding
        router.push("/onboarding");
      }
    } catch {
      router.push("/onboarding");
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    router.push("/onboarding");
  };

  // Loading state
  if (status === "loading" || isEligible === null) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 text-brand-green animate-spin mx-auto" />
          <p className="text-sm text-slate-500 font-semibold">
            Mempersiapkan akun Anda...
          </p>
        </div>
      </div>
    );
  }

  // Activated success state
  if (activated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-4 max-w-md mx-auto px-4">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-2xl bg-emerald-100">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-extrabold text-brand-ink">
            Pro Trial Aktif!
          </h2>
          <p className="text-sm text-slate-500 font-semibold leading-relaxed">
            Selamat! Anda kini menikmati seluruh fitur premium WattWise AI
            secara gratis selama 30 hari. Mengalihkan ke halaman profil
            usaha...
          </p>
          <Loader2 className="h-5 w-5 text-brand-green animate-spin mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand-green text-white shadow-soft">
              <Zap className="h-6 w-6 fill-current" />
            </div>
            <span className="text-2xl font-bold tracking-tight text-brand-ink">
              WattWise <span className="text-brand-green">AI</span>
            </span>
          </Link>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 px-6 py-6 text-center relative overflow-hidden">
            {/* Decorative elements */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-2 left-8 h-20 w-20 rounded-full bg-white/30 blur-xl" />
              <div className="absolute bottom-1 right-12 h-16 w-16 rounded-full bg-white/20 blur-lg" />
            </div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-sm rounded-full px-3 py-1 text-[10px] font-extrabold text-white uppercase tracking-widest mb-3">
                <Sparkles className="h-3 w-3" />
                Penawaran Spesial Pengguna Baru
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                Coba Pro Trial
              </h1>
              <div className="mt-2 flex items-baseline justify-center gap-2">
                <span className="text-4xl font-black text-white">
                  GRATIS
                </span>
                <span className="text-lg font-bold text-white/80">
                  30 Hari
                </span>
              </div>
              <p className="mt-2 text-xs text-white/70 font-semibold">
                Tidak ada biaya. Tidak ada kartu kredit. Otomatis kembali ke Paket Gratis setelah 30 hari.
              </p>
            </div>
          </div>

          {/* Body */}
          <div className="px-6 py-6 space-y-6">
            {/* Price comparison */}
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <span className="text-xs text-slate-400 font-bold block">Harga Normal</span>
                <span className="text-lg font-extrabold text-slate-300 line-through">Rp 149.000</span>
                <span className="text-[10px] text-slate-400 block">/bulan</span>
              </div>
              <ArrowRight className="h-5 w-5 text-emerald-500" />
              <div className="text-center">
                <span className="text-xs text-emerald-600 font-bold block">Untuk Anda</span>
                <span className="text-lg font-extrabold text-emerald-600">Rp 0</span>
                <span className="text-[10px] text-emerald-500 block">/ 30 hari pertama</span>
              </div>
            </div>

            {/* Features list */}
            <div className="space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Fitur yang Anda dapatkan selama 30 hari:
              </h3>
              <ul className="space-y-2.5">
                {[
                  { icon: TrendingUp, text: "Prediksi kWh lengkap dengan Model Estimasi Adaptif (Hybrid AI Decision Support)" },
                  { icon: Shield, text: "Deteksi anomali AI otomatis & penjelasan detail" },
                  { icon: Sparkles, text: "Rekomendasi hemat energi AI yang praktis" },
                  { icon: BarChart3, text: "Hingga 3 bisnis/properti sekaligus" },
                  { icon: FileText, text: "Laporan bulanan PDF lengkap & export" },
                  { icon: Crown, text: "Histori data hingga 12 bulan" },
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <div className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-md bg-emerald-50 border border-emerald-100">
                      <item.icon className="h-3 w-3 text-emerald-600" />
                    </div>
                    <span className="text-sm text-slate-700 font-semibold leading-snug">
                      {item.text}
                    </span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Disclaimer */}
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 text-center">
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Setelah 30 hari, akun otomatis kembali ke Paket Gratis.
                Tidak ada tagihan tersembunyi. Anda dapat upgrade kapan saja.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleActivateTrial}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-200/50 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Mengaktifkan...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Aktifkan Pro Trial — Gratis 30 Hari
                  </>
                )}
              </button>

              <button
                onClick={handleSkip}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-6 py-3 text-sm font-semibold text-slate-500 transition-all"
              >
                <X className="h-3.5 w-3.5" />
                Lewati, Mulai dengan Paket Gratis
              </button>
            </div>
          </div>
        </div>

        {/* Footer disclaimer */}
        <p className="text-center text-[10px] text-slate-400 mt-6 font-semibold">
          Dengan mengaktifkan, Anda menyetujui Syarat &amp; Ketentuan WattWise AI.
          <br />
          Penawaran ini hanya berlaku satu kali untuk setiap akun baru.
        </p>
      </div>
    </div>
  );
}
