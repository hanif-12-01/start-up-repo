"use client";

import { useState, useTransition } from "react";
import { 
  AlertTriangle, 
  Lightbulb, 
  Loader2, 
  Zap, 
  CheckCircle2
} from "lucide-react";
import { toggleRecommendationAction } from "@/app/actions/recommendation";
import { useToast } from "@/components/ui/toast";
import { formatRupiah } from "@/lib/utils";
import { UpgradeCta } from "@/components/subscription/UpgradeCta";
import { AdSlot } from "@/components/ads/ad-slot";
import { FreeOnlyAdSlot } from "@/components/ads/free-only-ad-slot";


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
  potentialSavingsIdr,
  businessType,
  isFreePlan = false,
  adsEnabled = false,
}: {
  recommendations: RecommendationCardData[];
  businessName: string;
  latestBill: number;
  potentialSavingsIdr: number;
  businessType: string;
  appliances: any[];
  latestEntryCost: number | null;
  latestEntryKwh: number | null;
  isFreePlan?: boolean;
  adsEnabled?: boolean;
}) {
  const { toast } = useToast();
  const [recs, setRecs] = useState(recommendations);

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

  return (
    <div className="space-y-6">
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
            <div className="space-y-4 font-sans">
              {recs.map((rec) => (
                <RecommendationCard key={rec.id} rec={rec} onToggle={handleToggle} />
              ))}

              {isFreePlan && (
                <div className="mt-6 border-t border-slate-100 pt-6">
                  <UpgradeCta 
                    title="Rekomendasi Hemat Lainnya Terkunci"
                    description="Buka rekomendasi hemat energi AI yang dipersonalisasi lengkap untuk seluruh peralatan listrik usaha Anda."
                    href="/dashboard/paket-demo"
                    buttonText="Mulai Pro Trial"
                  />
                </div>
              )}
            </div>
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
      <AdSlot placement="recommendation_bottom" businessType={businessType} />
      <FreeOnlyAdSlot adsEnabled={adsEnabled} placement="recommendation_bottom" />
    </div>
  );
}
