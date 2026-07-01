"use client";

import { useEffect, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  DollarSign,
  HelpCircle,
  Info,
  TrendingDown,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, StatCard, StatusBadge } from "@/components/ui/common";
import { prediksi, proyeksiBulanIni } from "@/lib/mock-data";
import { formatKwh, formatRupiah } from "@/lib/utils";

export default function PrediksiPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <div>
      <PageHeader
        title="Prediksi Tagihan Listrik"
        subtitle="Perkiraan biaya listrik bulan ini agar Anda bisa merencanakan kas usaha lebih baik."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Prediksi Tagihan Bulan Ini"
          value={formatRupiah(prediksi.prediksiTagihan)}
          helper="Estimasi biaya hingga akhir bulan"
          tone="blue"
          icon={<DollarSign className="h-5 w-5" />}
        />
        <StatCard
          label="Tagihan Bulan Lalu"
          value={formatRupiah(prediksi.tagihanBulanLalu)}
          helper="Untuk perbandingan"
          tone="slate"
          icon={<TrendingDown className="h-5 w-5" />}
        />
        <StatCard
          label="Perbandingan Bulan Lalu"
          value={`+${prediksi.kenaikanPersen}%`}
          helper="Kenaikan estimasi bulan ini"
          tone="red"
          icon={<ArrowUpRight className="h-5 w-5" />}
        />
        <StatCard
          label="Tingkat Risiko"
          value={prediksi.risikoLevel}
          helper="Risiko pemborosan listrik"
          tone="yellow"
          icon={<AlertTriangle className="h-5 w-5" />}
          badge={prediksi.risikoLevel}
        />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-12">
        <section className="card flex flex-col justify-between lg:col-span-4">
          <div>
            <h2 className="flex items-center gap-2 font-bold">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              Penyebab Utama Kenaikan
            </h2>
            <p className="mt-3 rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm font-medium leading-relaxed text-slate-600">
              “{prediksi.alasanUtama}”
            </p>
            <div className="mt-4">
              <StatusBadge status={prediksi.risikoLevel} />
            </div>
          </div>

          <div className="mt-6 border-t border-slate-100 pt-5">
            <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400">
              <Info className="h-4 w-4" />
              Penjelasan Sederhana
            </h3>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{prediksi.penjelasan}</p>
          </div>
        </section>

        <section className="card lg:col-span-8">
          <div className="mb-5">
            <h2 className="font-bold">Proyeksi Pemakaian Listrik</h2>
            <p className="mt-1 text-xs text-slate-500">
              Garis hijau adalah pemakaian aktual. Garis kuning putus-putus adalah prediksi hingga akhir bulan.
            </p>
          </div>

          {mounted && (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={proyeksiBulanIni} margin={{ top: 10, right: 10, left: -22, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="hari"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: "#64748b" }}
                    tickFormatter={(v: string) => `Tgl ${v}`}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    tickFormatter={(v: number) => `${v} kWh`}
                  />
                  <Tooltip
                    formatter={(value: number, name: string) => [
                      formatKwh(value),
                      name === "aktual" ? "Pemakaian Aktual" : "Prediksi",
                    ]}
                    contentStyle={{
                      borderRadius: 14,
                      border: "1px solid #e2e8f0",
                      boxShadow: "0 4px 20px -8px rgba(15,23,42,.18)",
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Line
                    name="Aktual"
                    type="monotone"
                    dataKey="aktual"
                    stroke="#16a34a"
                    strokeWidth={3}
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 7 }}
                    connectNulls
                  />
                  <Line
                    name="Prediksi"
                    type="monotone"
                    dataKey="proyeksi"
                    stroke="#eab308"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ r: 4, strokeWidth: 2 }}
                    activeDot={{ r: 7 }}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-green-100 bg-brand-greenSoft p-5">
        <HelpCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-greenDark" />
        <div>
          <h4 className="text-sm font-bold text-brand-greenDark">Saran Singkat WattWise AI</h4>
          <p className="mt-1 text-xs leading-relaxed text-green-800">
            Anda dapat menurunkan proyeksi biaya ini sekitar <strong>10-15%</strong> jika membagi
            waktu penggunaan alat berdaya besar di luar jam operasional sore.
          </p>
        </div>
      </div>
    </div>
  );
}