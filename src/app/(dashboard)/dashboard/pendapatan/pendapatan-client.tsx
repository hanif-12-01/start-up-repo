"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Banknote,
  ChevronDown,
  Info,
  Loader2,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/ui/common";
import { formatRupiah, cn } from "@/lib/utils";
import { createOrUpdateCashFlowEntry } from "@/app/actions/cash-flow";
import { useToast } from "@/components/ui/toast";

const BULAN_LABEL = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

interface LatestSnapshot {
  month: number;
  year: number;
  revenueIdr: number;
  notes: string | null;
}

interface CurrentPeriodEntry {
  month: number;
  year: number;
  revenueIdr: number;
  grossProfitIdr: number | null;
  marginPercent: number | null;
  otherOperationalCostIdr: number | null;
  notes: string | null;
}

interface Props {
  businessName: string;
  defaultMonth: number;
  defaultYear: number;
  latestSnapshot: LatestSnapshot | null;
  currentPeriodEntry: CurrentPeriodEntry | null;
}

function parseNumberOrNull(s: string): number | null {
  const trimmed = s.trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export default function PendapatanClient({
  businessName,
  defaultMonth,
  defaultYear,
  latestSnapshot,
  currentPeriodEntry,
}: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const initial = currentPeriodEntry;
  const [month, setMonth] = useState<number>(initial?.month ?? defaultMonth);
  const [year, setYear] = useState<number>(initial?.year ?? defaultYear);
  const [revenue, setRevenue] = useState<string>(
    initial ? String(initial.revenueIdr) : "",
  );
  const [notes, setNotes] = useState<string>(initial?.notes ?? "");
  const [showAdvanced, setShowAdvanced] = useState<boolean>(
    !!(
      initial?.grossProfitIdr ||
      initial?.marginPercent ||
      initial?.otherOperationalCostIdr
    ),
  );
  const [grossProfit, setGrossProfit] = useState<string>(
    initial?.grossProfitIdr != null ? String(initial.grossProfitIdr) : "",
  );
  const [margin, setMargin] = useState<string>(
    initial?.marginPercent != null ? String(initial.marginPercent) : "",
  );
  const [otherCost, setOtherCost] = useState<string>(
    initial?.otherOperationalCostIdr != null
      ? String(initial.otherOperationalCostIdr)
      : "",
  );

  const isSameAsInitialPeriod =
    initial !== null && month === initial.month && year === initial.year;
  const isSameAsDefaultPeriod =
    month === defaultMonth && year === defaultYear;

  // Status "sudah/belum ada data" hanya akurat untuk periode default (yang
  // di-fetch server). Kalau user mengubah bulan/tahun, kita hanya tampilkan
  // helper netral karena tidak melakukan refetch di client.
  const periodStatusText: {
    tone: "amber" | "emerald" | "slate";
    text: string;
  } | null = useMemo(() => {
    if (!isSameAsDefaultPeriod) return null;
    if (initial) {
      return {
        tone: "emerald",
        text: "Data untuk periode ini sudah ada. Menyimpan akan memperbarui data yang tersimpan.",
      };
    }
    return {
      tone: "amber",
      text: "Belum ada data pendapatan untuk periode ini. Isi form di bawah untuk menyimpan.",
    };
  }, [initial, isSameAsDefaultPeriod]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const revenueNum = Number(revenue);
    if (!Number.isFinite(revenueNum) || revenueNum <= 0) {
      toast("Pendapatan harus lebih dari Rp0.", "error");
      return;
    }

    startTransition(async () => {
      const grossProfitNum = parseNumberOrNull(grossProfit);
      const marginNum = parseNumberOrNull(margin);
      const otherCostNum = parseNumberOrNull(otherCost);

      const res = await createOrUpdateCashFlowEntry({
        month,
        year,
        revenueIdr: revenueNum,
        grossProfitIdr: grossProfitNum ?? undefined,
        marginPercent: marginNum ?? undefined,
        otherOperationalCostIdr: otherCostNum ?? undefined,
        notes: notes.trim() || undefined,
      });

      toast(res.message, res.success ? "success" : "error");
      if (res.success) {
        router.refresh();
      }
    });
  }

  const submitLabel = isSameAsInitialPeriod ? "Perbarui Data" : "Simpan Data";

  return (
    <div>
      <PageHeader
        title="Pendapatan & Listrik"
        subtitle="Analitik sederhana untuk melihat dampak biaya listrik terhadap pendapatan usaha."
      />

      {/* Ringkasan data terakhir */}
      {latestSnapshot ? (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-100 text-emerald-700">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
              Pendapatan terakhir tersimpan
            </p>
            <p className="mt-1 text-sm font-semibold text-emerald-900">
              {formatRupiah(latestSnapshot.revenueIdr)} — periode{" "}
              {BULAN_LABEL[latestSnapshot.month - 1]} {latestSnapshot.year}
            </p>
            {latestSnapshot.notes && (
              <p className="mt-1 text-xs text-emerald-800/80">
                {latestSnapshot.notes}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-500">
            <Banknote className="h-4 w-4" />
          </div>
          <p className="text-sm text-slate-600">
            {businessName} belum memiliki data pendapatan. Mulai catat pendapatan bulanan Anda di form di bawah.
          </p>
        </div>
      )}

      {/* Info box */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-700">
          <Info className="h-4 w-4" />
        </div>
        <p className="text-sm leading-relaxed text-blue-900">
          Data pendapatan digunakan untuk menghitung rasio biaya listrik
          terhadap pendapatan usaha Anda.
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="card space-y-5">
        <div>
          <h3 className="text-base font-bold text-slate-800">
            Catat Pendapatan Bulanan
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Hanya nominal pendapatan yang wajib diisi. Field lain bersifat
            opsional untuk analitik lanjutan.
          </p>
        </div>

        {/* Periode */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="pndp-month" className="label">
              Bulan
            </label>
            <select
              id="pndp-month"
              className="select"
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              disabled={pending}
            >
              {BULAN_LABEL.map((label, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="pndp-year" className="label">
              Tahun
            </label>
            <input
              id="pndp-year"
              type="number"
              min={2020}
              max={2100}
              step={1}
              className="input"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              disabled={pending}
            />
          </div>
        </div>

        {periodStatusText && (
          <p
            className={cn(
              "rounded-xl border px-3 py-2 text-xs font-semibold",
              periodStatusText.tone === "emerald" &&
                "border-emerald-200 bg-emerald-50 text-emerald-800",
              periodStatusText.tone === "amber" &&
                "border-amber-200 bg-amber-50 text-amber-800",
              periodStatusText.tone === "slate" &&
                "border-slate-200 bg-slate-50 text-slate-600",
            )}
          >
            {periodStatusText.text}
          </p>
        )}

        {/* Pendapatan (wajib) */}
        <div>
          <label htmlFor="pndp-revenue" className="label">
            Pendapatan / Omzet Bulanan{" "}
            <span className="text-rose-500">*</span>
          </label>
          <input
            id="pndp-revenue"
            type="number"
            min={1000}
            step={1000}
            inputMode="numeric"
            placeholder="mis. 15000000"
            className="input"
            value={revenue}
            onChange={(e) => setRevenue(e.target.value)}
            disabled={pending}
            required
          />
          <p className="helper">
            Total omzet kotor bulan ini dalam Rupiah, tanpa titik pemisah.
            Contoh: 15000000 = Rp 15.000.000.
          </p>
        </div>

        {/* Catatan */}
        <div>
          <label htmlFor="pndp-notes" className="label">
            Catatan{" "}
            <span className="text-xs font-normal text-slate-400">
              (opsional)
            </span>
          </label>
          <textarea
            id="pndp-notes"
            rows={2}
            maxLength={500}
            placeholder="Catatan singkat mengenai pendapatan bulan ini"
            className="input resize-none"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={pending}
          />
        </div>

        {/* Opsional / Tahap Lanjut */}
        <div className="border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="flex w-full items-center justify-between text-left text-sm font-bold text-slate-700 transition hover:text-emerald-700"
            aria-expanded={showAdvanced}
          >
            <span>Opsional / Tahap Lanjut</span>
            <ChevronDown
              className={cn(
                "h-4 w-4 transition-transform",
                showAdvanced && "rotate-180",
              )}
            />
          </button>
          {showAdvanced && (
            <div className="mt-4 space-y-4">
              <p className="text-xs leading-relaxed text-slate-500">
                Isian di bawah bersifat opsional. Analitik dasar sudah cukup
                dari kolom pendapatan di atas.
              </p>
              <div>
                <label htmlFor="pndp-gp" className="label">
                  Keuntungan Kotor{" "}
                  <span className="text-xs font-normal text-slate-400">
                    (opsional)
                  </span>
                </label>
                <input
                  id="pndp-gp"
                  type="number"
                  min={0}
                  step={1000}
                  inputMode="numeric"
                  placeholder="mis. 6000000"
                  className="input"
                  value={grossProfit}
                  onChange={(e) => setGrossProfit(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div>
                <label htmlFor="pndp-margin" className="label">
                  Margin (%){" "}
                  <span className="text-xs font-normal text-slate-400">
                    (opsional)
                  </span>
                </label>
                <input
                  id="pndp-margin"
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  inputMode="decimal"
                  placeholder="mis. 40"
                  className="input"
                  value={margin}
                  onChange={(e) => setMargin(e.target.value)}
                  disabled={pending}
                />
              </div>
              <div>
                <label htmlFor="pndp-other" className="label">
                  Biaya Operasional Lain{" "}
                  <span className="text-xs font-normal text-slate-400">
                    (opsional)
                  </span>
                </label>
                <input
                  id="pndp-other"
                  type="number"
                  min={0}
                  step={1000}
                  inputMode="numeric"
                  placeholder="mis. 3000000"
                  className="input"
                  value={otherCost}
                  onChange={(e) => setOtherCost(e.target.value)}
                  disabled={pending}
                />
              </div>
            </div>
          )}
        </div>

        <button
          type="submit"
          disabled={pending}
          className="btn-primary w-full py-3 text-sm"
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Menyimpan…
            </>
          ) : (
            submitLabel
          )}
        </button>
      </form>

      {/* Disclaimer wajib */}
      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        <div className="space-y-1.5 text-xs leading-relaxed text-slate-600">
          <p>
            Sisa pendapatan setelah listrik belum memperhitungkan biaya
            operasional lain seperti bahan baku, gaji, sewa, air, internet, dan
            biaya lainnya.
          </p>
          <p>
            Prediksi dan estimasi WattWise AI bersifat perkiraan berdasarkan data yang dimasukkan pengguna dan bukan tagihan resmi PLN.
          </p>
        </div>
      </div>
    </div>
  );
}
