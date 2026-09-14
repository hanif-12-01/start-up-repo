'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Sparkles, CheckCircle2 } from 'lucide-react';
import { InteractiveMotion } from '@/components/motion/InteractiveMotion';

export interface SetupStep {
  id: string;
  stepNumber: number;
  targetId: string;
  title: string;
  instruction: string;
  note?: string;
}

const SETUP_STEPS: SetupStep[] = [
  {
    id: 'setup-step-1',
    stepNumber: 1,
    targetId: 'setup-basic-info',
    title: 'Kenali usaha Anda',
    instruction: 'Mulai dari informasi dasar. Ini membantu WattWise membedakan lokasi usaha Anda.',
    note: 'Nama usaha dan jenis usaha wajib diisi. Informasi lokasi lainnya dapat dilengkapi jika tersedia.',
  },
  {
    id: 'setup-step-2',
    stepNumber: 2,
    targetId: 'setup-electricity-info',
    title: 'Kenali listrik usaha',
    instruction: 'Pilih cara biaya listrik dikelola di lokasi usaha Anda. Jika Anda tahu detail listrik seperti daya atau golongan, Anda juga bisa melengkapinya di sini.',
    note: 'Pengaturan biaya listrik wajib dipilih. Detail lain seperti daya, golongan, tarif, metode pembayaran, dan tipe meter dapat dilewati jika belum diketahui.',
  },
  {
    id: 'setup-step-3',
    stepNumber: 3,
    targetId: 'setup-context-info',
    title: 'Tambahkan konteks jika relevan',
    instruction: 'Jam/hari operasi, jumlah pegawai, atau jumlah unit dapat membantu menjelaskan mengapa pemakaian listrik berubah.',
    note: 'Bagian ini bersifat opsional untuk memberikan konteks tambahan pada analisis.',
  },
  {
    id: 'setup-step-4',
    stepNumber: 4,
    targetId: 'setup-submit',
    title: 'Simpan profil usaha',
    instruction: 'Setelah profil disimpan, kita akan menambahkan tagihan pertama agar WattWise mulai membaca pola listrik usaha Anda.',
    note: 'WattWise siap membaca riwayat tagihan pertama Anda setelah langkah ini.',
  },
];

export function BusinessSetupGuide({
  isActive,
  onDismiss,
  onStepChange,
}: {
  isActive: boolean;
  onDismiss: () => void;
  onStepChange?: (stepIndex: number) => void;
}) {
  const [currentStep, setCurrentStep] = useState(0);

  const scrollToTarget = useCallback((targetId: string) => {
    if (typeof document === 'undefined') return;
    const element = document.querySelector(`[data-tour-id="${targetId}"]`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      // Add subtle temporary pulse ring
      element.classList.add('ring-2', 'ring-[var(--primary)]', 'ring-offset-2');
      setTimeout(() => {
        element.classList.remove('ring-2', 'ring-[var(--primary)]', 'ring-offset-2');
      }, 2000);
    }
  }, []);

  useEffect(() => {
    if (!isActive) return;
    onStepChange?.(currentStep);
    const step = SETUP_STEPS[currentStep];
    if (step) {
      scrollToTarget(step.targetId);
    }
  }, [isActive, currentStep, scrollToTarget, onStepChange]);

  // Escape key closes the guide
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

  const step = SETUP_STEPS[currentStep] || SETUP_STEPS[0];
  const isFirst = currentStep === 0;
  const isLast = currentStep === SETUP_STEPS.length - 1;

  return (
    <aside
      aria-label="Panduan pengisian profil usaha"
      className="mb-6 rounded-2xl border-2 border-[var(--primary)]/40 bg-[var(--primary-soft)]/60 p-4 sm:p-5 shadow-sm transition-all"
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-lg bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-[var(--primary)]">
              Panduan Pengisian · Langkah {step.stepNumber} dari {SETUP_STEPS.length}
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
            {step.title}
            {isLast && <CheckCircle2 className="h-4 w-4 text-[var(--success)]" aria-hidden="true" />}
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
                  onClick={() => setCurrentStep((prev) => Math.min(SETUP_STEPS.length - 1, prev + 1))}
                  className="inline-flex items-center gap-1 rounded-xl bg-[var(--primary)] px-3.5 py-1.5 text-xs font-bold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition shadow-xs"
                >
                  Lanjut
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </InteractiveMotion>
            ) : (
              <button
                type="button"
                onClick={() => scrollToTarget('setup-submit')}
                className="inline-flex items-center gap-1 rounded-xl bg-[var(--primary)] px-3.5 py-1.5 text-xs font-bold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition shadow-xs"
              >
                Ke tombol simpan ↓
              </button>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
