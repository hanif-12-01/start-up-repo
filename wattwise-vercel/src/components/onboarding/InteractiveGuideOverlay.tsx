'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
  HelpCircle,
  MousePointerClick,
} from 'lucide-react';
import { useBeginnerGuide } from './BeginnerGuideContext';
import { SESSION_TOUR_PENDING_STEP_KEY } from './guide-steps';

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
  bottom: number;
  right: number;
}

export function InteractiveGuideOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    isTourActive,
    currentStep,
    currentStepData,
    steps,
    stopTour,
    nextStep,
    prevStep,
    goToStep,
    completeTour,
  } = useBeginnerGuide();

  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [targetFound, setTargetFound] = useState<boolean>(false);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const targetElRef = useRef<Element | null>(null);

  // Derived state without cascading setState in effect
  const isTargetClickStep = currentStepData?.advanceMode === 'target-click';

  // Check viewport width for responsive mobile layout
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const updateTargetPosition = useCallback(() => {
    if (!isTourActive || !currentStepData) {
      setTargetRect(null);
      setTargetFound(false);
      targetElRef.current = null;
      return;
    }

    const mobile = window.innerWidth < 640;
    let el: Element | null = document.querySelector(
      `[data-tour-id="${currentStepData.targetTourId}"]`
    );

    // On mobile, if target is in hidden sidebar, highlight mobile menu button if available
    if (mobile && (!el || el.clientHeight === 0)) {
      const isSidebarTarget = currentStepData.targetTourId.startsWith('sidebar-');
      if (isSidebarTarget) {
        const menuBtn = document.querySelector('[data-tour-id="mobile-menu-button"]');
        if (menuBtn && menuBtn.clientHeight > 0) {
          el = menuBtn;
        }
      }
    }

    if (!el && currentStepData.fallbackTourId) {
      el = document.querySelector(
        `[data-tour-id="${currentStepData.fallbackTourId}"]`
      );
    }

    targetElRef.current = el;

    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        bottom: rect.bottom,
        right: rect.right,
      });
      setTargetFound(true);
    } else {
      setTargetRect(null);
      setTargetFound(false);
    }
  }, [isTourActive, currentStepData]);

  // Attach scoped temporary click listener to the active target element ONLY
  useEffect(() => {
    if (!isTourActive || !currentStepData || currentStepData.advanceMode !== 'target-click') {
      return;
    }

    const el = targetElRef.current;
    if (!el) return;

    const handleTargetClick = () => {
      // Do NOT call preventDefault or stopPropagation
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(SESSION_TOUR_PENDING_STEP_KEY, String(currentStep + 1));
        }
      } catch {}
    };

    el.addEventListener('click', handleTargetClick, { capture: true });
    return () => {
      el.removeEventListener('click', handleTargetClick, { capture: true });
    };
  }, [isTourActive, currentStep, currentStepData, targetFound]);

  // Route confirmation: observe pathname and searchParams to auto-advance target-click steps
  useEffect(() => {
    if (!isTourActive || !currentStepData) return;

    if (currentStepData.advanceMode === 'target-click') {
      let pathnameMatched = true;
      if (currentStepData.expectedPathname) {
        pathnameMatched =
          pathname === currentStepData.expectedPathname ||
          (currentStepData.expectedPathname !== '/dashboard' &&
            pathname.startsWith(currentStepData.expectedPathname));
      }

      let searchParamMatched = true;
      if (currentStepData.expectedSearchParam) {
        const paramVal = searchParams.get(currentStepData.expectedSearchParam.key);
        searchParamMatched = paramVal === currentStepData.expectedSearchParam.value;
      }

      if (pathnameMatched && searchParamMatched) {
        // Check if this step was pending or we're on the step and target was clicked/reached
        let wasPending = false;
        try {
          if (typeof window !== 'undefined') {
            const pending = sessionStorage.getItem(SESSION_TOUR_PENDING_STEP_KEY);
            if (pending === String(currentStep + 1)) {
              wasPending = true;
              sessionStorage.removeItem(SESSION_TOUR_PENDING_STEP_KEY);
            }
          }
        } catch {}

        // If route matches expected destination for a target-click navigation step, advance to next step
        if (wasPending || currentStepData.expectedSearchParam) {
          const timer = setTimeout(() => {
            nextStep();
          }, 120);
          return () => clearTimeout(timer);
        }
      }
    }
  }, [isTourActive, currentStep, currentStepData, pathname, searchParams, nextStep]);

  // Scroll target into view smoothly and track position on step/route change
  useEffect(() => {
    if (!isTourActive || !currentStepData) return;

    let el: Element | null = document.querySelector(
      `[data-tour-id="${currentStepData.targetTourId}"]`
    );
    if (!el && currentStepData.fallbackTourId) {
      el = document.querySelector(
        `[data-tour-id="${currentStepData.fallbackTourId}"]`
      );
    }

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Delay slightly to account for smooth scroll & dynamic render
    const timer = setTimeout(updateTargetPosition, 100);

    const handleScrollOrResize = () => {
      window.requestAnimationFrame(updateTargetPosition);
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isTourActive, currentStep, currentStepData, pathname, updateTargetPosition]);

  if (!isTourActive || !currentStepData) {
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

  // Desktop positioning calculation with viewport clamping
  const getCardStyle = (): React.CSSProperties => {
    if (isMobile || !targetRect) {
      return {};
    }

    const cardWidth = 380;
    const cardHeight = 270;
    const padding = 16;
    const placement = currentStepData.placement || 'bottom';

    let top = 0;
    let left = 0;

    if (placement === 'bottom') {
      top = targetRect.bottom + 12;
      left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    } else if (placement === 'top') {
      top = targetRect.top - cardHeight - 12;
      left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    } else if (placement === 'right') {
      top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
      left = targetRect.right + 16;
    } else if (placement === 'left') {
      top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
      left = targetRect.left - cardWidth - 16;
    }

    // Viewport clamping
    const maxLeft = window.innerWidth - cardWidth - padding;
    const maxTop = window.innerHeight - cardHeight - padding;

    left = Math.max(padding, Math.min(left, maxLeft));
    top = Math.max(padding, Math.min(top, maxTop));

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
      zIndex: 60,
    };
  };

  return (
    <div
      className="fixed inset-0 z-50 pointer-events-none"
      role="region"
      aria-label="Panduan Interaktif WattWise"
    >
      {/* Target Highlight Spotlight (pointer-events: none allows clicking the actual target underneath) */}
      {targetFound && targetRect && (
        <div
          className="fixed pointer-events-none transition-all duration-200 rounded-xl"
          style={{
            top: `${targetRect.top - 4}px`,
            left: `${targetRect.left - 4}px`,
            width: `${targetRect.width + 8}px`,
            height: `${targetRect.height + 8}px`,
            border: '2.5px solid var(--primary)',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.50), 0 0 20px rgba(16, 185, 129, 0.45)',
            zIndex: 45,
          }}
          aria-hidden="true"
        />
      )}

      {/* Dimmed backdrop when target is not found on current page */}
      {!targetFound && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-2xs pointer-events-none transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Interactive Coachmark Card (pointer-events: auto) */}
      <div
        ref={cardRef}
        style={getCardStyle()}
        className={`pointer-events-auto rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-5 sm:p-6 shadow-2xl transition-all ${
          isMobile || !targetFound
            ? 'fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-md z-60'
            : ''
        }`}
      >
        {/* Header: Stage Badge, Step Count, Close */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--border)] pb-3">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${badgeClass}`}
            >
              {currentStepData.stage}
            </span>
            <span className="text-xs font-bold text-[var(--muted)]">
              Langkah {currentStep + 1} dari {steps.length}
            </span>
          </div>

          <button
            type="button"
            onClick={stopTour}
            aria-label="Tutup panduan interaktif"
            className="rounded-full p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Stepper Progress Indicator */}
        <div
          className="mt-3 flex items-center justify-between gap-1"
          aria-label="Progres panduan"
        >
          {steps.map((step, idx) => (
            <button
              key={step.id}
              type="button"
              onClick={() => goToStep(idx)}
              aria-label={`Langkah ${idx + 1}: ${step.title}`}
              aria-current={idx === currentStep ? 'step' : undefined}
              className={`h-1 flex-1 rounded-full transition-all ${
                idx === currentStep
                  ? 'bg-[var(--primary)]'
                  : idx < currentStep
                  ? 'bg-[var(--primary)]/50'
                  : 'bg-[var(--border)]'
              }`}
            />
          ))}
        </div>

        {/* Body Content */}
        <div className="mt-3.5 space-y-2">
          <h3 className="text-base font-black tracking-tight text-[var(--foreground)]">
            {currentStepData.title}
          </h3>

          <p className="text-xs leading-relaxed text-[var(--foreground)] font-medium">
            {currentStepData.instruction}
          </p>

          {/* Missing target helper */}
          {!targetFound && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-300">
              <HelpCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Bagian ini berada di halaman lain.</p>
                <p className="mt-0.5">
                  Gunakan tombol di bawah untuk menuju halaman target atau lanjutkan langkah.
                </p>
              </div>
            </div>
          )}

          {targetFound && currentStepData.detailedContext && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/70 p-2.5 text-[11px] leading-relaxed text-[var(--muted)]">
              {currentStepData.detailedContext}
            </div>
          )}
        </div>

        {/* Target-click visual helper or route CTA */}
        <div className="mt-3 pt-2.5 border-t border-[var(--border)] flex items-center justify-between">
          {targetFound && isTargetClickStep ? (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--primary)]">
              <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Klik bagian yang disorot untuk melanjutkan</span>
            </div>
          ) : (
            <Link
              href={currentStepData.ctaHref}
              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[var(--primary)] hover:underline decoration-[var(--primary)]/50 underline-offset-4 focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] rounded-md py-0.5"
            >
              <span>Buka: {currentStepData.ctaLabel}</span>
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
            </Link>
          )}

          <button
            type="button"
            onClick={stopTour}
            className="text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)] ml-auto"
          >
            Lewati panduan
          </button>
        </div>

        {/* Footer Navigation Buttons */}
        <div className="mt-3 flex items-center justify-between gap-2 pt-1">
          <button
            type="button"
            disabled={isFirstStep}
            onClick={prevStep}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-muted)] disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Kembali
          </button>

          <div className="flex items-center gap-2">
            {isLastStep ? (
              <button
                type="button"
                onClick={completeTour}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-extrabold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition shadow-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Selesai
              </button>
            ) : isTargetClickStep && targetFound ? (
              // For target-click steps when target exists: DO NOT show competing primary Lanjut button!
              null
            ) : (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center gap-1 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-extrabold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition shadow-xs"
              >
                {currentStepData.actionLabel || 'Lanjut'}
                <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}