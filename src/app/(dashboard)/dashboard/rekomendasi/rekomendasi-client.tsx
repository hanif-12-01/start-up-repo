"use client";

import { useMemo, useState, useTransition } from "react";
import { 
  AlertTriangle, 
  Calculator, 
  CheckCircle2, 
  Lightbulb, 
  Loader2, 
  Zap, 
  Info, 
  Percent, 
  HelpCircle, 
  Settings,
  TrendingDown,
  Check
} from "lucide-react";
import { toggleRecommendationAction } from "@/app/actions/recommendation";
import { useToast } from "@/components/ui/toast";
import { formatRupiah } from "@/lib/utils";
import { generateSavingsPlan } from "@/services/savings-simulation";

type Difficulty = "EASY" | "MEDIUM" | "HARD";
type Priority = "Tinggi" | "Sedang" | "Rendah";

export type RecommendationCardData = {
  id: string;
  title: string;
  description: string;
  estimatedSavingIdr: number | null;
  estimatedSavingKwh: number | null;
  difficulty: Difficulty;
  isImplemented: boolean;
  priority: Priority;
  triggerApplianceName?: string;
  reason: string;
  impact: Priority;
  practicalSteps: string[];
  disclaimer: string;
  source?: "database" | "generated";
};

const difficultyLabel: Record<Difficulty, string> = {
  EASY: "Mudah",
  MEDIUM: "Sedang",
  HARD: "Sulit",
};

const difficultyClass: Record<Difficulty, string> = {
  EASY: "bg-green-50 text-green-700",
  MEDIUM: "bg-yellow-50 text-yellow-700",
  HARD: "bg-red-50 text-red-700",
};

const priorityClass: Record<RecommendationCardData["priority"], string> = {
  Tinggi: "bg-red-50 text-red-700",
  Sedang: "bg-orange-50 text-orange-700",
  Rendah: "bg-slate-100 text-slate-600",
};

function RecommendationCard({
  rec,
  onToggle,
}: {
  rec: RecommendationCardData;
  onToggle: (id: string) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className={`card transition hover:shadow-soft ${rec.isImplemented ? "border-green-100 bg-green-50/40" : ""}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-brand-greenSoft text-brand-greenDark">
            {rec.isImplemented ? <CheckCircle2 className="h-6 w-6" /> : <Lightbulb className="h-6 w-6" />}
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-brand-ink">{rec.title}</h3>
              {rec.isImplemented && (
                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">
                  Diterapkan
                </span>
              )}
              {rec.source === "generated" && (
                <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                  Rule Peralatan
                </span>
              )}
            </div>

            <p className="mt-1 text-sm leading-relaxed text-slate-500">{rec.description}</p>

            {rec.triggerApplianceName && (
              <p className="mt-2 text-xs font-semibold text-brand-blue">Dipicu: {rec.triggerApplianceName}</p>
            )}

            <p className="mt-2 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
              <strong>Alasan:</strong> {rec.reason}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="badge bg-green-50 text-green-700">
                Hemat {rec.estimatedSavingIdr ? formatRupiah(rec.estimatedSavingIdr) : "bervariasi"}/bulan (Estimasi)
              </span>
              {rec.estimatedSavingKwh !== null && (
                <span className="badge bg-blue-50 text-blue-700">
                  ±{rec.estimatedSavingKwh.toLocaleString("id-ID")} kWh/bulan
                </span>
              )}
              <span className={`badge ${difficultyClass[rec.difficulty]}`}>
                Tingkat: {difficultyLabel[rec.difficulty]}
              </span>
              <span className={`badge ${priorityClass[rec.priority]}`}>Prioritas {rec.priority}</span>
              <span className={`badge ${priorityClass[rec.impact]}`}>Dampak {rec.impact}</span>
            </div>

            {rec.practicalSteps.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-bold text-brand-ink">Langkah praktis:</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-xs leading-relaxed text-slate-600">
                  {rec.practicalSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
            )}

            <p className="mt-3 text-[11px] leading-relaxed text-slate-400">{rec.disclaimer}</p>
          </div>
        </div>

        {rec.source !== "generated" && (
          <button
            className={rec.isImplemented ? "btn-outline shrink-0 border-orange-200 text-orange-600" : "btn-primary shrink-0"}
            disabled={pending}
            onClick={() => startTransition(() => void onToggle(rec.id))}
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : rec.isImplemented ? (
              <>
                <AlertTriangle className="h-4 w-4" />
                Batalkan
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Terapkan
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

export function RekomendasiClient({
  recommendations,
  businessName,
  latestBill,
  potentialSavingsIdr,
  businessType,
  appliances,
  latestEntryCost,
  latestEntryKwh,
}: {
  recommendations: RecommendationCardData[];
  businessName: string;
  latestBill: number;
  potentialSavingsIdr: number;
  businessType: string;
  appliances: any[];
  latestEntryCost: number | null;
  latestEntryKwh: number | null;
}) {
  const { toast } = useToast();
  const [recs, setRecs] = useState(recommendations);
  const [tagihan, setTagihan] = useState(latestBill || 1_000_000);
  const [targetPersen, setTargetPersen] = useState(15);
  const [activeTab, setActiveTab] = useState<"recommendations" | "simulation">("simulation");

  const trackableCount = recs.filter((r) => r.source !== "generated").length;
  const diterapkan = recs.filter((r) => r.source !== "generated" && r.isImplemented).length;

  async function handleToggle(id: string) {
    if (recs.find((item) => item.id === id)?.source === "generated") return;

    const res = await toggleRecommendationAction(id);

    if (!res.success) {
      toast(res.error ?? "Gagal memperbarui rekomendasi.", "error");
      return;
    }

    const nextState = res.isImplemented ?? false;
    setRecs((items) => items.map((item) => (item.id === id ? { ...item, isImplemented: nextState } : item)));
    toast(
      nextState
        ? `"${res.title}" ditandai sebagai diterapkan. WattWise AI akan memantau dampaknya.`
        : `"${res.title}" dibatalkan.`
    );
  }

  // Generate the explainable savings plan
  const plan = useMemo(() => generateSavingsPlan({
    businessType,
    appliances,
    currentMonthlyBill: tagihan,
    targetPercent: targetPersen,
    latestEntryCost,
    latestEntryKwh,
  }), [appliances, businessType, latestEntryCost, latestEntryKwh, tagihan, targetPersen]);

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("simulation")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-all ${
            activeTab === "simulation"
              ? "border-brand-blue text-brand-blue"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Calculator className="h-4 w-4" />
          Simulasi Target Penghematan
        </button>
        <button
          onClick={() => setActiveTab("recommendations")}
          className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-all ${
            activeTab === "recommendations"
              ? "border-brand-blue text-brand-blue"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Zap className="h-4 w-4" />
          Rekomendasi Utama ({recs.length})
        </button>
      </div>

      {activeTab === "simulation" ? (
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Main Simulation Area */}
          <div className="space-y-6 lg:col-span-8">
            {appliances.length === 0 ? (
              <div className="card flex flex-col items-center gap-3 py-12 text-center border-dashed border-2">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-yellowSoft text-brand-yellowDark">
                  <Settings className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-brand-ink">Belum Ada Data Peralatan</h3>
                <p className="max-w-md text-sm text-slate-500">
                  Tambahkan data peralatan terlebih dahulu agar simulasi penghematan bisa menjelaskan sumber penghematan secara mendalam dan terperinci.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-brand-ink">Rincian Tindakan Penghematan</h2>
                  <p className="text-sm text-slate-500">
                    Berikut adalah rencana tindakan nyata terperinci yang dihasilkan oleh WattWise AI untuk membantu mencapai target sasaran Anda.
                  </p>
                </div>

                {/* Cover status bar / Target realism */}
                <div className={`card p-5 border ${
                  plan.isRealistic 
                    ? "bg-green-50/50 border-green-200 text-green-900" 
                    : "bg-yellow-50/50 border-yellow-200 text-yellow-900"
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {plan.isRealistic ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0" />
                      )}
                    </div>
                    <div className="space-y-2 w-full">
                      <p className="text-sm font-semibold">
                        {plan.isRealistic 
                          ? "Target ini realistis jika tindakan utama dilakukan." 
                          : `Target ini cukup agresif. Tindakan yang tersedia baru menutup sekitar ${plan.coveragePercent}% dari target.`}
                      </p>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                          <span>Progress Tindakan Ke Target:</span>
                          <span className="font-bold text-brand-ink">
                            {formatRupiah(plan.totalActionSavingIdr)} dari {formatRupiah(plan.targetSavingIdr)} target
                          </span>
                        </div>
                        <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 ${plan.isRealistic ? "bg-green-600" : "bg-yellow-500"}`}
                            style={{ width: `${Math.min(100, plan.coveragePercent)}%` }}
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          Rencana ini menutup {plan.coveragePercent}% dari target penghematan (dihitung sebagai persen dari target penghematan).
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Plan action items */}
                <div className="space-y-4">
                  {plan.actions.map((action, idx) => (
                    <div key={idx} className="card border border-slate-100 hover:border-slate-200 transition p-5 space-y-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-brand-blueSoft text-brand-blue px-2.5 py-0.5 text-xs font-bold">
                              Tindakan {idx + 1}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                              action.difficulty === "Mudah" ? "bg-green-50 text-green-700" : 
                              action.difficulty === "Sedang" ? "bg-yellow-50 text-yellow-700" : 
                              "bg-red-50 text-red-700"
                            }`}>
                              {action.difficulty}
                            </span>
                          </div>
                          <h3 className="font-bold text-base text-brand-ink mt-1.5">{action.title}</h3>
                          <p className="text-xs text-slate-500 mt-0.5">Peralatan Terdampak: <span className="font-semibold text-brand-blue">{action.affectedApplianceName}</span></p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-lg font-bold text-brand-green block">
                            -{formatRupiah(action.estimatedSavingIdr)}/bln
                          </span>
                          <span className="text-xs text-slate-500 font-medium">
                            {action.contributionToTargetPercent}% kontribusi terhadap target
                          </span>
                        </div>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2 bg-slate-50 p-4 rounded-xl text-xs">
                        <div>
                          <p className="font-bold text-brand-ink uppercase tracking-wider text-[10px] text-slate-400 mb-1">ASUMSI PERUBAHAN</p>
                          <p className="text-slate-600 leading-relaxed">{action.assumption}</p>
                          <div className="mt-2 pt-2 border-t border-slate-200/50 flex gap-4 text-slate-500">
                            <div>Sebelum: <strong className="text-slate-700">{action.beforeKwh} kWh</strong></div>
                            <div>Sesudah: <strong className="text-slate-700">{action.afterKwh} kWh</strong></div>
                            <div>Hemat: <strong className="text-brand-green">{action.savedKwh} kWh</strong></div>
                          </div>
                        </div>
                        <div>
                          <p className="font-bold text-brand-ink uppercase tracking-wider text-[10px] text-slate-400 mb-1">MENGAPA TINDAKAN INI MENGHEMAT?</p>
                          <p className="text-slate-600 leading-relaxed">{action.whyItSaves}</p>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <p className="text-xs font-bold text-brand-ink">Langkah-Langkah Praktis Implementasi:</p>
                        <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                          {action.practicalSteps.map((step, sIdx) => (
                            <li key={sIdx} className="leading-relaxed">{step}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar Area */}
          <aside className="space-y-6 lg:col-span-4">
            {/* Input & Target Slider card */}
            <div className="card">
              <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-blueSoft text-brand-blue">
                  <Calculator className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-bold text-brand-ink">Simulasi Penghematan</h2>
                  <p className="text-xs text-slate-500">Sesuaikan target hemat usaha Anda.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Tagihan Bulanan Saat Ini (Estimasi)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-medium text-slate-400">Rp</span>
                    <input
                      type="number"
                      min="0"
                      className="input pl-10 font-semibold"
                      value={tagihan}
                      onChange={(e) => setTagihan(Number(e.target.value))}
                    />
                  </div>
                  <p className="helper">Gunakan tagihan rata-rata bulanan Anda.</p>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="label !mb-0">Target Penghematan</label>
                    <span className="font-bold text-brand-blue">{targetPersen}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    step="5"
                    value={targetPersen}
                    onChange={(e) => setTargetPersen(Number(e.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-blue"
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                    <span>5% mudah</span>
                    <span>15% sedang</span>
                    <span>30% agresif</span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed mt-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                    <strong>Catatan:</strong> Target ini adalah sasaran hemat biaya. WattWise akan memperkirakan tindakan yang bisa mendekati target tersebut.
                  </p>
                </div>
              </div>
            </div>

            {/* A. Summary Card */}
            <div className="card bg-slate-900 text-white space-y-4">
              <h3 className="font-bold text-sm text-slate-300 uppercase tracking-wider">Target Penghematan Bulanan</h3>
              
              <div className="space-y-3">
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Tagihan Saat Ini:</span>
                  <span className="font-bold text-white">{formatRupiah(tagihan)}/bulan</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Target Persentase:</span>
                  <span className="font-bold text-white">{targetPersen}% dari tagihan bulanan</span>
                </div>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>Nilai Target Hemat:</span>
                  <span className="font-bold text-brand-green">{formatRupiah(plan.targetSavingIdr)}/bulan</span>
                </div>
                
                <div className="border-t border-slate-800 my-2" />

                <div className="flex justify-between text-xs text-slate-400">
                  <span>Estimasi Tarif Listrik:</span>
                  <span className="font-bold text-white">{plan.effectiveTariff} IDR/kWh</span>
                </div>

                <div className="flex justify-between text-xs text-slate-400">
                  <span>Rencana Hemat Tindakan:</span>
                  <span className="font-bold text-brand-green">{formatRupiah(plan.totalActionSavingIdr)}/bulan</span>
                </div>
              </div>

              {plan.isTariffEstimated && (
                <p className="text-[10px] text-yellow-400 bg-yellow-400/10 p-2 rounded-lg leading-relaxed">
                  Tarif listrik menggunakan estimasi default karena data tagihan belum tersedia.
                </p>
              )}
            </div>

            {/* D. Formula Explanation */}
            <div className="card bg-blue-50 border border-blue-100 p-4 space-y-2">
              <div className="flex gap-2 items-center text-brand-blue">
                <Info className="h-4 w-4 shrink-0" />
                <h4 className="font-bold text-xs">Bagaimana Kami Menghitung?</h4>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                Perhitungan memakai rumus: <br />
                <code className="bg-white/80 px-1 py-0.5 rounded font-mono font-bold text-brand-blue">watt × jumlah alat × jam pakai × 30 hari / 1000</code>.
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                Rumus ini menghitung kWh bulanan sebelum dan sesudah tindakan untuk memperkirakan penghematan Rupiah yang realistis.
              </p>
            </div>

            {/* E. Disclaimer */}
            <div className="text-[10px] text-slate-400 leading-relaxed px-2">
              <strong>Pernyataan Penyangkalan (Disclaimer):</strong><br />
              Simulasi ini adalah estimasi berdasarkan input manual dan bukan jaminan tagihan resmi PLN. Hasil aktual dapat bervariasi bergantung pada fluktuasi tarif, efisiensi nyata peralatan, dan faktor eksternal lainnya.
            </div>
          </aside>
        </div>
      ) : (
        /* Recommendations Tab */
        <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
          <section className="space-y-4 lg:col-span-8">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-brand-ink">Saran Hemat Khusus {businessName}</h2>
                <p className="text-sm text-slate-500">Disusun dari hasil analisis listrik terakhir dan klasifikasi peralatan.</p>
              </div>
              {recs.length > 0 && (
                <span className="text-sm text-slate-500">
                  {trackableCount > 0 ? `${diterapkan}/${trackableCount} diterapkan` : `${recs.length} rekomendasi`}
                </span>
              )}
            </div>

            {recs.length === 0 ? (
              <div className="card flex flex-col items-center gap-3 py-12 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-2xl bg-brand-greenSoft text-brand-green">
                  <Zap className="h-7 w-7" />
                </div>
                <h3 className="font-bold text-brand-ink">Belum Ada Rekomendasi</h3>
                <p className="max-w-sm text-sm text-slate-500">
                  Masukkan data pemakaian listrik di halaman <strong>Input Data</strong> agar WattWise AI membuat rekomendasi
                  khusus usaha Anda.
                </p>
              </div>
            ) : (
              recs.map((rec) => <RecommendationCard key={rec.id} rec={rec} onToggle={handleToggle} />)
            )}
          </section>

          <aside className="card sticky top-24 lg:col-span-4">
            <div className="mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-greenSoft text-brand-green">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold text-brand-ink">Potensi Hemat Total</h2>
                <p className="text-xs text-slate-500">Estimasi berdasarkan rekomendasi sistem.</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-4 text-center">
                <p className="text-xs text-slate-500">Potensi Hemat Bulanan</p>
                <p className="mt-1 text-2xl font-extrabold text-brand-green">{formatRupiah(potentialSavingsIdr)}</p>
                <div className="my-3 border-t border-slate-200/60" />
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Potensi Hemat Tahunan</p>
                <p className="mt-1 font-bold text-brand-ink text-lg">{formatRupiah(potentialSavingsIdr * 12)}</p>
              </div>

              {potentialSavingsIdr > 0 && (
                <p className="rounded-xl border border-green-100 bg-green-50 p-3 text-xs leading-relaxed text-green-800">
                  Berdasarkan rekomendasi di samping, potensi hemat usaha Anda sekitar{" "}
                  <strong>{formatRupiah(potentialSavingsIdr)}/bulan</strong> jika seluruhnya dijalankan.
                </p>
              )}

              <p className="text-[10px] text-slate-400 leading-relaxed">
                * Estimasi ini berdasarkan saran efisiensi standar. Keberhasilan penghematan bergantung sepenuhnya pada kepatuhan pelaksanaan di lapangan.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
