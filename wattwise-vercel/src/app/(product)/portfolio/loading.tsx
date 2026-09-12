export default function PortfolioLoading() {
  return (
    <main
      className="min-h-screen bg-[var(--background)] px-4 py-6 text-[var(--foreground)] sm:px-6 lg:px-10 lg:py-9 animate-pulse"
      aria-busy="true"
      aria-label="Memuat data portfolio semua usaha..."
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 border-b border-[var(--border)] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <div className="h-4 w-28 bg-[var(--surface-elevated)] rounded-md" />
            <div className="h-8 w-48 bg-[var(--surface-elevated)] rounded-md" />
            <div className="h-4 w-72 bg-[var(--surface-elevated)] rounded-md" />
          </div>
          <div className="h-10 w-36 bg-[var(--surface-elevated)] rounded-xl" />
        </div>

        {/* 4 Summary Cards Skeleton */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-36 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-5"
            />
          ))}
        </div>

        {/* Health Banner Skeleton */}
        <div className="h-20 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5" />

        {/* Attention Section Skeleton */}
        <div className="h-48 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6" />

        {/* Contributors Skeleton */}
        <div className="h-44 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6" />

        {/* Trend Section Skeleton */}
        <div className="h-64 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6" />

        {/* Locations Table Skeleton */}
        <div className="h-72 rounded-2xl border border-[var(--border)] bg-[var(--surface-elevated)] p-6" />
      </div>
    </main>
  );
}
