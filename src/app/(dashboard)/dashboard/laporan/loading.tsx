import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/common";

export default function LaporanLoading() {
  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Laporan Bulanan Listrik"
        subtitle="Memuat pratinjau laporan berbasis data usaha dan pemakaian listrik terbaru..."
      />
      <div className="card flex min-h-[400px] flex-col items-center justify-center text-center">
        <Loader2 className="h-9 w-9 animate-spin text-brand-green" />
        <p className="mt-4 text-sm font-semibold text-slate-500">Mempersiapkan laporan...</p>
      </div>
    </div>
  );
}