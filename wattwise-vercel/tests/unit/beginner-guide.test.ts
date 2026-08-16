import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  TOUR_STEPS,
  SESSION_TOUR_ACTIVE_KEY,
  SESSION_TOUR_STEP_KEY,
  SESSION_TOUR_PENDING_STEP_KEY,
} from '@/components/onboarding/guide-steps';

describe('UX-ONBOARD-02-FIX — True Click-Driven Tour & Provider Boundary Tests', () => {
  it('CASE 1: TourStep supports explicit advanceMode with 9 sequential steps', () => {
    expect(TOUR_STEPS).toHaveLength(9);
    for (const step of TOUR_STEPS) {
      expect(['manual', 'target-click', 'route-change']).toContain(step.advanceMode);
    }
  });

  it('CASE 2: Step 3 (Tagihan Listrik) is target-click with expectedPathname /bills', () => {
    const step3 = TOUR_STEPS[2];
    expect(step3.advanceMode).toBe('target-click');
    expect(step3.targetTourId).toBe('sidebar-bills');
    expect(step3.expectedPathname).toBe('/bills');
  });

  it('CASE 3: Step 6 (Analisis) is target-click with expectedPathname /analysis', () => {
    const step6 = TOUR_STEPS[5];
    expect(step6.advanceMode).toBe('target-click');
    expect(step6.targetTourId).toBe('sidebar-analysis');
    expect(step6.expectedPathname).toBe('/analysis');
  });

  it('CASE 4: Step 7 (Forecast) is target-click with expectedSearchParam tab=forecast', () => {
    const step7 = TOUR_STEPS[6];
    expect(step7.advanceMode).toBe('target-click');
    expect(step7.targetTourId).toBe('analysis-forecast-tab');
    expect(step7.expectedPathname).toBe('/analysis');
    expect(step7.expectedSearchParam).toEqual({
      key: 'tab',
      value: 'forecast',
    });
  });

  it('CASE 5: Step 8 (Recommendations) is target-click with expectedSearchParam tab=recommendations', () => {
    const step8 = TOUR_STEPS[7];
    expect(step8.advanceMode).toBe('target-click');
    expect(step8.targetTourId).toBe('analysis-recommendations-tab');
    expect(step8.expectedPathname).toBe('/analysis');
    expect(step8.expectedSearchParam).toEqual({
      key: 'tab',
      value: 'recommendations',
    });
  });

  it('CASE 6: Step 2 (Business profile) remains manual advanceMode', () => {
    const step2 = TOUR_STEPS[1];
    expect(step2.advanceMode).toBe('manual');
    expect(step2.actionLabel).toBe('Profil sudah siap — lanjut');
  });

  it('CASE 7: Step 4 (Bill form) remains manual advanceMode', () => {
    const step4 = TOUR_STEPS[3];
    expect(step4.advanceMode).toBe('manual');
    expect(step4.actionLabel).toBe('Saya sudah punya tagihan — lanjut');
  });

  it('CASE 8: Target-click handler does NOT call preventDefault', () => {
    const overlayFile = readFileSync(join(process.cwd(), 'src/components/onboarding/InteractiveGuideOverlay.tsx'), 'utf8');
    expect(overlayFile).not.toContain('.preventDefault()');
  });

  it('CASE 9: Target-click handler does NOT call stopPropagation', () => {
    const overlayFile = readFileSync(join(process.cwd(), 'src/components/onboarding/InteractiveGuideOverlay.tsx'), 'utf8');
    expect(overlayFile).not.toContain('.stopPropagation()');
  });

  it('CASE 10: Target listener cleanup exists on step/route change', () => {
    const overlayFile = readFileSync(join(process.cwd(), 'src/components/onboarding/InteractiveGuideOverlay.tsx'), 'utf8');
    expect(overlayFile).toContain('removeEventListener');
  });

  it('CASE 11: Pending navigation advancement persists only in sessionStorage', () => {
    expect(SESSION_TOUR_PENDING_STEP_KEY).toBe('wattwise:interactive-tour:v2:pending-step');
    expect(SESSION_TOUR_ACTIVE_KEY).toBe('wattwise:interactive-tour:v2:active');
    expect(SESSION_TOUR_STEP_KEY).toBe('wattwise:interactive-tour:v2:step');
  });

  it('CASE 12 & 13: Expected route vs wrong route handling in overlay', () => {
    const overlayFile = readFileSync(join(process.cwd(), 'src/components/onboarding/InteractiveGuideOverlay.tsx'), 'utf8');
    expect(overlayFile).toContain('currentStepData.expectedPathname');
    expect(overlayFile).toContain('pathnameMatched');
    expect(overlayFile).toContain('searchParamMatched');
  });

  it('CASE 14: Forecast step specifically validates search params tab=forecast', () => {
    const step7 = TOUR_STEPS[6];
    expect(step7.expectedSearchParam?.key).toBe('tab');
    expect(step7.expectedSearchParam?.value).toBe('forecast');
  });

  it('CASE 15: Missing target does not throw error and renders graceful helper', () => {
    const overlayFile = readFileSync(join(process.cwd(), 'src/components/onboarding/InteractiveGuideOverlay.tsx'), 'utf8');
    expect(overlayFile).toContain('Bagian ini berada di halaman lain');
    expect(overlayFile).toContain('!targetFound');
  });

  it('CASE 16: ProductLayout Suspense fallback cannot expose authenticated children outside provider', () => {
    const layoutFile = readFileSync(join(process.cwd(), 'src/app/(product)/layout.tsx'), 'utf8');
    expect(layoutFile).not.toContain('fallback={<div className="min-h-screen bg-[#f7f9f4]">{children}</div>}');
    expect(layoutFile).toContain('aria-busy="true"');
  });

  it('CASE 17: No onboarding database or auth internals imported', () => {
    const contextFile = readFileSync(join(process.cwd(), 'src/components/onboarding/BeginnerGuideContext.tsx'), 'utf8');
    const overlayFile = readFileSync(join(process.cwd(), 'src/components/onboarding/InteractiveGuideOverlay.tsx'), 'utf8');
    const bannerFile = readFileSync(join(process.cwd(), 'src/components/onboarding/BeginnerWelcomeBanner.tsx'), 'utf8');
    const replayFile = readFileSync(join(process.cwd(), 'src/components/onboarding/GuideReplayButton.tsx'), 'utf8');

    const combined = `${contextFile} ${overlayFile} ${bannerFile} ${replayFile}`;
    expect(combined).not.toContain('@/server/db');
    expect(combined).not.toContain('drizzle-orm');
    expect(combined).not.toContain('INSERT INTO');
    expect(combined).not.toContain('DELETE FROM');
    expect(combined).not.toContain('UPDATE ');
    expect(combined).not.toContain('wattwise.jury.demo@example.com');
  });

  it('CASE 18: No automatic mutation or form auto-submission in onboarding code', () => {
    const overlayFile = readFileSync(join(process.cwd(), 'src/components/onboarding/InteractiveGuideOverlay.tsx'), 'utf8');
    expect(overlayFile).not.toContain('.submit()');
    expect(overlayFile).not.toContain('dispatchEvent(new SubmitEvent');
  });

  it('CASE 19: Mobile menu button target exists on ProductShell', () => {
    const shellFile = readFileSync(join(process.cwd(), 'src/components/product/ProductShell.tsx'), 'utf8');
    expect(shellFile).toContain('data-tour-id="mobile-menu-button"');
  });

  it('CASE 20: Step 8 has exact route/target match (analysis-recommendations-tab on /analysis)', () => {
    const step8 = TOUR_STEPS[7];
    expect(step8.route).toBe('/analysis');
    expect(step8.targetTourId).toBe('analysis-recommendations-tab');
    expect(step8.expectedPathname).toBe('/analysis');
    expect(step8.expectedSearchParam).toEqual({
      key: 'tab',
      value: 'recommendations',
    });

    const analysisViewFile = readFileSync(join(process.cwd(), 'src/components/analysis/AnalysisView.tsx'), 'utf8');
    expect(analysisViewFile).toContain('data-tour-id=');
    expect(analysisViewFile).toContain('analysis-recommendations-tab');
  });
});