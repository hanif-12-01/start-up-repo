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
import { formatKwh, formatRupiah } from "@/lib/utils";

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
}

export default function AnomaliClient({ summary, anomalies }: AnomaliClientProps) {
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
        title="Deteksi Pemakaian Tidak Normal"
        subtitle="WattWise AI mendeteksi lonjakan pemakaian listrik yang tidak biasa. Segera periksa untuk mencegah tagihan membengkak."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card border-t-4 border-t-red-500 bg-red-50/50">
          <div className="mb-3 flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            <h3 className="text-sm font-bold">Status Deteksi</h3>
          </div>
          <p className="font-semibold text-red-900">{summary.judulLonjakan}</p>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center gap-2 text-slate-500">
            <Clock className="h-5 w-5 text-brand-blue" />
            <h3 className="text-sm font-bold">Estimasi Kejadian</h3>
          </div>
          <p className="font-semibold">{summary.waktu}</p>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center gap-2 text-slate-500">
            <Search className="h-5 w-5 text-brand-yellow" />
            <h3 className="text-sm font-bold">Kemungkinan Penyebab</h3>
          </div>
          <p className="text-sm font-medium leading-relaxed">{summary.kemungkinanPenyebab}</p>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center gap-2 text-slate-500">
            <DollarSign className="h-5 w-5 text-brand-green" />
            <h3 className="text-sm font-bold">Dampak Estimasi</h3>
          </div>
          <p className="text-sm font-medium leading-relaxed">{summary.dampakEstimasi}</p>
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

        {filteredAnomalies.length > 0 ? (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="whitespace-nowrap px-6 py-4 font-bold">Tanggal</th>
                    <th className="whitespace-nowrap px-6 py-4 font-bold">Pemakaian Normal</th>
                    <th className="whitespace-nowrap px-6 py-4 font-bold">Pemakaian Terdeteksi</th>
                    <th className="whitespace-nowrap px-6 py-4 font-bold">Status</th>
                    <th className="min-w-[200px] px-6 py-4 font-bold">Kemungkinan Penyebab</th>
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
            <h3 className="font-bold text-slate-800">Tidak Ada Anomali Ditemukan</h3>
            <p className="text-slate-500 text-xs mt-1 max-w-sm">
              Semua pemakaian listrik terpantau normal sesuai dengan kapasitas alat terdaftar. Bagus sekali!
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5">
        <Info className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
        <div>
          <h4 className="text-sm font-bold text-blue-800">Bagaimana kami mendeteksi anomali?</h4>
          <p className="mt-1 text-xs leading-relaxed text-blue-700">
            WattWise AI membandingkan data pemakaian listrik harian dengan kapasitas standar dari peralatan yang didaftarkan pada profil usaha Anda. Jika terdeteksi konsumsi di luar batas wajar (misalnya boiler bocor atau AC kotor), sistem akan memberikan tanda peringatan.
          </p>
        </div>
      </div>
    </div>
  );
}