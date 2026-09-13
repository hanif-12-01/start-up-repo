import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  CORE_TOUR_STEPS,
  MULTI_LOCATION_STEP,
  getEffectiveTourSteps,
  TOUR_STEPS,
  SESSION_TOUR_ACTIVE_KEY,
  SESSION_TOUR_STEP_KEY,
  SESSION_TOUR_PENDING_STEP_KEY,
  STORAGE_TOUR_V2_COMPLETED_KEY,
} from '@/components/onboarding/guide-steps';

describe('WattWise Guided Tutorial Improvement Unit Tests', () => {
  it('CASE 1: Core tour consists of 6 sequential steps teaching the product loop', () => {
    expect(CORE_TOUR_STEPS).toHaveLength(6);
    expect(TOUR_STEPS).toHaveLength(6);

    const stages = CORE_TOUR_STEPS.map((s) => s.stage);
    expect(stages).toContain('UNDERSTAND');
    expect(stages).toContain('DATA');
    expect(stages).toContain('PREDICT');
    expect(stages).toContain('DECIDE / ACT');
    expect(stages).toContain('MEASURE');
  });

  it('CASE 2: Step 1 (Welcome) introduces WattWise on dashboard-header', () => {
    const step1 = CORE_TOUR_STEPS[0];
    expect(step1.id).toBe('step-welcome');
    expect(step1.targetTourId).toBe('dashboard-header');
    expect(step1.title).toBe('Selamat datang di WattWise');
    expect(step1.benefit).toBeDefined();
    expect(step1.advanceMode).toBe('manual');
  });

  it('CASE 3: Step 2 (Bills) directs to sidebar-bills with target-click', () => {
    const step2 = CORE_TOUR_STEPS[1];
    expect(step2.id).toBe('step-bills');
    expect(step2.targetTourId).toBe('sidebar-bills');
    expect(step2.advanceMode).toBe('target-click');
    expect(step2.expectedPathname).toBe('/bills');
  });

  it('CASE 4: Step 3 (Summary) highlights dashboard-summary KPI cards', () => {
    const step3 = CORE_TOUR_STEPS[2];
    expect(step3.id).toBe('step-summary');
    expect(step3.targetTourId).toBe('dashboard-summary');
    expect(step3.advanceMode).toBe('manual');
  });

  it('CASE 5: Step 4 (Trend Chart) highlights dashboard-chart', () => {
    const step4 = CORE_TOUR_STEPS[3];
    expect(step4.id).toBe('step-chart');
    expect(step4.targetTourId).toBe('dashboard-chart');
    expect(step4.advanceMode).toBe('manual');
  });

  it('CASE 6: Step 5 (Diagnostics) highlights dashboard-candidates', () => {
    const step5 = CORE_TOUR_STEPS[4];
    expect(step5.id).toBe('step-diagnostics');
    expect(step5.targetTourId).toBe('dashboard-candidates');
    expect(step5.advanceMode).toBe('manual');
  });

  it('CASE 7: Step 6 (Actions & Measure) highlights dashboard-actions', () => {
    const step6 = CORE_TOUR_STEPS[5];
    expect(step6.id).toBe('step-actions');
    expect(step6.targetTourId).toBe('dashboard-actions');
    expect(step6.actionLabel).toBe('Selesai');
  });

  it('CASE 8: Multi-location step is conditionally included via getEffectiveTourSteps', () => {
    const singleLocSteps = getEffectiveTourSteps(false);
    expect(singleLocSteps).toHaveLength(6);

    const multiLocSteps = getEffectiveTourSteps(true);
    expect(multiLocSteps).toHaveLength(7);
    expect(multiLocSteps[6]).toEqual(MULTI_LOCATION_STEP);
    expect(multiLocSteps[6].id).toBe('step-portfolio');
    expect(multiLocSteps[6].targetTourId).toBe('business-selector');
    expect(multiLocSteps[6].isMultiLocationOnly).toBe(true);
  });

  it('CASE 9: Target-click handler does NOT prevent user clicks', () => {
    const overlayFile = readFileSync(
      join(process.cwd(), 'src/components/onboarding/InteractiveGuideOverlay.tsx'),
      'utf8'
    );
    expect(overlayFile).not.toContain('.preventDefault()');
    expect(overlayFile).not.toContain('.stopPropagation()');
    expect(overlayFile).toContain('removeEventListener');
  });

  it('CASE 10: Adaptive collision-free positioning flips to prevent covering target', () => {
    const overlayFile = readFileSync(
      join(process.cwd(), 'src/components/onboarding/InteractiveGuideOverlay.tsx'),
      'utf8'
    );
    expect(overlayFile).toContain('fitsBottom');
    expect(overlayFile).toContain('fitsTop');
    expect(overlayFile).toContain('fitsRight');
    expect(overlayFile).toContain('fitsLeft');
    expect(overlayFile).toContain('resolvedPlacement');
    expect(overlayFile).toContain('Math.max(targetRect.bottom + 8');
  });

  it('CASE 11: Mobile layout adopts bottom sheet panel pattern', () => {
    const overlayFile = readFileSync(
      join(process.cwd(), 'src/components/onboarding/InteractiveGuideOverlay.tsx'),
      'utf8'
    );
    expect(overlayFile).toContain('window.innerWidth < 640');
    expect(overlayFile).toContain('fixed bottom-0 left-0 right-0');
    expect(overlayFile).toContain("block: 'start'");
  });

  it('CASE 12: Accessibility attributes and focus restoration exist', () => {
    const overlayFile = readFileSync(
      join(process.cwd(), 'src/components/onboarding/InteractiveGuideOverlay.tsx'),
      'utf8'
    );
    expect(overlayFile).toContain('role="dialog"');
    expect(overlayFile).toContain('aria-modal="false"');
    expect(overlayFile).toContain('aria-label="Panduan Interaktif WattWise"');
    expect(overlayFile).toContain('previousActiveElementRef');
  });

  it('CASE 13: Keyboard Escape closes tour in context', () => {
    const contextFile = readFileSync(
      join(process.cwd(), 'src/components/onboarding/BeginnerGuideContext.tsx'),
      'utf8'
    );
    expect(contextFile).toContain("e.key === 'Escape'");
    expect(contextFile).toContain('stopTour()');
  });

  it('CASE 14: Persistence keys are standard and secure in session/local storage', () => {
    expect(STORAGE_TOUR_V2_COMPLETED_KEY).toBe('wattwise:interactive-tour:v2:completed');
    expect(SESSION_TOUR_ACTIVE_KEY).toBe('wattwise:interactive-tour:v2:active');
    expect(SESSION_TOUR_STEP_KEY).toBe('wattwise:interactive-tour:v2:step');
    expect(SESSION_TOUR_PENDING_STEP_KEY).toBe('wattwise:interactive-tour:v2:pending-step');
  });

  it('CASE 15: Missing target renders graceful guidance helper without crashing', () => {
    const overlayFile = readFileSync(
      join(process.cwd(), 'src/components/onboarding/InteractiveGuideOverlay.tsx'),
      'utf8'
    );
    expect(overlayFile).toContain('Bagian ini berada di halaman lain');
    expect(overlayFile).toContain('!targetFound');
  });

  it('CASE 16: ProductLayout Suspense fallback cannot expose authenticated children outside provider', () => {
    const layoutFile = readFileSync(
      join(process.cwd(), 'src/app/(product)/layout.tsx'),
      'utf8'
    );
    expect(layoutFile).not.toContain('fallback={<div className="min-h-screen bg-[#f7f9f4]">{children}</div>}');
    expect(layoutFile).toContain('aria-busy="true"');
  });

  it('CASE 17: No onboarding database or auth internals imported', () => {
    const contextFile = readFileSync(
      join(process.cwd(), 'src/components/onboarding/BeginnerGuideContext.tsx'),
      'utf8'
    );
    const overlayFile = readFileSync(
      join(process.cwd(), 'src/components/onboarding/InteractiveGuideOverlay.tsx'),
      'utf8'
    );
    const bannerFile = readFileSync(
      join(process.cwd(), 'src/components/onboarding/BeginnerWelcomeBanner.tsx'),
      'utf8'
    );
    const replayFile = readFileSync(
      join(process.cwd(), 'src/components/onboarding/GuideReplayButton.tsx'),
      'utf8'
    );

    const combined = `${contextFile} ${overlayFile} ${bannerFile} ${replayFile}`;
    expect(combined).not.toContain('@/server/db');
    expect(combined).not.toContain('drizzle-orm');
    expect(combined).not.toContain('INSERT INTO');
    expect(combined).not.toContain('DELETE FROM');
    expect(combined).not.toContain('UPDATE ');
    expect(combined).not.toContain('wattwise.jury.demo@example.com');
  });

  it('CASE 18: No automatic mutation or form auto-submission in onboarding code', () => {
    const overlayFile = readFileSync(
      join(process.cwd(), 'src/components/onboarding/InteractiveGuideOverlay.tsx'),
      'utf8'
    );
    expect(overlayFile).not.toContain('.submit()');
    expect(overlayFile).not.toContain('dispatchEvent(new SubmitEvent');
  });

  it('CASE 19: Mobile menu button target exists on ProductShell', () => {
    const shellFile = readFileSync(
      join(process.cwd(), 'src/components/product/ProductShell.tsx'),
      'utf8'
    );
    expect(shellFile).toContain('data-tour-id="mobile-menu-button"');
  });

  it('CASE 20: Dashboard page contains all core in-page tour targets', () => {
    const dashboardFile = readFileSync(
      join(process.cwd(), 'src/app/(product)/dashboard/page.tsx'),
      'utf8'
    );
    expect(dashboardFile).toContain('data-tour-id="dashboard-header"');
    expect(dashboardFile).toContain('data-tour-id="dashboard-summary"');
    expect(dashboardFile).toContain('data-tour-id="dashboard-chart"');
    expect(dashboardFile).toContain('data-tour-id="dashboard-candidates"');
    expect(dashboardFile).toContain('data-tour-id="dashboard-actions"');
  });
});
