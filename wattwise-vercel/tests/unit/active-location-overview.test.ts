import { describe, expect, it } from 'vitest';
import {
  OPERATIONAL_AGE_NOT_RECORDED,
  buildActiveLocationOverview,
  describeAddress,
  describeDiagnosticsExposure,
  describeElectricalSystem,
  parseBillNumber,
  parseTariff,
} from '@/lib/active-location-overview';

const business = {
  id: 'b1',
  name: 'Kos Melati',
  segment: 'KOS',
  electricalSystem: 'TOKEN_PER_KAMAR',
  address: null,
  city: 'Bandung',
  province: null,
  tariffRupiahPerKwh: '1500',
};

describe('buildActiveLocationOverview', () => {
  it('averages only valid recorded kWh and labels non-adjacent period comparators', () => {
    const model = buildActiveLocationOverview(business, [
      { id: 'a', periodStart: '2026-01-01', periodEnd: '2026-01-31', totalAmountRupiah: 100, kwh: '0' },
      { id: 'b', periodStart: '2026-03-01', periodEnd: '2026-03-31', totalAmountRupiah: 150, kwh: '100' },
      { id: 'c', periodStart: '2026-04-01', periodEnd: '2026-04-30', totalAmountRupiah: 0, kwh: '' },
    ]);
    expect(model.averageKwh).toBe(50);
    expect(model.completeness.withKwh).toBe(2);
    expect(model.bills[1].costChange.percent).toBe(50);
    expect(model.bills[1].costChange.previousPeriod).toBe('2026-01-31');
    expect(model.bills[1].kwhChange.state).toBe('ZERO_PREVIOUS');
    expect(model.bills[0].kwhChange.state).toBe('MISSING');
    expect(buildActiveLocationOverview(business, []).averageKwh).toBeNull();
  });
  it('sorts periods, derives latest cost/kWh and guards zero previous values', () => {
    const model = buildActiveLocationOverview(business, [
      { id: 'a', periodStart: '2026-01-01', periodEnd: '2026-01-31', totalAmountRupiah: '0', kwh: '100' },
      { id: 'b', periodStart: '2026-02-01', periodEnd: '2026-02-28', totalAmountRupiah: '300000', kwh: '0' },
      { id: 'c', periodStart: '2026-03-01', periodEnd: '2026-03-31', totalAmountRupiah: '450000', kwh: '150' },
    ]);

    expect(model.latest?.periodEnd).toBe('2026-03-31');
    expect(model.latest?.cost).toBe(450000);
    expect(model.latest?.usageKwh).toBe(150);
    expect(model.completeness.periodCount).toBe(3);
    expect(model.completeness.uniqueMonthCount).toBe(3);
    expect(model.costChange.state).toBe('CHANGE');
    expect(model.kwhChange.state).toBe('ZERO_PREVIOUS');
  });

  it('distinguishes periods from unique months and short history', () => {
    const model = buildActiveLocationOverview(business, [
      { id: 'a', periodStart: '2026-01-01', periodEnd: '2026-01-31', totalAmountRupiah: '100', kwh: '10' },
      { id: 'b', periodStart: '2026-01-02', periodEnd: '2026-01-30', totalAmountRupiah: '200', kwh: '20' },
    ]);
    expect(model.completeness.periodCount).toBe(2);
    expect(model.completeness.uniqueMonthCount).toBe(1);
    expect(model.hasShortHistory).toBe(true);
  });

  it('reports missing data without inventing values or age', () => {
    const model = buildActiveLocationOverview(business, []);
    expect(model.latest).toBeNull();
    expect(model.costChange.state).toBe('MISSING');
    expect(model.kwhChange.state).toBe('MISSING');
    expect(model.completeness.periodCount).toBe(0);
    expect(model.completeness.gaps).toContain('Belum ada periode tagihan yang tercatat.');
    expect(describeAddress(business)).toBe('Bandung');
    expect(describeAddress({ ...business, city: null })).toBe(OPERATIONAL_AGE_NOT_RECORDED);
    expect(describeElectricalSystem('TOKEN_PER_KAMAR')).toBe('Token per kamar');
  });

  it('never presents an older valid bill as the current period', () => {
    const model = buildActiveLocationOverview(business, [
      { id: 'old', periodStart: '2026-01-01', periodEnd: '2026-01-31', totalAmountRupiah: '300000', kwh: '150' },
      { id: 'new', periodStart: '2026-02-01', periodEnd: '2026-02-28', totalAmountRupiah: 'abc', kwh: '' },
    ]);
    expect(model.latest?.periodEnd).toBe('2026-02-28');
    expect(model.latest?.cost).toBeNull();
    expect(model.latest?.usageKwh).toBeNull();
    expect(model.costChange.state).toBe('MISSING');
    expect(model.completeness.withCost).toBe(1);
    expect(model.completeness.withKwh).toBe(1);
    expect(model.completeness.gaps).toContain('1 periode belum berisi kWh.');
  });

  it('rejects blank, non-finite and negative bill values; tariff must be positive', () => {
    expect(parseBillNumber('')).toBeNull();
    expect(parseBillNumber('   ')).toBeNull();
    expect(parseBillNumber('abc')).toBeNull();
    expect(parseBillNumber(Number.NaN)).toBeNull();
    expect(parseBillNumber(Number.POSITIVE_INFINITY)).toBeNull();
    expect(parseBillNumber('-1')).toBeNull();
    expect(parseBillNumber(-5)).toBeNull();
    expect(parseBillNumber('0')).toBe(0);
    expect(parseBillNumber(0)).toBe(0);
    expect(parseBillNumber('1250.5')).toBe(1250.5);

    expect(parseTariff('')).toBeNull();
    expect(parseTariff('0')).toBeNull();
    expect(parseTariff(0)).toBeNull();
    expect(parseTariff('-1500')).toBeNull();
    expect(parseTariff('1500')).toBe(1500);
  });
});

describe('describeDiagnosticsExposure', () => {
  it('hides the link when the real capability check says the feature is disabled', () => {
    expect(
      describeDiagnosticsExposure({
        available: false,
        reason: 'DISABLED',
        costIncreaseDetected: true,
        comparisonCount: 4,
      })
    ).toEqual({ showLink: false, note: 'Cek Kenaikan belum diaktifkan pada paket ini.' });
  });

  it('hides the link for an unsupported segment even when a spike was detected', () => {
    expect(
      describeDiagnosticsExposure({
        available: false,
        reason: 'UNSUPPORTED_SEGMENT',
        costIncreaseDetected: true,
        comparisonCount: 4,
      }).showLink
    ).toBe(false);
  });

  it('shows the link without requiring a spike and promises no findings', () => {
    const noSpike = describeDiagnosticsExposure({
      available: true,
      reason: 'SUPPORTED',
      costIncreaseDetected: false,
      comparisonCount: 3,
    });
    expect(noSpike.showLink).toBe(true);
    expect(noSpike.note).toContain('Belum ada indikasi kenaikan');

    const spike = describeDiagnosticsExposure({
      available: true,
      reason: 'SUPPORTED',
      costIncreaseDetected: true,
      comparisonCount: 3,
    });
    expect(spike.showLink).toBe(true);
    expect(spike.note).toContain('tanpa menetapkan penyebab');
  });

  it('is explicit when there are not yet two periods to compare', () => {
    const result = describeDiagnosticsExposure({
      available: true,
      reason: 'SUPPORTED',
      costIncreaseDetected: false,
      comparisonCount: 0,
    });
    expect(result.showLink).toBe(true);
    expect(result.note).toContain('minimal dua periode tagihan');
  });
});
