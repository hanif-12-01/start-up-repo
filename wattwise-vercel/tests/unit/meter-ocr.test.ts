import { describe, expect, it } from 'vitest';
import { parseMeterReading } from '@/lib/meter-ocr';

describe('browser-local meter OCR parser', () => {
  it('parses a single credible reading', () => {
    const result = parseMeterReading('METER 12 345.6 kWh', 91, 75);
    expect(result.success).toBe(true);
    expect(result.recommended?.value).toBe(12345.6);
  });

  it('rejects negative and implausibly long candidates', () => {
    const result = parseMeterReading('-123 123456789', 90, 75);
    expect(result.success).toBe(false);
  });

  it('requires manual selection when multiple candidates are credible', () => {
    const result = parseMeterReading('1234 kWh · REF 5678', 88, 75);
    expect(result.ambiguous).toBe(true);
    expect(result.recommended).toBeNull();
  });
});
