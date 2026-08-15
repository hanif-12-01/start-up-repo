import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { PredictionResult, UsageSample } from './product-analysis';

export const PHASE_AWARE_SCHEMA_VERSION = '1.0' as const;
export const PHASE_AWARE_FEATURE_SCHEMA_SHA256 =
  '0442358152959f5ea3568c4baf846e0df887d14b692ed734600f6fdb60958fd4';

export const PHASE_AWARE_MODELS = {
  lightgbm: {
    version: 'lightgbm-ai02-1.0.0',
    artifactIdentifier: 'lightgbm/ai02-1.0.0/model.joblib',
    artifactSha256: '85f325153810e2611f6d364c81e7ca6f13948b68feee6f491a3015df3f3cf1c0',
  },
  nbeats: {
    version: 'nbeats-ai02-1.0.0',
    artifactIdentifier: 'nbeats/ai02-1.0.0/model.ckpt',
    artifactSha256: '541905740b790d39434774679ce3120338ecdabd3f13a8d95385f1d6272191d6',
  },
} as const;

export type PredictionMode = 'OFF' | 'SHADOW' | 'EXPERIMENTAL' | 'ACTIVE';
export type ReportingPhase = 'H00' | 'H01_02' | 'H03_05' | 'H06_12' | 'H13_PLUS';
export type PredictionEngine = 'deterministic_baseline' | 'lightgbm' | 'nbeats';

export type FallbackReason =
  | 'MODEL_DISABLED'
  | 'MODEL_VERSION_UNCONFIGURED'
  | 'MISSING_VALIDATED_STATIC_PROFILE'
  | 'MINIMUM_CONTEXT_6_MONTHS'
  | 'SERVICE_UNAVAILABLE'
  | 'SERVICE_TIMEOUT'
  | 'ARTIFACT_NOT_READY'
  | 'ARTIFACT_VERSION_MISMATCH'
  | 'MALFORMED_RESPONSE'
  | 'INVALID_PREDICTION'
  | 'INSUFFICIENT_HISTORY';

export interface ContinuousHistory {
  reportingPhase: ReportingPhase;
  continuousHistoryMonths: number;
  history: Array<{ period_month: string; usage_kwh: number }>;
  targetPeriod: string;
  duplicateMonthsRejected: string[];
}

export interface PhaseAwareConfig {
  mode: PredictionMode;
  serviceUrl: string | null;
  serviceToken: string | null;
  timeoutMs: number;
  reason: string;
}

export interface PhaseAwareForecast {
  reportingPhase: ReportingPhase;
  continuousHistoryMonths: number;
  requestedEngine: PredictionEngine;
  selectedEngine: PredictionEngine;
  displayedEngine: PredictionEngine;
  modelVersion: string | null;
  eligible: boolean;
  eligibilityReason: string;
  fallbackEngine: 'deterministic_baseline';
  fallbackUsed: boolean;
  fallbackReason: FallbackReason | null;
  inferenceLatencyMs: number | null;
  mode: PredictionMode;
  prediction: PredictionResult;
  deterministicPrediction: PredictionResult;
  mlPredictionKwh: number | null;
  sourceLabel: string;
  phaseLabel: string;
  validationDetailsVisible: boolean;
  dataProvenance: 'BUSINESS_DATA' | 'SYNTHETIC_DEMO';
}

const periodPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

function isProductionDeployment(input: Record<string, string | undefined>): boolean {
  return input.VERCEL_ENV === 'production' || (!input.VERCEL_ENV && input.NODE_ENV === 'production');
}

function parseTrustedServiceUrl(
  value: string | undefined,
  input: Record<string, string | undefined>
): string | null {
  if (!value) return null;
  try {
    const parsed = new URL(value);
    const loopback = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost';
    if (parsed.username || parsed.password || parsed.search || parsed.hash) return null;
    if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && loopback && !isProductionDeployment(input))) {
      return null;
    }
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function getPhaseAwareConfig(
  input: Record<string, string | undefined> = process.env
): PhaseAwareConfig {
  const requestedMode = input.WATTWISE_AI_MODE?.trim().toUpperCase();
  const validModes = new Set<PredictionMode>(['OFF', 'SHADOW', 'EXPERIMENTAL', 'ACTIVE']);
  let mode: PredictionMode = validModes.has(requestedMode as PredictionMode)
    ? (requestedMode as PredictionMode)
    : 'OFF';
  let reason = requestedMode && !validModes.has(requestedMode as PredictionMode)
    ? 'INVALID_MODE'
    : 'CONFIGURED';

  if (isProductionDeployment(input) && mode !== 'OFF') {
    mode = 'OFF';
    reason = 'PRODUCTION_AI_NOT_AUTHORIZED';
  }

  const authorityMismatch =
    (input.WATTWISE_AI_LIGHTGBM_VERSION &&
      input.WATTWISE_AI_LIGHTGBM_VERSION !== PHASE_AWARE_MODELS.lightgbm.version) ||
    (input.WATTWISE_AI_LIGHTGBM_SHA256 &&
      input.WATTWISE_AI_LIGHTGBM_SHA256 !== PHASE_AWARE_MODELS.lightgbm.artifactSha256) ||
    (input.WATTWISE_AI_NBEATS_VERSION &&
      input.WATTWISE_AI_NBEATS_VERSION !== PHASE_AWARE_MODELS.nbeats.version) ||
    (input.WATTWISE_AI_NBEATS_SHA256 &&
      input.WATTWISE_AI_NBEATS_SHA256 !== PHASE_AWARE_MODELS.nbeats.artifactSha256) ||
    (input.WATTWISE_AI_FEATURE_SCHEMA_SHA256 &&
      input.WATTWISE_AI_FEATURE_SCHEMA_SHA256 !== PHASE_AWARE_FEATURE_SCHEMA_SHA256);
  if (authorityMismatch) {
    mode = 'OFF';
    reason = 'MODEL_AUTHORITY_MISMATCH';
  }

  const serviceUrl = parseTrustedServiceUrl(input.WATTWISE_AI_SERVICE_URL, input);
  const serviceToken = input.WATTWISE_AI_SERVICE_TOKEN?.trim() || null;
  if (mode !== 'OFF' && (!serviceUrl || !serviceToken)) {
    mode = 'OFF';
    reason = 'MISSING_SERVICE_CONFIGURATION';
  }

  const timeoutCandidate = Number(input.WATTWISE_AI_REQUEST_TIMEOUT_MS ?? 5_000);
  const timeoutMs = Number.isInteger(timeoutCandidate) && timeoutCandidate >= 100 && timeoutCandidate <= 30_000
    ? timeoutCandidate
    : 5_000;

  return { mode, serviceUrl, serviceToken, timeoutMs, reason };
}

function monthOrdinal(period: string): number {
  const [year, month] = period.split('-').map(Number);
  return year * 12 + month - 1;
}

function periodFromOrdinal(ordinal: number): string {
  const year = Math.floor(ordinal / 12);
  const month = (ordinal % 12) + 1;
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}

function nextMonth(period: string): string {
  return periodFromOrdinal(monthOrdinal(period) + 1);
}

export function reportingPhaseForMonths(months: number): ReportingPhase {
  if (!Number.isInteger(months) || months < 0) throw new Error('INVALID_CONTINUOUS_HISTORY_MONTHS');
  if (months === 0) return 'H00';
  if (months <= 2) return 'H01_02';
  if (months <= 5) return 'H03_05';
  if (months <= 12) return 'H06_12';
  return 'H13_PLUS';
}

export function requestedEngineForPhase(phase: ReportingPhase): PredictionEngine {
  if (phase === 'H06_12' || phase === 'H13_PLUS') return 'nbeats';
  return 'deterministic_baseline';
}

export function buildContinuousHistory(
  samples: UsageSample[],
  forecastOrigin = new Date()
): ContinuousHistory {
  const latestAllowedPeriod = forecastOrigin.toISOString().slice(0, 7);
  const candidates = samples.filter(
    (sample) =>
      periodPattern.test(sample.period) &&
      sample.period <= latestAllowedPeriod &&
      sample.usageKwh !== null &&
      Number.isFinite(sample.usageKwh) &&
      sample.usageKwh >= 0
  );
  const counts = new Map<string, number>();
  for (const sample of candidates) counts.set(sample.period, (counts.get(sample.period) ?? 0) + 1);
  const duplicateMonthsRejected = [...counts]
    .filter(([, count]) => count > 1)
    .map(([period]) => period)
    .sort();
  const unique = candidates
    .filter((sample) => counts.get(sample.period) === 1)
    .map((sample) => ({ period_month: sample.period, usage_kwh: Number(sample.usageKwh) }))
    .sort((left, right) => left.period_month.localeCompare(right.period_month));

  const history: ContinuousHistory['history'] = [];
  for (let index = unique.length - 1; index >= 0; index -= 1) {
    if (history.length === 0 || nextMonth(unique[index].period_month) === history[0].period_month) {
      history.unshift(unique[index]);
    } else {
      break;
    }
  }

  const currentPeriod = forecastOrigin.toISOString().slice(0, 7);
  const targetPeriod = history.length > 0 ? nextMonth(history.at(-1)!.period_month) : nextMonth(currentPeriod);
  return {
    reportingPhase: reportingPhaseForMonths(history.length),
    continuousHistoryMonths: history.length,
    history,
    targetPeriod,
    duplicateMonthsRejected,
  };
}

const phaseLabels: Record<ReportingPhase, string> = {
  H00: 'Estimasi awal',
  H01_02: 'Estimasi berdasarkan histori awal',
  H03_05: 'Estimasi berdasarkan histori tersedia',
  H06_12: 'Prediksi AI berbasis histori',
  H13_PLUS: 'Prediksi AI berbasis histori panjang',
};

export function fallbackReasonFromError(error: unknown): FallbackReason {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const name = error instanceof Error ? error.name : '';

  if (
    name === 'TimeoutError' ||
    message.includes('timeout') ||
    message.includes('Timeout') ||
    message.includes('aborted')
  ) {
    return 'SERVICE_TIMEOUT';
  }
  if (message.includes('ARTIFACT') || message.includes('artifact')) {
    return 'ARTIFACT_VERSION_MISMATCH';
  }
  if (message.includes('INVALID_PREDICTION') || message.includes('PREDICTION')) {
    return 'INVALID_PREDICTION';
  }
  if (
    message.includes('MALFORMED_JSON') ||
    message.includes('INVALID_CONTENT') ||
    message.includes('TOO_LARGE') ||
    message.includes('ZodError') ||
    message.includes('ML_REQUEST_ID_MISMATCH') ||
    message.includes('ML_RESPONSE_PHASE_MISMATCH') ||
    message.includes('ML_RESPONSE_MODEL_MISMATCH') ||
    error instanceof z.ZodError
  ) {
    return 'MALFORMED_RESPONSE';
  }
  return 'SERVICE_UNAVAILABLE';
}

interface InferenceContext {
  dataset_source: string;
  building_primary_use: string | null;
  business_type: string | null;
  building_area: number | null;
  site: string | null;
  timezone: string | null;
  profile_eligible: boolean;
}

function validationBusinessIds(input: Record<string, string | undefined>): Set<string> {
  return new Set(
    (input.WATTWISE_AI_VALIDATION_BUSINESS_IDS ?? '')
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
  );
}

export function buildInferenceContext(
  business: { id: string; businessType: string | null },
  input: Record<string, string | undefined> = process.env
): { context: InferenceContext; provenance: 'BUSINESS_DATA' | 'SYNTHETIC_DEMO'; validation: boolean } {
  const validation =
    !isProductionDeployment(input) &&
    input.WATTWISE_AI_VALIDATION_PROFILE_ENABLED === 'true' &&
    validationBusinessIds(input).has(business.id);
  if (validation) {
    return {
      context: {
        dataset_source: 'bdg2',
        building_primary_use: 'Entertainment/public assembly',
        business_type: null,
        building_area: 22_117,
        site: 'Bear',
        timezone: 'US/Pacific',
        profile_eligible: true,
      },
      provenance: 'SYNTHETIC_DEMO',
      validation: true,
    };
  }
  return {
    context: {
      dataset_source: 'wattwise_real',
      building_primary_use: null,
      business_type: business.businessType?.trim() || null,
      building_area: null,
      site: null,
      timezone: null,
      profile_eligible: false,
    },
    provenance: 'BUSINESS_DATA',
    validation: false,
  };
}

const baseResponseSchema = z
  .object({
    schema_version: z.literal(PHASE_AWARE_SCHEMA_VERSION),
    request_id: z.string().regex(/^[A-Za-z0-9:._-]{1,128}$/),
    status: z.enum(['SUCCESS', 'NOT_ELIGIBLE', 'ERROR']),
    selected_model: z.enum(['lightgbm', 'nbeats']),
    model_version: z.string(),
    reporting_phase: z.enum(['H00', 'H01_02', 'H03_05', 'H06_12', 'H13_PLUS']),
    prediction_kwh: z.number().finite().nonnegative().nullable(),
    eligibility_status: z.enum(['ELIGIBLE', 'NOT_ELIGIBLE']),
    fallback_reason: z.string().nullable(),
    inference_latency_ms: z.number().finite().nonnegative(),
    artifact_identifier: z.string().nullable(),
    artifact_sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
    warnings: z.array(z.string().min(1).max(200)).max(20),
    error_code: z.string().nullable(),
  })
  .strict();

type MlResponse = z.infer<typeof baseResponseSchema>;

export function validateMlResponse(
  value: unknown,
  expected: { requestId: string; phase: ReportingPhase; engine: 'lightgbm' | 'nbeats' }
): MlResponse {
  const parsed = baseResponseSchema.parse(value);
  const authority = PHASE_AWARE_MODELS[expected.engine];
  if (parsed.request_id !== expected.requestId) throw new Error('ML_REQUEST_ID_MISMATCH');
  if (parsed.reporting_phase !== expected.phase) throw new Error('ML_RESPONSE_PHASE_MISMATCH');
  if (parsed.selected_model !== expected.engine) throw new Error('ML_RESPONSE_MODEL_MISMATCH');
  if (parsed.model_version !== authority.version) throw new Error('ML_RESPONSE_MODEL_VERSION_MISMATCH');
  if (parsed.status === 'SUCCESS') {
    if (
      parsed.prediction_kwh === null ||
      parsed.eligibility_status !== 'ELIGIBLE' ||
      parsed.fallback_reason !== null ||
      parsed.error_code !== null ||
      parsed.artifact_identifier !== authority.artifactIdentifier ||
      parsed.artifact_sha256 !== authority.artifactSha256
    ) {
      throw new Error('ML_RESPONSE_AUTHORITY_MISMATCH');
    }
  } else if (parsed.prediction_kwh !== null) {
    throw new Error('ML_RESPONSE_INVALID_PREDICTION');
  }
  return parsed;
}

async function callMlService(
  payload: Record<string, unknown>,
  config: PhaseAwareConfig,
  expected: { requestId: string; phase: ReportingPhase; engine: 'lightgbm' | 'nbeats' },
  fetcher: typeof fetch
): Promise<MlResponse> {
  if (config.mode === 'OFF' || !config.serviceUrl || !config.serviceToken) throw new Error('ML_DISABLED');
  const response = await fetcher(`${config.serviceUrl}/v1/predictions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.serviceToken}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(config.timeoutMs),
    redirect: 'error',
    cache: 'no-store',
  });
  const contentType = response.headers.get('content-type') ?? '';
  const contentLength = Number(response.headers.get('content-length') ?? 0);
  if (!contentType.startsWith('application/json') || contentLength > 64 * 1024) {
    throw new Error('ML_RESPONSE_INVALID_CONTENT');
  }
  if (!response.ok) throw new Error(`ML_SERVICE_HTTP_${response.status}`);
  const text = await response.text();
  if (text.length > 64 * 1024) throw new Error('ML_RESPONSE_TOO_LARGE');
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error('ML_RESPONSE_MALFORMED_JSON');
  }
  return validateMlResponse(json, expected);
}

function displayedPrediction(
  deterministic: PredictionResult,
  predictionKwh: number,
  tariff: number | null,
  continuousHistoryMonths: number,
  engine: PredictionEngine
): PredictionResult {
  const rounded = Number(Math.max(0, predictionKwh).toFixed(2));
  const previous = deterministic.previousUsageKwh;
  const changePercent = previous !== null && previous > 0
    ? Number((((rounded - previous) / previous) * 100).toFixed(1))
    : null;
  const risk = changePercent === null ? null : changePercent >= 15 ? 'HIGH' : changePercent >= 5 ? 'MEDIUM' : 'LOW';
  return {
    ...deterministic,
    hasPrediction: true,
    predictedUsageKwh: rounded,
    estimatedBill: tariff && tariff > 0 ? Number((rounded * tariff).toFixed(2)) : null,
    changePercent,
    risk,
    confidence: continuousHistoryMonths >= 13 ? 'Tinggi' : continuousHistoryMonths >= 3 ? 'Sedang' : 'Rendah',
    method: engine === 'lightgbm' ? 'Prediksi WattWise berbasis LightGBM' : 'Prediksi WattWise berbasis N-BEATS',
    historyMonths: continuousHistoryMonths,
  };
}

export async function getPhaseAwareForecast(input: {
  business: { id: string; businessType: string | null };
  samples: UsageSample[];
  deterministicPrediction: PredictionResult;
  tariff: number | null;
  forecastOrigin?: Date;
  env?: Record<string, string | undefined>;
  fetcher?: typeof fetch;
}): Promise<PhaseAwareForecast> {
  const environment = input.env ?? process.env;
  const config = getPhaseAwareConfig(environment);
  const history = buildContinuousHistory(input.samples, input.forecastOrigin);
  const requestedEngine = requestedEngineForPhase(history.reportingPhase);
  const context = buildInferenceContext(input.business, environment);
  const validationDetailsVisible =
    context.validation && environment.WATTWISE_AI_VALIDATION_DETAILS_ENABLED === 'true';
  const base = {
    reportingPhase: history.reportingPhase,
    continuousHistoryMonths: history.continuousHistoryMonths,
    requestedEngine,
    fallbackEngine: 'deterministic_baseline' as const,
    mode: config.mode,
    deterministicPrediction: input.deterministicPrediction,
    validationDetailsVisible,
    dataProvenance: context.provenance,
  };

  if (requestedEngine === 'deterministic_baseline') {
    return {
      ...base,
      selectedEngine: 'deterministic_baseline',
      displayedEngine: 'deterministic_baseline',
      modelVersion: null,
      eligible: true,
      eligibilityReason: 'DETERMINISTIC_PHASE',
      fallbackUsed: false,
      fallbackReason: null,
      inferenceLatencyMs: null,
      prediction: input.deterministicPrediction,
      mlPredictionKwh: null,
      sourceLabel: phaseLabels[history.reportingPhase],
      phaseLabel: phaseLabels[history.reportingPhase],
    };
  }

  const fallback = (
    reason: FallbackReason,
    eligibilityReason: string,
    eligible = false
  ): PhaseAwareForecast => ({
    ...base,
    selectedEngine: 'deterministic_baseline',
    displayedEngine: 'deterministic_baseline',
    modelVersion: PHASE_AWARE_MODELS[requestedEngine].version,
    eligible,
    eligibilityReason,
    fallbackUsed: true,
    fallbackReason: reason,
    inferenceLatencyMs: null,
    prediction: input.deterministicPrediction,
    mlPredictionKwh: null,
    sourceLabel: 'Prediksi aman berdasarkan histori tersedia',
    phaseLabel: phaseLabels[history.reportingPhase],
  });

  if (config.mode === 'OFF') return fallback('MODEL_DISABLED', config.reason);
  if (history.reportingPhase === 'H00' && !context.context.profile_eligible) {
    return fallback('MISSING_VALIDATED_STATIC_PROFILE', 'MISSING_VALIDATED_STATIC_PROFILE');
  }
  if (requestedEngine === 'nbeats' && history.continuousHistoryMonths < 6) {
    return fallback('MINIMUM_CONTEXT_6_MONTHS', 'MINIMUM_CONTEXT_6_MONTHS');
  }

  const authority = PHASE_AWARE_MODELS[requestedEngine];
  const entityId = createHash('sha256').update(input.business.id).digest('hex').slice(0, 32);
  const requestId = createHash('sha256')
    .update(JSON.stringify({ entityId, history, requestedEngine, mode: config.mode }))
    .digest('hex');
  const payload = {
    schema_version: PHASE_AWARE_SCHEMA_VERSION,
    request_id: requestId,
    entity_id: entityId,
    reporting_phase: history.reportingPhase,
    target_period: history.targetPeriod,
    consumption_history: history.history,
    contextual_features: context.context,
    requested_horizon: 1,
    requested_model: requestedEngine,
    model_version: authority.version,
  };

  try {
    const response = await callMlService(
      payload,
      config,
      { requestId, phase: history.reportingPhase, engine: requestedEngine },
      input.fetcher ?? fetch
    );
    if (response.status !== 'SUCCESS' || response.prediction_kwh === null) {
      const reason = response.status === 'NOT_ELIGIBLE'
        ? 'MISSING_VALIDATED_STATIC_PROFILE'
        : response.error_code?.includes('ARTIFACT')
          ? 'ARTIFACT_NOT_READY'
          : 'SERVICE_UNAVAILABLE';
      return fallback(reason, response.fallback_reason ?? response.error_code ?? response.status, response.eligibility_status === 'ELIGIBLE');
    }
    const mlPrediction = displayedPrediction(
      input.deterministicPrediction,
      response.prediction_kwh,
      input.tariff,
      history.continuousHistoryMonths,
      requestedEngine
    );
    const displayMl = config.mode === 'EXPERIMENTAL' || config.mode === 'ACTIVE';
    return {
      ...base,
      selectedEngine: requestedEngine,
      displayedEngine: displayMl ? requestedEngine : 'deterministic_baseline',
      modelVersion: authority.version,
      eligible: true,
      eligibilityReason: 'ELIGIBLE',
      fallbackUsed: false,
      fallbackReason: null,
      inferenceLatencyMs: response.inference_latency_ms,
      prediction: displayMl ? mlPrediction : input.deterministicPrediction,
      mlPredictionKwh: response.prediction_kwh,
      sourceLabel: displayMl ? phaseLabels[history.reportingPhase] : 'Estimasi berdasarkan metode aman saat ini',
      phaseLabel: phaseLabels[history.reportingPhase],
    };
  } catch (error) {
    return fallback(fallbackReasonFromError(error), 'ML_GATEWAY_FAILURE', true);
  }
}
