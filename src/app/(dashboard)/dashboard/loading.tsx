export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Skeleton Page Header */}
      <div className="mb-8 border-b border-slate-200/40 pb-5">
        <div className="h-8 w-64 rounded-lg bg-slate-200" />
        <div className="mt-2 h-4 w-96 rounded-lg bg-slate-100" />
      </div>

      {/* Skeleton Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="card flex flex-col gap-3 p-5 border-t-4 border-t-slate-200 bg-white">
            <div className="flex items-center justify-between">
              <div className="h-4 w-28 rounded bg-slate-200" />
              <div className="h-9 w-9 rounded-xl bg-slate-100" />
            </div>
            <div className="my-1">
              <div className="h-8 w-24 rounded bg-slate-200" />
            </div>
            <div className="mt-auto h-3 w-32 rounded bg-slate-100 pt-2" />
          </div>
        ))}
      </div>

      {/* Skeleton Charts */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="card lg:col-span-8 p-5 bg-white h-80 flex flex-col justify-between">
          <div>
            <div className="h-5 w-40 rounded bg-slate-200" />
            <div className="mt-1 h-3 w-60 rounded bg-slate-100" />
          </div>
          <div className="h-48 w-full rounded bg-slate-100" />
        </div>

        <div className="card lg:col-span-4 p-5 bg-white h-80 flex flex-col justify-between">
          <div>
            <div className="h-5 w-40 rounded bg-slate-200" />
            <div className="mt-1 h-3 w-48 rounded bg-slate-100" />
          </div>
          <div className="h-36 w-36 rounded-full bg-slate-100 mx-auto" />
          <div className="h-4 w-24 rounded bg-slate-200 mx-auto" />
        </div>
      </div>
    </div>
  );
}
