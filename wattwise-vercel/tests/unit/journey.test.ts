import { describe, it, expect } from 'vitest';
import { PLAN_TYPES, BUSINESS_TYPES, ELECTRICAL_SYSTEMS, BUSINESS_SEGMENTS } from '../../src/server/db/schema/journey';
import { selectPlanSchema, createBusinessSchema } from '../../src/server/validation/journey';
import { JOURNEY_ROUTES } from '../../src/server/services/journey.service';

describe('Plan Validation', () => {
  it('accepts FREE plan', () => {
    expect(selectPlanSchema.safeParse({ plan: 'FREE' }).success).toBe(true);
  });

  it('accepts PRO_TRIAL plan', () => {
    expect(selectPlanSchema.safeParse({ plan: 'PRO_TRIAL' }).success).toBe(true);
  });

  it('rejects invalid plan', () => {
    expect(selectPlanSchema.safeParse({ plan: 'PREMIUM' }).success).toBe(false);
  });

  it('rejects empty plan', () => {
    expect(selectPlanSchema.safeParse({ plan: '' }).success).toBe(false);
  });

  it('PLAN_TYPES contains exactly FREE and PRO_TRIAL', () => {
    expect([...PLAN_TYPES]).toEqual(['FREE', 'PRO_TRIAL']);
  });
});

describe('Trial Expiry Calculation', () => {
  it('calculates 30 days from now', () => {
    const now = new Date('2026-07-23T00:00:00Z');
    const trialEnd = new Date(now.getTime() + 30 * 86400000);
    expect(trialEnd.toISOString()).toBe('2026-08-22T00:00:00.000Z');
  });

  it('30-day duration is exactly 2592000000ms', () => {
    expect(30 * 86400000).toBe(2592000000);
  });
});

describe('Business Schema Validation', () => {
  const validBusiness = {
    name: 'Kos Pak Budi',
    businessType: 'KOS_PROPERTY' as const,
    segment: 'KOS' as const,
    electricalSystem: 'ALL_IN' as const,
  };

  it('accepts valid minimal business', () => {
    const result = createBusinessSchema.safeParse(validBusiness);
    expect(result.success).toBe(true);
  });

  it('accepts business with all optional fields', () => {
    const result = createBusinessSchema.safeParse({
      ...validBusiness,
      city: 'Bandung',
      roomCount: 20,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing name', () => {
    const result = createBusinessSchema.safeParse({ ...validBusiness, name: '' });
    expect(result.success).toBe(false);
  });

  it('rejects name longer than 120 chars', () => {
    const result = createBusinessSchema.safeParse({ ...validBusiness, name: 'A'.repeat(121) });
    expect(result.success).toBe(false);
  });

  it('rejects invalid businessType', () => {
    const result = createBusinessSchema.safeParse({ ...validBusiness, businessType: 'HOTEL' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid businessType values', () => {
    for (const t of BUSINESS_TYPES) {
      const result = createBusinessSchema.safeParse({ ...validBusiness, businessType: t });
      expect(result.success).toBe(true);
    }
  });

  it('accepts all valid electricalSystem values', () => {
    for (const e of ELECTRICAL_SYSTEMS) {
      const result = createBusinessSchema.safeParse({ ...validBusiness, electricalSystem: e });
      expect(result.success).toBe(true);
    }
  });

  it('rejects invalid electricalSystem', () => {
    const result = createBusinessSchema.safeParse({ ...validBusiness, electricalSystem: 'SOLAR' });
    expect(result.success).toBe(false);
  });

  it('accepts all valid segment values', () => {
    for (const s of BUSINESS_SEGMENTS) {
      const result = createBusinessSchema.safeParse({ ...validBusiness, segment: s });
      expect(result.success).toBe(true);
    }
  });

  it('rejects negative roomCount', () => {
    const result = createBusinessSchema.safeParse({ ...validBusiness, roomCount: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects roomCount > 10000', () => {
    const result = createBusinessSchema.safeParse({ ...validBusiness, roomCount: 10001 });
    expect(result.success).toBe(false);
  });

  it('accepts roomCount of 0', () => {
    const result = createBusinessSchema.safeParse({ ...validBusiness, roomCount: 0 });
    expect(result.success).toBe(true);
  });

  it('rejects non-integer roomCount', () => {
    const result = createBusinessSchema.safeParse({ ...validBusiness, roomCount: 5.5 });
    expect(result.success).toBe(false);
  });
});

describe('Journey Routes', () => {
  it('maps PLAN to /plan', () => {
    expect(JOURNEY_ROUTES.PLAN).toBe('/plan');
  });

  it('maps ONBOARDING to /onboarding', () => {
    expect(JOURNEY_ROUTES.ONBOARDING).toBe('/onboarding');
  });

  it('maps BUSINESS to /businesses/new', () => {
    expect(JOURNEY_ROUTES.BUSINESS).toBe('/businesses/new');
  });

  it('maps COMPLETE to /setup', () => {
    expect(JOURNEY_ROUTES.COMPLETE).toBe('/setup');
  });

  it('no route target is an external URL (prevents open redirect)', () => {
    for (const route of Object.values(JOURNEY_ROUTES)) {
      expect(route.startsWith('/')).toBe(true);
      expect(route).not.toContain('://');
    }
  });
});
