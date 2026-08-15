import { describe, expect, it, vi } from 'vitest';
import {
  PHASE_AWARE_MODELS,
  buildContinuousHistory,
  getPhaseAwareConfig,
  getPhaseAwareForecast,
  reportingPhaseForMonths,
  requestedEngineForPhase,
  validateMlResponse,
} from '@/server/services/phase-aware-forecast.service';
import { predictUsage, type UsageSample } from '@/server/services/product-analysis';

const sample = (period: string, usageKwh: number): UsageSample => ({
  period,
  usageKwh,
  tariff: 1_500,
  billAmount: usageKwh * 1_500,
});

const origin = new Date('2027-12-15T00:00:00.000Z');
const mlEnv = {
  NODE_ENV: 'test',
  WATTWISE_AI_MODE: 'EXPERIMENTAL',
  WATTWISE_AI_SERVICE_URL: 'http://127.0.0.1:8090',
  WATTWISE_AI_SERVICE_TOKEN: 'test-token',
};

function months(count: number, start = 1): UsageSample[] {
  return Array.from({ length: count }, (_, index) => {
    const ordinal = 2026 * 12 + start - 1 + index;
    const year = Math.floor(ordinal / 12);
    const month = (ordinal % 12) + 1;
    return sample(`${year}-${String(month).padStart(2, '0')}`, 100 + index * 10);
  });
}

function successfulResponse(request: Record<string, unknown>, prediction = 222.25) {
  const engine = request.requested_model as 'lightgbm' | 'nbeats';
  const authority = PHASE_AWARE_MODELS[engine];
  return {
    schema_version: '1.0',
    request_id: request.request_id,
    status: 'SUCCESS',
    selected_model: engine,
    model_version: authority.version,
    reporting_phase: request.reporting_phase,
    prediction_kwh: prediction,
    eligibility_status: 'ELIGIBLE',
    fallback_reason: null,
    inference_latency_ms: 12.5,
    artifact_identifier: authority.artifactIdentifier,
    artifact_sha256: authority.artifactSha256,
    warnings: [],
    error_code: null,
  };
}

function jsonResponse(value: unknown, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('phase-aware history and routing', () => {
  it.each([
    [0, 'H00'],
    [1, 'H01_02'],
    [2, 'H01_02'],
    [3, 'H03_05'],
    [5, 'H03_05'],
    [6, 'H06_12'],
    [12, 'H06_12'],
    [13, 'H13_PLUS'],
    [24, 'H13_PLUS'],
  ] as const)('maps %i continuous months to %s', (count, phase) => {
    expect(reportingPhaseForMonths(count)).toBe(phase);
  });

  it('rejects negative history counts', () => {
    expect(() => reportingPhaseForMonths(-1)).toThrow('INVALID_CONTINUOUS_HISTORY_MONTHS');
  });

  it('maps every phase to the authorized engine', () => {
    expect(requestedEngineForPhase('H00')).toBe('deterministic_baseline');
    expect(requestedEngineForPhase('H01_02')).toBe('deterministic_baseline');
    expect(requestedEngineForPhase('H03_05')).toBe('deterministic_baseline');
    expect(requestedEngineForPhase('H06_12')).toBe('nbeats');
    expect(requestedEngineForPhase('H13_PLUS')).toBe('nbeats');
  });

  it('uses the latest valid contiguous run instead of lifetime bill count', () => {
    const history = buildContinuousHistory(
      [sample('2026-01', 80), sample('2026-02', 90), ...months(3, 7)],
      origin
    );
    expect(history.history.map((item) => item.period_month)).toEqual(['2026-07', '2026-08', '2026-09']);
    expect(history.continuousHistoryMonths).toBe(3);
    expect(history.reportingPhase).toBe('H03_05');
  });

  it('does not count duplicate, negative, non-finite, or future observations', () => {
    const history = buildContinuousHistory(
      [
        sample('2026-07', 100),
        sample('2026-08', 110),
        sample('2026-09', 120),
        sample('2026-09', 121),
        sample('2026-10', -1),
        sample('2026-11', Number.NaN),
        sample('2028-01', 200),
      ],
      origin
    );
    expect(history.duplicateMonthsRejected).toEqual(['2026-09']);
    expect(history.history.map((item) => item.period_month)).toEqual(['2026-07', '2026-08']);
  });
});

describe('phase-aware execution modes and gateway', () => {
  it('fails invalid modes and all Production ML modes closed to OFF', () => {
    expect(getPhaseAwareConfig({ WATTWISE_AI_MODE: 'UNKNOWN' }).mode).toBe('OFF');
    expect(getPhaseAwareConfig({ ...mlEnv, NODE_ENV: 'production' }).mode).toBe('OFF');
    expect(getPhaseAwareConfig({ ...mlEnv, NODE_ENV: 'production', VERCEL_ENV: 'preview' }).mode).toBe('EXPERIMENTAL');
    expect(getPhaseAwareConfig({ ...mlEnv, VERCEL_ENV: 'production' }).mode).toBe('OFF');
  });

  it('makes zero ML requests for H01_02', async () => {
    const samples = months(2);
    const fetcher = vi.fn<typeof fetch>();
    const result = await getPhaseAwareForecast({
      business: { id: 'business-one', businessType: 'FNB' },
      samples,
      deterministicPrediction: predictUsage(samples, 1_500),
      tariff: 1_500,
      forecastOrigin: origin,
      env: mlEnv,
      fetcher,
    });
    expect(result.requestedEngine).toBe('deterministic_baseline');
    expect(result.fallbackUsed).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('makes zero ML requests for H03_05 and returns deterministic baseline', async () => {
    const samples = months(4);
    const fetcher = vi.fn<typeof fetch>();
    const result = await getPhaseAwareForecast({
      business: { id: 'h03-05-business', businessType: 'FNB' },
      samples,
      deterministicPrediction: predictUsage(samples, 1_500),
      tariff: 1_500,
      forecastOrigin: origin,
      env: mlEnv,
      fetcher,
    });
    expect(result.reportingPhase).toBe('H03_05');
    expect(result.requestedEngine).toBe('deterministic_baseline');
    expect(result.selectedEngine).toBe('deterministic_baseline');
    expect(result.displayedEngine).toBe('deterministic_baseline');
    expect(result.sourceLabel).toBe('Estimasi berdasarkan histori tersedia');
    expect(result.phaseLabel).toBe('Estimasi berdasarkan histori tersedia');
    expect(result.fallbackUsed).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('makes zero ML requests for H00 and returns truthful initial estimate', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const deterministic = predictUsage([], 1_500);
    const result = await getPhaseAwareForecast({
      business: { id: 'ordinary-business', businessType: 'FNB' },
      samples: [],
      deterministicPrediction: deterministic,
      tariff: 1_500,
      forecastOrigin: origin,
      env: mlEnv,
      fetcher,
    });
    expect(result.reportingPhase).toBe('H00');
    expect(result.requestedEngine).toBe('deterministic_baseline');
    expect(result.selectedEngine).toBe('deterministic_baseline');
    expect(result.displayedEngine).toBe('deterministic_baseline');
    expect(result.phaseLabel).toBe('Estimasi awal');
    expect(result.sourceLabel).toBe('Estimasi awal');
    expect(result.mlPredictionKwh).toBeNull();
    expect(result.fallbackUsed).toBe(false);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it('keeps H00 non-ML and returns truthful initial estimate for synthetic demo and real businesses', async () => {
    const fetcher = vi.fn<typeof fetch>();
    const result = await getPhaseAwareForecast({
      business: { id: 'demo-h00', businessType: 'FNB' },
      samples: [],
      deterministicPrediction: predictUsage([], 1_500),
      tariff: 1_500,
      forecastOrigin: origin,
      env: {
        ...mlEnv,
        WATTWISE_AI_VALIDATION_PROFILE_ENABLED: 'true',
        WATTWISE_AI_VALIDATION_DETAILS_ENABLED: 'true',
        WATTWISE_AI_VALIDATION_BUSINESS_IDS: 'demo-h00',
      },
      fetcher,
    });
    expect(result.requestedEngine).toBe('deterministic_baseline');
    expect(result.selectedEngine).toBe('deterministic_baseline');
    expect(result.displayedEngine).toBe('deterministic_baseline');
    expect(result.phaseLabel).toBe('Estimasi awal');
    expect(result.sourceLabel).toBe('Estimasi awal');
    expect(result.validationDetailsVisible).toBe(true);
    expect(result.dataProvenance).toBe('SYNTHETIC_DEMO');
    expect(result.fallbackUsed).toBe(false);
    expect(result.mlPredictionKwh).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it.each([
    [8, 'nbeats'],
    [13, 'nbeats'],
  ] as const)('routes %i months through real gateway contract as %s', async (count, engine) => {
    const samples = months(count);
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      const request = JSON.parse(String(init?.body)) as Record<string, unknown>;
      expect(request.requested_model).toBe(engine);
      return jsonResponse(successfulResponse(request));
    });
    const result = await getPhaseAwareForecast({
      business: { id: `business-${count}`, businessType: 'FNB' },
      samples,
      deterministicPrediction: predictUsage(samples, 1_500),
      tariff: 1_500,
      forecastOrigin: origin,
      env: mlEnv,
      fetcher,
    });
    expect(result.selectedEngine).toBe(engine);
    expect(result.displayedEngine).toBe(engine);
    expect(result.fallbackUsed).toBe(false);
  });

  it('runs ML in SHADOW but displays the accepted deterministic result', async () => {
    const samples = months(8);
    const deterministic = predictUsage(samples, 1_500);
    const fetcher = vi.fn<typeof fetch>(async (_url, init) => {
      const request = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return jsonResponse(successfulResponse(request, 999));
    });
    const result = await getPhaseAwareForecast({
      business: { id: 'shadow-business', businessType: 'FNB' },
      samples,
      deterministicPrediction: deterministic,
      tariff: 1_500,
      forecastOrigin: origin,
      env: { ...mlEnv, WATTWISE_AI_MODE: 'SHADOW' },
      fetcher,
    });
    expect(result.selectedEngine).toBe('nbeats');
    expect(result.displayedEngine).toBe('deterministic_baseline');
    expect(result.prediction).toEqual(deterministic);
    expect(result.mlPredictionKwh).toBe(999);
  });

  it.each([
    ['HTTP 500', async () => jsonResponse({ error: true }, 500), 'SERVICE_UNAVAILABLE'],
    ['malformed JSON', async () => new Response('{broken', { headers: { 'content-type': 'application/json' } }), 'MALFORMED_RESPONSE'],
    ['unreachable service', async () => { throw new Error('connect ECONNREFUSED'); }, 'SERVICE_UNAVAILABLE'],
    ['timeout', async () => { throw new Error('TimeoutError: request aborted'); }, 'SERVICE_TIMEOUT'],
  ] as const)('falls back safely on %s with reason %s', async (_name, behavior, expectedReason) => {
    const samples = months(8);
    const deterministic = predictUsage(samples, 1_500);
    const result = await getPhaseAwareForecast({
      business: { id: 'failure-business', businessType: 'FNB' },
      samples,
      deterministicPrediction: deterministic,
      tariff: 1_500,
      forecastOrigin: origin,
      env: mlEnv,
      fetcher: vi.fn<typeof fetch>(behavior),
    });
    expect(result.fallbackUsed).toBe(true);
    expect(result.fallbackReason).toBe(expectedReason);
    expect(result.selectedEngine).toBe('deterministic_baseline');
    expect(result.prediction).toEqual(deterministic);
  });

  it.each([
    ['wrong request ID', { request_id: 'wrong' }],
    ['wrong model version', { model_version: 'latest' }],
    ['artifact mismatch', { artifact_sha256: '0'.repeat(64) }],
    ['negative output', { prediction_kwh: -1 }],
    ['missing field', { warnings: undefined }],
  ])('rejects %s at the strict response boundary', (_name, mutation) => {
    const request = { request_id: 'request-one', requested_model: 'nbeats', reporting_phase: 'H06_12' };
    const response = { ...successfulResponse(request), ...mutation };
    if ('warnings' in mutation && mutation.warnings === undefined) {
      delete (response as { warnings?: unknown }).warnings;
    }
    expect(() =>
      validateMlResponse(response, { requestId: 'request-one', phase: 'H06_12', engine: 'nbeats' })
    ).toThrow();
  });
});
