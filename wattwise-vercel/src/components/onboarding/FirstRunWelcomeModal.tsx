'use client';

import React, { useEffect, useRef } from 'react';
import { Sparkles, ArrowRight, Check } from 'lucide-react';
import { InteractiveMotion } from '@/components/motion/InteractiveMotion';

export interface FirstRunWelcomeModalProps {
  isOpen: boolean;
  onSelectGuided: () => void;
  onSelectSelf: () => void;
}

export function FirstRunWelcomeModal({
  isOpen,
  onSelectGuided,
  onSelectSelf,
}: FirstRunWelcomeModalProps) {
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      primaryButtonRef.current?.focus();
    }
  }, [isOpen]);

  // Keyboard navigation: Escape selects self-service / closes
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onSelectSelf();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onSelectSelf]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-run-welcome-title"
      aria-describedby="first-run-welcome-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[var(--primary)] text-[var(--primary-foreground)] shadow-xs">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2
              id="first-run-welcome-title"
              className="text-xl sm:text-2xl font-black tracking-tight text-[var(--foreground)]"
            >
              Selamat datang di WattWise 👋
            </h2>
            <p
              id="first-run-welcome-desc"
              className="text-sm leading-relaxed text-[var(--muted)]"
            >
              WattWise membantu Anda memahami biaya listrik usaha, melihat perubahan yang perlu diperiksa, dan menentukan langkah yang bisa dilakukan berdasarkan data usaha Anda.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--primary)]/20 bg-[var(--primary-soft)]/50 p-4 space-y-2 text-xs sm:text-sm text-[var(--foreground)]">
          <p className="font-semibold text-[var(--primary)]">
            Kami bisa membimbing Anda dari awal
          </p>
          <p className="leading-relaxed text-[var(--muted)]">
            Tidak perlu memahami istilah teknis kelistrikan untuk mulai. Cukup isi informasi yang Anda tahu, lalu lanjutkan.
          </p>
          <div className="flex items-center gap-2 pt-1 text-xs text-[var(--muted)]">
            <Check className="h-4 w-4 text-[var(--primary)] shrink-0" aria-hidden="true" />
            <span>Anda bisa melewati informasi yang belum diketahui dan melengkapinya nanti.</span>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end pt-2">
          <button
            type="button"
            onClick={onSelectSelf}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5 text-xs sm:text-sm font-bold text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition order-2 sm:order-1 text-center"
          >
            Saya ingin isi sendiri
          </button>
          <InteractiveMotion className="order-1 sm:order-2">
            <button
              ref={primaryButtonRef}
              type="button"
              onClick={onSelectGuided}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs sm:text-sm font-extrabold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition shadow-xs"
            >
              Bimbing saya dari awal
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </InteractiveMotion>
        </div>
      </div>
    </div>
  );
}
