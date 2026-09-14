'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Sparkles, ReceiptText } from 'lucide-react';
import { InteractiveMotion } from '@/components/motion/InteractiveMotion';

export interface BillStep {
  id: string;
  stepNumber: number;
  targetId: string;
  title: string;
  instruction: string;
  note?: string;
}

const BILL_STEPS: BillStep[] = [
  {
    id: 'bill-step-1',
    stepNumber: 1,
    targetId: 'bill-period',
    title: 'Periode Tagihan',
    instruction: 'Pilih bulan tagihan yang ingin dicatat. Biasanya tertera tanggal awal dan akhir pemakaian pada struk atau aplikasi PLN.',
    note: 'Tanggal awal dan akhir dihitung penuh untuk akurasi perhitungan harian.',
  },
  {
    id: 'bill-step-2',
    stepNumber: 2,
    targetId: 'bill-amount',
    title: 'Total Tagihan (Rupiah)',
    instruction: 'Masukkan total biaya listrik yang Anda bayarkan pada bulan tersebut. Masukkan angka saja tanpa titik atau koma.',
    note: 'Biaya ini menjadi dasar pemantauan tren pengeluaran bulanan usaha Anda.',
  },
  {
    id: 'bill-step-3',
    stepNumber: 3,
    targetId: 'bill-kwh',
    title: 'Pemakaian (kWh) — Opsional',
    instruction: 'Jika angka kWh tersedia di tagihan, masukkan di sini. Data ini membantu WattWise membaca perubahan pemakaian dengan lebih baik.',
    note: 'Jika tidak tersedia di struk pembayaran, Anda dapat melewati bagian ini.',
  },
];

export function FirstBillGuide({
  isActive,
  onDismiss,
}: {
  isActive: boolean;
  onDismiss: () => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);

  const scrollToTarget = useCallback((targetId: string) => {
    if (typeof document === 'undefined') return;
    const element = document.querySelector(`[data-tour-id="${targetId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('ring-2', 'ring-[var(--primary)]', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-[var(--primary)]', 'ring-offset-2');
      }, 2000);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;
    const step = BILL_STEPS[currentStep];
    if (step) {
      scrollToTarget(step.targetId);
    }
  }, [isActive, currentStep, scrollToTarget]);

  useEffect(() => {
    if (!isActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isActive, onDismiss]);

  if (!isActive) return null;

  const step = BILL_STEPS[currentStep] || BILL_STEPS[0];
  const isFirst = currentStep === 0;
  const isLast = currentStep === BILL_STEPS.length - 1;

  return (
    <aside
      aria-label="Panduan pengisian tagihan pertama"
      className="mb-6 rounded-2xl border-2 border-[var(--primary)]/40 bg-[var(--primary-soft)]/60 p-4 sm:p-5 shadow-sm transition-all"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
              Panduan Tagihan Pertama · Langkah {step.stepNumber} dari {BILL_STEPS.length}
            </span>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition"
            title="Tutup panduan"
            aria-label="Tutup panduan"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-1">
          <h3 className="text-base font-bold text-[var(--foreground)] flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-[var(--primary)] shrink-0" aria-hidden="true" />
            {step.title}
          </h3>
          <p className="text-sm leading-relaxed text-[var(--foreground)]/90">
            {step.instruction}
          </p>
          {step.note && (
            <p className="text-xs leading-relaxed text-[var(--muted)] pt-0.5">
              💡 {step.note}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[var(--primary)]/20">
          <button
            type="button"
            onClick={onDismiss}
            className="text-xs font-bold text-[var(--muted)] hover:text-[var(--foreground)] underline underline-offset-4"
          >
            Saya ingin isi mandiri
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition"
              >
                <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                Kembali
              </button>
            )}

            {!isLast ? (
              <InteractiveMotion>
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.min(BILL_STEPS.length - 1, prev + 1))}
                  className="inline-flex items-center gap-1 rounded-xl bg-[var(--primary)] px-3.5 py-1.5 text-xs font-bold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition shadow-xs"
                >
                  Lanjut
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </InteractiveMotion>
            ) : (
              <button
                type="button"
                onClick={onDismiss}
                className="inline-flex items-center gap-1 rounded-xl bg-[var(--primary)] px-3.5 py-1.5 text-xs font-bold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition shadow-xs"
              >
                Selesai bimbingan ✓
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
