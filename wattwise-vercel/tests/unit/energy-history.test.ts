import { describe, expect, it } from 'vitest';
import { historyHref, historyQuery, sourceTime } from '@/lib/energy-history';

describe('History filters and pagination', () => {
  it('bounds query with one-row lookahead, validates offset', () => {
    expect(historyQuery('b', {})).toMatchObject({ success: true, data: { limit: 21, offset: 0 } });
    expect(historyQuery('b', { page: '5001' })).toMatchObject({ success: true, data: { offset: 100000 } });
    for (const page of ['-1', '0', '1.5', '1e2', '5002', 'bad']) expect(historyQuery('b', { page }).success).toBe(false);
  });
  it('converts selected zone; rejects invalid interval', () => {
    expect(historyQuery('b', { source: 's', from: '2026-01-01T00:00', zone: 'Asia/Jayapura' })).toMatchObject({ success: true, data: { periodStart: '2026-01-01T00:00:00+09:00', measurementSourceId: 's' } });
    expect(historyQuery('b', { from: '2026-01-02T00:00', to: '2026-01-01T00:00' }).success).toBe(false);
    expect(historyQuery('b', { from: 'invalid' }).success).toBe(false);
    expect(historyQuery('b', { from: '2026-01-01T00:00' }).success).toBe(false);
  });
  it('retains only known filters and business across pages', () => {
    const url = new URL(historyHref('b', { source: 's', from: '2026-01-01T00:00', zone: 'UTC', userId: 'evil' }, 2), 'http://localhost');
    expect(Object.fromEntries(url.searchParams)).toEqual({ businessId: 'b', page: '2', source: 's', from: '2026-01-01T00:00', zone: 'UTC' });
    expect(url.hash).toBe('#history-title');
  });
  it('renders source timezone, not server local timezone', () => {
    expect(sourceTime(new Date('2026-01-01T00:00:00Z'), 'Asia/Jakarta')).toContain('07.00.00');
  });
});
