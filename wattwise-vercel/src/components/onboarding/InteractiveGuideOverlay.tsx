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
  Sparkles,
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
  const [cardHeight, setCardHeight] = useState<number>(290);
  const cardRef = useRef<HTMLDivElement>(null);
  const targetElRef = useRef<Element | null>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  const isTargetClickStep = currentStepData?.advanceMode === 'target-click';

  // Store trigger element for accessible focus restoration upon closing
  useEffect(() => {
    if (isTourActive) {
      if (document.activeElement instanceof HTMLElement) {
        previousActiveElementRef.current = document.activeElement;
      }
    } else if (previousActiveElementRef.current) {
      previousActiveElementRef.current.focus?.();
      previousActiveElementRef.current = null;
    }
  }, [isTourActive]);

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
      if (cardRef.current && cardRef.current.offsetHeight > 0) {
        setCardHeight(cardRef.current.offsetHeight);
      }
    } else {
      setTargetRect(null);
      setTargetFound(false);
    }
  }, [isTourActive, currentStepData]);

  useEffect(() => {
    if (cardRef.current && cardRef.current.offsetHeight > 0) {
      setCardHeight(cardRef.current.offsetHeight);
    }
  }, [currentStep, targetRect]);

  // Attach scoped temporary click listener to the active target element
  useEffect(() => {
    if (!isTourActive || !currentStepData || currentStepData.advanceMode !== 'target-click') {
      return;
    }

    const el = targetElRef.current;
    if (!el) return;

    const handleTargetClick = () => {
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

  // Route confirmation: auto-advance target-click steps when route changes
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
      if (window.innerWidth < 640) {
        // On mobile, scroll so target is positioned in the upper portion above bottom sheet
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

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
    DATA: 'bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/30',
    UNDERSTAND: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-400 border-indigo-500/30',
    PREDICT: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30',
    'DECIDE / ACT': 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30',
    MEASURE: 'bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-500/30',
  };

  const badgeClass =
    stageColorMap[currentStepData.stage] ||
    'bg-[var(--primary-soft)] text-[var(--primary)] border-[var(--primary)]/30';

  // Smart Adaptive Collision-Free Positioning (B4, B5)
  const getCardStyle = (): React.CSSProperties => {
    if (isMobile || !targetRect) {
      return {};
    }

    const cardWidth = 380;
    const padding = 16;
    const preferredPlacement = currentStepData.placement || 'bottom';

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const spaceTop = targetRect.top;
    const spaceBottom = vh - targetRect.bottom;
    const spaceLeft = targetRect.left;
    const spaceRight = vw - targetRect.right;

    // Check clearances
    const fitsBottom = spaceBottom >= cardHeight + padding;
    const fitsTop = spaceTop >= cardHeight + padding;
    const fitsRight = spaceRight >= cardWidth + padding;
    const fitsLeft = spaceLeft >= cardWidth + padding;

    let resolvedPlacement = preferredPlacement;

    // Adaptive flip to prevent covering the target element
    if (preferredPlacement === 'bottom') {
      if (!fitsBottom && fitsTop) {
        resolvedPlacement = 'top';
      } else if (!fitsBottom && fitsRight) {
        resolvedPlacement = 'right';
      } else if (!fitsBottom && fitsLeft) {
        resolvedPlacement = 'left';
      }
    } else if (preferredPlacement === 'top') {
      if (!fitsTop && fitsBottom) {
        resolvedPlacement = 'bottom';
      } else if (!fitsTop && fitsRight) {
        resolvedPlacement = 'right';
      } else if (!fitsTop && fitsLeft) {
        resolvedPlacement = 'left';
      }
    } else if (preferredPlacement === 'right') {
      if (!fitsRight && fitsLeft) {
        resolvedPlacement = 'left';
      } else if (!fitsRight && fitsBottom) {
        resolvedPlacement = 'bottom';
      } else if (!fitsRight && fitsTop) {
        resolvedPlacement = 'top';
      }
    } else if (preferredPlacement === 'left') {
      if (!fitsLeft && fitsRight) {
        resolvedPlacement = 'right';
      } else if (!fitsLeft && fitsBottom) {
        resolvedPlacement = 'bottom';
      } else if (!fitsLeft && fitsTop) {
        resolvedPlacement = 'top';
      }
    }

    // Compute coordinates
    let top = 0;
    let left = 0;

    if (resolvedPlacement === 'bottom') {
      top = targetRect.bottom + 14;
      left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    } else if (resolvedPlacement === 'top') {
      top = targetRect.top - cardHeight - 14;
      left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    } else if (resolvedPlacement === 'right') {
      top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
      left = targetRect.right + 16;
    } else if (resolvedPlacement === 'left') {
      top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
      left = targetRect.left - cardWidth - 16;
    }

    // Clamping along non-placement axis, ensuring we NEVER overlap the target
    if (resolvedPlacement === 'bottom' || resolvedPlacement === 'top') {
      left = Math.max(padding, Math.min(left, vw - cardWidth - padding));
      if (resolvedPlacement === 'bottom') {
        top = Math.max(targetRect.bottom + 8, Math.min(top, vh - cardHeight - padding));
      } else {
        top = Math.min(targetRect.top - cardHeight - 8, Math.max(padding, top));
      }
    } else {
      top = Math.max(padding, Math.min(top, vh - cardHeight - padding));
      if (resolvedPlacement === 'right') {
        left = Math.max(targetRect.right + 8, Math.min(left, vw - cardWidth - padding));
      } else {
        left = Math.min(targetRect.left - cardWidth - 8, Math.max(padding, left));
      }
    }

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
      role="dialog"
      aria-modal="false"
      aria-label="Panduan Interaktif WattWise"
    >
      {/* Target Highlight Spotlight (pointer-events: none keeps target clickable) */}
      {targetFound && targetRect && (
        <div
          className="fixed pointer-events-none transition-all duration-200 rounded-2xl"
          style={{
            top: `${targetRect.top - 6}px`,
            left: `${targetRect.left - 6}px`,
            width: `${targetRect.width + 12}px`,
            height: `${targetRect.height + 12}px`,
            border: '2.5px solid var(--primary)',
            boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.52), 0 0 24px rgba(16, 185, 129, 0.45)',
            zIndex: 45,
          }}
          aria-hidden="true"
        />
      )}

      {/* Dimmed backdrop when target is not found on current page */}
      {!targetFound && (
        <div
          className="fixed inset-0 bg-black/45 backdrop-blur-2xs pointer-events-none transition-opacity"
          aria-hidden="true"
        />
      )}

      {/* Interactive Coachmark Card (pointer-events: auto) */}
      <div
        ref={cardRef}
        style={getCardStyle()}
        className={`pointer-events-auto transition-all ${
          isMobile
            ? 'fixed bottom-0 left-0 right-0 z-60 rounded-t-3xl border-t border-[var(--border-strong)] bg-[var(--surface-elevated)] p-5 shadow-2xl max-h-[52vh] overflow-y-auto'
            : !targetFound
            ? 'fixed bottom-6 right-6 z-60 w-[380px] rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-6 shadow-2xl'
            : 'rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-5 sm:p-6 shadow-2xl'
        }`}
      >
        {/* Header: Stage Badge, Step Count, Close Button */}
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

        {/* Stepper Progress Bar */}
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
        <div className="mt-3.5 space-y-2.5">
          <h3 className="text-base font-black tracking-tight text-[var(--foreground)]">
            {currentStepData.title}
          </h3>

          <p className="text-xs leading-relaxed text-[var(--foreground)] font-medium">
            {currentStepData.instruction}
          </p>

          {/* Missing target helper */}
          {!targetFound && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-300">
              <HelpCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <div>
                <p className="font-bold">Bagian ini berada di halaman lain.</p>
                <p className="mt-0.5">
                  Gunakan tombol di bawah untuk menuju halaman target atau lanjutkan langkah.
                </p>
              </div>
            </div>
          )}

          {/* Context Explainer */}
          {targetFound && currentStepData.detailedContext && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/70 p-2.5 text-[11px] leading-relaxed text-[var(--muted)]">
              {currentStepData.detailedContext}
            </div>
          )}

          {/* Benefit Badge */}
          {currentStepData.benefit && (
            <div className="flex items-center gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span>{currentStepData.benefit}</span>
            </div>
          )}
        </div>

        {/* Target click helper or route navigation */}
        <div className="mt-3 pt-2.5 border-t border-[var(--border)] flex items-center justify-between">
          {targetFound && isTargetClickStep ? (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--primary)]">
              <MousePointerClick className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Klik bagian yang disorot atau tombol Lanjut</span>
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
