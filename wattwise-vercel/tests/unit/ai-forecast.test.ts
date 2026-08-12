import { describe, expect, it, vi } from 'vitest';
import {
  AI05_ARTIFACT_SHA256,
  AI05_FEATURE_SCHEMA_SHA256,
  AI05_MODEL_VERSION,
  buildAiPayload,
  buildContiguousHistory,
  callAiService,
  classifyProspectiveForecast,
  deterministicParitySnapshot,
  forecastDaysIntoTarget,
  forecastTimingBucket,
  getAiIntegrationDiagnostics,
  getEffectiveAiConfig,
  historyFingerprint,
  opaqueRequestId,
  routeHistory,
  targetMonthBounds,
  validateAiResponse,
} from '@/server/services/ai-forecast.service';
import { predictUsage, type UsageSample } from '@/server/services/product-analysis';

const sample = (period: string, usageKwh: number): UsageSample => ({
  period, usageKwh, billAmount: usageKwh * 1500, tariff: 1500,
});

const observation = (
  periodMonth: string,
  usageKwh: number,
  periodEnd = `${periodMonth}-28`
) => ({ periodMonth, periodStart: `${periodMonth}-01`, periodEnd, usageKwh });

function success(requestId = 'opaque-request') {
  return {
    schema_version: '2.0', request_id: requestId, status: 'SUCCESS',
    history_phase: 'H06_12', selected_model: 'nbeats',
    model_version: AI05_MODEL_VERSION, prediction_kwh: 123.45,
    artifact_sha256: AI05_ARTIFACT_SHA256,
    feature_schema_sha256: AI05_FEATURE_SCHEMA_SHA256,
    fallback_used: false, fallback_reason: null, inference_latency_ms: 100,
    worker_generation: 2, service_state: 'READY',
  };
}

describe('AI-05 server-only integration contract', () => {
  it('defaults and fails closed to OFF', () => {
    expect(getEffectiveAiConfig({ NODE_ENV: 'test' }).mode).toBe('OFF');
    expect(getEffectiveAiConfig({ WATTWISE_AI_MODE: 'broken' }).mode).toBe('OFF');
    expect(getEffectiveAiConfig({ WATTWISE_AI_MODE: 'SHADOW' }).mode).toBe('OFF');
  });

  it('guards production shadow and local experimental', () => {
    expect(getEffectiveAiConfig({
      NODE_ENV: 'production', WATTWISE_AI_MODE: 'LOCAL_EXPERIMENTAL',
      WATTWISE_AI_SERVICE_URL: 'http://127.0.0.1:8091', WATTWISE_AI_SERVICE_TOKEN: 'x',
    }).mode).toBe('OFF');
    expect(getEffectiveAiConfig({
      VERCEL_ENV: 'production', WATTWISE_AI_MODE: 'SHADOW',
      WATTWISE_AI_SERVICE_URL: 'https://private.example', WATTWISE_AI_SERVICE_TOKEN: 'x',
    }).mode).toBe('OFF');
    expect(getEffectiveAiConfig({
      VERCEL_ENV: 'production', WATTWISE_AI_MODE: 'SHADOW',
      WATTWISE_AI_ALLOW_PRODUCTION_SHADOW: 'true',
      WATTWISE_AI_PRODUCTION_SHADOW_APPROVED: 'true',
      WATTWISE_AI_SERVICE_URL: 'https://private.example', WATTWISE_AI_SERVICE_TOKEN: 'x',
    }).mode).toBe('SHADOW');
  });

  it('fails closed when configured model authority does not match the frozen package', () => {
    expect(getEffectiveAiConfig({
      NODE_ENV: 'test', WATTWISE_AI_MODE: 'SHADOW',
      WATTWISE_AI_SERVICE_URL: 'http://127.0.0.1:8091',
      WATTWISE_AI_SERVICE_TOKEN: 'x', WATTWISE_AI_NBEATS_VERSION: 'latest',
    })).toMatchObject({ mode: 'OFF', reason: 'MODEL_AUTHORITY_MISMATCH' });
  });

  it.each([[0, 'H00'], [1, 'H01_02'], [2, 'H01_02'], [3, 'H03_05'], [5, 'H03_05'], [6, 'H06_12'], [12, 'H06_12'], [13, 'H13_PLUS']])(
    'routes %i months to %s', (months, phase) => expect(routeHistory(months)).toBe(phase)
  );

  it('uses only the latest contiguous history run and preserves zero', () => {
    const history = buildContiguousHistory([
      observation('2025-01', 99), observation('2025-03', 0),
      observation('2025-04', 120), observation('2025-05', 130),
    ], new Date('2025-06-15T00:00:00Z'));
    expect(history.history).toEqual([
      { period_month: '2025-03', usage_kwh: 0 },
      { period_month: '2025-04', usage_kwh: 120 },
      { period_month: '2025-05', usage_kwh: 130 },
    ]);
    expect(history.targetPeriod).toBe('2025-06');
  });

  it('fails closed on duplicate months and excludes future months', () => {
    expect(buildContiguousHistory([
      observation('2025-01', 100), observation('2025-01', 101),
    ], new Date('2025-02-15T00:00:00Z')).phase).toBe('H00');
    expect(buildContiguousHistory([
      observation('2025-01', 100, '2025-01-31'),
      observation('2025-02', 101, '2025-02-28'),
      observation('2025-03', 102, '2025-03-31'),
    ], new Date('2025-02-15T00:00:00Z')).targetPeriod).toBe('2025-02');
  });

  it('uses exact Asia/Jakarta period-end completion with conservative same-day exclusion', () => {
    const forecastOrigin = new Date('2026-08-12T05:00:00Z');
    const history = buildContiguousHistory([
      observation('2026-07', 100, '2026-07-31'),
      observation('2026-08', 999, '2026-08-31'),
    ], forecastOrigin);
    expect(history.history).toEqual([{ period_month: '2026-07', usage_kwh: 100 }]);
    expect(history.latestPeriodEnd).toBe('2026-07-31');
    expect(history.temporalIntegrity).toBe(true);
    expect(buildContiguousHistory([
      observation('2026-07', 100, '2026-07-31'),
    ], new Date('2026-07-31T05:00:00Z')).history).toHaveLength(0);
  });

  it('derives target calendar boundaries and timing buckets in Asia/Jakarta', () => {
    expect(targetMonthBounds('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' });
    expect(targetMonthBounds('2028-02')).toEqual({ start: '2028-02-01', end: '2028-02-29' });
    expect(forecastDaysIntoTarget('2026-08', new Date('2026-07-31T17:00:00Z'))).toBe(0);
    expect(forecastDaysIntoTarget('2026-08', new Date('2026-08-14T17:00:00Z'))).toBe(14);
    expect(forecastDaysIntoTarget('2026-08', new Date('2026-08-31T16:59:59Z'))).toBe(30);
    expect(forecastDaysIntoTarget('2026-08', new Date('2026-08-31T17:00:00Z'))).toBeNull();
    expect(forecastDaysIntoTarget('2026-08', new Date('2026-07-31T16:59:59Z'))).toBeNull();
    expect(forecastTimingBucket(0)).toBe('DAY_0_1');
    expect(forecastTimingBucket(1)).toBe('DAY_0_1');
    expect(forecastTimingBucket(2)).toBe('DAY_2_7');
    expect(forecastTimingBucket(7)).toBe('DAY_2_7');
    expect(forecastTimingBucket(8)).toBe('DAY_8_PLUS');
  });

  it.each([
    ['before target', '2026-07-31T16:59:59Z', null, false],
    ['target day 1', '2026-07-31T17:00:00Z', 0, true],
    ['target middle', '2026-08-14T17:00:00Z', 14, true],
    ['target final day', '2026-08-31T16:59:59Z', 30, true],
    ['after target', '2026-08-31T17:00:00Z', null, false],
  ])('classifies prospective boundary: %s', (_label, iso, days, prospective) => {
    expect(classifyProspectiveForecast({
      targetPeriod: '2026-08',
      forecastOrigin: new Date(iso),
      historyTemporalIntegrity: true,
      targetOutcomeUnknownAtForecast: true,
    })).toEqual({ daysIntoTarget: days, prospective });
  });

  it('fails prospective classification closed when history is unsafe or target is known', () => {
    const forecastOrigin = new Date('2026-07-31T17:00:00Z');
    expect(classifyProspectiveForecast({
      targetPeriod: '2026-08', forecastOrigin,
      historyTemporalIntegrity: false, targetOutcomeUnknownAtForecast: true,
    }).prospective).toBe(false);
    expect(classifyProspectiveForecast({
      targetPeriod: '2026-08', forecastOrigin,
      historyTemporalIntegrity: true, targetOutcomeUnknownAtForecast: false,
    }).prospective).toBe(false);
  });

  it('is invariant to future-bill and target-actual perturbations', () => {
    const origin = new Date('2026-07-01T00:00:00Z');
    const completed = Array.from({ length: 6 }, (_, index) => {
      const month = String(index + 1).padStart(2, '0');
      return observation(`2026-${month}`, 100 + index, `2026-${month}-28`);
    });
    const a = buildContiguousHistory([
      ...completed, observation('2026-07', 1, '2026-07-31'),
      observation('2026-08', 1, '2026-08-31'),
    ], origin);
    const b = buildContiguousHistory([
      ...completed, observation('2026-07', 999999, '2026-07-31'),
      observation('2026-08', 999999, '2026-08-31'),
    ], origin);
    expect(a.history).toEqual(b.history);
    expect(historyFingerprint(a)).toBe(historyFingerprint(b));
    const request = {
      opaqueRequestId: 'temporal-invariance-request',
      forecastOrigin: origin,
      context: { businessType: 'RETAIL', timezone: null, buildingArea: null },
    };
    expect(buildAiPayload({ ...request, history: a }))
      .toEqual(buildAiPayload({ ...request, history: b }));
  });

  it('does not allow target actual to influence payload or history fingerprint', () => {
    const history = buildContiguousHistory(
      Array.from({ length: 6 }, (_, index) =>
        observation(`2025-0${index + 1}`, 100 + index, `2025-0${index + 1}-28`)),
      new Date('2025-07-01T00:00:00Z')
    );
    const payload = buildAiPayload({ opaqueRequestId: 'opaque-request', forecastOrigin: new Date('2025-06-30T23:00:00Z'), history, context: { businessType: 'RETAIL', timezone: null, buildingArea: null } });
    expect(JSON.stringify(payload)).not.toContain('actual');
    expect(payload.contextual_features.site).toBeNull();
    expect(historyFingerprint(history)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('creates opaque deterministic request identity', () => {
    const id = opaqueRequestId({ businessId: 'private-business-id', targetPeriod: '2026-01', forecastOrigin: new Date('2025-12-01T00:00:00Z'), historyFingerprint: 'a'.repeat(64), mode: 'SHADOW' });
    expect(id).toMatch(/^[a-f0-9]{64}$/);
    expect(id).not.toContain('private-business-id');
  });

  it.each([
    ['request id', { request_id: 'wrong' }],
    ['artifact', { artifact_sha256: '0'.repeat(64) }],
    ['model', { model_version: 'latest' }],
    ['schema', { feature_schema_sha256: '0'.repeat(64) }],
    ['negative', { prediction_kwh: -1 }],
    ['extra', { unexpected: true }],
  ])('rejects corrupt response: %s', (_label, change) => {
    expect(() => validateAiResponse({ ...success(), ...change }, 'opaque-request')).toThrow();
  });

  it('rejects NaN and Infinity', () => {
    expect(() => validateAiResponse({ ...success(), prediction_kwh: Number.NaN }, 'opaque-request')).toThrow();
    expect(() => validateAiResponse({ ...success(), prediction_kwh: Number.POSITIVE_INFINITY }, 'opaque-request')).toThrow();
  });

  it('OFF performs zero network calls', async () => {
    const fetcher = vi.fn();
    await expect(callAiService({} as never, getEffectiveAiConfig({}), fetcher as never)).rejects.toThrow('AI_MODE_OFF');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('reports disabled diagnostics without exposing configuration or making a request', async () => {
    const fetcher = vi.fn();
    const diagnostics = await getAiIntegrationDiagnostics(
      getEffectiveAiConfig({ NODE_ENV: 'test' }),
      fetcher as never
    );
    expect(diagnostics).toMatchObject({
      mode: 'OFF', integrationEnabled: false, workerState: 'DISABLED',
    });
    expect(diagnostics).not.toHaveProperty('serviceUrl');
    expect(diagnostics).not.toHaveProperty('serviceToken');
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('uses bounded authenticated server request and validates response', async () => {
    const requestOptions: RequestInit[] = [];
    const fetcher = vi.fn(async (_url: string | URL | Request, init?: RequestInit) => {
      if (init) requestOptions.push(init);
      return new Response(JSON.stringify(success()), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    });
    const config = getEffectiveAiConfig({ WATTWISE_AI_MODE: 'SHADOW', WATTWISE_AI_SERVICE_URL: 'http://127.0.0.1:8091', WATTWISE_AI_SERVICE_TOKEN: 'synthetic-token' });
    const result = await callAiService({ request_id: 'opaque-request' } as never, config, fetcher as never);
    expect(result.prediction_kwh).toBe(123.45);
    const requestInit = requestOptions[0];
    expect((requestInit.headers as Record<string, string>).Authorization).toBe('Bearer synthetic-token');
  });

  it('freezes deterministic user-facing parity', () => {
    const fixtures: UsageSample[][] = [
      [], [sample('2025-01', 100)], [sample('2025-01', 100), sample('2025-02', 120)],
      [sample('2025-01', 0), sample('2025-02', 100), sample('2025-03', 50)],
      Array.from({ length: 13 }, (_, index) => sample(`2024-${String(index + 1).padStart(2, '0')}`, 100 + (index % 3) * 50)),
    ];
    for (const fixture of fixtures) {
      const before = deterministicParitySnapshot(predictUsage(fixture, 1500));
      const after = deterministicParitySnapshot(predictUsage(fixture, 1500));
      expect(after).toEqual(before);
    }
  });
});
