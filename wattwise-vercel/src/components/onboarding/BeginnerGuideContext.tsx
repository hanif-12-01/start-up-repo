'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useSyncExternalStore } from 'react';
import {
  GUIDE_STEPS,
  STORAGE_COMPLETED_KEY,
  STORAGE_DISMISSED_SESSION_KEY,
  type GuideStep,
} from './guide-steps';

interface BeginnerGuideContextType {
  isGuideOpen: boolean;
  currentStep: number;
  isCompleted: boolean;
  isBannerDismissed: boolean;
  steps: GuideStep[];
  startGuide: (step?: number) => void;
  closeGuide: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  dismissBanner: () => void;
  completeGuide: () => void;
}

const BeginnerGuideContext = createContext<BeginnerGuideContextType | undefined>(undefined);

function subscribeStorage(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('wattwise-onboarding-update', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('wattwise-onboarding-update', callback);
  };
}

function getCompletedSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
}

function getDismissedSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(STORAGE_DISMISSED_SESSION_KEY) === 'true';
  } catch {
    return false;
  }
}

function getServerSnapshot(): boolean {
  return false;
}

export function BeginnerGuideProvider({ children }: { children: React.ReactNode }) {
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const isCompleted = useSyncExternalStore(
    subscribeStorage,
    getCompletedSnapshot,
    getServerSnapshot
  );

  const isBannerDismissed = useSyncExternalStore(
    subscribeStorage,
    getDismissedSnapshot,
    getServerSnapshot
  );

  const notifyChange = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('wattwise-onboarding-update'));
    }
  }, []);

  const startGuide = useCallback((step = 0) => {
    const validStep = Math.max(0, Math.min(step, GUIDE_STEPS.length - 1));
    setCurrentStep(validStep);
    setIsGuideOpen(true);
  }, []);

  const closeGuide = useCallback(() => {
    setIsGuideOpen(false);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      if (prev >= GUIDE_STEPS.length - 1) {
        try {
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_COMPLETED_KEY, 'true');
            notifyChange();
          }
        } catch {}
        setIsGuideOpen(false);
        return prev;
      }
      return prev + 1;
    });
  }, [notifyChange]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1));
  }, []);

  const goToStep = useCallback((step: number) => {
    const validStep = Math.max(0, Math.min(step, GUIDE_STEPS.length - 1));
    setCurrentStep(validStep);
  }, []);

  const dismissBanner = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_DISMISSED_SESSION_KEY, 'true');
        notifyChange();
      }
    } catch {}
  }, [notifyChange]);

  const completeGuide = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_COMPLETED_KEY, 'true');
        notifyChange();
      }
    } catch {}
    setIsGuideOpen(false);
  }, [notifyChange]);

  // Keyboard accessibility: Escape to close guide
  useEffect(() => {
    if (!isGuideOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsGuideOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGuideOpen]);

  return (
    <BeginnerGuideContext.Provider
      value={{
        isGuideOpen,
        currentStep,
        isCompleted,
        isBannerDismissed,
        steps: GUIDE_STEPS,
        startGuide,
        closeGuide,
        nextStep,
        prevStep,
        goToStep,
        dismissBanner,
        completeGuide,
      }}
    >
      {children}
    </BeginnerGuideContext.Provider>
  );
}

export function useBeginnerGuide() {
  const context = useContext(BeginnerGuideContext);
  if (!context) {
    throw new Error('useBeginnerGuide must be used within a BeginnerGuideProvider');
  }
  return context;
}