"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Calculator, CheckCircle2, Lightbulb, Loader2, Zap } from "lucide-react";
import { toggleRecommendationAction } from "@/app/actions/recommendation";
import { useToast } from "@/components/ui/toast";
import { formatRupiah } from "@/lib/utils";

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
                Hemat {rec.estimatedSavingIdr ? formatRupiah(rec.estimatedSavingIdr) : "bervariasi"}/bulan
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
}: {
  recommendations: RecommendationCardData[];
  businessName: string;
  latestBill: number;
  potentialSavingsIdr: number;
}) {
  const { toast } = useToast();
  const [recs, setRecs] = useState(recommendations);
  const [tagihan, setTagihan] = useState(latestBill || 1_000_000);
  const [targetPersen, setTargetPersen] = useState(15);

  const estimasiHematBulan = Math.max(0, (tagihan * targetPersen) / 100);
  const estimasiHematTahun = estimasiHematBulan * 12;
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
    <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
      <section className="space-y-4 lg:col-span-8">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-bold">Saran Hemat Khusus {businessName}</h2>
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
        <div className="mb-5 flex items-center gap-2 border-b border-slate-100 pb-4">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-blueSoft text-brand-blue">
            <Calculator className="h-5 w-5" />
          </div>
          <div>
            <h2 className="font-bold">Simulasi Penghematan</h2>
            <p className="text-xs text-slate-500">Hitung estimasi hemat bulanan dan tahunan.</p>
          </div>
        </div>

        <div className="space-y-5">
          <div>
            <label className="label">Tagihan Bulanan Sekarang</label>
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
            <p className="helper">Ubah sesuai tagihan listrik usaha Anda.</p>
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
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <p className="text-xs text-slate-500">Estimasi Hemat Bulanan</p>
            <p className="mt-1 text-2xl font-extrabold text-brand-green">{formatRupiah(estimasiHematBulan)}</p>
            <div className="my-3 border-t border-slate-200/60" />
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Estimasi Hemat Tahunan</p>
            <p className="mt-1 font-bold text-brand-ink">{formatRupiah(estimasiHematTahun)}</p>
          </div>

          {potentialSavingsIdr > 0 && (
            <p className="rounded-xl border border-green-100 bg-green-50 p-3 text-xs leading-relaxed text-green-800">
              Berdasarkan analisis terakhir, potensi hemat usaha Anda sekitar{" "}
              <strong>{formatRupiah(potentialSavingsIdr)}/bulan</strong>.
            </p>
          )}

          <p className="rounded-xl border border-yellow-100 bg-brand-yellowSoft p-3 text-xs leading-relaxed text-yellow-800">
            Simulasi ini adalah perkiraan sederhana, bukan jaminan tagihan PLN resmi.
          </p>
        </div>
      </aside>
    </div>
  );
}