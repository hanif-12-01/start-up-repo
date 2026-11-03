import { describe, expect, it } from 'vitest';
import { energyError, energyIssue, localTimestamp, manualInput } from '@/lib/energy-input';
const form = (changes: Record<string, string | undefined> = {}) => {
  const data = new FormData();
  for (const [k, v] of Object.entries({ businessId: 'b', measurementSourceId: 's', sourceTimezone: 'Asia/Jakarta', periodStart: '2026-01-01T00:00', periodEnd: '2026-01-02T00:00', energyKwh: '12.345', consumptionBasis: 'MEASURED', provenanceReference: 'catatan-1', ...changes })) if (v !== undefined) data.set(k, v);
  return data;
};
describe('Manual energy mapping', () => {
  it('humanizes boundary validation without leaking raw contract or infrastructure messages', () => {
    expect(energyIssue('periodStart', 'Invalid ISO datetime')).toContain('Waktu mulai');
    expect(energyIssue('name', 'Too small: expected string')).toContain('Nama sumber');
    expect(energyIssue('periodEnd', 'Akhir interval harus setelah awal [start,end)')).toContain('Waktu selesai harus setelah waktu mulai');
    expect(energyIssue('energyKwh', 'SQL constraint secret')).toContain('12.5');
    expect(energyIssue('measurementKind', 'Invalid input: INTERVAL_ENERGY')).not.toContain('INTERVAL_ENERGY');
    expect(energyError('DUPLICATE_INTERVAL')).toContain('sudah pernah disimpan');
    expect(energyError('OVERLAPPING_INTERVAL')).toContain('bertumpang tindih');
    expect(energyError('23505 secret')).not.toMatch(/23505|secret/);
  });
  it.each([['Asia/Jakarta', '+07:00'], ['Asia/Makassar', '+08:00'], ['Asia/Jayapura', '+09:00'], ['UTC', '+00:00']])('uses explicit source offset %s, no browser zone', (zone, offset) => {
    expect(localTimestamp('2026-01-01T00:00', zone)).toBe('2026-01-01T00:00:00'+offset);
    expect(manualInput(form({ sourceTimezone: zone })).success).toBe(true);
  });
  it('preserves decimal, fixes method/unit/kind, ignores spoofed input method', () => {
    const parsed = manualInput(form({ measurementMethod: 'SENSOR', energyKwh: '0.001' }));
    expect(parsed).toMatchObject({ success: true, data: { energyKwh: '0.001', unit: 'kWh', measurementKind: 'INTERVAL_ENERGY', measurementMethod: 'MANUAL', qualityStatus: 'RECORDED' } });
    expect(manualInput(form({ consumptionBasis: 'ESTIMATED' }))).toMatchObject({ success: true, data: { qualityStatus: 'NEEDS_REVIEW' } });
  });
  it.each([{ energyKwh: '-1' }, { energyKwh: '1.0001' }, { energyKwh: '1,2' }, { energyKwh: '1e2' }, { periodEnd: '2026-01-01T00:00' }, { sourceTimezone: 'invalid' }, { sourceTimezone: '' }, { consumptionBasis: '' }, { periodStart: '2026-01-01T00:00:00+08:00' }, { provenanceReference: '' }])('rejects malformed input %j', changes => expect(manualInput(form(changes)).success).toBe(false));
});
