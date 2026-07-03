export default function AnomaliLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="mb-8 border-b border-slate-200/40 pb-5">
        <div className="h-8 w-64 rounded-lg bg-slate-200" />
        <div className="mt-2 h-4 w-96 rounded-lg bg-slate-100" />
      </div>

      <div className="card p-6 bg-white h-44 flex gap-4 items-center border border-slate-100">
        <div className="h-10 w-10 rounded-xl bg-slate-100 shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-5 w-48 rounded bg-slate-200" />
          <div className="h-4 w-full rounded bg-slate-100" />
        </div>
      </div>

      <div className="space-y-4">
        <div className="h-6 w-32 rounded bg-slate-200" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card p-5 bg-white border border-slate-100 flex justify-between items-center">
            <div className="space-y-2">
              <div className="h-4 w-40 rounded bg-slate-200" />
              <div className="h-3 w-72 rounded bg-slate-100" />
            </div>
            <div className="h-6 w-20 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
