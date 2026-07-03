export default function LoadingPeralatan() {
  return (
    <div className="space-y-6">
      <div className="h-20 animate-pulse rounded-2xl bg-slate-100" />
      <div className="grid gap-4 md:grid-cols-3">
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
        <div className="h-32 animate-pulse rounded-2xl bg-slate-100" />
      </div>
      <div className="h-80 animate-pulse rounded-2xl bg-slate-100" />
    </div>
  );
}