import { describe, it, expect } from 'vitest';
import {
  ENTITLEMENT_POLICY_V1,
  resolveEffectivePlanFromRow,
  BusinessLimitExceededError,
} from '../../src/server/services/entitlement.service';
import { monthDistance, MonthlyReportHistoryGatedError } from '../../src/server/services/monthly-report.service';

describe('Entitlement Policy V1 Matrix', () => {
  it('FREE plan has max 1 business, 3 months history, and diagnostic journey allowed', () => {
    expect(ENTITLEMENT_POLICY_V1.FREE.maxBusinesses).toBe(1);
    expect(ENTITLEMENT_POLICY_V1.FREE.monthlyReportHistoryMonths).toBe(3);
    expect(ENTITLEMENT_POLICY_V1.FREE.coreDiagnosticJourneyAllowed).toBe(true);
  });

  it('TRIAL plan has max 3 businesses, 24 months history, and diagnostic journey allowed', () => {
    expect(ENTITLEMENT_POLICY_V1.TRIAL.maxBusinesses).toBe(3);
    expect(ENTITLEMENT_POLICY_V1.TRIAL.monthlyReportHistoryMonths).toBe(24);
    expect(ENTITLEMENT_POLICY_V1.TRIAL.coreDiagnosticJourneyAllowed).toBe(true);
  });

  it('PRO plan has max 10 businesses, 24 months history, and diagnostic journey allowed', () => {
    expect(ENTITLEMENT_POLICY_V1.PRO.maxBusinesses).toBe(10);
    expect(ENTITLEMENT_POLICY_V1.PRO.monthlyReportHistoryMonths).toBe(24);
    expect(ENTITLEMENT_POLICY_V1.PRO.coreDiagnosticJourneyAllowed).toBe(true);
  });
});

describe('Effective Plan & Trial Expiry Resolver', () => {
  const baseNow = new Date('2026-08-03T12:00:00Z');

  it('resolves to FREE when planRow is null', () => {
    const res = resolveEffectivePlanFromRow(null, baseNow);
    expect(res.effectivePlan).toBe('FREE');
    expect(res.isTrialExpired).toBe(false);
    expect(res.trialEndsAt).toBeNull();
  });

  it('resolves to FREE for FREE plan', () => {
    const row = {
      id: '1',
      userId: 'u1',
      plan: 'FREE',
      trialStartsAt: null,
      trialEndsAt: null,
      idempotencyKey: 'k1',
      onboardingCompletedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const res = resolveEffectivePlanFromRow(row, baseNow);
    expect(res.effectivePlan).toBe('FREE');
    expect(res.isTrialExpired).toBe(false);
  });

  it('resolves to TRIAL when trialEndsAt is in the future', () => {
    const futureDate = new Date('2026-08-20T12:00:00Z');
    const row = {
      id: '2',
      userId: 'u1',
      plan: 'PRO_TRIAL',
      trialStartsAt: new Date('2026-07-20T12:00:00Z'),
      trialEndsAt: futureDate,
      idempotencyKey: 'k2',
      onboardingCompletedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const res = resolveEffectivePlanFromRow(row, baseNow);
    expect(res.effectivePlan).toBe('TRIAL');
    expect(res.isTrialExpired).toBe(false);
    expect(res.trialEndsAt).toEqual(futureDate);
  });

  it('resolves to FREE (non-destructive fallback) when trialEndsAt is in the past', () => {
    const pastDate = new Date('2026-08-01T12:00:00Z');
    const row = {
      id: '3',
      userId: 'u1',
      plan: 'PRO_TRIAL',
      trialStartsAt: new Date('2026-07-01T12:00:00Z'),
      trialEndsAt: pastDate,
      idempotencyKey: 'k3',
      onboardingCompletedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const res = resolveEffectivePlanFromRow(row, baseNow);
    expect(res.effectivePlan).toBe('FREE');
    expect(res.isTrialExpired).toBe(true);
    expect(res.trialEndsAt).toEqual(pastDate);
  });

  it('resolves to PRO for PRO plan', () => {
    const row = {
      id: '4',
      userId: 'u1',
      plan: 'PRO',
      trialStartsAt: null,
      trialEndsAt: null,
      idempotencyKey: 'k4',
      onboardingCompletedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const res = resolveEffectivePlanFromRow(row, baseNow);
    expect(res.effectivePlan).toBe('PRO');
    expect(res.isTrialExpired).toBe(false);
  });
});

describe('Monthly Report History Window Calculation', () => {
  it('calculates 0 for same month', () => {
    expect(monthDistance('2026-08', '2026-08')).toBe(0);
  });

  it('calculates 2 months for 2026-06 relative to 2026-08', () => {
    expect(monthDistance('2026-08', '2026-06')).toBe(2);
  });

  it('calculates 3 months for 2026-05 relative to 2026-08', () => {
    expect(monthDistance('2026-08', '2026-05')).toBe(3);
  });

  it('calculates across year boundaries correctly', () => {
    expect(monthDistance('2027-01', '2026-11')).toBe(2);
    expect(monthDistance('2026-01', '2025-01')).toBe(12);
  });
});

describe('Entitlement Errors', () => {
  it('BusinessLimitExceededError sets status 403 and code BUSINESS_LIMIT_EXCEEDED', () => {
    const err = new BusinessLimitExceededError('FREE', 1);
    expect(err.status).toBe(403);
    expect(err.code).toBe('BUSINESS_LIMIT_EXCEEDED');
    expect(err.message).toContain('Business limit reached (1) for plan FREE');
  });

  it('MonthlyReportHistoryGatedError sets status 403 and code MONTHLY_REPORT_HISTORY_GATED', () => {
    const err = new MonthlyReportHistoryGatedError();
    expect(err.status).toBe(403);
    expect(err.code).toBe('MONTHLY_REPORT_HISTORY_GATED');
  });
});
