"use client";

import Link from "next/link";
import { Lock, Sparkles, ArrowRight } from "lucide-react";

interface UpgradeCtaProps {
  title?: string;
  description?: string;
  requiredTier?: string;
  href?: string;
  buttonText?: string;
}

export function UpgradeCta({
  title = "Fitur Premium Terkunci",
  description = "Aktifkan Pro Trial 30 hari untuk mencoba fitur ini tanpa biaya.",
  requiredTier = "Pro",
  href = "/dashboard/paket-demo",
  buttonText = "Coba Pro Trial 30 Hari"
}: UpgradeCtaProps) {
  return (
    <div className="max-w-md mx-auto my-8 p-6 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/50 via-white to-sky-50/30 text-center shadow-soft relative overflow-hidden">
      {/* Top gradient border accent */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-teal-500" />
      
      <div className="mx-auto w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100/50 flex items-center justify-center mb-4 text-indigo-600 shadow-2xs hover:scale-105 transition-all">
        <Lock className="h-5 w-5" />
      </div>

      <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 border border-indigo-100/30 px-2.5 py-0.5 text-[9px] font-bold text-indigo-700 uppercase tracking-wider mb-3">
        <Sparkles className="h-3 w-3 animate-pulse" /> Fitur Premium
      </span>

      <h3 className="text-base font-extrabold text-slate-800 tracking-tight mb-2">
        {title}
      </h3>
      
      <p className="text-xs text-slate-500 leading-relaxed mb-5 max-w-xs mx-auto">
        {description} Halaman ini memerlukan langganan paket minimum <strong>{requiredTier}</strong>.
      </p>

      <div className="space-y-2.5">
        <Link
          href={href}
          className="w-full btn bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-2.5 font-bold flex items-center justify-center gap-1.5 shadow-md shadow-indigo-100/30 hover:shadow-indigo-200/50 transition-all rounded-xl"
        >
          {buttonText} <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/dashboard"
          className="block text-[11px] text-slate-400 hover:text-slate-600 font-bold transition-colors"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
