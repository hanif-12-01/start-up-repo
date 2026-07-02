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
    statusPemakaian: "Aman" | "Perlu Perhatian" | "Boros";
    kenaikanVsMingguLalu: number;
    hasAnomaly: boolean;
    anomalyDesc: string | null;
    businessName: string;
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

  return (
    <div>
      <PageHeader
        title="Dashboard Pemantauan Listrik"
        subtitle={`Ringkasan pemakaian listrik ${ringkasan.businessName}. Data diperbarui secara real-time dari database.`}
      />

      {/* Warning Anomaly banner */}
      {ringkasan.hasAnomaly && (
        <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 p-4 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-red-700 shadow-card">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-red-950">Pemakaian Tidak Normal Terdeteksi</h2>
              <p className="mt-1 text-sm leading-relaxed text-red-900">
                {ringkasan.anomalyDesc || "Terdeteksi adanya lonjakan atau ketidakwajaran pemakaian listrik."}
              </p>
            </div>
            <Link
              href="/dashboard/anomali"
              className="inline-flex items-center gap-1 text-sm font-bold text-red-950 hover:underline"
            >
              Lihat detail
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      {/* Fallback if no anomaly but general check needed */}
      {!ringkasan.hasAnomaly && ringkasan.statusPemakaian !== "Aman" && (
        <div className="mb-6 rounded-2xl border border-yellow-100 bg-brand-yellowSoft p-4 shadow-card">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-yellow-700 shadow-card">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-yellow-900">Pemakaian Perlu Perhatian</h2>
              <p className="mt-1 text-sm leading-relaxed text-yellow-800">
                Peringatan: Pemakaian listrik Anda bulan ini cenderung naik dibandingkan bulan lalu. Silakan cek peralatan Anda.
              </p>
            </div>
            <Link
              href="/dashboard/anomali"
              className="inline-flex items-center gap-1 text-sm font-bold text-yellow-900 hover:underline"
            >
              Lihat detail
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Estimasi Tagihan Bulan Ini"
          value={formatRupiah(ringkasan.prediksiBulanIni)}
          helper={`Bulan lalu ${formatRupiah(ringkasan.tagihanBulanLalu)}`}
          tone="blue"
          icon={<TrendingUp className="h-5 w-5" />}
        />
        <StatCard
          label="Pemakaian kWh Bulan Ini"
          value={formatKwh(ringkasan.kwhBulanIni)}
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
          value={`${ringkasan.energyScore}/100`}
          helper="Semakin tinggi semakin efisien"
          tone="slate"
          icon={<Award className="h-5 w-5" />}
        />
        <StatCard
          label="Status Pemakaian"
          value={ringkasan.statusPemakaian === "Aman" ? "Efisien" : ringkasan.statusPemakaian === "Boros" ? "Boros" : "Perlu Perhatian"}
          helper="Status efisiensi pemakaian"
          tone={ringkasan.statusPemakaian === "Boros" ? "red" : ringkasan.statusPemakaian === "Perlu Perhatian" ? "yellow" : "green"}
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
            <div className="mb-5">
              <h2 className="font-bold">Tagihan Listrik Bulanan</h2>
              <p className="mt-1 text-xs text-slate-500">Batang kuning adalah data bulan berjalan (prediksi berjalan).</p>
            </div>
            {tagihanBulanan.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tagihanBulanan} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                    <XAxis dataKey="bulan" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                      tickFormatter={(v: number) => `Rp${(v / 1_000_000).toFixed(1)}jt`}
                    />
                    <Tooltip
                      cursor={{ fill: "#f8fafc" }}
                      formatter={(value: number) => [formatRupiah(value), "Tagihan"]}
                      contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 4px 20px -8px rgba(15,23,42,.18)" }}
                    />
                    <Bar dataKey="tagihan" radius={[8, 8, 0, 0]} maxBarSize={46}>
                      {tagihanBulanan.map((entry) => (
                        <Cell key={entry.bulan} fill={entry.prediksi ? "#eab308" : "#2563eb"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 text-xs">
                Belum ada data bulanan. Masukkan data di menu Input Data.
              </div>
            )}
          </section>

          {/* Appliance breakdown */}
          <section className="card lg:col-span-4">
            <div className="mb-5">
              <h2 className="font-bold">Estimasi Pemakaian per Alat</h2>
              <p className="mt-1 text-xs text-slate-500">Perkiraan pembagian kWh berdasarkan daya alat utama.</p>
            </div>
            {pemakaianPeralatan.length > 0 ? (
              <>
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pemakaianPeralatan} dataKey="kwh" innerRadius={52} outerRadius={78} paddingAngle={3}>
                        {pemakaianPeralatan.map((entry) => (
                          <Cell key={entry.nama} fill={entry.warna} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [formatKwh(value), "Pemakaian"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto pr-1">
                  {pemakaianPeralatan.map((item) => (
                    <div key={item.nama} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex items-center gap-2 font-semibold text-slate-600 truncate">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.warna }} />
                        <span className="truncate">{item.nama}</span>
                      </span>
                      <span className="text-slate-500 shrink-0">{formatKwh(item.kwh)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-52 flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 text-xs">
                Belum ada data peralatan. Lengkapi profil usaha Anda.
              </div>
            )}
          </section>

          {/* Appliance efficiency classifier */}
          <section className="card lg:col-span-12">
            <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="font-bold">Top 3 Peralatan Perlu Perhatian</h2>
                <p className="mt-1 text-xs text-slate-500">Klasifikasi efisiensi berdasarkan estimasi kWh, kontribusi, jam pakai, dan riwayat tagihan.</p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">Estimasi, bukan nilai resmi PLN</span>
            </div>
            {topPerluPerhatian.length > 0 ? (
              <div className="grid gap-3 md:grid-cols-3">
                {topPerluPerhatian.map((item) => (
                  <div key={item.applianceId} className="rounded-2xl border border-slate-100 bg-slate-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800">{item.name}</h3>
                        <p className="mt-1 text-xs text-slate-500">{formatKwh(item.monthlyKwh)} · {item.contributionPercent.toFixed(1)}% kontribusi</p>
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${statusClass(item.status)}`}>{item.status}</span>
                    </div>
                    <p className="mt-3 text-xs leading-relaxed text-slate-600">{item.reason}</p>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500">Saran: {item.practicalAdvice}</p>
                    <p className="mt-3 text-[11px] font-semibold text-slate-500">Estimasi biaya: {formatRupiah(item.estimatedMonthlyCost)}/bulan</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                Belum ada peralatan yang perlu perhatian khusus. Klasifikasi ini estimasi WattWise AI, bukan nilai resmi PLN.
              </div>
            )}
          </section>

          {/* Daily usage line chart */}
          <section className="card lg:col-span-12">
            <div className="mb-5">
              <h2 className="font-bold">Pemakaian Listrik Harian Bulan Ini (kWh)</h2>
              <p className="mt-1 text-xs text-slate-500">Garis biru menunjukkan pemakaian normal acuan efisiensi.</p>
            </div>
            {pemakaianHarian.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={pemakaianHarian} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                    <XAxis dataKey="hari" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatKwh(value),
                        name === "kwh" ? "Pemakaian aktual" : "Acuan normal",
                      ]}
                      contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 4px 20px -8px rgba(15,23,42,.18)" }}
                    />
                    <Line type="monotone" dataKey="normal" stroke="#2563eb" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                    <Line type="monotone" dataKey="kwh" stroke="#16a34a" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 7 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50 text-slate-400 text-xs">
                Belum ada data pemakaian harian.
              </div>
            )}
          </section>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold">Ingin mengurangi biaya listrik bulan ini?</h2>
          <p className="mt-1 text-sm text-slate-500">Lihat saran hemat yang dibuat khusus berdasarkan jenis usaha Anda.</p>
        </div>
        <Link href="/dashboard/rekomendasi" className="btn-primary shrink-0">
          Lihat Rekomendasi
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Disclaimers */}
      <div className="mt-6 flex gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-card">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        <div className="text-[11px] leading-relaxed text-slate-500">
          <p className="font-bold text-slate-600">Pernyataan Penting (Disclaimer):</p>
          <ul className="list-disc pl-4 mt-1 space-y-1">
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
  if (status === "Sangat Boros") return "bg-red-100 text-red-700";
  if (status === "Boros") return "bg-orange-100 text-orange-700";
  if (status === "Perlu Dicek") return "bg-yellow-100 text-yellow-700";
  if (status === "Efisien") return "bg-green-100 text-green-700";
  return "bg-blue-100 text-blue-700";
}
