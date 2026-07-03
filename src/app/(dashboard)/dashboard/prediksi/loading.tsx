export default function PrediksiLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="mb-8 border-b border-slate-200/40 pb-5">
        <div className="h-8 w-56 rounded-lg bg-slate-200" />
        <div className="mt-2 h-4 w-80 rounded-lg bg-slate-100" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="card flex flex-col gap-3 p-5 border-t-4 border-t-slate-200 bg-white">
            <div className="h-4 w-28 rounded bg-slate-200" />
            <div className="h-8 w-32 rounded bg-slate-200" />
            <div className="h-3 w-40 rounded bg-slate-100" />
          </div>
        ))}
      </div>

      <div className="card p-5 bg-white h-72 flex flex-col justify-between">
        <div>
          <div className="h-5 w-48 rounded bg-slate-200" />
          <div className="mt-1 h-3 w-64 rounded bg-slate-100" />
        </div>
        <div className="h-44 w-full rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}
