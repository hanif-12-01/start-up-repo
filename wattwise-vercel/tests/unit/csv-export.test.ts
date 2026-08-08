import { describe, expect, it } from 'vitest';
import {
  formatCsvRow,
  sanitizeCell,
  sanitizeFilename,
} from '@/app/api/reports/monthly.csv/route';

describe('CSV Export Serialization & Formula Injection Protection', () => {
  it('quotes normal text correctly', () => {
    expect(sanitizeCell('Usaha Kos Melati')).toBe('"Usaha Kos Melati"');
  });

  it('escapes quotes within cell text', () => {
    expect(sanitizeCell('Toko "Barokah"')).toBe('"Toko ""Barokah"""');
  });

  it('handles null and undefined gracefully as empty cell', () => {
    expect(sanitizeCell(null)).toBe('""');
    expect(sanitizeCell(undefined)).toBe('""');
  });

  it('neutralizes formula injection characters (=, +, -, @, \\t, \\r, \\n)', () => {
    expect(sanitizeCell('=SUM(1,1)')).toBe('"\'=SUM(1,1)"');
    expect(sanitizeCell('+cmd|\'/C calc\'!A0')).toBe('"\'+cmd|\'/C calc\'!A0"');
    expect(sanitizeCell('-1+2')).toBe('"\'-1+2"');
    expect(sanitizeCell('@EVIL')).toBe('"\'@EVIL"');
    expect(sanitizeCell('\t=SUM(A1:A2)')).toBe('"\'\t=SUM(A1:A2)"');
    expect(sanitizeCell('\n=1+1')).toBe('"\'\n=1+1"');
  });

  it('formats rows by comma separating cells', () => {
    expect(formatCsvRow(['Periode', 'Hari', 'Biaya'])).toBe(
      '"Periode","Hari","Biaya"'
    );
  });

  it('sanitizes business names for safe downloadable filenames', () => {
    expect(sanitizeFilename('Kos Melati 1 & 2', '2026-08')).toBe(
      'wattwise-laporan-kos-melati-1-2-2026-08.csv'
    );
    expect(
      sanitizeFilename('../../../etc/passwd"\'\\', '2026-08')
    ).toBe('wattwise-laporan-etc-passwd-2026-08.csv');
  });
});
