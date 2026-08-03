import { describe, expect, it } from 'vitest';
import {
  FUNNEL_DEFINITION_V1,
  parseDateBounds,
  ANALYTICS_MINIMUM_BREAKDOWN_COHORT,
} from '../../src/server/services/funnel-analytics.service';

describe('IT-DIAG-08B Funnel Definitions V1 Catalog', () => {
  it('defines stable User Activation Funnel with 4 stages in correct order', () => {
    const userFunnel = FUNNEL_DEFINITION_V1.USER_ACTIVATION_FUNNEL;
    expect(userFunnel.funnelCode).toBe('USER_ACTIVATION_FUNNEL');
    expect(userFunnel.unitOfAnalysis).toBe('USER');
    expect(userFunnel.stages).toHaveLength(4);

    expect(userFunnel.stages[0].stageCode).toBe('ACCOUNT_CREATED');
    expect(userFunnel.stages[1].stageCode).toBe('PLAN_SELECTED');
    expect(userFunnel.stages[2].stageCode).toBe('ONBOARDING_COMPLETED');
    expect(userFunnel.stages[3].stageCode).toBe('FIRST_BUSINESS_CREATED');

    userFunnel.stages.forEach((stg, index) => {
      expect(stg.order).toBe(index + 1);
      expect(stg.label).toBeDefined();
    });
  });

  it('defines stable Business Value Funnel with 12 stages in correct order', () => {
    const bizFunnel = FUNNEL_DEFINITION_V1.BUSINESS_VALUE_FUNNEL;
    expect(bizFunnel.funnelCode).toBe('BUSINESS_VALUE_FUNNEL');
    expect(bizFunnel.unitOfAnalysis).toBe('BUSINESS');
    expect(bizFunnel.stages).toHaveLength(12);

    expect(bizFunnel.stages[0].stageCode).toBe('BUSINESS_CREATED');
    expect(bizFunnel.stages[1].stageCode).toBe('FIRST_BILL_CREATED');
    expect(bizFunnel.stages[2].stageCode).toBe('COMPARISON_READY');
    expect(bizFunnel.stages[3].stageCode).toBe('DIAGNOSTIC_STARTED');
    expect(bizFunnel.stages[4].stageCode).toBe('QUESTIONNAIRE_COMPLETED');
    expect(bizFunnel.stages[5].stageCode).toBe('CANDIDATES_READY');
    expect(bizFunnel.stages[6].stageCode).toBe('INSPECTION_STARTED');
    expect(bizFunnel.stages[7].stageCode).toBe('INSPECTION_COMPLETED');
    expect(bizFunnel.stages[8].stageCode).toBe('ACTION_CREATED');
    expect(bizFunnel.stages[9].stageCode).toBe('ACTION_COMPLETED');
    expect(bizFunnel.stages[10].stageCode).toBe('OUTCOME_CREATED');
    expect(bizFunnel.stages[11].stageCode).toBe('SESSION_CLOSED');

    bizFunnel.stages.forEach((stg, index) => {
      expect(stg.order).toBe(index + 1);
      expect(stg.label).toBeDefined();
    });
  });
});

describe('Cohort Date Parsing and Validation', () => {
  const baseNow = new Date('2026-08-03T12:00:00Z');

  it('parses valid date bounds within max 366 days', () => {
    const bounds = parseDateBounds('2026-05-01', '2026-08-01', baseNow);
    expect(bounds.fromDateStr).toBe('2026-05-01');
    expect(bounds.toDateStr).toBe('2026-08-01');
    expect(bounds.dayCount).toBe(93);
  });

  it('uses default 90 days range when from and to are omitted', () => {
    const bounds = parseDateBounds(undefined, undefined, baseNow);
    expect(bounds.fromDateStr).toBeDefined();
    expect(bounds.toDateStr).toBe('2026-08-03');
    expect(bounds.dayCount).toBe(90);
  });

  it('throws error when from date is after to date', () => {
    expect(() => parseDateBounds('2026-08-10', '2026-08-01', baseNow)).toThrow('Tanggal mulai tidak boleh lebih besar');
  });

  it('throws error when day range exceeds 366 days', () => {
    expect(() => parseDateBounds('2024-01-01', '2026-01-01', baseNow)).toThrow('Rentang cohort maksimal 366 hari');
  });

  it('throws error when from date is entirely in the future', () => {
    expect(() => parseDateBounds('2026-09-01', '2026-10-01', baseNow)).toThrow('Rentang cohort tidak boleh sepenuhnya di masa depan');
  });

  it('handles leap day and year boundary dates correctly', () => {
    const bounds = parseDateBounds('2028-02-28', '2028-03-01', new Date('2028-03-05T00:00:00Z'));
    expect(bounds.dayCount).toBe(3);
  });
});

describe('Privacy & Suppression Constants', () => {
  it('defines minimum segment breakdown cohort suppression threshold of 5', () => {
    expect(ANALYTICS_MINIMUM_BREAKDOWN_COHORT).toBe(5);
  });
});
