import { describe, expect, it } from 'vitest';
import { withBusinessId } from '@/lib/business-query';

describe('withBusinessId', () => {
  it('adds a single explicit active location to internal links', () => {
    expect(withBusinessId('/analysis', 'second')).toBe('/analysis?businessId=second');
    expect(withBusinessId('/dashboard?tab=trend', 'second')).toBe(
      '/dashboard?tab=trend&businessId=second'
    );
  });

  it('never doubles the parameter and keeps hashes', () => {
    expect(withBusinessId('/bills?businessId=second', 'second')).toBe('/bills?businessId=second');
    expect(withBusinessId('/reports#summary', 'abc')).toBe('/reports?businessId=abc#summary');
  });

  it('ignores blank IDs and non-internal hrefs', () => {
    expect(withBusinessId('/bills', '   ')).toBe('/bills');
    expect(withBusinessId('/bills', null)).toBe('/bills');
    expect(withBusinessId('https://example.test', 'second')).toBe('https://example.test');
    expect(withBusinessId('//evil.test', 'second')).toBe('//evil.test');
  });
});