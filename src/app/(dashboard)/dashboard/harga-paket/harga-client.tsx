"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  Building2,
  CheckCircle2,
  ChevronRight,
  Crown,
  Download,
  FileText,
  Headphones,
  Layers,
  Lock,
  MessageSquare,
  PhoneCall,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { changeSubscriptionPlanAction } from "@/actions/billing";
import { cn } from "@/lib/utils";
import { AdSlot } from "@/components/ads/ad-slot";


interface Plan {
  id: string;
  code: string;
  name: string;
  description: string | null;
  priceIdr: number;
  billingCycle: string;
  features: string[];
}

/* ─── Config paket statis ──────────────────────────────────── */
interface PlanConfig {
  code: string;
  icon: typeof Zap;
  gradient: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  tagline: string;
  highlight?: string;
  maxBiz: string;
}

const PLAN_CONFIG: Record<string, PlanConfig> = {
  FREE: {
    code: "FREE",
    icon: Zap,
    gradient: "from-slate-400 to-slate-600",
    accentBg: "bg-slate-50",
    accentBorder: "border-slate-200",
    accentText: "text-slate-700",
    tagline: "Mulai coba tanpa biaya",
    maxBiz: "1 bisnis",
  },
  PRO_UMKM: {
    code: "PRO_UMKM",
    icon: TrendingUp,
    gradient: "from-brand-green to-emerald-600",
    accentBg: "bg-emerald-50",
    accentBorder: "border-emerald-200",
    accentText: "text-emerald-700",
    tagline: "Analisis lengkap untuk UMKM serius",
    highlight: "Paling Populer",
    maxBiz: "3 bisnis",
  },
  BUSINESS: {
    code: "BUSINESS",
    icon: Building2,
    gradient: "from-blue-500 to-indigo-600",
    accentBg: "bg-blue-50",
    accentBorder: "border-blue-200",
    accentText: "text-blue-700",
    tagline: "Kelola multi-cabang dengan satu dashboard",
    maxBiz: "50 bisnis",
  },
  ENTERPRISE: {
    code: "ENTERPRISE",
    icon: Crown,
    gradient: "from-amber-500 to-orange-600",
    accentBg: "bg-amber-50",
    accentBorder: "border-amber-200",
    accentText: "text-amber-700",
    tagline: "Solusi khusus skala besar & integrasi IoT",
    maxBiz: "Unlimited",
  },
};

export default function HargaClient({
  plans,
  currentPlanCode,
  isTrialEligible = false,
}: {
  plans: Plan[];
  currentPlanCode: string;
  isTrialEligible?: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loadingCode, setLoadingCode] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    if (val === 0) return "Rp0";
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
    if (code === "ENTERPRISE") {
      toast("Hubungi tim sales untuk paket Enterprise.", "info");
      return;
    }

    setLoadingCode(code);
    try {
      const res = await changeSubscriptionPlanAction(code);
      if (res.ok) {
        const planName = code === "FREE" ? "Gratis" : code === "PRO_UMKM" ? "Pro" : code === "BUSINESS" ? "Business" : "Enterprise";
        toast(`Berhasil beralih ke paket ${planName}!`, "success");
        router.refresh();
      } else {
        toast(res.error || "Gagal mengubah paket.", "error");
      }
    } catch {
      toast("Terjadi kesalahan koneksi.", "error");
    } finally {
      setLoadingCode(null);
    }
  };

  // Ensure plans are in order: FREE, PRO, BIZ, ENTERPRISE
  const orderedCodes = ["FREE", "PRO_UMKM", "BUSINESS", "ENTERPRISE"];
  const sortedPlans = orderedCodes
    .map((code) => plans.find((p) => p.code === code))
    .filter(Boolean) as Plan[];

  return (
    <div className="space-y-12">
      {/* ─── Active Plan Banner ──────────────────────────────── */}
      <ActivePlanBanner
        plans={plans}
        currentPlanCode={currentPlanCode}
        onGoToBilling={() => router.push("/dashboard/billing")}
      />

      {/* ─── Plan Cards Grid ────────────────────────────────── */}
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-4">
        {sortedPlans.map((plan) => {
          const config = PLAN_CONFIG[plan.code] || PLAN_CONFIG.FREE;
          const isCurrent = plan.code === currentPlanCode;
          const isPopular = plan.code === "PRO_UMKM";
          const isEnterprise = plan.code === "ENTERPRISE";
          const Icon = config.icon;

          return (
            <div
              key={plan.id}
              className="group relative flex flex-col"
            >
              {/* Glow */}
              {isPopular && (
                <div className="absolute -inset-0.5 rounded-[1.35rem] bg-gradient-to-br from-emerald-400 to-teal-500 opacity-[0.12] blur-sm transition-opacity duration-500 group-hover:opacity-[0.22]" />
              )}

              <div
                className={cn(
                  "card relative flex flex-1 flex-col gap-5 overflow-hidden transition-all duration-300",
                  isPopular && "border-emerald-500 ring-2 ring-emerald-500/10 shadow-sm",
                  isCurrent && "bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.03),transparent_50%)]"
                )}
              >
                {/* Popular ribbon */}
                {isPopular && (
                  <div className="absolute -top-px left-1/2 -translate-x-1/2 z-10">
                    <div className="rounded-b-xl bg-gradient-to-r from-brand-green to-emerald-600 px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-white shadow-sm shadow-emerald-200/50">
                      <Sparkles className="inline h-3 w-3 mr-1 -mt-0.5" />
                      Paling Populer
                    </div>
                  </div>
                )}

                {/* Header */}
                <div className={cn("pt-1", isPopular && "pt-5")}>
                  <div className="flex items-center gap-3">
                    <div
                      className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${config.gradient} text-white shadow-lg`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-extrabold text-slate-800">{plan.name}</h3>
                        {isCurrent && (
                          <span className="badge bg-emerald-50 border-emerald-200 text-emerald-700 text-[9px] py-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block mr-0.5" />
                            Aktif
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-brand-muted mt-0.5">{plan.description}</p>
                    </div>
                  </div>
                </div>

                {/* Price */}
                <div className="border-t border-slate-100 pt-4">
                  {isEnterprise ? (
                    <div>
                      <span className="text-2xl font-extrabold tracking-tight text-slate-800">
                        Custom
                      </span>
                      <p className="text-[11px] text-brand-muted mt-1">Hubungi tim sales kami</p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-2xl font-extrabold tracking-tight text-slate-800">
                          {formatCurrency(plan.priceIdr)}
                        </span>
                        <span className="text-xs font-semibold text-slate-400">/bulan</span>
                      </div>
                      {/* Show "Gratis 30 hari" badge for Pro plan when user has never used a trial */}
                      {plan.code === "PRO_UMKM" && isTrialEligible && currentPlanCode === "FREE" && (
                        <div className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 px-2.5 py-1">
                          <Sparkles className="h-3 w-3 text-indigo-600" />
                          <span className="text-[10px] font-extrabold text-indigo-700 uppercase tracking-wider">
                            Gratis 30 Hari Uji Coba
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Max business badge */}
                <div
                  className={`inline-flex items-center gap-1.5 self-start rounded-lg px-2.5 py-1.5 ${config.accentBg} ${config.accentBorder} border`}
                >
                  <Building2 className={`h-3 w-3 ${config.accentText}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${config.accentText}`}>
                    {config.maxBiz}
                  </span>
                </div>

                {/* Features */}
                <ul className="space-y-2.5 flex-1">
                  {plan.features.map((fitur, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-slate-600">
                      <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span className="font-medium leading-snug">{fitur}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA Button */}
                <div className="mt-auto pt-2">
                  <button
                    onClick={() => handleSelectPlan(plan.code)}
                    disabled={isCurrent || loadingCode !== null}
                    className={cn(
                      "w-full btn text-xs font-bold py-2.5",
                      isCurrent
                        ? "bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed"
                        : isPopular
                        ? "btn-primary shadow-md shadow-brand-green/20"
                        : isEnterprise
                        ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white hover:from-amber-600 hover:to-orange-700 btn"
                        : "btn-outline border-slate-300 text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    {loadingCode === plan.code ? (
                      <span className="inline-block animate-pulse">Memproses...</span>
                    ) : isCurrent ? (
                      "Paket Aktif Anda"
                    ) : isEnterprise ? (
                      <>
                        Hubungi Sales <PhoneCall className="ml-1 h-3 w-3" />
                      </>
                    ) : plan.code === "FREE" ? (
                      "Kembali ke Gratis"
                    ) : (
                      <>
                        Langganan {plan.name} <ArrowRight className="ml-1 h-3 w-3" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Simulation Disclaimer ───────────────────────────── */}
      <div className="card flex items-start gap-3 border-amber-100 bg-amber-50/30">
        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-600">
          <AlertCircle className="h-4 w-4" />
        </div>
        <div className="text-sm leading-relaxed">
          <p className="font-bold text-amber-800 text-xs">Simulasi Tagihan & Pembayaran</p>
          <p className="text-[11px] text-amber-700 mt-0.5">
            Ini adalah halaman simulasi paket. Tidak ada pembayaran riil atau transaksi uang sungguhan yang diproses.
            Anda bebas mencoba alur upgrade paket secara gratis untuk melihat fitur-fitur premium aktif.
            Pembayaran untuk Pro dan Business disimulasikan menggunakan Virtual Account.
          </p>
        </div>
      </div>

      {/* ─── Feature Comparison Table ────────────────────────── */}
      <FeatureComparisonTable currentPlanCode={currentPlanCode} />

      {/* ─── Feature Unlock Preview ──────────────────────────── */}
      <FeatureUnlockPreview currentPlanCode={currentPlanCode} />
    </div>
  );
}

/* ─── COMPONENT: Active Plan Banner ─────────────────────────── */
function ActivePlanBanner({
  plans,
  currentPlanCode,
  onGoToBilling,
}: {
  plans: Plan[];
  currentPlanCode: string;
  onGoToBilling: () => void;
}) {
  const config = PLAN_CONFIG[currentPlanCode] || PLAN_CONFIG.FREE;
  const currentPlan = plans.find((p) => p.code === currentPlanCode);
  const Icon = config.icon;

  if (!currentPlan) return null;

  return (
    <div className="card border-emerald-100/50 bg-gradient-to-br from-white to-emerald-50/30 p-6 shadow-soft">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${config.gradient} text-white shadow-lg`}
          >
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-black text-brand-green uppercase tracking-widest">
                Paket Aktif
              </p>
              <span className="badge bg-emerald-50 border-emerald-200 text-emerald-700 text-[9px] py-0.5 px-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block mr-1" />
                Aktif
              </span>
            </div>
            <h2 className="text-xl font-extrabold text-slate-800 mt-0.5">{currentPlan.name}</h2>
            <p className="text-xs text-brand-muted">{config.tagline}</p>
          </div>
        </div>
        <div className="flex flex-col items-start sm:items-end gap-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Biaya Langganan
          </span>
          <span className="text-2xl font-extrabold text-slate-800">
            {currentPlan.priceIdr === 0 ? "Rp0" : `Rp${currentPlan.priceIdr.toLocaleString("id-ID")}`}
            <span className="text-sm font-semibold text-slate-400">
              /{currentPlan.billingCycle === "monthly" ? "bulan" : "custom"}
            </span>
          </span>
          <button
            onClick={onGoToBilling}
            className="btn btn-ghost text-[10px] py-1 px-2 mt-1"
          >
            Lihat Riwayat Tagihan <ChevronRight className="ml-0.5 h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── COMPONENT: Feature Comparison Table ────────────────────── */
function FeatureComparisonTable({ currentPlanCode }: { currentPlanCode: string }) {
  const features = [
    { name: "Batas bisnis/properti", free: "1", pro: "3", biz: "50", ent: "Unlimited" },
    { name: "Input listrik manual", free: true, pro: true, biz: true, ent: true },
    { name: "Input pendapatan bulanan", free: true, pro: true, biz: true, ent: true },
    { name: "Prediksi kWh dasar", free: true, pro: true, biz: true, ent: true },
    { name: "Estimasi tagihan dasar", free: true, pro: true, biz: true, ent: true },
    { name: "Rasio listrik terhadap pendapatan", free: true, pro: true, biz: true, ent: true },
    { name: "Rekomendasi AI", free: "Terbatas", pro: "Detail", biz: "Detail", ent: "Detail" },
    { name: "Histori data", free: "1–3 bulan", pro: "12 bulan", biz: "12 bulan", ent: "Unlimited" },
    { name: "Semua fitur analitik", free: false, pro: true, biz: true, ent: true },
    { name: "Anomaly detection", free: false, pro: true, biz: true, ent: true },
    { name: "Laporan PDF", free: false, pro: true, biz: true, ent: true },
    { name: "Potensi penghematan rupiah", free: false, pro: true, biz: true, ent: true },
    { name: "Reminder input data", free: false, pro: true, biz: true, ent: true },
    { name: "Simulasi IoT/demo", free: false, pro: true, biz: true, ent: true },
    { name: "Dashboard agregat", free: false, pro: false, biz: true, ent: true },
    { name: "Laporan per lokasi", free: false, pro: false, biz: true, ent: true },
    { name: "Multi-user/admin", free: false, pro: false, biz: true, ent: true },
    { name: "Export massal", free: false, pro: false, biz: true, ent: true },
    { name: "Komparasi antar lokasi", free: false, pro: false, biz: true, ent: true },
    { name: "Prioritas support", free: false, pro: false, biz: true, ent: true },
    { name: "Onboarding khusus", free: false, pro: false, biz: false, ent: true },
    { name: "Integrasi/IoT lanjutan", free: false, pro: false, biz: false, ent: true },
    { name: "Support khusus", free: false, pro: false, biz: false, ent: true },
  ];

  const renderCell = (val: boolean | string) => {
    if (val === true) return <CheckCircle2 className="h-4 w-4 text-emerald-500 mx-auto" />;
    if (val === false) return <Lock className="h-3.5 w-3.5 text-slate-200 mx-auto" />;
    return <span className="text-[11px] font-bold text-slate-600">{val}</span>;
  };

  const planHeaders = [
    { code: "FREE", name: "Gratis", color: "text-slate-600" },
    { code: "PRO_UMKM", name: "Pro", color: "text-emerald-700" },
    { code: "BUSINESS", name: "Business", color: "text-blue-700" },
    { code: "ENTERPRISE", name: "Enterprise", color: "text-amber-700" },
  ];

  return (
    <div className="card space-y-5 overflow-hidden">
      <div className="flex items-center gap-2.5">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-green to-emerald-600 text-white shadow-lg shadow-emerald-200/40">
          <BarChart3 className="h-4.5 w-4.5" />
        </div>
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">Perbandingan Fitur</h2>
          <p className="text-xs text-brand-muted">Lihat fitur lengkap di setiap tier paket</p>
        </div>
      </div>

      <div className="overflow-x-auto -mx-6 px-6">
        <table className="w-full text-left min-w-[640px]">
          <thead>
            <tr className="border-b border-slate-100">
              <th className="py-3 pr-4 text-[11px] font-bold uppercase tracking-wider text-slate-400 w-[40%]">
                Fitur
              </th>
              {planHeaders.map((h) => (
                <th
                  key={h.code}
                  className={cn(
                    "py-3 px-2 text-center text-[11px] font-extrabold uppercase tracking-wider w-[15%]",
                    h.color,
                    currentPlanCode === h.code && "bg-emerald-50/50 rounded-t-lg"
                  )}
                >
                  {h.name}
                  {currentPlanCode === h.code && (
                    <span className="block text-[8px] text-emerald-600 font-bold mt-0.5">● AKTIF</span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((f, i) => (
              <tr
                key={f.name}
                className={cn(
                  "border-b border-slate-50 transition-colors hover:bg-slate-50/50",
                  i % 2 === 0 && "bg-slate-50/20"
                )}
              >
                <td className="py-2.5 pr-4 text-xs font-semibold text-slate-700">{f.name}</td>
                <td className={cn("py-2.5 px-2 text-center", currentPlanCode === "FREE" && "bg-emerald-50/30")}>
                  {renderCell(f.free)}
                </td>
                <td className={cn("py-2.5 px-2 text-center", currentPlanCode === "PRO_UMKM" && "bg-emerald-50/30")}>
                  {renderCell(f.pro)}
                </td>
                <td className={cn("py-2.5 px-2 text-center", currentPlanCode === "BUSINESS" && "bg-emerald-50/30")}>
                  {renderCell(f.biz)}
                </td>
                <td className={cn("py-2.5 px-2 text-center", currentPlanCode === "ENTERPRISE" && "bg-emerald-50/30")}>
                  {renderCell(f.ent)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── COMPONENT: Feature Unlock Preview ──────────────────────── */
function FeatureUnlockPreview({ currentPlanCode }: { currentPlanCode: string }) {
  const isPro = currentPlanCode === "PRO_UMKM" || currentPlanCode === "BUSINESS" || currentPlanCode === "ENTERPRISE";
  const isBiz = currentPlanCode === "BUSINESS" || currentPlanCode === "ENTERPRISE";
  const isEnt = currentPlanCode === "ENTERPRISE";

  const previewCards = [
    {
      title: "Anomaly Detection",
      desc: "Mendeteksi pola pemakaian listrik abnormal secara otomatis.",
      icon: <Shield className="h-5 w-5" />,
      unlocked: isPro,
      tier: "Pro",
    },
    {
      title: "Laporan PDF",
      desc: "Unduh ringkasan performa bulanan dalam format PDF profesional.",
      icon: <FileText className="h-5 w-5" />,
      unlocked: isPro,
      tier: "Pro",
    },
    {
      title: "Potensi Penghematan",
      desc: "Simulasi potensi penghematan biaya listrik berdasarkan rekomendasi AI.",
      icon: <TrendingUp className="h-5 w-5" />,
      unlocked: isPro,
      tier: "Pro",
    },
    {
      title: "Reminder Input Data",
      desc: "Notifikasi pengingat untuk input data listrik dan pendapatan bulanan.",
      icon: <Bell className="h-5 w-5" />,
      unlocked: isPro,
      tier: "Pro",
    },
    {
      title: "Simulasi IoT/Demo",
      desc: "Coba simulasi integrasi smart meter dan IoT monitoring.",
      icon: <Wifi className="h-5 w-5" />,
      unlocked: isPro,
      tier: "Pro",
    },
    {
      title: "Dashboard Agregat",
      desc: "Konsolidasikan data dari semua lokasi dalam satu dashboard.",
      icon: <Layers className="h-5 w-5" />,
      unlocked: isBiz,
      tier: "Business",
    },
    {
      title: "Laporan Per Lokasi",
      desc: "Laporan terpisah untuk setiap cabang/properti usaha Anda.",
      icon: <BarChart3 className="h-5 w-5" />,
      unlocked: isBiz,
      tier: "Business",
    },
    {
      title: "Multi-User/Admin",
      desc: "Kelola akses tim dengan role admin dan viewer untuk setiap lokasi.",
      icon: <Users className="h-5 w-5" />,
      unlocked: isBiz,
      tier: "Business",
    },
    {
      title: "Export Massal",
      desc: "Download data CSV/Excel massal untuk semua lokasi sekaligus.",
      icon: <Download className="h-5 w-5" />,
      unlocked: isBiz,
      tier: "Business",
    },
    {
      title: "Komparasi Antar Lokasi",
      desc: "Bandingkan efisiensi energi dan biaya antar cabang usaha Anda.",
      icon: <BarChart3 className="h-5 w-5" />,
      unlocked: isBiz,
      tier: "Business",
    },
    {
      title: "Prioritas Support",
      desc: "Jalur bantuan khusus dari tim ahli WattWise AI.",
      icon: <Headphones className="h-5 w-5" />,
      unlocked: isBiz,
      tier: "Business",
    },
    {
      title: "Integrasi IoT Lanjutan",
      desc: "Integrasi langsung dengan smart meter dan sensor IoT perusahaan.",
      icon: <Wifi className="h-5 w-5" />,
      unlocked: isEnt,
      tier: "Enterprise",
    },
  ];

  return (
    <div className="border-t border-slate-200/60 pt-10 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200/40">
            <Sparkles className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">Pratinjau Fitur</h2>
            <p className="text-xs text-brand-muted">
              Status fitur berdasarkan paket <strong>{currentPlanCode === "FREE" ? "Gratis" : currentPlanCode === "PRO_UMKM" ? "Pro" : currentPlanCode === "BUSINESS" ? "Business" : "Enterprise"}</strong> Anda
            </p>
          </div>
        </div>
        <span className="badge bg-slate-100 border-slate-200 text-slate-600 text-[9px] self-start sm:self-auto">
          Mode Demo
        </span>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {previewCards.map((card) => (
          <div
            key={card.title}
            className={cn(
              "card relative flex gap-3.5 p-4 overflow-hidden transition-all",
              card.unlocked
                ? "border-slate-200/80 text-slate-800"
                : "border-slate-100 bg-slate-50/50 text-slate-400 select-none"
            )}
          >
            <div
              className={cn(
                "rounded-lg p-2.5 shrink-0 h-10 w-10 flex items-center justify-center",
                card.unlocked ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-300"
              )}
            >
              {card.icon}
            </div>
            <div className="space-y-1 pr-6 flex-1">
              <h4 className={cn("text-xs font-bold", card.unlocked ? "text-slate-800" : "text-slate-500")}>
                {card.title}
              </h4>
              <p className="text-[11px] leading-relaxed text-slate-400">{card.desc}</p>
              <span
                className={cn(
                  "inline-block text-[9px] font-bold uppercase tracking-widest mt-1",
                  card.tier === "Pro"
                    ? "text-emerald-500"
                    : card.tier === "Business"
                    ? "text-blue-500"
                    : "text-amber-500"
                )}
              >
                {card.tier}
              </span>
            </div>
            <div className="absolute top-3 right-3">
              {card.unlocked ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <Lock className="h-4 w-4 text-slate-300" />
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Ads Placement: Pricing Page Bottom */}
      <AdSlot placement="pricing_page" />
    </div>
  );
}
