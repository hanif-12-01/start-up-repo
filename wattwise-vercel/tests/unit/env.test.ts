import { describe, it, expect } from 'vitest';
import { parseEnv } from '../../src/config/env';

describe('Environment Schema Validation', () => {
  it('should apply safe defaults when environment variables are omitted', () => {
    const parsed = parseEnv({});
    expect(parsed.NODE_ENV).toBe('development');
    expect(parsed.DIAGNOSTICS_ENABLED).toBe(false);
    expect(parsed.ACTION_PLANS_ENABLED).toBe(false);
    expect(parsed.OUTCOME_TRACKING_ENABLED).toBe(false);
    expect(parsed.ADVANCED_ML_ENABLED).toBe(false);
  });

  it('should parse boolean string feature flags correctly', () => {
    const parsed = parseEnv({
      DIAGNOSTICS_ENABLED: 'true',
      ADVANCED_ML_ENABLED: 'false',
    });
    expect(parsed.DIAGNOSTICS_ENABLED).toBe(true);
    expect(parsed.ADVANCED_ML_ENABLED).toBe(false);
  });
});
