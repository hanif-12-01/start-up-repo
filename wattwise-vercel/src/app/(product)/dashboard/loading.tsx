export default function DashboardLoading() {
  return (
    <main className="min-h-screen bg-slate-950 p-4 text-slate-100 md:p-10" aria-busy="true">
      <div className="mx-auto max-w-6xl space-y-6">
        <p className="sr-only">Memuat dashboard</p>
        <div className="h-40 animate-pulse rounded-2xl border border-slate-800 bg-slate-900 motion-reduce:animate-none" />
        <div className="h-56 animate-pulse rounded-2xl border border-slate-800 bg-slate-900 motion-reduce:animate-none" />
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="h-72 animate-pulse rounded-2xl border border-slate-800 bg-slate-900 motion-reduce:animate-none" />
          <div className="h-72 animate-pulse rounded-2xl border border-slate-800 bg-slate-900 motion-reduce:animate-none" />
        </div>
      </div>
    </main>
  );
}
