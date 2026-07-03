import { PageHeader } from "@/components/ui/common";

export default function LaporanLoading() {
  return (
    <div className="max-w-5xl">
      <PageHeader
        title="Laporan Bulanan Listrik"
        subtitle="Memuat pratinjau laporan berbasis data usaha dan pemakaian listrik terbaru..."
      />
      <div className="card animate-pulse space-y-6">
        <div className="h-8 w-56 rounded-xl bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="h-28 rounded-2xl bg-slate-100" />
          <div className="h-28 rounded-2xl bg-slate-100" />
        </div>
        <div className="h-40 rounded-2xl bg-slate-100" />
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="h-24 rounded-2xl bg-slate-100" />
          <div className="h-24 rounded-2xl bg-slate-100" />
          <div className="h-24 rounded-2xl bg-slate-100" />
        </div>
      </div>
    </div>
  );
}