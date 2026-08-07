import { describe, expect, it } from 'vitest';
import { estimateMonthlyKwh } from '../../src/server/services/workspace.service';

describe('workspace feature-parity calculations', () => {
  it('calculates an appliance profile estimate from explicit assumptions', () => {
    expect(estimateMonthlyKwh({ powerWatts: 500, dailyHours: '8', quantity: 2, operatingDays: 30 })).toBe(240);
  });

  it('keeps the estimate unavailable when watt or daily hours are unknown', () => {
    expect(estimateMonthlyKwh({ powerWatts: null, dailyHours: '8', quantity: 2, operatingDays: 30 })).toBeNull();
    expect(estimateMonthlyKwh({ powerWatts: 500, dailyHours: null, quantity: 2, operatingDays: 30 })).toBeNull();
  });

  it('does not infer hidden appliance values', () => {
    expect(estimateMonthlyKwh({ powerWatts: 0, dailyHours: '10', quantity: 1, operatingDays: 30 })).toBe(0);
  });
});
