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
import { formatKwh, formatRupiah } from "@/lib/utils";

interface PrediksiClientProps {
  prediksi: {
    prediksiTagihan: number;
    tagihanBulanLalu: number;
    kenaikanPersen: number;
    risikoLevel: string;
    alasanUtama: string;
    penjelasan: string;
  };
  proyeksiBulanIni: {
    hari: string;
    aktual: number | null;
    proyeksi: number | null;
  }[];
}

export default function PrediksiClient({ prediksi, proyeksiBulanIni }: PrediksiClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
          value={prediksi.kenaikanPersen >= 0 ? `+${prediksi.kenaikanPersen}%` : `${prediksi.kenaikanPersen}%`}
          helper="Kenaikan estimasi bulan ini"
          tone={prediksi.kenaikanPersen > 0 ? "red" : "green"}
          icon={<ArrowUpRight className="h-5 w-5" />}
        />
        <StatCard
          label="Tingkat Risiko"
          value={prediksi.risikoLevel}
          helper="Risiko pemborosan listrik"
          tone={prediksi.risikoLevel === "HIGH" || prediksi.risikoLevel === "Tinggi" ? "red" : prediksi.risikoLevel === "MEDIUM" || prediksi.risikoLevel === "Sedang" ? "yellow" : "green"}
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
              Garis hijau adalah pemakaian aktual harian. Garis kuning putus-putus adalah prediksi proyeksi ke depan.
            </p>
          </div>

          {mounted && proyeksiBulanIni.length > 0 ? (
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
                      name === "Aktual" ? "Pemakaian Aktual" : "Prediksi/Proyeksi",
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
                    name="Proyeksi"
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
          ) : (
            <div className="h-80 flex items-center justify-center border border-dashed border-slate-200 rounded-2xl bg-slate-50">
              <p className="text-slate-400 text-xs">Belum ada data pemakaian harian untuk proyeksi grafik.</p>
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

      <div className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
        <div>
          <h4 className="text-sm font-bold text-slate-700">Disclaimer / Penafian Penting</h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            Prediksi tagihan dan proyeksi ini dibuat untuk tujuan estimasi perencanaan dan didasarkan pada data input pengguna. Hasil ini <strong>bukan merupakan tagihan resmi PLN</strong>. Layanan WattWise AI tidak berafiliasi atau terhubung secara resmi dengan PT PLN (Persero).
          </p>
        </div>
      </div>
    </div>
  );
}
