import { AlertTriangle, Clock, DollarSign, Info, Search } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/ui/common";
import { anomaliCards, tabelAnomali } from "@/lib/mock-data";
import { formatKwh } from "@/lib/utils";

export default function AnomaliPage() {
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
            <h3 className="text-sm font-bold">Lonjakan Pemakaian Terdeteksi</h3>
          </div>
          <p className="font-semibold text-red-900">{anomaliCards.judulLonjakan}</p>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center gap-2 text-slate-500">
            <Clock className="h-5 w-5 text-brand-blue" />
            <h3 className="text-sm font-bold">Waktu Kemungkinan Terjadi</h3>
          </div>
          <p className="font-semibold">{anomaliCards.waktu}</p>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center gap-2 text-slate-500">
            <Search className="h-5 w-5 text-brand-yellow" />
            <h3 className="text-sm font-bold">Kemungkinan Penyebab</h3>
          </div>
          <p className="text-sm font-medium leading-relaxed">{anomaliCards.kemungkinanPenyebab}</p>
        </div>

        <div className="card">
          <div className="mb-3 flex items-center gap-2 text-slate-500">
            <DollarSign className="h-5 w-5 text-brand-green" />
            <h3 className="text-sm font-bold">Dampak Estimasi</h3>
          </div>
          <p className="text-sm font-medium leading-relaxed">{anomaliCards.dampakEstimasi}</p>
        </div>
      </div>

      <div className="mt-8">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-bold">Riwayat Deteksi Bulan Ini</h2>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Info className="h-4 w-4" />
            Berdasarkan perbandingan kWh harian
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="whitespace-nowrap px-6 py-4 font-bold">Tanggal</th>
                  <th className="whitespace-nowrap px-6 py-4 font-bold">Pemakaian Normal</th>
                  <th className="whitespace-nowrap px-6 py-4 font-bold">Pemakaian Terdeteksi</th>
                  <th className="whitespace-nowrap px-6 py-4 font-bold">Status</th>
                  <th className="min-w-[250px] px-6 py-4 font-bold">Saran</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tabelAnomali.map((row) => (
                  <tr key={row.tanggal} className="transition hover:bg-slate-50/50">
                    <td className="whitespace-nowrap px-6 py-4 font-medium">{row.tanggal}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-slate-500">{formatKwh(row.normal)}</td>
                    <td className="whitespace-nowrap px-6 py-4 font-semibold text-brand-ink">
                      {formatKwh(row.terdeteksi)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <StatusBadge status={row.status} />
                    </td>
                    <td className="px-6 py-4 text-xs leading-relaxed text-slate-600">{row.saran}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}