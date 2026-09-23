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

function findVisibleTarget(tourId: string): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  const elements = document.querySelectorAll<HTMLElement>(`[data-tour-id="${tourId}"]`);
  
  // First priority: check if element is inside an active mobile drawer
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const drawerParent = el.closest('#product-mobile-menu');
    if (drawerParent) {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      if (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        (rect.width > 0 || rect.height > 0)
      ) {
        return el;
      }
    }
  }

  // Second priority: any visible element in DOM
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    if (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      style.opacity !== '0' &&
      (rect.width > 0 || rect.height > 0 || el.getClientRects().length > 0)
    ) {
      return el;
    }
  }
  return elements[0] || null;
}

export function InteractiveGuideOverlay() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const {
    isTourActive,
    currentStep,
    currentStepData,
    steps,
    isMobileMenuOpen,
    setMobileMenuOpen,
    stopTour,
    nextStep,
    prevStep,
    goToStep,
    completeTour,
  } = useBeginnerGuide();

  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const [targetFound, setTargetFound] = useState<boolean>(false);
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

  const updateTargetPosition = useCallback(() => {
    if (!isTourActive || !currentStepData) {
      setTargetRect(null);
      setTargetFound(false);
      targetElRef.current = null;
      return;
    }

    let el = findVisibleTarget(currentStepData.targetTourId);

    if ((!el || el.clientHeight === 0 || el.clientWidth === 0) && currentStepData.fallbackTourId) {
      el = findVisibleTarget(currentStepData.fallbackTourId);
    }

    targetElRef.current = el;

    if (el && el.clientHeight > 0 && el.clientWidth > 0) {
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

  // Close tour handlers that also ensure any tour-opened mobile drawer is closed cleanly
  const handleStopTour = useCallback(() => {
    if (isMobileMenuOpen) {
      setMobileMenuOpen(false);
    }
    stopTour();
  }, [isMobileMenuOpen, setMobileMenuOpen, stopTour]);

  const handleCompleteTour = useCallback(() => {
    if (isMobileMenuOpen) {
      setMobileMenuOpen(false);
    }
    completeTour();
  }, [isMobileMenuOpen, setMobileMenuOpen, completeTour]);

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

  // Automatic UI state synchronization (Auto-Open / Auto-Close) + smooth scroll & highlight
  useEffect(() => {
    if (!isTourActive || !currentStepData) return;

    const isSidebarTarget = currentStepData.targetTourId.startsWith('sidebar-');
    const isMobileNav = typeof window !== 'undefined' && window.innerWidth < 1024;

    if (isMobileNav) {
      if (isSidebarTarget && !isMobileMenuOpen) {
        setMobileMenuOpen(true);
      } else if (!isSidebarTarget && isMobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    }

    let cancelled = false;

    const syncTargetAndScroll = () => {
      if (cancelled) return;

      let el = findVisibleTarget(currentStepData.targetTourId);
      if ((!el || el.clientHeight === 0 || el.clientWidth === 0) && currentStepData.fallbackTourId) {
        el = findVisibleTarget(currentStepData.fallbackTourId);
      }

      if (el && el.clientHeight > 0 && el.clientWidth > 0) {
        const isInDrawer = !!el.closest('#product-mobile-menu');
        if (isInDrawer) {
          const drawerNav = el.closest('nav') || el.closest('#product-mobile-menu');
          el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          if (drawerNav) {
            const handleDrawerScroll = () => {
              window.requestAnimationFrame(updateTargetPosition);
            };
            drawerNav.addEventListener('scroll', handleDrawerScroll, { passive: true });
            setTimeout(() => {
              drawerNav.removeEventListener('scroll', handleDrawerScroll);
            }, 500);
          }
        } else if (window.innerWidth < 768) {
          // On mobile, scroll with start alignment (respecting scroll-margin-top)
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        updateTargetPosition();
        setTimeout(updateTargetPosition, 80);
        setTimeout(updateTargetPosition, 200);
        setTimeout(updateTargetPosition, 350);
      } else {
        requestAnimationFrame(() => {
          if (!cancelled) updateTargetPosition();
        });
      }
    };

    // Use double rAF to guarantee DOM mount and layout settlement
    const frameId1 = requestAnimationFrame(() => {
      const frameId2 = requestAnimationFrame(syncTargetAndScroll);
      return () => cancelAnimationFrame(frameId2);
    });

    const timer = setTimeout(updateTargetPosition, 200);

    const handleScrollOrResize = () => {
      window.requestAnimationFrame(updateTargetPosition);
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId1);
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [
    isTourActive,
    currentStep,
    currentStepData,
    pathname,
    isMobileMenuOpen,
    setMobileMenuOpen,
    updateTargetPosition,
  ]);

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

  // Adaptive Collision-Aware Positioning (Mobile + Desktop)
  const getCardStyle = (): React.CSSProperties => {
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const vh = typeof window !== 'undefined' ? (window.visualViewport?.height || window.innerHeight) : 768;

    // Tablet layout with open mobile drawer (768 <= vw < 1024):
    // The drawer occupies 0 to 256px on the left. Place coachmark in the ample space to the right (272px+)
    if (vw >= 768 && vw < 1024 && isMobileMenuOpen) {
      const cardWidth = Math.min(380, vw - 288);
      const top = targetRect
        ? Math.max(16, Math.min(targetRect.top + targetRect.height / 2 - cardHeight / 2, vh - cardHeight - 16))
        : Math.max(16, vh / 2 - cardHeight / 2);
      return {
        position: 'fixed',
        top: `${top}px`,
        left: '272px',
        width: `${cardWidth}px`,
        zIndex: 70,
      };
    }

    // Phone mobile layout (vw < 768): Vertical Partitioning Strategy
    if (vw < 768) {
      const SAFE_PADDING = 12; // 12px safe horizontal/vertical margin for mobile viewports (Section 8)
      const targetPadding = 10;

      // Safe fallback if target is not located on current screen
      if (!targetRect) {
        return {
          position: 'fixed',
          bottom: `${SAFE_PADDING}px`,
          left: `${SAFE_PADDING}px`,
          right: `${SAFE_PADDING}px`,
          maxWidth: '440px',
          marginLeft: 'auto',
          marginRight: 'auto',
          maxHeight: `${Math.floor(vh * 0.52)}px`,
          zIndex: 70,
        };
      }

      // Compute target exclusion zone (including spotlight halo)
      const targetTop = Math.max(0, targetRect.top - targetPadding);
      const targetBottom = Math.min(vh, targetRect.bottom + targetPadding);

      const availableBelow = Math.max(0, vh - targetBottom - SAFE_PADDING);
      const availableAbove = Math.max(0, targetTop - SAFE_PADDING);

      // Mobile Placement Strategy (Section 5):
      // 1. If enough safe space exists BELOW target: place below
      // 2. Else if enough safe space exists ABOVE target: place above
      // 3. Otherwise pick the larger region and strictly constrain maxHeight with internal scroll
      let placement: 'bottom' | 'top' = 'bottom';
      if (availableBelow >= cardHeight + 16) {
        placement = 'bottom';
      } else if (availableAbove >= cardHeight + 16) {
        placement = 'top';
      } else {
        placement = availableBelow >= availableAbove ? 'bottom' : 'top';
      }

      if (placement === 'bottom') {
        const maxSafeHeight = Math.max(160, Math.min(380, availableBelow - 8));
        return {
          position: 'fixed',
          bottom: `${SAFE_PADDING}px`,
          left: `${SAFE_PADDING}px`,
          right: `${SAFE_PADDING}px`,
          maxWidth: '440px',
          marginLeft: 'auto',
          marginRight: 'auto',
          maxHeight: `${maxSafeHeight}px`,
          zIndex: 70,
        };
      } else {
        const maxSafeHeight = Math.max(160, Math.min(380, availableAbove - 8));
        return {
          position: 'fixed',
          top: `${SAFE_PADDING}px`,
          left: `${SAFE_PADDING}px`,
          right: `${SAFE_PADDING}px`,
          maxWidth: '440px',
          marginLeft: 'auto',
          marginRight: 'auto',
          maxHeight: `${maxSafeHeight}px`,
          zIndex: 70,
        };
      }
    }

    // DESKTOP FLOATING PLACEMENT (>= 1024px without mobile drawer)
    if (!targetRect) {
      return {
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        width: '380px',
        zIndex: 70,
      };
    }

    const cardWidth = 380;
    const padding = 16;
    const preferredPlacement = currentStepData.placement || 'bottom';

    const spaceTop = targetRect.top;
    const spaceBottom = vh - targetRect.bottom;
    const spaceLeft = targetRect.left;
    const spaceRight = vw - targetRect.right;

    const fitsBottom = spaceBottom >= cardHeight + padding;
    const fitsTop = spaceTop >= cardHeight + padding;
    const fitsRight = spaceRight >= cardWidth + padding;
    const fitsLeft = spaceLeft >= cardWidth + padding;

    let resolvedPlacement = preferredPlacement;

    if (preferredPlacement === 'bottom') {
      if (!fitsBottom && fitsTop) resolvedPlacement = 'top';
      else if (!fitsBottom && fitsRight) resolvedPlacement = 'right';
      else if (!fitsBottom && fitsLeft) resolvedPlacement = 'left';
    } else if (preferredPlacement === 'top') {
      if (!fitsTop && fitsBottom) resolvedPlacement = 'bottom';
      else if (!fitsTop && fitsRight) resolvedPlacement = 'right';
      else if (!fitsTop && fitsLeft) resolvedPlacement = 'left';
    } else if (preferredPlacement === 'right') {
      if (!fitsRight && fitsLeft) resolvedPlacement = 'left';
      else if (!fitsRight && fitsBottom) resolvedPlacement = 'bottom';
      else if (!fitsRight && fitsTop) resolvedPlacement = 'top';
    } else if (preferredPlacement === 'left') {
      if (!fitsLeft && fitsRight) resolvedPlacement = 'right';
      else if (!fitsLeft && fitsBottom) resolvedPlacement = 'bottom';
      else if (!fitsLeft && fitsTop) resolvedPlacement = 'top';
    }

    let top = 0;
    let left = 0;

    const isSidebarTarget = currentStepData.targetTourId.startsWith('sidebar-');

    if (resolvedPlacement === 'bottom') {
      top = targetRect.bottom + 14;
      left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    } else if (resolvedPlacement === 'top') {
      top = targetRect.top - cardHeight - 14;
      left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
    } else if (resolvedPlacement === 'right') {
      top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
      left = isSidebarTarget ? 272 : targetRect.right + 16;
    } else if (resolvedPlacement === 'left') {
      top = targetRect.top + targetRect.height / 2 - cardHeight / 2;
      left = targetRect.left - cardWidth - 16;
    }

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
        const minLeft = isSidebarTarget ? 272 : targetRect.right + 8;
        left = Math.max(minLeft, Math.min(left, vw - cardWidth - padding));
      } else {
        left = Math.min(targetRect.left - cardWidth - 8, Math.max(padding, left));
      }
    }

    return {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      width: `${cardWidth}px`,
      zIndex: 70,
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
            zIndex: 65,
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
        className="pointer-events-auto transition-all box-border rounded-2xl sm:rounded-3xl border border-[var(--border-strong)] bg-[var(--surface-elevated)] p-4 sm:p-5 shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header: Stage Badge, Step Count, Close Button */}
        <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] pb-2.5 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${badgeClass}`}
            >
              {currentStepData.stage}
            </span>
            <span className="truncate text-xs font-bold text-[var(--muted)]">
              Langkah {currentStep + 1} dari {steps.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleStopTour}
            aria-label="Tutup panduan interaktif"
            className="shrink-0 rounded-full p-1 text-[var(--muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Stepper Progress Bar */}
        <div
          className="mt-2.5 flex items-center justify-between gap-1 w-full shrink-0"
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

        {/* Scrollable Body Content */}
        <div className="mt-2.5 space-y-2 overflow-y-auto pr-1 flex-1 min-h-0">
          <h3 className="text-base font-black tracking-tight text-[var(--foreground)] break-words">
            {currentStepData.title}
          </h3>

          <p className="text-xs leading-relaxed text-[var(--foreground)] font-medium break-words">
            {currentStepData.instruction}
          </p>

          {/* Missing target helper */}
          {!targetFound && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-700 dark:text-amber-300">
              <HelpCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="font-bold">Bagian ini berada di halaman lain.</p>
                <p className="mt-0.5">
                  Gunakan tombol di bawah untuk menuju halaman target atau lanjutkan langkah.
                </p>
              </div>
            </div>
          )}

          {/* Context Explainer */}
          {targetFound && currentStepData.detailedContext && (
            <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/70 p-2.5 text-[11px] leading-relaxed text-[var(--muted)] break-words">
              {currentStepData.detailedContext}
            </div>
          )}

          {/* Benefit Badge */}
          {currentStepData.benefit && (
            <div className="flex items-start gap-1.5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              <Sparkles className="h-3.5 w-3.5 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
              <span className="min-w-0 flex-1 break-words">{currentStepData.benefit}</span>
            </div>
          )}
        </div>

        {/* Target click helper or route navigation */}
        <div className="mt-2.5 pt-2 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-2 shrink-0">
          {targetFound && isTargetClickStep ? (
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--primary)] min-w-0">
              <MousePointerClick className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate sm:overflow-visible sm:whitespace-normal">Klik target disorot atau Lanjut</span>
            </div>
          ) : (
            <Link
              href={currentStepData.ctaHref}
              className="inline-flex items-center gap-1 text-[11px] font-extrabold text-[var(--primary)] hover:underline decoration-[var(--primary)]/50 underline-offset-4 focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] rounded-md py-0.5 min-w-0"
            >
              <span className="truncate sm:overflow-visible">Buka: {currentStepData.ctaLabel}</span>
              <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
            </Link>
          )}

          <button
            type="button"
            onClick={handleStopTour}
            className="text-[11px] font-semibold text-[var(--muted)] hover:text-[var(--foreground)] ml-auto shrink-0 py-0.5"
          >
            Lewati panduan
          </button>
        </div>

        {/* Footer Navigation Buttons */}
        <div className="mt-2.5 flex items-center justify-between gap-2 pt-1 flex-wrap shrink-0">
          <button
            type="button"
            disabled={isFirstStep}
            onClick={prevStep}
            className="inline-flex items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs font-bold text-[var(--foreground)] hover:bg-[var(--surface-muted)] disabled:opacity-30 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition shrink-0"
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Kembali
          </button>

          <div className="flex items-center gap-2 ml-auto">
            {isLastStep ? (
              <button
                type="button"
                onClick={handleCompleteTour}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-extrabold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition shadow-xs shrink-0"
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                Selesai
              </button>
            ) : (
              <button
                type="button"
                onClick={nextStep}
                className="inline-flex items-center gap-1 rounded-xl bg-[var(--primary)] px-3.5 sm:px-4 py-2 text-xs font-extrabold text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--focus-ring)] transition shadow-xs min-w-0"
              >
                <span className="truncate max-w-[170px] sm:max-w-none">
                  {currentStepData.actionLabel || 'Lanjut'}
                </span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
