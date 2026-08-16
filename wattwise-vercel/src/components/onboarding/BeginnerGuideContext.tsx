'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useSyncExternalStore,
} from 'react';
import {
  TOUR_STEPS,
  STORAGE_TOUR_V2_COMPLETED_KEY,
  STORAGE_TOUR_V1_COMPLETED_KEY,
  STORAGE_DISMISSED_SESSION_KEY,
  SESSION_TOUR_ACTIVE_KEY,
  SESSION_TOUR_STEP_KEY,
  type TourStep,
} from './guide-steps';

interface BeginnerGuideContextType {
  isTourActive: boolean;
  currentStep: number;
  currentStepData: TourStep;
  isCompleted: boolean;
  isBannerDismissed: boolean;
  steps: TourStep[];
  startTour: (step?: number) => void;
  stopTour: () => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (step: number) => void;
  dismissBanner: () => void;
  completeTour: () => void;
}

const BeginnerGuideContext = createContext<BeginnerGuideContextType | undefined>(undefined);

function subscribeStorage(callback: () => void) {
  if (typeof window === 'undefined') return () => {};
  window.addEventListener('storage', callback);
  window.addEventListener('wattwise-tour-update', callback);
  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener('wattwise-tour-update', callback);
  };
}

function getCompletedSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const v2 = localStorage.getItem(STORAGE_TOUR_V2_COMPLETED_KEY) === 'true';
    const v1 = localStorage.getItem(STORAGE_TOUR_V1_COMPLETED_KEY) === 'true';
    return v2 || v1;
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

function getTourActiveSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return sessionStorage.getItem(SESSION_TOUR_ACTIVE_KEY) === 'true';
  } catch {
    return false;
  }
}

function getTourStepSnapshot(): number {
  if (typeof window === 'undefined') return 0;
  try {
    const savedStepStr = sessionStorage.getItem(SESSION_TOUR_STEP_KEY);
    const savedStep = savedStepStr ? parseInt(savedStepStr, 10) : 0;
    return Math.max(0, Math.min(Number.isNaN(savedStep) ? 0 : savedStep, TOUR_STEPS.length - 1));
  } catch {
    return 0;
  }
}

function getServerBooleanSnapshot(): boolean {
  return false;
}

function getServerNumberSnapshot(): number {
  return 0;
}

export function BeginnerGuideProvider({ children }: { children: React.ReactNode }) {
  const isCompleted = useSyncExternalStore(
    subscribeStorage,
    getCompletedSnapshot,
    getServerBooleanSnapshot
  );

  const isBannerDismissed = useSyncExternalStore(
    subscribeStorage,
    getDismissedSnapshot,
    getServerBooleanSnapshot
  );

  const isTourActive = useSyncExternalStore(
    subscribeStorage,
    getTourActiveSnapshot,
    getServerBooleanSnapshot
  );

  const currentStep = useSyncExternalStore(
    subscribeStorage,
    getTourStepSnapshot,
    getServerNumberSnapshot
  );

  const notifyChange = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('wattwise-tour-update'));
    }
  }, []);

  const startTour = useCallback((step = 0) => {
    const validStep = Math.max(0, Math.min(step, TOUR_STEPS.length - 1));
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_TOUR_ACTIVE_KEY, 'true');
        sessionStorage.setItem(SESSION_TOUR_STEP_KEY, String(validStep));
      }
    } catch {}
    notifyChange();
  }, [notifyChange]);

  const stopTour = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem(SESSION_TOUR_ACTIVE_KEY);
        sessionStorage.removeItem(SESSION_TOUR_STEP_KEY);
      }
    } catch {}
    notifyChange();
  }, [notifyChange]);

  const nextStep = useCallback(() => {
    const next = currentStep + 1;
    if (next >= TOUR_STEPS.length) {
      try {
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_TOUR_V2_COMPLETED_KEY, 'true');
          sessionStorage.removeItem(SESSION_TOUR_ACTIVE_KEY);
          sessionStorage.removeItem(SESSION_TOUR_STEP_KEY);
        }
      } catch {}
      notifyChange();
      return;
    }
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_TOUR_STEP_KEY, String(next));
      }
    } catch {}
    notifyChange();
  }, [currentStep, notifyChange]);

  const prevStep = useCallback(() => {
    const next = Math.max(0, currentStep - 1);
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_TOUR_STEP_KEY, String(next));
      }
    } catch {}
    notifyChange();
  }, [currentStep, notifyChange]);

  const goToStep = useCallback((step: number) => {
    const validStep = Math.max(0, Math.min(step, TOUR_STEPS.length - 1));
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_TOUR_STEP_KEY, String(validStep));
      }
    } catch {}
    notifyChange();
  }, [notifyChange]);

  const dismissBanner = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(STORAGE_DISMISSED_SESSION_KEY, 'true');
      }
    } catch {}
    notifyChange();
  }, [notifyChange]);

  const completeTour = useCallback(() => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_TOUR_V2_COMPLETED_KEY, 'true');
        sessionStorage.removeItem(SESSION_TOUR_ACTIVE_KEY);
        sessionStorage.removeItem(SESSION_TOUR_STEP_KEY);
      }
    } catch {}
    notifyChange();
  }, [notifyChange]);

  // Keyboard accessibility: Escape closes tour
  useEffect(() => {
    if (!isTourActive) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopTour();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isTourActive, stopTour]);

  const currentStepData = TOUR_STEPS[currentStep] || TOUR_STEPS[0];

  return (
    <BeginnerGuideContext.Provider
      value={{
        isTourActive,
        currentStep,
        currentStepData,
        isCompleted,
        isBannerDismissed,
        steps: TOUR_STEPS,
        startTour,
        stopTour,
        nextStep,
        prevStep,
        goToStep,
        dismissBanner,
        completeTour,
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