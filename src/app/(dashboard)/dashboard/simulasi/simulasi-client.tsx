"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Info, Sparkles, TrendingDown } from "lucide-react";
import { formatKwh, formatRupiah } from "@/lib/utils";
import {
  simulateReduceHours,
  simulateLowerWatt,
  simulateMaintenance,
  simulateTargetPercent,
  type ScenarioAppliance,
} from "@/services/scenario-simulator";

type ScenarioTab = "reduce_hours" | "lower_watt" | "maintenance" | "target_percent";

const DISCLAIMER =
  "Hasil simulasi adalah estimasi berbasis aturan dan asumsi yang Anda pilih, bukan tagihan resmi PLN. Data peralatan asli tidak diubah.";

interface Props {
  appliances: ScenarioAppliance[];
  tariff: number;
  isTariffEstimated: boolean;
  currentBillIdr: number | null;
}

export function SimulasiClient({ appliances, tariff, isTariffEstimated, currentBillIdr }: Props) {
  const [tab, setTab] = useState<ScenarioTab>("reduce_hours");
  const [selectedId, setSelectedId] = useState(appliances[0]?.id ?? "");
  const selected = appliances.find((a) => a.id === selectedId) ?? appliances[0];

  const [newHours, setNewHours] = useState(() => Math.max(0, (appliances[0]?.dailyUsageHours ?? 1) - 1));
  const [newWatt, setNewWatt] = useState(() => Math.round((appliances[0]?.powerWatt ?? 100) * 0.7));
  const [targetPercent, setTargetPercent] = useState(15);
  const [maintenancePercent, setMaintenancePercent] = useState(10);

  // keep controls in sync when appliance changes
  function onSelect(id: string) {
    setSelectedId(id);
    const a = appliances.find((x) => x.id === id);
    if (a) {
      setNewHours(Math.max(0, a.dailyUsageHours - 1));
      setNewWatt(Math.round(a.powerWatt * 0.7));
    }
  }

  const hourResult = useMemo(
    () => (selected ? simulateReduceHours({ appliance: selected, newHours, tariff }) : null),
    [selected, newHours, tariff]
  );
  const wattResult = useMemo(
    () => (selected ? simulateLowerWatt({ appliance: selected, newPowerWatt: newWatt, tariff }) : null),
    [selected, newWatt, tariff]
  );
  const maintenanceResult = useMemo(
    () => (selected ? simulateMaintenance({ appliance: selected, savingPercent: maintenancePercent, tariff }) : null),
    [selected, maintenancePercent, tariff]
  );
  const targetResult = useMemo(
    () => simulateTargetPercent({ appliances, targetPercent, tariff, currentBillIdr }),
    [appliances, targetPercent, tariff, currentBillIdr]
  );

  return (
    <div className="space-y-6">
      {/* Tariff banner */}
      <div className="flex items-start gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-sm text-slate-600">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
        <p>
          Tarif dasar simulasi: <strong>{formatRupiah(tariff)}/kWh</strong>{" "}
          {isTariffEstimated ? "(estimasi default, belum ada input tagihan)" : "(dihitung dari input tagihan terakhir)"}.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "reduce_hours", label: "Kurangi Jam Pakai" },
          { id: "lower_watt", label: "Ganti Alat Lebih Hemat" },
          { id: "maintenance", label: "Servis Freezer/AC" },
          { id: "target_percent", label: "Target Persentase Hemat" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as ScenarioTab)}
            className={`rounded-xl border px-4 py-2 text-sm font-semibold transition ${
              tab === t.id
                ? "border-brand-green bg-brand-greenSoft text-brand-greenDark"
                : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Appliance picker (per-appliance scenarios) */}
      {tab !== "target_percent" && selected && (
        <div className="card space-y-5">
          <div>
            <label className="label">Pilih Peralatan</label>
            <select className="input" value={selectedId} onChange={(e) => onSelect(e.target.value)}>
              {appliances.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} - {a.powerWatt}W x {a.quantity}, {a.dailyUsageHours} jam/hari
                </option>
              ))}
            </select>
          </div>

          {tab === "reduce_hours" && (
            <div>
              <label className="label">
                Jam pakai baru: <strong>{newHours} jam/hari</strong> (asli {selected.dailyUsageHours} jam)
              </label>
              <input
                type="range"
                min={0}
                max={selected.dailyUsageHours}
                step={0.5}
                value={newHours}
                onChange={(e) => setNewHours(Number(e.target.value))}
                className="w-full accent-brand-green"
              />
            </div>
          )}

          {tab === "lower_watt" && (
            <div>
              <label className="label">
                Daya alat pengganti: <strong>{newWatt} W</strong> (asli {selected.powerWatt} W)
              </label>
              <input
                type="range"
                min={0}
                max={selected.powerWatt}
                step={10}
                value={newWatt}
                onChange={(e) => setNewWatt(Number(e.target.value))}
                className="w-full accent-brand-green"
              />
            </div>
          )}

          {tab === "maintenance" && (
            <div>
              <label className="label">Efek perawatan: <strong>{maintenancePercent}%</strong></label>
              <input type="range" min={5} max={30} step={5} value={maintenancePercent} onChange={(e) => setMaintenancePercent(Number(e.target.value))} className="w-full accent-brand-green" />
            </div>
          )}

          {tab === "reduce_hours" && hourResult && <ResultCard result={hourResult} />}
          {tab === "lower_watt" && wattResult && <ResultCard result={wattResult} />}
          {tab === "maintenance" && maintenanceResult && <ResultCard result={maintenanceResult} />}
        </div>
      )}

      {/* Target percent scenario */}
      {tab === "target_percent" && (
        <div className="card space-y-5">
          <div>
            <label className="label">
              Target hemat: <strong>{targetPercent}%</strong> dari tagihan bulanan
            </label>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={targetPercent}
              onChange={(e) => setTargetPercent(Number(e.target.value))}
              className="w-full accent-brand-green"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-semibold text-slate-500">Tagihan / Estimasi Saat Ini</p>
              <p className="mt-2 text-xl font-extrabold text-brand-ink">{formatRupiah(targetResult.currentMonthlyIdr)}</p>
              <p className="text-xs text-slate-400">~ {formatKwh(targetResult.currentMonthlyKwh)}/bulan</p>
            </div>
            <div className="rounded-2xl border border-green-100 bg-green-50 p-5">
              <p className="text-xs font-semibold text-green-700">Potensi Hemat ({targetPercent}%)</p>
              <p className="mt-2 text-xl font-extrabold text-green-700">{formatRupiah(targetResult.targetSavedIdr)}</p>
              <p className="text-xs text-green-600">~ {formatKwh(targetResult.targetSavedKwh)}/bulan</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-100 bg-white p-5 text-sm text-slate-600">
            <p className="flex items-center gap-2 font-bold text-brand-ink">
              <Sparkles className="h-4 w-4 text-brand-green" /> Perkiraan Usaha yang Dibutuhkan
            </p>
            <p className="mt-2">
              Untuk mencapai target ini, Anda perlu memangkas rata-rata sekitar{" "}
              <strong>{targetResult.requiredDailyHourCut} jam pemakaian setara/hari</strong> dari total peralatan aktif -
              misalnya mematikan alat berdaya besar lebih awal atau mengganti unit boros.
            </p>
            <p
              className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                targetResult.isRealistic
                  ? "bg-green-50 text-green-700"
                  : "bg-brand-yellowSoft text-yellow-800"
              }`}
            >
              {targetResult.isRealistic
                ? "Target tergolong realistis untuk usaha sejenis."
                : "Target cukup agresif - butuh perubahan operasional besar / investasi alat."}
            </p>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-[11px] leading-relaxed text-slate-500">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
        <p>
          <strong>Disclaimer:</strong> {DISCLAIMER}
        </p>
      </div>
    </div>
  );
}

function ResultCard({
  result,
}: {
  result: {
    beforeKwh: number;
    afterKwh: number;
    savedKwh: number;
    beforeIdr: number;
    afterIdr: number;
    savedIdr: number;
    savedPercent: number;
    assumption: string;
  };
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-slate-100 bg-slate-50/40 p-5">
      <div className="grid grid-cols-3 items-center gap-2 text-center">
        <div>
          <p className="text-xs text-slate-400">Sebelum</p>
          <p className="text-lg font-extrabold text-brand-ink">{formatKwh(result.beforeKwh)}</p>
          <p className="text-xs text-slate-400">{formatRupiah(result.beforeIdr)}</p>
        </div>
        <ArrowRight className="mx-auto h-5 w-5 text-slate-300" />
        <div>
          <p className="text-xs text-slate-400">Sesudah</p>
          <p className="text-lg font-extrabold text-brand-green">{formatKwh(result.afterKwh)}</p>
          <p className="text-xs text-slate-400">{formatRupiah(result.afterIdr)}</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 rounded-xl border border-green-100 bg-green-50 py-3 text-green-700">
        <TrendingDown className="h-5 w-5" />
        <span className="font-extrabold">
          Hemat {formatRupiah(result.savedIdr)}/bulan ({result.savedPercent}%)
        </span>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        <strong>Asumsi:</strong> {result.assumption}
      </p>
    </div>
  );
}
