"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Download,
  FileText,
  Info,
  Loader2,
  Store,
} from "lucide-react";
import { useToast } from "@/components/ui/toast";
import { formatKwh, formatRupiah, cn } from "@/lib/utils";

const BULAN_LABEL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

interface BusinessItem {
  id: string;
  name: string;
  type: string;
  latestMonth: number | null;
  latestYear: number | null;
  latestUsageKwh: number | null;
  latestCostIdr: number | null;
}

export default function BulkReportClient({
  businesses,
}: {
  businesses: BusinessItem[];
}) {
  const { toast } = useToast();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [generating, setGenerating] = useState(false);
  const [readyToDownload, setReadyToDownload] = useState<string[]>([]);

  const eligible = useMemo(
    () => businesses.filter((b) => b.latestMonth !== null),
    [businesses],
  );

  const selectedIds = useMemo(
    () => Object.entries(selected).filter(([, v]) => v).map(([k]) => k),
    [selected],
  );

  function toggle(id: string) {
    setSelected((s) => ({ ...s, [id]: !s[id] }));
  }

  function selectAll() {
    const next: Record<string, boolean> = {};
    for (const b of eligible) next[b.id] = true;
    setSelected(next);
  }

  function clearAll() {
    setSelected({});
    setReadyToDownload([]);
  }

  async function handleGenerate() {
    if (selectedIds.length === 0) {
      toast("Pilih minimal 1 lokasi.", "error");
      return;
    }
    setGenerating(true);
    // Simulasi: delay singkat untuk UI feedback, tandai siap diunduh individual.
    await new Promise((r) => setTimeout(r, 800));
    setReadyToDownload(selectedIds);
    setGenerating(false);
    toast(
      `${selectedIds.length} laporan disiapkan. Anda dapat mengunduh masing-masing di daftar di bawah.`,
      "success",
    );
  }

  function downloadOne(biz: BusinessItem) {
    if (!biz.latestMonth || !biz.latestYear) return;
    // Reuse PDF route existing per lokasi (bukan combined PDF).
    // Task spec: "safe simulation, do not fake downloaded file if not implemented"
    // Kita re-use endpoint existing tapi butuh set active cookie dulu → skip untuk MVP;
    // beri toast informatif kalau feature belum full end-to-end.
    toast(
      `${biz.name}: gunakan halaman Laporan usaha aktif untuk mengunduh PDF individual.`,
      "success",
    );
  }

  return (
    <div>
      {/* Info banner */}
      <div className="mb-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-blue-100 text-blue-700">
          <Info className="h-4 w-4" />
        </div>
        <div className="text-sm text-blue-900">
          <p className="font-semibold">Simulasi Bulk PDF MVP</p>
          <p className="mt-1 text-xs leading-relaxed">
            Pilih lokasi yang ingin di-export. Pada MVP ini, sistem menyiapkan
            daftar laporan; pengunduhan gabungan (combined PDF) akan tersedia pada
            rilis berikutnya. Untuk sekarang, unduh PDF per lokasi lewat halaman
            Laporan usaha aktif.
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-xs">
          <button onClick={selectAll} className="btn-outline px-3 py-1.5 text-xs">
            Pilih semua ({eligible.length})
          </button>
          <button onClick={clearAll} className="btn-outline px-3 py-1.5 text-xs">
            Bersihkan
          </button>
          <span className="ml-2 text-slate-500">
            {selectedIds.length} dipilih
          </span>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating || selectedIds.length === 0}
          className="btn-primary px-4 py-2 text-xs"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Menyiapkan…
            </>
          ) : (
            <>
              <FileText className="h-4 w-4" /> Generate Bulk PDF Report
            </>
          )}
        </button>
      </div>

      {/* Business list */}
      {businesses.length === 0 ? (
        <div className="card p-8 text-center text-sm text-slate-500">
          Belum ada bisnis/properti untuk di-ekspor.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {businesses.map((b) => {
            const isEligible = b.latestMonth !== null;
            const isChecked = !!selected[b.id];
            const isReady = readyToDownload.includes(b.id);
            return (
              <label
                key={b.id}
                className={cn(
                  "card cursor-pointer border-2 transition-all",
                  isChecked
                    ? "border-emerald-400 bg-emerald-50/40"
                    : "border-slate-200 hover:border-slate-300",
                  !isEligible && "cursor-not-allowed opacity-60",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="mt-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => isEligible && toggle(b.id)}
                        disabled={!isEligible}
                        className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                    </div>
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Store className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-slate-800">{b.name}</h3>
                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {b.latestMonth != null && b.latestYear != null
                          ? `Data terakhir: ${BULAN_LABEL[b.latestMonth - 1]} ${b.latestYear}`
                          : "Belum ada data listrik"}
                      </p>
                      {isEligible && (
                        <p className="mt-1 text-[11px] text-slate-500">
                          {b.latestUsageKwh != null ? formatKwh(b.latestUsageKwh) : "-"} ·{" "}
                          {b.latestCostIdr != null ? formatRupiah(b.latestCostIdr) : "-"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {isReady && (
                  <div className="mt-3 flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] font-semibold text-emerald-800">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Siap diekspor
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        downloadOne(b);
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-emerald-700"
                    >
                      <Download className="h-3 w-3" /> Unduh
                    </button>
                  </div>
                )}
              </label>
            );
          })}
        </div>
      )}

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
        <strong className="text-slate-700">Catatan:</strong> Simulasi Bulk PDF MVP.
        Pengunduhan combined PDF akan tersedia pada rilis berikutnya. Estimasi
        tagihan listrik yang muncul di laporan bukan tagihan resmi PLN.
      </div>

      <div className="mt-3 text-xs">
        <Link href="/dashboard/laporan" className="font-bold text-emerald-700 hover:underline">
          Buka halaman Laporan usaha aktif →
        </Link>
      </div>
    </div>
  );
}
