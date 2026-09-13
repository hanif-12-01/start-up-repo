'use client';

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { CheckCircle2, ArrowRight, ReceiptText } from 'lucide-react';
import { InteractiveMotion } from '@/components/motion/InteractiveMotion';

export interface FirstBusinessSuccessModalProps {
  isOpen: boolean;
  businessId: string;
  onDismiss: () => void;
}

export function FirstBusinessSuccessModal({
  isOpen,
  businessId,
  onDismiss,
}: FirstBusinessSuccessModalProps) {
  const primaryButtonRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (isOpen) {
      primaryButtonRef.current?.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onDismiss]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-business-success-title"
      aria-describedby="first-business-success-desc"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8 shadow-2xl space-y-6">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-500/20 text-emerald-500 shadow-xs">
            <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
          </div>
          <div className="space-y-1.5">
            <h2
              id="first-business-success-title"
              className="text-xl sm:text-2xl font-black tracking-tight text-[var(--foreground)]"
            >
              Profil usaha siap 🎉
            </h2>
            <p
              id="first-business-success-desc"
              className="text-sm leading-relaxed text-[var(--muted)]"
            >
              Sekarang tambahkan satu tagihan listrik agar WattWise mulai mengenali riwayat biaya dan pemakaian usaha Anda.
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-4 space-y-2 text-xs sm:text-sm text-[var(--foreground)]">
          <div className="flex items-center gap-2 font-semibold text-[var(--foreground)]">
            <ReceiptText className="h-4 w-4 text-[var(--primary)] shrink-0" aria-hidden="true" />
            <span>Mulai dari satu tagihan yang sudah Anda miliki</span>
          </div>
          <p className="leading-relaxed text-[var(--muted)]">
            Cukup masukkan total biaya tagihan listrik bulan terakhir. Jika ada angka pemakaian (kWh), Anda bisa melengkapinya untuk analisis yang lebih akurat.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end pt-2">
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2.5 text-xs sm:text-sm font-bold text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition order-2 sm:order-1 text-center"
          >
            Nanti saja
          </button>
          <InteractiveMotion className="order-1 sm:order-2">
            <Link
              ref={primaryButtonRef}
              href={`/bills/new?businessId=${encodeURIComponent(businessId)}&guided=1`}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs sm:text-sm font-extrabold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition shadow-xs"
            >
              Tambahkan tagihan pertama
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </InteractiveMotion>
        </div>
      </div>
    </div>
  );
}
