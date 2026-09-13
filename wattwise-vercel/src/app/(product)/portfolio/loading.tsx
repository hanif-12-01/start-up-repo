import React from 'react';

export default function PortfolioLoading() {
  return (
    <div
      className="min-h-screen bg-[var(--background)] px-4 py-6 sm:px-6 lg:px-10 lg:py-9 animate-pulse"
      aria-busy="true"
      aria-label="Memuat data portofolio..."
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="h-14 w-1/3 rounded-2xl bg-[var(--surface-muted)]" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-28 rounded-2xl bg-[var(--surface-muted)]" />
          <div className="h-28 rounded-2xl bg-[var(--surface-muted)]" />
          <div className="h-28 rounded-2xl bg-[var(--surface-muted)]" />
          <div className="h-28 rounded-2xl bg-[var(--surface-muted)]" />
        </div>
        <div className="h-24 rounded-2xl bg-[var(--surface-muted)]" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="h-44 rounded-2xl bg-[var(--surface-muted)]" />
          <div className="h-44 rounded-2xl bg-[var(--surface-muted)]" />
          <div className="h-44 rounded-2xl bg-[var(--surface-muted)]" />
        </div>
        <div className="h-64 rounded-2xl bg-[var(--surface-muted)]" />
        <div className="h-80 rounded-2xl bg-[var(--surface-muted)]" />
      </div>
    </div>
  );
}
