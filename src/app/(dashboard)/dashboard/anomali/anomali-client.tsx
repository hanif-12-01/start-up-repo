"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Clock,
  DollarSign,
  Info,
  Search,
  Filter,
  CheckCircle,
} from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui/common";
import { cn, formatKwh, formatRupiah } from "@/lib/utils";
import { UpgradeCta } from "@/components/subscription/UpgradeCta";

interface AnomaliItem {
  id: string;
  tanggal: string;
  normal: number;
  terdeteksi: number;
  status: "Normal" | "Perlu Dicek" | "Boros";
  penyebab: string;
  costImpact: number;
  saran: string;
}

interface AnomaliClientProps {
  summary: {
    judulLonjakan: string;
    waktu: string;
    kemungkinanPenyebab: string;
    dampakEstimasi: string;
  };
  anomalies: AnomaliItem[];
  isFreePlan?: boolean;
}

export default function AnomaliClient({ summary, anomalies, isFreePlan = false }: AnomaliClientProps) {
  const [filter, setFilter] = useState<"ALL" | "Normal" | "Perlu Dicek" | "Boros">(
    "ALL"
  );

  const filteredAnomalies = anomalies.filter((a) => {
    if (filter === "ALL") return true;
    return a.status === filter;
  });

  return (
    <div>
      <PageHeader
        title="Indikasi Pemakaian Tidak Wajar"
        subtitle="WattWise AI mengidentifikasi indikasi pemakaian listrik yang tidak biasa. Segera periksa untuk mencegah tagihan membengkak. Disclaimer: Ini adalah indikasi awal berbasis data input, bukan diagnosis teknis atau bukti kerusakan alat."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 font-sans">
        <div className={cn(
          "card border-t-4",
          isFreePlan
            ? summary.judulLonjakan === "Pemakaian Normal"
              ? "border-t-green-500 bg-green-50/50 text-green-900"
              : "border-t-yellow-500 bg-yellow-50/50 text-yellow-900"
            : "border-t-red-500 bg-red-50/50 text-red-900"
        )}>
          <div className={cn(
            "mb-3 flex items-center gap-2 font-bold",
            isFreePlan
              ? summary.judulLonjakan === "Pemakaian Normal"
                ? "text-green-600"
                : "text-yellow-600"
              : "text-red-600"
          )}>
            <AlertTriangle className="h-5 w-5" />
            <h3 className="text-sm">Status Deteksi</h3>
          </div>
          <p className="font-semibold">
            {isFreePlan
              ? summary.judulLonjakan === "Pemakaian Normal"
                ? "Normal"
                : "Perlu dicek"
              : summary.judulLonjakan}
          </p>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center gap-2 text-slate-500">
            <Clock className="h-5 w-5 text-brand-blue" />
            <h3 className="text-sm font-bold">Estimasi Kejadian</h3>
          </div>
          <p className="font-semibold">
            {isFreePlan ? "Terkunci (Paket Pro)" : summary.waktu}
          </p>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center gap-2 text-slate-500">
            <Search className="h-5 w-5 text-brand-yellow" />
            <h3 className="text-sm font-bold">Kemungkinan Penyebab yang Perlu Dicek</h3>
          </div>
          <p className="text-sm font-medium leading-relaxed">
            {isFreePlan ? "Deteksi penyebab mendalam dinonaktifkan." : summary.kemungkinanPenyebab}
          </p>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center gap-2 text-slate-500">
            <DollarSign className="h-5 w-5 text-brand-green" />
            <h3 className="text-sm font-bold">Dampak Estimasi</h3>
          </div>
          <p className="text-sm font-medium leading-relaxed">
            {isFreePlan ? "Perhitungan kerugian dinonaktifkan." : summary.dampakEstimasi}
          </p>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold">Riwayat Deteksi Pemakaian</h2>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-2">
              <Filter className="h-3.5 w-3.5" />
              Saring:
            </div>
            <button
              onClick={() => setFilter("ALL")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === "ALL"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilter("Normal")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === "Normal"
                  ? "bg-green-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Normal
            </button>
            <button
              onClick={() => setFilter("Perlu Dicek")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === "Perlu Dicek"
                  ? "bg-yellow-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Perlu Dicek
            </button>
            <button
              onClick={() => setFilter("Boros")}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                filter === "Boros"
                  ? "bg-red-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Boros
            </button>
          </div>
        </div>

        {isFreePlan ? (
          <div className="relative p-8 border border-slate-200 rounded-2xl bg-white shadow-soft font-sans">
            <div className="absolute inset-0 bg-white/70 backdrop-blur-xs flex items-center justify-center z-10">
              <UpgradeCta 
                title="Riwayat Indikasi Pemakaian Tidak Wajar Terkunci"
                description="Detail riwayat kejadian anomali, klasifikasi penyebab, estimasi kerugian Rupiah, dan rekomendasi langkah perbaikan memerlukan paket Pro."
                href="/dashboard/paket-demo"
                buttonText="Coba Pro Trial"
              />
            </div>
            <div className="filter blur-xs opacity-35 select-none pointer-events-none overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-6 py-4">Tanggal</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Penyebab</th>
                    <th className="px-6 py-4">Estimasi Kerugian</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="px-6 py-4">Mei 2026</td>
                    <td className="px-6 py-4">Boros</td>
                    <td className="px-6 py-4">Kerusakan gasket freezer...</td>
                    <td className="px-6 py-4">Rp 450.000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : filteredAnomalies.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="whitespace-nowrap px-6 py-4 font-bold">Tanggal</th>
                    <th className="whitespace-nowrap px-6 py-4 font-bold">Pemakaian Normal</th>
                    <th className="whitespace-nowrap px-6 py-4 font-bold">Pemakaian Terdeteksi</th>
                    <th className="whitespace-nowrap px-6 py-4 font-bold">Status</th>
                    <th className="min-w-[200px] px-6 py-4 font-bold">Kemungkinan Penyebab yang Perlu Dicek</th>
                    <th className="whitespace-nowrap px-6 py-4 font-bold">Estimasi Kerugian</th>
                    <th className="min-w-[250px] px-6 py-4 font-bold">Saran Penanganan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAnomalies.map((row) => (
                    <tr key={row.id} className="transition hover:bg-slate-50/50">
                      <td className="whitespace-nowrap px-6 py-4 font-medium">{row.tanggal}</td>
                      <td className="whitespace-nowrap px-6 py-4 text-slate-500">{formatKwh(row.normal)}</td>
                      <td className="whitespace-nowrap px-6 py-4 font-semibold text-brand-ink">
                        {formatKwh(row.terdeteksi)}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4">
                        <StatusBadge
                          status={
                            row.status === "Normal"
                              ? "Aman"
                              : row.status === "Perlu Dicek"
                              ? "Perlu Perhatian"
                              : "Boros"
                          }
                        />
                      </td>
                      <td className="px-6 py-4 text-xs leading-relaxed text-slate-600">
                        {row.penyebab}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-red-600 font-semibold">
                        {row.costImpact > 0 ? formatRupiah(row.costImpact) : "-"}
                      </td>
                      <td className="px-6 py-4 text-xs leading-relaxed text-slate-600">
                        {row.saran}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-12 text-center rounded-2xl border border-dashed border-slate-200 bg-white">
            <CheckCircle className="h-10 w-10 text-green-500 mb-3" />
            <h3 className="font-bold text-slate-800">Tidak Ada Indikasi Pemakaian Tidak Wajar</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-sm">
              Semua pemakaian listrik terpantau normal sesuai dengan kapasitas alat terdaftar. Bagus sekali!
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <div>
          <h4 className="text-sm font-bold text-blue-800">Bagaimana kami mendeteksi indikasi pemakaian tidak wajar?</h4>
          <p className="mt-1 text-xs leading-relaxed text-blue-700 font-sans">
            WattWise AI membandingkan data pemakaian listrik harian dengan kapasitas standar dari peralatan yang didaftarkan pada profil properti atau usaha Anda. Jika terdeteksi konsumsi di luar batas wajar, sistem akan memberikan tanda peringatan. <strong>Disclaimer:</strong> Ini adalah indikasi awal berbasis data input, bukan diagnosis teknis atau bukti kerusakan alat.
          </p>
        </div>
      </div>
    </div>
  );
}