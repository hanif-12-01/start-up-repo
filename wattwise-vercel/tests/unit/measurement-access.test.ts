import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isMeasurementWriteEnabled, isMeasurementPilotAllowed } from '@/server/services/measurement-access';

describe('ADR-015 server environment gate', () => {
  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'test');
    for (const key of ['VERCEL', 'VERCEL_ENV', 'VERCEL_TARGET_ENV', 'MEASUREMENT_WRITE_ENABLED', 'MEASUREMENT_PILOT_ALLOWLIST']) vi.stubEnv(key, undefined);
  });
  afterEach(() => vi.unstubAllEnvs());

  it.each([undefined, '', 'false', 'TRUE', '1', ' true ', 'invalid'])('denies absent/off/malformed flag %s', flag => {
    vi.stubEnv('MEASUREMENT_WRITE_ENABLED', flag);
    expect(isMeasurementWriteEnabled()).toBe(false);
  });
  it('permits an explicitly enabled isolated automated test environment', () => {
    vi.stubEnv('MEASUREMENT_WRITE_ENABLED', 'true');
    expect(isMeasurementWriteEnabled()).toBe(true);
  });
  it.each(['development', 'production'])('denies standalone %s even with flag on', nodeEnv => {
    vi.stubEnv('NODE_ENV', nodeEnv);
    vi.stubEnv('MEASUREMENT_WRITE_ENABLED', 'true');
    expect(isMeasurementWriteEnabled()).toBe(false);
  });
  it('permits platform Preview identity with production Node runtime', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('MEASUREMENT_WRITE_ENABLED', 'true');
    expect(isMeasurementWriteEnabled()).toBe(true);
  });
  it.each(['production', 'development', '', 'unknown'])('denies Vercel environment %s even under test', deployment => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', deployment);
    vi.stubEnv('MEASUREMENT_WRITE_ENABLED', 'true');
    expect(isMeasurementWriteEnabled()).toBe(false);
  });
  it.each(['production', 'staging'])('denies conflicting/custom target %s', target => {
    vi.stubEnv('VERCEL', '1');
    vi.stubEnv('VERCEL_ENV', 'preview');
    vi.stubEnv('VERCEL_TARGET_ENV', target);
    vi.stubEnv('MEASUREMENT_WRITE_ENABLED', 'true');
    expect(isMeasurementWriteEnabled()).toBe(false);
  });
  it.each([undefined, '', '[]', 'null', '{}', 'broken', '["user-a:business-a"]',
    '[{"userId":"*","businessId":"business-a"}]', '[{"userId":"user-a","businessId":"*"}]',
    '[{"userId":"user-a"}]', '[{"userId":"user-a","businessId":"business-a","extra":true}]',
    '[{"userId":"user-a","businessId":"business-a"},{"userId":false,"businessId":"business-b"}]',
  ])('fails closed for entire missing/empty/malformed allowlist %s', list => {
    vi.stubEnv('MEASUREMENT_WRITE_ENABLED', 'true');
    vi.stubEnv('MEASUREMENT_PILOT_ALLOWLIST', list);
    expect(isMeasurementPilotAllowed('user-a', 'business-a')).toBe(false);
  });
  it('matches exact pairs only; revocation and disabling take effect on subsequent evaluation', () => {
    vi.stubEnv('MEASUREMENT_WRITE_ENABLED', 'true');
    vi.stubEnv('MEASUREMENT_PILOT_ALLOWLIST', JSON.stringify([{ userId: 'user-a', businessId: 'business-a' }, { userId: 'user-b', businessId: 'business-b' }]));
    expect(isMeasurementPilotAllowed('user-a', 'business-a')).toBe(true);
    expect(isMeasurementPilotAllowed('user-b', 'business-b')).toBe(true);
    for (const pair of [['user-a', 'business-b'], ['user-b', 'business-a'], ['user', 'business-a'], ['user-a', 'business']]) {
      expect(isMeasurementPilotAllowed(pair[0], pair[1])).toBe(false);
    }
    vi.stubEnv('MEASUREMENT_PILOT_ALLOWLIST', '[]');
    expect(isMeasurementPilotAllowed('user-a', 'business-a')).toBe(false);
    vi.stubEnv('MEASUREMENT_PILOT_ALLOWLIST', '[{"userId":"user-a","businessId":"business-a"}]');
    vi.stubEnv('MEASUREMENT_WRITE_ENABLED', 'false');
    expect(isMeasurementPilotAllowed('user-a', 'business-a')).toBe(false);
  });
});
