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
  isMobileMenuOpen: boolean;
  setMobileMenuOpen: (open: boolean) => void;
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

export function BeginnerGuideProvider({
  children,
  steps = TOUR_STEPS,
  isMobileMenuOpen: controlledMenuOpen,
  onSetMobileMenuOpen,
}: {
  children: React.ReactNode;
  steps?: TourStep[];
  isMobileMenuOpen?: boolean;
  onSetMobileMenuOpen?: (open: boolean) => void;
}) {
  const [internalMenuOpen, setInternalMenuOpen] = React.useState(false);
  const isMobileMenuOpen = controlledMenuOpen ?? internalMenuOpen;
  const setMobileMenuOpen = useCallback(
    (open: boolean) => {
      if (onSetMobileMenuOpen) {
        onSetMobileMenuOpen(open);
      } else {
        setInternalMenuOpen(open);
      }
    },
    [onSetMobileMenuOpen]
  );
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

  const rawStep = useSyncExternalStore(
    subscribeStorage,
    getTourStepSnapshot,
    getServerNumberSnapshot
  );

  const currentStep = Math.min(rawStep, Math.max(0, steps.length - 1));

  const notifyChange = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('wattwise-tour-update'));
    }
  }, []);

  const startTour = useCallback((step = 0) => {
    const validStep = Math.max(0, Math.min(step, steps.length - 1));
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_TOUR_ACTIVE_KEY, 'true');
        sessionStorage.setItem(SESSION_TOUR_STEP_KEY, String(validStep));
      }
    } catch {}
    notifyChange();
  }, [notifyChange, steps.length]);

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
    if (next >= steps.length) {
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
  }, [currentStep, notifyChange, steps.length]);

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
    const validStep = Math.max(0, Math.min(step, steps.length - 1));
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem(SESSION_TOUR_STEP_KEY, String(validStep));
      }
    } catch {}
    notifyChange();
  }, [notifyChange, steps.length]);

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

  const currentStepData = steps[currentStep] || steps[0];

  return (
    <BeginnerGuideContext.Provider
      value={{
        isTourActive,
        currentStep,
        currentStepData,
        isCompleted,
        isBannerDismissed,
        steps,
        isMobileMenuOpen,
        setMobileMenuOpen,
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

const defaultGuideContext: BeginnerGuideContextType = {
  isTourActive: false,
  currentStep: 0,
  currentStepData: TOUR_STEPS[0],
  isCompleted: true,
  isBannerDismissed: true,
  steps: TOUR_STEPS,
  isMobileMenuOpen: false,
  setMobileMenuOpen: () => {},
  startTour: () => {},
  stopTour: () => {},
  nextStep: () => {},
  prevStep: () => {},
  goToStep: () => {},
  dismissBanner: () => {},
  completeTour: () => {},
};

export function useBeginnerGuide() {
  const context = useContext(BeginnerGuideContext);
  return context || defaultGuideContext;
}
