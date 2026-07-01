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
import { pemakaianHarian, pemakaianPeralatan, ringkasan, tagihanBulanan } from "@/lib/mock-data";
import { formatKwh, formatRupiah } from "@/lib/utils";

export default function DashboardPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div>
      <PageHeader
        title="Dashboard Pemantauan Listrik"
        subtitle="Ringkasan pemakaian listrik Laundry Berkah, Purwokerto. Semua angka adalah contoh untuk demo."
      />

      <div className="mb-6 rounded-2xl border border-yellow-100 bg-brand-yellowSoft p-4 shadow-card">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-yellow-700 shadow-card">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h2 className="text-sm font-bold text-yellow-900">Pemakaian Tidak Normal Terdeteksi</h2>
            <p className="mt-1 text-sm leading-relaxed text-yellow-800">
              Pemakaian listrik naik <strong>{ringkasan.kenaikanVsMingguLalu}%</strong> dibanding
              rata-rata minggu lalu. Periksa penggunaan mesin pengering dan setrika.
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
          helper="Total pemakaian bulan berjalan"
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
          value="Perlu Perhatian"
          helper="Ada kenaikan pemakaian yang perlu dicek"
          tone="red"
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
          <section className="card lg:col-span-8">
            <div className="mb-5">
              <h2 className="font-bold">Tagihan Listrik 6 Bulan Terakhir</h2>
              <p className="mt-1 text-xs text-slate-500">Batang kuning adalah prediksi bulan ini.</p>
            </div>
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
          </section>

          <section className="card lg:col-span-4">
            <div className="mb-5">
              <h2 className="font-bold">Estimasi Pemakaian per Alat</h2>
              <p className="mt-1 text-xs text-slate-500">Perkiraan pembagian kWh bulan ini.</p>
            </div>
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
            <div className="mt-3 space-y-2">
              {pemakaianPeralatan.map((item) => (
                <div key={item.nama} className="flex items-center justify-between gap-2 text-xs">
                  <span className="flex items-center gap-2 font-semibold text-slate-600">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.warna }} />
                    {item.nama}
                  </span>
                  <span className="text-slate-500">{formatKwh(item.kwh)}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="card lg:col-span-12">
            <div className="mb-5">
              <h2 className="font-bold">Pemakaian Listrik Harian Bulan Ini</h2>
              <p className="mt-1 text-xs text-slate-500">Garis biru menunjukkan pemakaian normal sebagai pembanding.</p>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={pemakaianHarian} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                  <XAxis dataKey="hari" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: "#64748b" }} />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatKwh(value),
                      name === "kwh" ? "Pemakaian aktual" : "Pemakaian normal",
                    ]}
                    contentStyle={{ borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 4px 20px -8px rgba(15,23,42,.18)" }}
                  />
                  <Line type="monotone" dataKey="normal" stroke="#2563eb" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  <Line type="monotone" dataKey="kwh" stroke="#16a34a" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 7 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </section>
        </div>
      )}

      <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold">Ingin mengurangi biaya listrik bulan ini?</h2>
          <p className="mt-1 text-sm text-slate-500">Lihat saran hemat yang paling mudah dilakukan untuk usaha laundry.</p>
        </div>
        <Link href="/dashboard/rekomendasi" className="btn-primary">
          Lihat Rekomendasi
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}