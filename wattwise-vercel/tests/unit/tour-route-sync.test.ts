import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CORE_TOUR_STEPS } from '@/components/onboarding/guide-steps';

describe('Stage5G14 tour route continuity', () => {
  it('keeps the target-click step and its following manual step on explicit routes', () => {
    const bills = CORE_TOUR_STEPS.find((step) => step.id === 'step-bills');
    const summary = CORE_TOUR_STEPS.find((step) => step.id === 'step-summary');
    expect(bills?.advanceMode).toBe('target-click');
    expect(bills?.expectedPathname).toBe('/bills');
    expect(summary?.advanceMode).toBe('manual');
    expect(summary?.expectedPathname).toBe('/dashboard');
    expect(summary?.targetTourId).toBe('dashboard-summary');
  });

  it('returns to the expected route after a target-click navigation and preserves businessId', () => {
    const overlay = readFileSync(
      join(process.cwd(), 'src/components/onboarding/InteractiveGuideOverlay.tsx'),
      'utf8'
    );
    expect(overlay).toContain('returnToStepRouteRef');
    expect(overlay).toContain('router.push');
    expect(overlay).toContain('withBusinessId(expected, businessId)');
    expect(overlay).toContain('markTargetClickPending');
    expect(overlay).toContain("document.addEventListener('click', handleTargetClick, true)");
    expect(overlay).toContain('prefers-reduced-motion');
    expect(overlay).toContain('aria-live="polite"');
    expect(overlay).toContain('Bagian ini tidak tersedia di halaman saat ini.');
  });

  it('keeps every internal shell link on the selected business context', () => {
    const shell = readFileSync(
      join(process.cwd(), 'src/components/product/ProductShell.tsx'),
      'utf8'
    );
    expect(shell).toContain('withBusinessId(item.href, businessId)');
    expect(shell).toContain("withBusinessId('/dashboard', activeBusinessId)");
  });
});