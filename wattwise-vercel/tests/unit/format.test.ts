import { describe, expect, it } from 'vitest';
import { formatMonth, formatMonthCompact, parseMonth } from '@/lib/format';

describe('format helpers', () => {
  it('formats valid month and date values in Indonesian', () => {
    expect(formatMonth('2026-08')).toBe('Agustus 2026');
    expect(formatMonth('2026-08-31')).toBe('Agustus 2026');
    expect(formatMonthCompact('2026-08')).toBe('Agu 26');
  });

  it('fails safely for labels that are not calendar periods', () => {
    expect(parseMonth('forecast-next')).toBeNull();
    expect(formatMonth('forecast-next')).toBe('Periode tidak valid');
    expect(formatMonthCompact('forecast-next')).toBe('Periode');
  });

  it('rejects invalid calendar months', () => {
    expect(parseMonth('2026-00')).toBeNull();
    expect(parseMonth('2026-13')).toBeNull();
  });
});
