import { describe, expect, it } from 'vitest';
import type { BillRecord } from '../../src/server/repositories/bill.repository';
import {
  compareBills,
  inclusivePeriodDays,
  periodsOverlap,
  selectPreviousBill,
} from '../../src/server/services/bill-comparison.service';
import { createBillSchema, MAX_BILL_AMOUNT_RUPIAH } from '../../src/server/validation/bills';

function bill(overrides: Partial<BillRecord> = {}): BillRecord {
  return {
    id: 'bill-1',
    businessId: 'business-1',
    businessName: 'Usaha Uji',
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    totalAmountRupiah: 3_100n,
    kwh: null,
    tariffRupiahPerKwh: null,
    notes: null,
    createdAt: new Date('2026-01-31T00:00:00Z'),
    updatedAt: new Date('2026-01-31T00:00:00Z'),
    ...overrides,
  };
}

function validInput(overrides: Record<string, unknown> = {}) {
  return {
    periodStart: '2026-01-01',
    periodEnd: '2026-01-31',
    totalAmountRupiah: '1250000',
    kwh: '',
    tariffRupiahPerKwh: '',
    notes: '',
    ...overrides,
  };
}

describe('inclusive period contract', () => {
  it('counts inclusive days', () => {
    expect(inclusivePeriodDays('2026-01-01', '2026-01-31')).toBe(31);
  });

  it('counts a single-day period as one', () => {
    expect(inclusivePeriodDays('2026-04-12', '2026-04-12')).toBe(1);
  });

  it('counts across a month boundary', () => {
    expect(inclusivePeriodDays('2026-01-31', '2026-02-02')).toBe(3);
  });

  it('counts leap-year February correctly', () => {
    expect(inclusivePeriodDays('2028-02-01', '2028-02-29')).toBe(29);
  });

  it('rejects an invalid calendar date', () => {
    expect(createBillSchema.safeParse(validInput({ periodStart: '2026-02-30' })).success).toBe(false);
  });

  it('rejects periodEnd before periodStart', () => {
    const result = createBillSchema.safeParse(
      validInput({ periodStart: '2026-02-01', periodEnd: '2026-01-31' })
    );
    expect(result.success).toBe(false);
  });
});

describe('inclusive overlap contract', () => {
  it('accepts adjacent non-overlapping periods', () => {
    expect(periodsOverlap('2026-01-01', '2026-01-31', '2026-02-01', '2026-02-28')).toBe(false);
  });

  it('detects exact duplicate periods', () => {
    expect(periodsOverlap('2026-01-01', '2026-01-31', '2026-01-01', '2026-01-31')).toBe(true);
  });

  it('detects boundary overlap', () => {
    expect(periodsOverlap('2026-01-01', '2026-01-31', '2026-01-31', '2026-02-20')).toBe(true);
  });

  it('detects partial overlap', () => {
    expect(periodsOverlap('2026-01-01', '2026-01-31', '2026-01-20', '2026-02-10')).toBe(true);
  });

  it('detects a contained period', () => {
    expect(periodsOverlap('2026-01-01', '2026-01-31', '2026-01-10', '2026-01-20')).toBe(true);
  });

  it('detects a containing period', () => {
    expect(periodsOverlap('2026-01-10', '2026-01-20', '2026-01-01', '2026-01-31')).toBe(true);
  });
});

describe('previous bill selection', () => {
  const current = bill({ id: 'current', periodStart: '2026-05-01', periodEnd: '2026-05-31' });
  const january = bill({ id: 'jan', periodStart: '2026-01-01', periodEnd: '2026-01-31' });
  const march = bill({ id: 'mar', periodStart: '2026-03-01', periodEnd: '2026-03-31' });
  const future = bill({ id: 'jun', periodStart: '2026-06-01', periodEnd: '2026-06-30' });

  it('selects the greatest eligible periodEnd despite a gap', () => {
    expect(selectPreviousBill(current, [january, march])?.id).toBe('mar');
  });

  it('ignores periods newer than a non-latest current period', () => {
    expect(selectPreviousBill(current, [future, january, march])?.id).toBe('mar');
  });

  it('ignores another tenant business', () => {
    const foreign = bill({
      id: 'foreign',
      businessId: 'business-2',
      periodStart: '2026-04-01',
      periodEnd: '2026-04-30',
    });
    expect(selectPreviousBill(current, [foreign, january])?.id).toBe('jan');
  });
});

describe('Rupiah BigInt validation and comparison', () => {
  it.each(['1250000', '0001250000'])('accepts digit input %s as BigInt', (value) => {
    const result = createBillSchema.safeParse(validInput({ totalAmountRupiah: value }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.totalAmountRupiah).toBe(1_250_000n);
  });

  it('accepts the largest PostgreSQL signed bigint', () => {
    const result = createBillSchema.safeParse(
      validInput({ totalAmountRupiah: MAX_BILL_AMOUNT_RUPIAH.toString() })
    );
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.totalAmountRupiah).toBe(MAX_BILL_AMOUNT_RUPIAH);
  });

  it('rejects a value above PostgreSQL signed bigint', () => {
    const result = createBillSchema.safeParse(
      validInput({ totalAmountRupiah: (MAX_BILL_AMOUNT_RUPIAH + 1n).toString() })
    );
    expect(result.success).toBe(false);
  });

  it.each(['1.25', '1,25', 'Rp1250000', '1.250.000'])('rejects non-digit Rupiah input %s', (value) => {
    expect(createBillSchema.safeParse(validInput({ totalAmountRupiah: value })).success).toBe(false);
  });

  it('rounds daily Rupiah deterministically with BigInt', () => {
    const result = compareBills(
      bill({ totalAmountRupiah: 100n, periodStart: '2026-02-01', periodEnd: '2026-02-03' }),
      bill({ id: 'previous', totalAmountRupiah: 0n, periodStart: '2026-01-01', periodEnd: '2026-01-01' })
    );
    expect(result.dailyCost.current).toBe(33n);
  });

  it('normalizes different period lengths', () => {
    const result = compareBills(
      bill({ totalAmountRupiah: 3_100n }),
      bill({
        id: 'previous',
        totalAmountRupiah: 3_000n,
        periodStart: '2025-12-01',
        periodEnd: '2025-12-30',
      })
    );
    expect(result.dailyCost.current).toBe(100n);
    expect(result.dailyCost.previous).toBe(100n);
    expect(result.dailyCost.difference).toBe(0n);
  });

  it('returns unavailable percentages when previous amount is zero', () => {
    const result = compareBills(
      bill({ totalAmountRupiah: 100n }),
      bill({ id: 'previous', totalAmountRupiah: 0n, periodStart: '2025-12-01', periodEnd: '2025-12-31' })
    );
    expect(result.totalCost.percentage).toBeNull();
    expect(result.dailyCost.percentage).toBeNull();
  });

  it('formats BigInt before any client boundary without JSON serialization', () => {
    expect(new Intl.NumberFormat('id-ID').format(MAX_BILL_AMOUNT_RUPIAH)).toBe(
      '9.223.372.036.854.775.807'
    );
    expect(MAX_BILL_AMOUNT_RUPIAH.toString()).toBe('9223372036854775807');
  });
});

describe('decimal kWh and tariff contract', () => {
  it.each([
    ['1.000', '1.000'],
    ['1.001', '1.001'],
    ['0.001', '0.001'],
    ['999999999.999', '999999999.999'],
  ])('accepts valid kWh %s deterministically', (input, expected) => {
    const result = createBillSchema.safeParse(validInput({ kwh: input }));
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.kwh).toBe(expected);
  });

  it('rejects kWh with more than three decimal digits', () => {
    expect(createBillSchema.safeParse(validInput({ kwh: '1.0001' })).success).toBe(false);
  });

  it('preserves tariff as a decimal string and leaves it missing when blank', () => {
    const withTariff = createBillSchema.safeParse(validInput({ tariffRupiahPerKwh: '1444.70' }));
    const withoutTariff = createBillSchema.safeParse(validInput());
    expect(withTariff.success).toBe(true);
    if (withTariff.success) expect(withTariff.data.tariffRupiahPerKwh).toBe('1444.70');
    expect(withoutTariff.success).toBe(true);
    if (withoutTariff.success) expect(withoutTariff.data.tariffRupiahPerKwh).toBeUndefined();
  });

  it('returns no kWh comparison when current kWh is missing', () => {
    const result = compareBills(
      bill({ kwh: null }),
      bill({ id: 'previous', kwh: '10.000', periodStart: '2025-12-01', periodEnd: '2025-12-31' })
    );
    expect(result.totalKwh).toBeNull();
    expect(result.dailyKwh).toBeNull();
  });

  it('returns no kWh comparison when previous kWh is missing', () => {
    const result = compareBills(
      bill({ kwh: '10.000' }),
      bill({ id: 'previous', kwh: null, periodStart: '2025-12-01', periodEnd: '2025-12-31' })
    );
    expect(result.totalKwh).toBeNull();
    expect(result.dailyKwh).toBeNull();
  });

  it('calculates total and daily kWh with scaled BigInt', () => {
    const result = compareBills(
      bill({ kwh: '31.031' }),
      bill({
        id: 'previous',
        kwh: '30.000',
        periodStart: '2025-12-01',
        periodEnd: '2025-12-30',
      })
    );
    expect(result.totalKwh?.difference).toBe('1.031');
    expect(result.dailyKwh?.current).toBe('1.001');
    expect(result.dailyKwh?.previous).toBe('1');
    expect(result.dailyKwh?.difference).toBe('0.001');
    expect(result.dailyKwh?.percentage).toBe('0.1');
  });

  it('rounds milli-kWh per day deterministically', () => {
    const result = compareBills(
      bill({ kwh: '1.001', periodStart: '2026-01-01', periodEnd: '2026-01-02' }),
      bill({ id: 'previous', kwh: '0.001', periodStart: '2025-12-01', periodEnd: '2025-12-01' })
    );
    expect(result.dailyKwh?.current).toBe('0.501');
    expect(result.dailyKwh?.previous).toBe('0.001');
  });

  it('returns unavailable kWh percentage when previous kWh is zero', () => {
    const result = compareBills(
      bill({ kwh: '1.000' }),
      bill({ id: 'previous', kwh: '0.000', periodStart: '2025-12-01', periodEnd: '2025-12-31' })
    );
    expect(result.totalKwh?.percentage).toBeNull();
    expect(result.dailyKwh?.percentage).toBeNull();
  });

  it('is deterministic and never produces NaN or Infinity', () => {
    const current = bill({ kwh: '31.031' });
    const previous = bill({
      id: 'previous',
      kwh: '30.000',
      periodStart: '2025-12-01',
      periodEnd: '2025-12-30',
    });
    const first = compareBills(current, previous);
    const second = compareBills(current, previous);
    expect(first).toEqual(second);
    expect(JSON.stringify({ totalKwh: first.totalKwh, dailyKwh: first.dailyKwh })).not.toMatch(
      /NaN|Infinity/
    );
  });
});

describe('safe wording', () => {
  it('uses cost-only wording when kWh is incomplete', () => {
    const result = compareBills(
      bill({ totalAmountRupiah: 4_000n, kwh: null }),
      bill({
        id: 'previous',
        totalAmountRupiah: 3_000n,
        kwh: '30.000',
        periodStart: '2025-12-01',
        periodEnd: '2025-12-30',
      })
    );
    expect(result.wording.title).toContain('Biaya harian');
    expect(result.wording.title).not.toContain('kWh');
  });

  it('uses safe kWh wording only when both values exist', () => {
    const result = compareBills(
      bill({ totalAmountRupiah: 4_000n, kwh: '40.000' }),
      bill({
        id: 'previous',
        totalAmountRupiah: 3_000n,
        kwh: '30.000',
        periodStart: '2025-12-01',
        periodEnd: '2025-12-30',
      })
    );
    expect(result.wording.title).toContain('kWh per hari');
  });

  it('never claims a diagnosis or definite cause', () => {
    const text = JSON.stringify(
      compareBills(
        bill({ totalAmountRupiah: 4_000n, kwh: '40.000' }),
        bill({
          id: 'previous',
          totalAmountRupiah: 3_000n,
          kwh: '30.000',
          periodStart: '2025-12-01',
          periodEnd: '2025-12-30',
        })
      ).wording
    ).toLowerCase();
    expect(text).not.toMatch(/disebabkan|pasti karena|kebocoran|boros|kerusakan/);
  });
});
