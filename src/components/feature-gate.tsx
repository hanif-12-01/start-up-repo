import Link from "next/link";
import { Lock, ArrowRight, Sparkles, Crown } from "lucide-react";

export function FeatureGate({
  featureName,
  requiredTier,
  description,
}: {
  featureName: string;
  requiredTier: "Pro UMKM" | "Business" | "Enterprise";
  description: string;
}) {
  const isEnterprise = requiredTier === "Enterprise";

  return (
    <div className="max-w-md mx-auto my-12 p-8 rounded-2xl border border-slate-200 bg-white text-center shadow-soft relative overflow-hidden">
      {/* Background Accent */}
      <div 
        className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${
          isEnterprise ? "from-amber-500 to-orange-500" : "from-emerald-500 to-teal-500"
        }`} 
      />
      
      <div 
        className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-5 border ${
          isEnterprise 
            ? "bg-amber-50 border-amber-100 text-amber-600" 
            : "bg-emerald-50 border-emerald-100 text-emerald-600"
        }`}
      >
        {isEnterprise ? <Crown className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
      </div>

      <span 
        className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mb-3 ${
          isEnterprise 
            ? "bg-amber-50 text-amber-800 border border-amber-100" 
            : "bg-emerald-50 text-emerald-800"
        }`}
      >
        <Sparkles className="h-3 w-3" /> {isEnterprise ? "Fitur Enterprise" : "Fitur Premium"}
      </span>

      <h2 className="text-xl font-bold text-slate-800 mb-2">
        {featureName} Terkunci
      </h2>
      
      <p className="text-xs text-slate-500 leading-relaxed mb-6">
        {isEnterprise 
          ? "Fitur ini tersedia untuk Paket Enterprise. Hubungi tim WattWise untuk kebutuhan custom multi-lokasi."
          : `${description} Halaman ini memerlukan langganan paket minimum ${requiredTier}.`
        }
      </p>

      <div className="space-y-3">
        {isEnterprise ? (
          <Link
            href="/dashboard/paket-demo#enterprise"
            className="w-full btn bg-amber-600 hover:bg-amber-700 text-white text-xs py-2.5 font-bold flex items-center justify-center gap-1.5 rounded-xl shadow-md transition-all"
          >
            Hubungi Tim WattWise <ArrowRight className="h-4 w-4" />
          </Link>
        ) : (
          <Link
            href="/dashboard/harga-paket"
            className="w-full btn btn-primary text-xs py-2.5 font-bold flex items-center justify-center gap-1.5"
          >
            Lihat Pilihan Paket <ArrowRight className="h-4 w-4" />
          </Link>
        )}
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
