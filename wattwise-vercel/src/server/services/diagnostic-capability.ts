import { env } from '@/config/env';
import type { BusinessSegment } from '@/server/db/schema/journey';
import {
  getDiagnosticCatalog,
  KOS_DIAGNOSTIC_RULE_VERSION,
} from '@/server/services/diagnostic-question-catalog';

export type DiagnosticCapability =
  | {
      available: true;
      reason: 'SUPPORTED';
    }
  | {
      available: false;
      reason: 'DISABLED' | 'UNSUPPORTED_SEGMENT';
    };

export function getDiagnosticCapability(
  segment: BusinessSegment | string | null | undefined
): DiagnosticCapability {
  const flagsEnabled = Boolean(
    env.DIAGNOSTICS_ENABLED && env.SEGMENT_TEMPLATES_ENABLED
  );
  if (!flagsEnabled) {
    return { available: false, reason: 'DISABLED' };
  }

  const isSegmentSupported =
    typeof segment === 'string' &&
    getDiagnosticCatalog(segment as BusinessSegment, KOS_DIAGNOSTIC_RULE_VERSION) !== null;

  if (!isSegmentSupported) {
    return { available: false, reason: 'UNSUPPORTED_SEGMENT' };
  }

  return { available: true, reason: 'SUPPORTED' };
}
