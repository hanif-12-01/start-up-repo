import Link from "next/link";
import { Lock, ArrowRight, Sparkles } from "lucide-react";

export function FeatureGate({
  featureName,
  requiredTier,
  description,
}: {
  featureName: string;
  requiredTier: "Pro UMKM" | "Business";
  description: string;
}) {
  return (
    <div className="max-w-md mx-auto my-12 p-8 rounded-2xl border border-slate-200 bg-white text-center shadow-soft relative overflow-hidden">
      {/* Background Accent */}
      <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-emerald-500 to-teal-500" />
      
      <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-5 text-emerald-600">
        <Lock className="h-5 w-5" />
      </div>

      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-3">
        <Sparkles className="h-3 w-3" /> Fitur Premium
      </span>

      <h2 className="text-xl font-bold text-slate-800 mb-2">
        {featureName} Terkunci
      </h2>
      
      <p className="text-xs text-slate-500 leading-relaxed mb-6">
        {description} Halaman ini memerlukan langganan paket minimum <strong>{requiredTier}</strong>.
      </p>

      <div className="space-y-3">
        <Link
          href="/dashboard/harga-paket"
          className="w-full btn btn-primary text-xs py-2.5 font-bold flex items-center justify-center gap-1.5"
        >
          Lihat Pilihan Paket <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/dashboard"
          className="block text-xs text-slate-500 hover:text-slate-700 font-semibold"
        >
          Kembali ke Dashboard
        </Link>
      </div>
    </div>
  );
}
