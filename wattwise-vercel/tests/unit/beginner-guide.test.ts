import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import {
  TOUR_STEPS,
  STORAGE_TOUR_V2_COMPLETED_KEY,
  STORAGE_TOUR_V1_COMPLETED_KEY,
  STORAGE_DISMISSED_SESSION_KEY,
  SESSION_TOUR_ACTIVE_KEY,
  SESSION_TOUR_STEP_KEY,
} from '@/components/onboarding/guide-steps';

describe('UX-ONBOARD-02 — Interactive Beginner Coachmark Tour', () => {
  it('CASE 1: Fresh user flow defines sequential interactive steps', () => {
    expect(TOUR_STEPS).toHaveLength(9);
    expect(TOUR_STEPS[0].stage).toBe('DATA');
    expect(TOUR_STEPS[1].stage).toBe('DATA');
    expect(TOUR_STEPS[2].stage).toBe('DATA');
    expect(TOUR_STEPS[3].stage).toBe('DATA');
    expect(TOUR_STEPS[4].stage).toBe('DECIDE / ACT');
    expect(TOUR_STEPS[5].stage).toBe('UNDERSTAND');
    expect(TOUR_STEPS[6].stage).toBe('PREDICT');
    expect(TOUR_STEPS[7].stage).toBe('DECIDE / ACT');
    expect(TOUR_STEPS[8].stage).toBe('MEASURE');
  });

  it('CASE 2: Start guide activates interactive tour with stable tour IDs', () => {
    expect(TOUR_STEPS[0].targetTourId).toBe('business-selector');
    expect(TOUR_STEPS[0].fallbackTourId).toBe('manage-business');
    expect(TOUR_STEPS[1].targetTourId).toBe('business-profile-form');
    expect(TOUR_STEPS[2].targetTourId).toBe('sidebar-bills');
    expect(TOUR_STEPS[3].targetTourId).toBe('add-bill');
    expect(TOUR_STEPS[4].targetTourId).toBe('dashboard-next-action');
    expect(TOUR_STEPS[5].targetTourId).toBe('analysis-trend-section');
    expect(TOUR_STEPS[6].targetTourId).toBe('analysis-forecast-tab');
    expect(TOUR_STEPS[7].targetTourId).toBe('analysis-next-action');
    expect(TOUR_STEPS[8].targetTourId).toBe('sidebar-reports');
  });

  it('CASE 3: Dashboard business selector and manage business targets exist in DashboardPage', () => {
    const dashboardFile = readFileSync(join(process.cwd(), 'src/app/(product)/dashboard/page.tsx'), 'utf8');
    expect(dashboardFile).toContain('data-tour-id="business-selector"');
    expect(dashboardFile).toContain('data-tour-id="manage-business"');
    expect(dashboardFile).toContain('data-tour-id="dashboard-next-action"');
    expect(dashboardFile).toContain('data-tour-id="dashboard-header"');
  });

  it('CASE 4: Stable tour IDs are present across ProductShell navigation and GuideReplayButton', () => {
    const shellFile = readFileSync(join(process.cwd(), 'src/components/product/ProductShell.tsx'), 'utf8');
    const replayFile = readFileSync(join(process.cwd(), 'src/components/onboarding/GuideReplayButton.tsx'), 'utf8');
    expect(shellFile).toContain('tourId: \'sidebar-dashboard\'');
    expect(shellFile).toContain('tourId: \'sidebar-analysis\'');
    expect(shellFile).toContain('tourId: \'sidebar-bills\'');
    expect(shellFile).toContain('tourId: \'sidebar-revenue\'');
    expect(shellFile).toContain('tourId: \'sidebar-businesses\'');
    expect(shellFile).toContain('tourId: \'sidebar-diagnostics\'');
    expect(shellFile).toContain('tourId: \'sidebar-reports\'');
    expect(replayFile).toContain('data-tour-id="sidebar-guide"');
    expect(shellFile).toContain('<InteractiveGuideOverlay');
  });

  it('CASE 5: Missing target safe fallback is implemented without crashing', () => {
    const overlayFile = readFileSync(join(process.cwd(), 'src/components/onboarding/InteractiveGuideOverlay.tsx'), 'utf8');
    expect(overlayFile).toContain('Bagian ini berada di halaman lain');
    expect(overlayFile).toContain('fallbackTourId');
    expect(overlayFile).toContain('!targetFound');
  });

  it('CASE 6: Target click allows normal interactivity without blocking clicks', () => {
    const overlayFile = readFileSync(join(process.cwd(), 'src/components/onboarding/InteractiveGuideOverlay.tsx'), 'utf8');
    expect(overlayFile).toContain('pointer-events-none');
    expect(overlayFile).toContain('pointer-events-auto');
  });

  it('CASE 7: Route navigation and session continuity keys are properly configured', () => {
    expect(SESSION_TOUR_ACTIVE_KEY).toBe('wattwise:interactive-tour:v2:active');
    expect(SESSION_TOUR_STEP_KEY).toBe('wattwise:interactive-tour:v2:step');
    expect(STORAGE_DISMISSED_SESSION_KEY).toBe('wattwise:interactive-tour:v2:dismissed');
  });

  it('CASE 8: Form-entry step does NOT auto-submit or autofill fake data', () => {
    const contextFile = readFileSync(join(process.cwd(), 'src/components/onboarding/BeginnerGuideContext.tsx'), 'utf8');
    const overlayFile = readFileSync(join(process.cwd(), 'src/components/onboarding/InteractiveGuideOverlay.tsx'), 'utf8');
    const combined = `${contextFile} ${overlayFile}`;

    expect(combined).not.toContain('.submit()');
    expect(combined).not.toContain('dispatchEvent(new SubmitEvent');
    expect(combined).not.toContain('formAction');
  });

  it('CASE 9: Completion stores v2 localStorage key', () => {
    expect(STORAGE_TOUR_V2_COMPLETED_KEY).toBe('wattwise:interactive-tour:v2:completed');
  });

  it('CASE 10: Replay works after completion via GuideReplayButton', () => {
    const replayFile = readFileSync(join(process.cwd(), 'src/components/onboarding/GuideReplayButton.tsx'), 'utf8');
    expect(replayFile).toContain('startTour(0)');
    expect(replayFile).toContain('data-tour-id="sidebar-guide"');
  });

  it('CASE 11: Existing v1-completed users are recognized without breaking compatibility', () => {
    expect(STORAGE_TOUR_V1_COMPLETED_KEY).toBe('wattwise:onboarding:v1:completed');
    const contextFile = readFileSync(join(process.cwd(), 'src/components/onboarding/BeginnerGuideContext.tsx'), 'utf8');
    expect(contextFile).toContain('STORAGE_TOUR_V1_COMPLETED_KEY');
  });

  it('CASE 12: No business empty-account state provides non-crashing guidance', () => {
    const step1 = TOUR_STEPS[0];
    expect(step1.fallbackTourId).toBe('manage-business');
    expect(step1.ctaHref).toBe('/businesses');
  });

  it('CASE 13: Existing business allows smooth continuation without forcing duplicate creation', () => {
    const step2 = TOUR_STEPS[1];
    expect(step2.actionLabel).toBe('Profil sudah siap — lanjut');
  });

  it('CASE 14: Existing bills allows continuation without forcing duplicate bill entry', () => {
    const step4 = TOUR_STEPS[3];
    expect(step4.actionLabel).toBe('Saya sudah punya tagihan — lanjut');
  });

  it('CASE 15: Forecast step copy strictly adheres to N-BEATS and historical estimate truthfulness', () => {
    const step7 = TOUR_STEPS[6];
    expect(step7.stage).toBe('PREDICT');
    expect(step7.detailedContext).toContain('kurang dari 6 bulan berurutan');
    expect(step7.detailedContext).toContain('estimasi historis');
    expect(step7.detailedContext).toContain('minimal 6 bulan histori berurutan');
    expect(step7.detailedContext).toContain('Prediksi AI N-BEATS');
    expect(step7.detailedContext).toContain('fallback');

    const fullText = `${step7.title} ${step7.instruction} ${step7.detailedContext}`;
    expect(fullText).not.toMatch(/model a|model b/i);
    expect(fullText).not.toMatch(/H01_02|H03_05|H06_12/i);
  });

  it('CASE 16: No database imports, mutations, or auth bypass in onboarding codebase', () => {
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
});