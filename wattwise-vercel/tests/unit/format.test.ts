import { describe, expect, it } from 'vitest';
import { formatMonth, formatMonthCompact, parseMonth, compactRupiah, compactDecimal } from '@/lib/format';

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

  it('formats compact Rupiah numbers correctly', () => {
    expect(compactRupiah(895000)).toBe('Rp 895 rb');
    expect(compactRupiah(1200000)).toBe('Rp 1,2 jt');
    expect(compactRupiah(25000000)).toBe('Rp 25 jt');
    expect(compactRupiah(1500000000)).toBe('Rp 1,5 M');
    expect(compactRupiah(450)).toBe('Rp 450');
  });

  it('formats compact decimal numbers correctly', () => {
    expect(compactDecimal(1400)).toBe('1,4k');
    expect(compactDecimal(450)).toBe('450');
  });
});
