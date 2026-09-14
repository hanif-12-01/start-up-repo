'use client';

import React, { useEffect, useRef } from 'react';
import { CheckCircle2, ArrowRight, TrendingUp } from 'lucide-react';
import { InteractiveMotion } from '@/components/motion/InteractiveMotion';

export interface FirstBillSuccessModalProps {
  isOpen: boolean;
  onContinue: () => void;
}

export function FirstBillSuccessModal({
  isOpen,
  onContinue,
}: FirstBillSuccessModalProps) {
  const primaryButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      primaryButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onContinue();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onContinue]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-bill-success-title"
      aria-describedby="first-bill-success-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-500 shadow-xs">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2
              id="first-bill-success-title"
              className="text-xl sm:text-2xl font-black tracking-tight text-[var(--foreground)]"
            >
              Data pertama berhasil dicatat
            </h2>
            <p
              id="first-bill-success-desc"
              className="text-sm leading-relaxed text-[var(--muted)]"
            >
              WattWise sekarang sudah mulai menyimpan riwayat listrik usaha Anda.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 space-y-3 text-xs sm:text-sm text-[var(--foreground)]">
          <div className="flex items-start gap-2.5">
            <TrendingUp className="h-4.5 w-4.5 text-[var(--primary)] shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <p className="font-semibold text-[var(--foreground)]">
                Setelah ada data bulan berikutnya
              </p>
              <p className="leading-relaxed text-[var(--muted)]">
                WattWise dapat mulai membandingkan perubahan antarbulan secara objektif dan menandai hal yang layak diperiksa.
              </p>
            </div>
          </div>
          <p className="border-t border-[var(--border)] pt-2.5 text-xs text-[var(--muted)]">
            💡 Semakin lengkap riwayat tagihan yang Anda masukkan, semakin baik WattWise memahami pola penggunaan listrik usaha Anda.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <InteractiveMotion className="w-full sm:w-auto">
            <button
              ref={primaryButtonRef}
              type="button"
              onClick={onContinue}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-2.5 text-xs sm:text-sm font-extrabold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition shadow-xs"
            >
              Buka Dashboard
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
          </InteractiveMotion>
        </div>
      </div>
    </div>
  );
}
