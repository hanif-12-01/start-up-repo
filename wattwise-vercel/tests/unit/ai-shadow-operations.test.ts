import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authorizeInternalAiRequest } from '@/server/services/internal-ai-auth.service';
import { evaluateAlertState } from '@/server/services/ai-shadow-monitoring.service';
import { processShadowBatch } from '@/server/services/ai-shadow-operations.service';

describe('AI-06 operation boundaries', () => {
  beforeEach(() => vi.unstubAllEnvs());

  it('authenticates internal calls with a server-only strong secret', () => {
    vi.stubEnv('WATTWISE_AI_SCHEDULER_SECRET', 'a'.repeat(32));
    expect(authorizeInternalAiRequest(null)).toBe(false);
    expect(authorizeInternalAiRequest('Bearer wrong')).toBe(false);
    expect(authorizeInternalAiRequest(`Bearer ${'a'.repeat(32)}`)).toBe(true);
  });

  it('evaluates deterministic warning and critical thresholds', () => {
    expect(evaluateAlertState({ serviceReady: true, identityMatch: true, p95LatencyMs: 200, systemFailureRate: 0, oldestEligibleSeconds: 0 })).toBe('OK');
    expect(evaluateAlertState({ serviceReady: true, identityMatch: true, p95LatencyMs: 501, systemFailureRate: 0, oldestEligibleSeconds: 0 })).toBe('WARNING');
    expect(evaluateAlertState({ serviceReady: false, identityMatch: true, p95LatencyMs: 0, systemFailureRate: 0, oldestEligibleSeconds: 0 })).toBe('CRITICAL');
    expect(evaluateAlertState({ serviceReady: true, identityMatch: false, p95LatencyMs: 0, systemFailureRate: 0, oldestEligibleSeconds: 0 })).toBe('CRITICAL');
  });

  it('makes the global OFF switch a no-op without any network call', async () => {
    vi.stubEnv('WATTWISE_AI_MODE', 'OFF');
    const fetcher = vi.fn<typeof fetch>();
    await expect(processShadowBatch({ fetcher })).resolves.toMatchObject({
      claimed: 0, noWork: true, mode: 'OFF', serviceReady: false,
    });
    expect(fetcher).not.toHaveBeenCalled();
  });
});
