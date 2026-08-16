'use client';

import { Sparkles, Clock } from 'lucide-react';
import { useBeginnerGuide } from './BeginnerGuideContext';

export function BeginnerWelcomeBanner() {
  const { isCompleted, isBannerDismissed, isGuideOpen, startGuide, dismissBanner } =
    useBeginnerGuide();

  if (isCompleted || isBannerDismissed || isGuideOpen) {
    return null;
  }

  return (
    <section
      aria-label="Panduan pemula WattWise"
      className="relative overflow-hidden rounded-2xl border border-[var(--primary)]/30 bg-[var(--primary-soft)]/60 p-4 sm:p-5 transition-all shadow-xs"
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs"
          >
            <Sparkles className="h-4.5 w-4.5" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight text-[var(--foreground)]">
                Baru pertama kali menggunakan WattWise?
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--primary)]/25 bg-[var(--surface)] px-2 py-0.5 text-[10px] font-bold text-[var(--primary)]">
                <Clock className="h-3 w-3" aria-hidden="true" />
                ± 2 menit
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm leading-5 text-[var(--muted)] max-w-2xl">
              Ikuti panduan singkat untuk memahami alur dari mencatat tagihan hingga menentukan tindakan hemat.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
          <button
            type="button"
            onClick={dismissBanner}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-xs font-bold text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition"
          >
            Nanti saja
          </button>
          <button
            type="button"
            onClick={() => startGuide(0)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-extrabold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition shadow-xs"
          >
            Mulai panduan →
          </button>
        </div>
      </div>
    </section>
  );
}