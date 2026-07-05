import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/ui/common";
import { formatKwh, formatRupiah } from "@/lib/utils";
import {
  AlertTriangle,
  Beaker,
  Brain,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Database,
  Info,
  Layers,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";

/* ─── Skenario Demo yang diharapkan ───────────────────────────── */
interface DemoScenario {
  name: string;
  expectedMethod: string;
  expectedLabel: string;
  maturityMonths: number;
  icon: typeof Brain;
  gradient: string;
  accentBg: string;
  accentBorder: string;
  accentText: string;
  ringColor: string;
}

const SCENARIOS: DemoScenario[] = [
  {
    name: "Warung Pemula AI Demo",
    expectedMethod: "RULE_BASED",
    expectedLabel: "Rule-Based Safety Layer",
    maturityMonths: 2,
    icon: Zap,
    gradient: "from-slate-500 to-slate-700",
    accentBg: "bg-slate-50",
    accentBorder: "border-slate-200",
    accentText: "text-slate-700",
    ringColor: "ring-slate-100",
  },
  {
    name: "Kedai Kopi AI Demo",
    expectedMethod: "TABULAR_UMKM_V1",
    expectedLabel: "Gradient Boosting Tabular Model",
    maturityMonths: 4,
    icon: TrendingUp,
    gradient: "from-blue-500 to-indigo-600",
    accentBg: "bg-blue-50",
    accentBorder: "border-blue-200",
    accentText: "text-blue-700",
    ringColor: "ring-blue-100",
  },
  {
    name: "Laundry LSTM AI Demo",
    expectedMethod: "LSTM_PROTOTYPE",
    expectedLabel: "LSTM Sequence Model",
    maturityMonths: 8,
    icon: Brain,
    gradient: "from-indigo-500 to-purple-600",
    accentBg: "bg-indigo-50",
    accentBorder: "border-indigo-200",
    accentText: "text-indigo-700",
    ringColor: "ring-indigo-100",
  },
];

function getFriendlyMethodLabel(method?: string): string {
  if (method === "RULE_BASED") return "Rule-Based Safety Layer";
  if (method === "TABULAR_UMKM_V1") return "Gradient Boosting Tabular Model";
  if (method === "LSTM_PROTOTYPE") return "LSTM Sequence Model";
  if (method === "HYBRID_FALLBACK") return "Hybrid Safety Fallback";
  if (method === "RIDGE_UMKM_V1") return "Ridge Legacy Model";
  return method || "Tidak Diketahui";
}

function getConfidenceBadge(level?: string) {
  if (level === "HIGH")
    return { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-700", label: "Tinggi" };
  if (level === "MEDIUM")
    return { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-700", label: "Sedang" };
  return { bg: "bg-slate-50", border: "border-slate-200", text: "text-slate-600", label: "Rendah" };
}

/* ─── Komponen Halaman ────────────────────────────────────────── */
export default async function AILabPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const isDemoUser = session.user.email === "owner@wattwise.id";

  // Query 3 bisnis demo berdasarkan nama untuk user aktif
  const businesses = await db.business.findMany({
    where: {
      userId: session.user.id,
      name: { in: SCENARIOS.map((s) => s.name) },
    },
    include: {
      electricityEntries: {
        orderBy: [{ year: "desc" }, { month: "desc" }],
      },
      predictionResults: {
        orderBy: [{ predictedForYear: "desc" }, { predictedForMonth: "desc" }],
        take: 1,
      },
    },
  });

  const businessScenarios = SCENARIOS.map((scenario) => ({
    scenario,
    data: businesses.find((b) => b.name === scenario.name) || null,
  }));

  const hasSeededData = businesses.length > 0;

  return (
    <div className="space-y-8">
      {/* ─── Header ──────────────────────────────────────────── */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-200/40">
            <Beaker className="h-4.5 w-4.5" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              WattWise AI Lab
            </h1>
          </div>
        </div>
        <p className="text-sm text-brand-muted mt-1 max-w-2xl leading-relaxed">
          Demo cara WattWise memilih model prediksi sesuai kematangan data UMKM.
          Setiap bisnis mendapatkan model AI yang paling optimal berdasarkan jumlah data historis yang tersedia.
        </p>
      </div>

      {/* ─── Alert Non-Demo ──────────────────────────────────── */}
      {!isDemoUser && (
        <div className="card flex items-start gap-3 border-blue-100 bg-blue-50/40">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-600">
            <Info className="h-4 w-4" />
          </div>
          <div className="text-sm text-blue-900 leading-relaxed">
            <p className="font-bold">Masuk Sebagai Akun Demo</p>
            <p className="mt-1 text-blue-800/80">
              Halaman ini mendemonstrasikan sistem pengujian kematangan data AI untuk akun demo utama
              (<strong>owner@wattwise.id</strong>). Silakan keluar dan masuk kembali menggunakan email demo.
            </p>
          </div>
        </div>
      )}

      {/* ─── Alert Belum di-Seed ──────────────────────────────── */}
      {!hasSeededData && (
        <div className="card flex items-start gap-3 border-amber-100 bg-amber-50/40">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-amber-100 text-amber-600">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="text-sm text-amber-900 leading-relaxed">
            <p className="font-bold">Data Simulasi AI Lab Belum Siap</p>
            <p className="mt-1 text-amber-800/80">
              Jalankan perintah berikut di terminal untuk membuat skenario demo:
            </p>
            <code className="mt-2 block w-fit rounded-lg bg-amber-100 px-3 py-1.5 font-mono text-xs text-amber-950 font-bold">
              npx tsx scripts/seed-ai-lab.ts
            </code>
          </div>
        </div>
      )}

      {/* ─── Grid Skenario Demo ──────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {businessScenarios.map(({ scenario, data }, idx) => {
          const prediction = data?.predictionResults[0] || null;
          const actualMethod = prediction?.method;
          const isMatch = actualMethod === scenario.expectedMethod;
          const conf = getConfidenceBadge(prediction?.confidenceLevel);
          const Icon = scenario.icon;

          return (
            <div key={scenario.name} className="group relative flex flex-col">
              {/* Glow effect di belakang kartu */}
              <div
                className={`absolute -inset-0.5 rounded-[1.35rem] bg-gradient-to-br ${scenario.gradient} opacity-[0.07] blur-sm transition-opacity duration-500 group-hover:opacity-[0.14]`}
              />

              <div className="card card-hover relative flex flex-1 flex-col gap-5 overflow-hidden">
                {/* ── Ribbon Demo ── */}
                <div className="absolute right-0 top-0">
                  <div className={`${scenario.accentBg} ${scenario.accentBorder} border-b border-l rounded-bl-xl px-3 py-1`}>
                    <span className={`text-[9px] font-black uppercase tracking-widest ${scenario.accentText}`}>
                      Skenario Demo
                    </span>
                  </div>
                </div>

                {/* ── Header bisnis ── */}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br ${scenario.gradient} text-white shadow-lg shadow-${scenario.gradient.split("-")[1]}-200/30`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-extrabold text-slate-800 leading-tight pr-16">
                      {scenario.name}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="badge bg-slate-50 border-slate-200 text-slate-600">
                        {data?.type || "FNB"}
                      </span>
                      <span className={`badge ${scenario.accentBg} ${scenario.accentBorder} ${scenario.accentText}`}>
                        <Database className="h-3 w-3" />
                        {scenario.maturityMonths} Bulan Data
                      </span>
                    </div>
                  </div>
                </div>

                {/* ── Routing Engine AI ── */}
                <div className={`rounded-xl ${scenario.accentBg} border ${scenario.accentBorder} p-4 space-y-3`}>
                  <div className="flex items-center gap-1.5">
                    <Sparkles className={`h-3.5 w-3.5 ${scenario.accentText}`} />
                    <span className={`text-[10px] font-black uppercase tracking-widest ${scenario.accentText}`}>
                      Routing Engine AI
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-semibold">Ekspektasi</span>
                      <span className={`text-[11px] font-bold ${scenario.accentText}`}>
                        {scenario.expectedLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-slate-500 font-semibold">Aktual</span>
                      <span className="text-[11px] font-bold text-slate-800">
                        {actualMethod ? getFriendlyMethodLabel(actualMethod) : "Belum dihitung"}
                      </span>
                    </div>
                  </div>

                  {/* Status validasi */}
                  {actualMethod && (
                    <div className="pt-1">
                      {isMatch ? (
                        <span className="badge bg-emerald-50 border-emerald-200 text-emerald-700">
                          <CheckCircle2 className="h-3 w-3" /> Model Sesuai
                        </span>
                      ) : (
                        <span className="badge bg-amber-50 border-amber-200 text-amber-700">
                          <AlertTriangle className="h-3 w-3" /> Model tidak sesuai skenario demo
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* ── Output Prediksi ── */}
                <div className="space-y-2.5">
                  <div className="flex items-center gap-1.5">
                    <Cpu className="h-3.5 w-3.5 text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Hasil Analisa AI Terkini
                    </span>
                  </div>
                  {prediction ? (
                    <div className="grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 transition-colors group-hover:bg-slate-100/50">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                          Prediksi Pemakaian Listrik
                        </span>
                        <span className="text-lg font-black text-slate-800 mt-0.5 block">
                          {formatKwh(prediction.predictedUsageKwh)}
                        </span>
                      </div>
                      <div className="rounded-xl bg-slate-50 border border-slate-100 p-3 transition-colors group-hover:bg-slate-100/50">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block">
                          Estimasi Tagihan Listrik
                        </span>
                        <span className="text-lg font-black text-brand-green mt-0.5 block">
                          {formatRupiah(prediction.predictedCostIdr)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 italic p-3 rounded-xl bg-slate-50 border border-slate-100">
                      Jalankan seeder untuk menghitung estimasi AI.
                    </p>
                  )}
                </div>

                {/* ── Detail Penjelasan AI ── */}
                {prediction && (
                  <div className="mt-auto pt-4 border-t border-slate-100 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                        Tingkat Kepercayaan
                      </span>
                      <span className={`badge ${conf.bg} ${conf.border} ${conf.text}`}>
                        {conf.label}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-slate-600 leading-relaxed bg-slate-50 border border-slate-100 rounded-xl p-3">
                      {prediction.explanation}
                    </p>
                    {prediction.confidenceReason && (
                      <div className="flex gap-1.5 items-start">
                        <Info className="h-3 w-3 shrink-0 text-slate-300 mt-0.5" />
                        <span className="text-[10px] text-slate-400 leading-relaxed">
                          {prediction.confidenceReason}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Data Maturity Ladder ─────────────────────────────── */}
      <div className="card space-y-6">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-green to-emerald-600 text-white shadow-lg shadow-emerald-200/40">
            <Layers className="h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">Data Maturity Ladder</h2>
            <p className="text-xs text-brand-muted">Peta evolusi kecerdasan WattWise berdasarkan jumlah data</p>
          </div>
        </div>

        {/* Timeline */}
        <div className="relative ml-5 border-l-2 border-slate-100 pl-8 space-y-8">
          {/* Step 1 */}
          <div className="relative">
            <div className="absolute -left-[41px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white border-2 border-slate-300 shadow-sm">
              <div className="h-2.5 w-2.5 rounded-full bg-slate-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge bg-slate-50 border-slate-200 text-slate-700">0–2 Bulan</span>
                <ChevronRight className="h-3 w-3 text-slate-300" />
                <span className="text-sm font-extrabold text-slate-700">Rule-Based Safety Layer</span>
              </div>
              <p className="mt-1.5 text-xs text-brand-muted leading-relaxed max-w-xl">
                Menggunakan algoritma berbasis aturan sederhana untuk menjaga batas keselamatan estimasi saat
                riwayat pemakaian masih minimal. Memberikan estimasi awal yang aman.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative">
            <div className="absolute -left-[41px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white border-2 border-blue-400 shadow-sm">
              <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge bg-blue-50 border-blue-200 text-blue-700">3–5 Bulan</span>
                <ChevronRight className="h-3 w-3 text-slate-300" />
                <span className="text-sm font-extrabold text-blue-700">Gradient Boosting Tabular Model</span>
              </div>
              <p className="mt-1.5 text-xs text-brand-muted leading-relaxed max-w-xl">
                Memanfaatkan Machine Learning (Gradient Boosting) untuk memprediksi pemakaian berdasarkan
                rata-rata 3 bulan, tren perubahan bulanan, klasifikasi jenis usaha, dan tarif listrik per kWh.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative">
            <div className="absolute -left-[41px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white border-2 border-indigo-500 shadow-sm">
              <div className="h-2.5 w-2.5 rounded-full bg-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge bg-indigo-50 border-indigo-200 text-indigo-700">6+ Bulan</span>
                <ChevronRight className="h-3 w-3 text-slate-300" />
                <span className="text-sm font-extrabold text-indigo-700">LSTM Sequence Model</span>
              </div>
              <p className="mt-1.5 text-xs text-brand-muted leading-relaxed max-w-xl">
                Mengaktifkan Deep Learning LSTM (Long Short-Term Memory) untuk menangkap pola musiman, tren
                jangka panjang, dan perilaku energi yang kompleks dari 6 bulan timestep berurutan.
              </p>
            </div>
          </div>

          {/* Step 4 — Future */}
          <div className="relative">
            <div className="absolute -left-[41px] top-1 flex h-6 w-6 items-center justify-center rounded-full bg-white border-2 border-emerald-500 shadow-sm">
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge bg-emerald-50 border-emerald-200 text-emerald-700">MVP 3 + AIoT</span>
                <ChevronRight className="h-3 w-3 text-slate-300" />
                <span className="text-sm font-extrabold text-emerald-700">Daily/Hourly Energy Intelligence</span>
                <span className="eyebrow text-[8px] py-0.5 px-2">Rencana Pengembangan</span>
              </div>
              <p className="mt-1.5 text-xs text-brand-muted leading-relaxed max-w-xl">
                Integrasi smart meter IoT untuk pemantauan energi harian dan per jam, estimasi anomali beban
                puncak seketika, serta asisten efisiensi daya cerdas berbasis sensor data langsung.
              </p>
            </div>
          </div>
        </div>

        {/* Filosofi Footer */}
        <div className="rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 p-4 flex gap-3 items-start">
          <Sparkles className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
          <p className="text-xs text-emerald-900 leading-relaxed font-medium">
            <strong>Filosofi WattWise AI Engine:</strong> WattWise tidak memaksakan satu model untuk semua jenis
            dan kematangan data UMKM. Sistem memilih model sesuai kematangan data. Semakin banyak data yang
            dimasukkan, semakin cerdas model prediksi yang digunakan.
          </p>
        </div>
      </div>
    </div>
  );
}
