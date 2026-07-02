"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Zap,
  Info,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui/common";
import { formatKwh, formatRupiah } from "@/lib/utils";
import type { ApplianceEfficiencyResult, ApplianceEfficiencyStatus } from "@/services/appliance-efficiency";

interface DashboardClientProps {
  ringkasan: {
    tagihanBulanLalu: number;
    prediksiBulanIni: number;
    kwhBulanIni: number;
    potensiHemat: number;
    energyScore: number;
    statusPemakaian: "Aman" | "Perlu Perhatian" | "Boros" | "Belum Ada Data";
    kenaikanVsMingguLalu: number;
    hasAnomaly: boolean;
    anomalyDesc: string | null;
    businessName: string;
    hasElectricityData: boolean;
    isFirstMonthOnly: boolean;
    hasTrendComparison: boolean;
  };
  tagihanBulanan: {
    bulan: string;
    tagihan: number;
    kwh: number;
    prediksi: boolean;
  }[];
  pemakaianHarian: {
    hari: string;
    kwh: number;
    normal: number;
  }[];
  pemakaianPeralatan: {
    nama: string;
    kwh: number;
    warna: string;
  }[];
  efisiensiPeralatan: ApplianceEfficiencyResult[];
}

export default function DashboardClient({
  ringkasan,
  tagihanBulanan,
  pemakaianHarian,
  pemakaianPeralatan,
  efisiensiPeralatan,
}: DashboardClientProps) {
  const [mounted, setMounted] = useState(false);
  const topPerluPerhatian = [...efisiensiPeralatan]
    .filter((item) => item.status !== "Efisien" && item.status !== "Normal")
    .sort((a, b) => statusRank[b.status] - statusRank[a.status] || b.contributionPercent - a.contributionPercent)
    .slice(0, 3);

  useEffect(() => setMounted(true), []);

  const contributionLabel = ringkasan.hasElectricityData
    ? "Kontribusi terhadap pemakaian bulanan"
    : "Kontribusi terhadap estimasi total peralatan";

  return (
    <div>
      <PageHeader
        title="Dashboard Pemantauan Listrik"
        subtitle={`Ringkasan pemakaian listrik ${ringkasan.businessName}. Ringkasan berdasarkan data input manual yang tersimpan di database.`}
      />

      {/* Info banner for no electricity data */}
      {!ringkasan.hasElectricityData && (
        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5 shadow-sm backdrop-blur-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4 items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white border border-blue-100 text-blue-600 shadow-sm">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Mulai Analisis Listrik Anda</h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500 leading-relaxed">
                Masukkan data listrik bulanan pertama untuk mulai melihat analisis pemakaian.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/input"
            className="btn-primary py-2 px-4 shadow-sm text-xs font-bold shrink-0 self-start sm:self-auto"
          >
            Input Data Pertama
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Info banner for first month only */}
      {ringkasan.hasElectricityData && ringkasan.isFirstMonthOnly && (
        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50/60 p-5 shadow-sm backdrop-blur-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4 items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white border border-blue-100 text-blue-600 shadow-sm">
              <Info className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Data Pertama Tersimpan</h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500 leading-relaxed">
                Data bulan pertama tersimpan. Tambahkan data bulan berikutnya agar tren pemakaian bisa dianalisis.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/input"
            className="btn-primary py-2 px-4 shadow-sm text-xs font-bold shrink-0 self-start sm:self-auto"
          >
            Input Data Baru
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Warning Anomaly banner */}
      {ringkasan.hasElectricityData && ringkasan.hasAnomaly && (
        <div className="mb-6 rounded-2xl border border-rose-100 bg-rose-50/60 p-5 shadow-sm backdrop-blur-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4 items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white border border-rose-100 text-rose-600 shadow-sm animate-pulse-soft">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pemakaian Tidak Normal Terdeteksi</h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500 leading-relaxed">
                {ringkasan.anomalyDesc || "Terdeteksi adanya lonjakan atau ketidakwajaran pemakaian listrik."}
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/anomali"
            className="btn bg-rose-600 text-white hover:bg-rose-700 py-2 px-4 shadow-sm text-xs font-bold shrink-0 self-start sm:self-auto"
          >
            Lihat Detail Anomali
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      {/* Fallback if no anomaly but general check needed (only show warning if enough data is available to compare) */}
      {ringkasan.hasElectricityData && ringkasan.hasTrendComparison && !ringkasan.hasAnomaly && ringkasan.statusPemakaian !== "Aman" && ringkasan.statusPemakaian !== "Belum Ada Data" && (
        <div className="mb-6 rounded-2xl border border-amber-100 bg-amber-50/60 p-5 shadow-sm backdrop-blur-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-4 items-center">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white border border-amber-100 text-amber-600 shadow-sm">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900">Pemakaian Perlu Perhatian</h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500 leading-relaxed">
                Peringatan: Pemakaian listrik Anda bulan ini cenderung naik dibandingkan bulan lalu. Silakan cek peralatan Anda.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/anomali"
            className="btn bg-amber-600 text-white hover:bg-amber-700 py-2 px-4 shadow-sm text-xs font-bold shrink-0 self-start sm:self-auto"
          >
            Lihat Analisis Tren
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Estimasi Tagihan Bulan Ini"
          value={ringkasan.hasElectricityData ? formatRupiah(ringkasan.prediksiBulanIni) : "-"}
          helper={ringkasan.hasElectricityData ? `Bulan lalu ${formatRupiah(ringkasan.tagihanBulanLalu)}` : "Masukkan data bulanan pertama"}
          tone="blue"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Pemakaian kWh Bulan Ini"
          value={ringkasan.hasElectricityData ? formatKwh(ringkasan.kwhBulanIni) : "-"}
          helper="Total pemakaian dari input data"
          tone="yellow"
          icon={<Zap className="h-5 w-5" />}
        />
        <StatCard
          label="Potensi Penghematan"
          value={formatRupiah(ringkasan.potensiHemat)}
          helper="Estimasi hemat jika saran dijalankan"
          tone="green"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          label="Energy Score"
          value={ringkasan.hasElectricityData ? `${ringkasan.energyScore}/100` : "-"}
          helper="Semakin tinggi semakin efisien"
          tone="slate"
          icon={<Award className="h-5 w-5" />}
        />
        <StatCard
          label="Status Pemakaian"
          value={
            ringkasan.statusPemakaian === "Belum Ada Data"
              ? "Belum Ada Data"
              : ringkasan.statusPemakaian === "Aman"
              ? "Efisien"
              : ringkasan.statusPemakaian === "Boros"
              ? "Boros"
              : "Perlu Perhatian"
          }
          helper="Status efisiensi pemakaian"
          tone={
            ringkasan.statusPemakaian === "Belum Ada Data"
              ? "slate"
              : ringkasan.statusPemakaian === "Boros"
              ? "red"
              : ringkasan.statusPemakaian === "Perlu Perhatian"
              ? "yellow"
              : "green"
          }
          icon={<AlertTriangle className="h-5 w-5" />}
          sub={
            <div className="mt-2">
              <StatusBadge status={ringkasan.statusPemakaian} />
            </div>
          }
        />
      </div>

      {mounted && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          {/* Monthly usage history */}
          <section className="card lg:col-span-8">
            <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Tagihan Listrik Bulanan</h2>
                <p className="mt-0.5 text-xs text-slate-400 font-medium">Batang kuning adalah data bulan berjalan (prediksi berjalan).</p>
              </div>
            </div>
            {tagihanBulanan.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tagihanBulanan} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                    <XAxis dataKey="bulan" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 10, fill: "#94a3b8", fontWeight: 600 }}
                      tickFormatter={(v: number) => `Rp${(v / 1_000_000).toFixed(1)}jt`}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(241, 245, 249, 0.4)" }}
                      formatter={(value: number) => [formatRupiah(value), "Tagihan"]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #f1f5f9", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}
                    />
                    <Bar dataKey="tagihan" radius={[6, 6, 0, 0]} maxBarSize={40}>
                      {tagihanBulanan.map((entry) => (
                        <Cell key={entry.bulan} fill={entry.prediksi ? "#f59e0b" : "#3b82f6"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 text-xs font-semibold">
                Belum ada data bulanan. Masukkan data di menu Input Data.
              </div>
            )}
          </section>

          {/* Appliance breakdown */}
          <section className="card lg:col-span-4">
            <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Estimasi Pemakaian per Alat</h2>
                <p className="mt-0.5 text-xs text-slate-400 font-medium">Perkiraan pembagian kWh berdasarkan daya alat utama.</p>
              </div>
            </div>
            {pemakaianPeralatan.length > 0 ? (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pemakaianPeralatan} dataKey="kwh" innerRadius={55} outerRadius={78} paddingAngle={4}>
                        {pemakaianPeralatan.map((entry) => (
                          <Cell key={entry.nama} fill={entry.warna} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatKwh(value), "Pemakaian"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-2.5 max-h-40 overflow-y-auto pr-1">
                  {pemakaianPeralatan.map((item) => (
                    <div key={item.nama} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2 font-bold text-slate-600 truncate">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.warna }} />
                        <span className="truncate">{item.nama}</span>
                      </span>
                      <span className="text-slate-400 font-bold shrink-0">{formatKwh(item.kwh)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-52 flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 text-xs font-semibold">
                Belum ada data peralatan. Lengkapi profil usaha Anda.
              </div>
            )}
          </section>

          {/* Appliance efficiency classifier */}
          <section className="card lg:col-span-12">
            <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Top 3 Peralatan Perlu Perhatian</h2>
                <p className="mt-0.5 text-xs text-slate-400 font-medium">Klasifikasi efisiensi berdasarkan estimasi kWh, kontribusi, jam pakai, dan riwayat tagihan.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-bold text-slate-500 border border-slate-200/50">Estimasi, bukan nilai resmi PLN</span>
            </div>
            {topPerluPerhatian.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-3">
                {topPerluPerhatian.map((item) => (
                  <div key={item.applianceId} className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 hover:bg-slate-50 hover:shadow-sm transition-all duration-300 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-extrabold text-slate-800">{item.name}</h3>
                          <p className="mt-0.5 text-[11px] text-slate-400 font-semibold leading-relaxed">
                            {formatKwh(item.monthlyKwh)} · {item.contributionPercent.toFixed(1)}% {contributionLabel.toLowerCase()}
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${statusClass(item.status)}`}>{item.status}</span>
                      </div>
                      <div className="mt-4 space-y-2 border-t border-slate-200/40 pt-3">
                        <p className="text-xs leading-relaxed text-slate-600"><strong className="text-slate-800">Analisis:</strong> {item.reason}</p>
                        <p className="text-xs leading-relaxed text-slate-600"><strong className="text-emerald-700">Saran:</strong> {item.practicalAdvice}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-200/40 text-xs font-bold text-slate-700 bg-slate-100/50 rounded-lg p-2.5 text-center">
                      Estimasi: <span className="text-emerald-600">{formatRupiah(item.estimatedMonthlyCost)}/bln</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-6 text-sm text-slate-500 font-semibold text-center">
                Belum ada peralatan yang perlu perhatian khusus. Klasifikasi ini estimasi WattWise AI, bukan nilai resmi PLN.
              </div>
            )}
          </section>

          {/* Daily usage line chart */}
          <section className="card lg:col-span-12">
            <div className="mb-6 flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-bold text-slate-800">Pemakaian Listrik Harian Bulan Ini (kWh)</h2>
                <p className="mt-0.5 text-xs text-slate-400 font-medium">Garis biru putus-putus menunjukkan pemakaian normal acuan efisiensi.</p>
              </div>
            </div>
            {pemakaianHarian.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pemakaianHarian} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                    <XAxis dataKey="hari" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatKwh(value),
                        name === "kwh" ? "Pemakaian aktual" : "Acuan normal",
                      ]}
                      contentStyle={{ borderRadius: 12, border: "1px solid #f1f5f9", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)" }}
                    />
                    <Line type="monotone" dataKey="normal" stroke="#3b82f6" strokeWidth={2} strokeDasharray="6 4" dot={false} />
                    <Line type="monotone" dataKey="kwh" stroke="#10b981" strokeWidth={3.5} dot={{ r: 4, strokeWidth: 2, fill: "#fff" }} activeDot={{ r: 6 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400 text-xs font-semibold px-4 text-center">
                Belum ada data pemakaian harian. Masukkan data atau gunakan data bulanan untuk melihat ringkasan.
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modern Gradient CTA section */}
      <div className="mt-6 flex flex-col gap-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 p-6 shadow-md shadow-emerald-900/10 sm:flex-row sm:items-center sm:justify-between text-white border-0">
        <div>
          <h2 className="font-extrabold text-base tracking-wide text-white">Ingin mengurangi biaya listrik bulan ini?</h2>
          <p className="mt-1 text-xs text-emerald-100 font-medium">Lihat saran hemat yang dibuat khusus berdasarkan jenis usaha Anda.</p>
        </div>
        <Link href="/dashboard/rekomendasi" className="btn bg-white text-emerald-700 hover:bg-emerald-50 hover:scale-[1.02] shadow-sm py-2 px-5 text-xs font-bold shrink-0 self-start sm:self-auto border-0">
          Lihat Rekomendasi
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Disclaimers */}
      <div className="mt-8 flex gap-3.5 rounded-2xl border border-slate-200/50 bg-slate-100/40 p-5 shadow-xs">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        <div className="text-[11px] leading-relaxed text-slate-400 font-semibold">
          <p className="text-slate-500 font-bold">Pernyataan Penting (Disclaimer):</p>
          <ul className="list-disc pl-4 mt-1.5 space-y-1">
            <li>Estimasi tagihan dan analisis pemakaian listrik adalah proyeksi sistem WattWise AI.</li>
            <li>Hasil ini bukan merupakan lembar tagihan resmi PLN. Tagihan resmi diterbitkan oleh PLN di akhir periode.</li>
            <li>Layanan WattWise AI MVP 1 belum terhubung ke sistem pembacaan meteran otomatis (AMI) atau penagihan resmi PLN.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

const statusRank: Record<ApplianceEfficiencyStatus, number> = {
  Efisien: 0,
  Normal: 1,
  "Perlu Dicek": 2,
  Boros: 3,
  "Sangat Boros": 4,
};

function statusClass(status: ApplianceEfficiencyStatus): string {
  if (status === "Sangat Boros") return "bg-rose-50 border-rose-200 text-rose-700";
  if (status === "Boros") return "bg-orange-50 border-orange-200 text-orange-700";
  if (status === "Perlu Dicek") return "bg-amber-50 border-amber-200 text-amber-700";
  if (status === "Efisien") return "bg-emerald-50 border-emerald-200 text-emerald-700";
  return "bg-blue-50 border-blue-200 text-blue-700";
}
