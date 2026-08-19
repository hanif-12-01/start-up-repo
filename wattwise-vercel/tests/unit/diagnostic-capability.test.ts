import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { env } from '@/config/env';
import { getDiagnosticCapability } from '@/server/services/diagnostic-capability';

describe('Diagnostic capability evaluation', () => {
  const originalDiagnosticsEnabled = env.DIAGNOSTICS_ENABLED;
  const originalTemplatesEnabled = env.SEGMENT_TEMPLATES_ENABLED;

  beforeEach(() => {
    env.DIAGNOSTICS_ENABLED = true;
    env.SEGMENT_TEMPLATES_ENABLED = true;
  });

  afterEach(() => {
    env.DIAGNOSTICS_ENABLED = originalDiagnosticsEnabled;
    env.SEGMENT_TEMPLATES_ENABLED = originalTemplatesEnabled;
  });

  it('reports KOS as supported when feature flags are enabled', () => {
    const capability = getDiagnosticCapability('KOS');
    expect(capability).toEqual({
      available: true,
      reason: 'SUPPORTED',
    });
  });

  it.each(['FNB', 'LAUNDRY', 'RETAIL', 'COLD_STORAGE', 'OTHER'] as const)(
    'reports %s as unsupported even when feature flags are enabled',
    (segment) => {
      const capability = getDiagnosticCapability(segment);
      expect(capability).toEqual({
        available: false,
        reason: 'UNSUPPORTED_SEGMENT',
      });
    }
  );

  it('handles null, undefined, or arbitrary invalid segment safely', () => {
    expect(getDiagnosticCapability(null)).toEqual({
      available: false,
      reason: 'UNSUPPORTED_SEGMENT',
    });
    expect(getDiagnosticCapability(undefined)).toEqual({
      available: false,
      reason: 'UNSUPPORTED_SEGMENT',
    });
    expect(getDiagnosticCapability('UNKNOWN_SEGMENT')).toEqual({
      available: false,
      reason: 'UNSUPPORTED_SEGMENT',
    });
  });

  it('reports KOS as disabled when DIAGNOSTICS_ENABLED is false', () => {
    env.DIAGNOSTICS_ENABLED = false;
    const capability = getDiagnosticCapability('KOS');
    expect(capability).toEqual({
      available: false,
      reason: 'DISABLED',
    });
  });

  it('reports KOS as disabled when SEGMENT_TEMPLATES_ENABLED is false', () => {
    env.SEGMENT_TEMPLATES_ENABLED = false;
    const capability = getDiagnosticCapability('KOS');
    expect(capability).toEqual({
      available: false,
      reason: 'DISABLED',
    });
  });

  it('reports unsupported segment as disabled when feature flags are disabled', () => {
    env.DIAGNOSTICS_ENABLED = false;
    const capability = getDiagnosticCapability('FNB');
    expect(capability).toEqual({
      available: false,
      reason: 'DISABLED',
    });
  });
});
