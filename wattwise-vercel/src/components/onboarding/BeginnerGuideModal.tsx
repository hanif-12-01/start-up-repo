'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { useBeginnerGuide } from './BeginnerGuideContext';

export function BeginnerGuideModal() {
  const {
    isGuideOpen,
    currentStep,
    steps,
    closeGuide,
    nextStep,
    prevStep,
    goToStep,
    completeGuide,
  } = useBeginnerGuide();

  const modalRef = useRef<HTMLDivElement>(null);
  const currentStepData = steps[currentStep];

  // Focus trap / manage focus on open
  useEffect(() => {
    if (!isGuideOpen) return;
    modalRef.current?.focus();
  }, [isGuideOpen, currentStep]);

  if (!isGuideOpen || !currentStepData) {
    return null;
  }

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const stageColorMap: Record<string, string> = {
    DATA: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    UNDERSTAND: 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30',
    PREDICT: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    'DECIDE / ACT': 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    MEASURE: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
  };

  const badgeClass =
    stageColorMap[currentStepData.stage] ||
    'bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)]/30';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="guide-step-title"
      aria-describedby="guide-step-desc"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in"
        onClick={closeGuide}
        aria-hidden="true"
      />

      {/* Modal / Card */}
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 sm:p-7 shadow-2xl transition-all focus:outline-none"
      >
        {/* Top bar: Stage badge, Step count, Close button */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-4">
          <div className="flex items-center gap-2.5">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide uppercase ${badgeClass}`}
            >
              {currentStepData.stage}
            </span>
            <span className="text-xs font-bold text-[var(--muted)]">
              Langkah {currentStep + 1} dari {steps.length}
            </span>
          </div>

          <button
            type="button"
            onClick={closeGuide}
            aria-label="Tutup panduan"
            className="rounded-full p-1.5 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Stepper Progress Indicator */}
        <div
          className="mt-4 flex items-center justify-between gap-1.5"
          aria-label="Progres langkah panduan"
        >
          {steps.map((step, idx) => (
            <button
              key={step.stepNumber}
              type="button"
              onClick={() => goToStep(idx)}
              aria-label={`Langkah ${idx + 1}: ${step.title}`}
              aria-current={idx === currentStep ? 'step' : undefined}
              className={`h-1.5 flex-1 rounded-full transition-all ${
                idx === currentStep
                  ? 'bg-[var(--primary)]'
                  : idx < currentStep
                  ? 'bg-[var(--primary)]/50'
                  : 'bg-[var(--border)]'
              }`}
            />
          ))}
        </div>

        {/* Content Body */}
        <div className="mt-5 space-y-3">
          <h3
            id="guide-step-title"
            className="text-lg sm:text-xl font-black tracking-tight text-[var(--foreground)]"
          >
            {currentStepData.title}
          </h3>

          <p
            id="guide-step-desc"
            className="text-sm leading-relaxed text-[var(--foreground)] font-medium"
          >
            {currentStepData.shortDescription}
          </p>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)]/70 p-3.5 text-xs leading-relaxed text-[var(--muted)]">
            <p className="font-semibold text-[var(--foreground)] mb-1">
              Yang perlu Anda ketahui:
            </p>
            <p>{currentStepData.detailedContext}</p>
          </div>
        </div>

        {/* Contextual Route CTA link */}
        <div className="mt-4 pt-3 border-t border-[var(--border)] flex items-center justify-between">
          <Link
            href={currentStepData.ctaHref}
            onClick={closeGuide}
            className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[var(--primary)] hover:underline decoration-[var(--primary)]/50 underline-offset-4 focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] rounded-md py-1"
          >
            <span>Buka halaman: {currentStepData.ctaLabel}</span>
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          </Link>

          <button
            type="button"
            onClick={closeGuide}
            className="text-xs font-semibold text-[var(--muted)] hover:text-[var(--foreground)]"
          >
            Lewati panduan
          </button>
        </div>

        {/* Navigation Buttons Footer */}
        <div className="mt-5 flex items-center justify-between gap-3 pt-2">
          <button
            type="button"
            disabled={isFirstStep}
            onClick={prevStep}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2.5 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-muted)] disabled:opacity-35 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            Kembali
          </button>

          <div className="flex items-center gap-2">
            {isLastStep ? (
              <button
                type="button"
                onClick={completeGuide}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs font-extrabold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition shadow-sm"
              >
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                Selesai
              </button>
            ) : (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-xs font-extrabold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition shadow-sm"
              >
                Berikutnya
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}