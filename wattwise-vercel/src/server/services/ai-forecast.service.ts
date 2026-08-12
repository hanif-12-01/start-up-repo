import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { PredictionResult } from './product-analysis';

export const AI05_MODEL_VERSION = 'nbeats-ai02-1.0.0';
export const AI05_ARTIFACT_SHA256 =
  '541905740b790d39434774679ce3120338ecdabd3f13a8d95385f1d6272191d6';
export const AI05_FEATURE_SCHEMA_SHA256 =
  '0442358152959f5ea3568c4baf846e0df887d14b692ed734600f6fdb60958fd4';

export type AiMode = 'OFF' | 'SHADOW' | 'LOCAL_EXPERIMENTAL';
export type HistoryPhase = 'H00' | 'H01_02' | 'H03_05' | 'H06_12' | 'H13_PLUS';
export type EvidenceProvenance = 'UNCLASSIFIED' | 'REAL_WATTWISE' | 'SYNTHETIC_DEMO';

export interface AiEffectiveConfig {
  mode: AiMode;
  serviceUrl: string | null;
  serviceToken: string | null;
  timeoutMs: number;
  reason: string;
}

export function getEffectiveAiConfig(
  input: Record<string, string | undefined> = process.env
): AiEffectiveConfig {
  const requested = input.WATTWISE_AI_MODE?.trim().toUpperCase();
  const environment = input.VERCEL_ENV || input.NODE_ENV || 'development';
  let mode: AiMode = requested === 'SHADOW' || requested === 'LOCAL_EXPERIMENTAL'
    ? requested
    : 'OFF';
  let reason = requested && !['OFF', 'SHADOW', 'LOCAL_EXPERIMENTAL'].includes(requested)
    ? 'INVALID_MODE'
    : 'CONFIGURED';
  if (mode === 'LOCAL_EXPERIMENTAL' && environment === 'production') {
    mode = 'OFF';
    reason = 'PRODUCTION_LOCAL_EXPERIMENTAL_BLOCKED';
  }
  if (
    mode === 'SHADOW' &&
    environment === 'production' &&
    !(
      input.WATTWISE_AI_ALLOW_PRODUCTION_SHADOW === 'true' &&
      input.WATTWISE_AI_PRODUCTION_SHADOW_APPROVED === 'true'
    )
  ) {
    mode = 'OFF';
    reason = 'PRODUCTION_SHADOW_NOT_APPROVED';
  }
  const serviceUrl = parseTrustedServiceUrl(input.WATTWISE_AI_SERVICE_URL);
  const token = input.WATTWISE_AI_SERVICE_TOKEN?.trim() || null;
  if (
    (input.WATTWISE_AI_NBEATS_VERSION && input.WATTWISE_AI_NBEATS_VERSION !== AI05_MODEL_VERSION) ||
    (input.WATTWISE_AI_NBEATS_SHA256 && input.WATTWISE_AI_NBEATS_SHA256 !== AI05_ARTIFACT_SHA256) ||
    (input.WATTWISE_AI_FEATURE_SCHEMA_SHA256 &&
      input.WATTWISE_AI_FEATURE_SCHEMA_SHA256 !== AI05_FEATURE_SCHEMA_SHA256)
  ) {
    mode = 'OFF';
    reason = 'MODEL_AUTHORITY_MISMATCH';
  }
  if (mode !== 'OFF' && (!serviceUrl || !token)) {
    mode = 'OFF';
    reason = 'MISSING_SERVICE_CONFIGURATION';
  }
  const timeout = Number(input.WATTWISE_AI_REQUEST_TIMEOUT_MS || 750);
  return {
    mode,
    serviceUrl,
    serviceToken: token,
    timeoutMs: Number.isInteger(timeout) && timeout >= 100 && timeout <= 5000 ? timeout : 750,
    reason,
  };
}

function parseTrustedServiceUrl(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (url.search || url.hash) return null;
    return url.toString().replace(/\/$/, '');
  } catch {
    return null;
  }
}

export function routeHistory(months: number): HistoryPhase {
  if (months === 0) return 'H00';
  if (months <= 2) return 'H01_02';
  if (months <= 5) return 'H03_05';
  if (months <= 12) return 'H06_12';
  return 'H13_PLUS';
}

function nextMonth(period: string): string {
  const [year, month] = period.split('-').map(Number);
  return month === 12 ? `${year + 1}-01` : `${year}-${String(month + 1).padStart(2, '0')}`;
}

export interface AiHistory {
  phase: HistoryPhase;
  history: Array<{ period_month: string; usage_kwh: number }>;
  targetPeriod: string | null;
  latestPeriodEnd: string | null;
  temporalIntegrity: boolean;
}

export interface AiHistoryObservation {
  periodMonth: string;
  periodStart: string;
  periodEnd: string;
  usageKwh: number | null;
}

export const AI05_APPLICATION_TIMEZONE = 'Asia/Jakarta';

export function applicationLocalDate(value: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: AI05_APPLICATION_TIMEZONE,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(value);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}

export interface TargetMonthBounds {
  start: string;
  end: string;
}

export type ForecastTimingBucket = 'DAY_0_1' | 'DAY_2_7' | 'DAY_8_PLUS';

export function targetMonthBounds(targetPeriod: string): TargetMonthBounds {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(targetPeriod)) {
    throw new Error('AI_TARGET_PERIOD_INVALID');
  }
  const [year, month] = targetPeriod.split('-').map(Number);
  const finalDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${targetPeriod}-01`,
    end: `${targetPeriod}-${String(finalDay).padStart(2, '0')}`,
  };
}

export function forecastDaysIntoTarget(targetPeriod: string, forecastOrigin: Date): number | null {
  const bounds = targetMonthBounds(targetPeriod);
  const localDate = applicationLocalDate(forecastOrigin);
  if (localDate < bounds.start || localDate > bounds.end) return null;
  const day = Number(localDate.slice(-2));
  return day - 1;
}

export function forecastTimingBucket(daysIntoTarget: number | null): ForecastTimingBucket | null {
  if (daysIntoTarget === null || !Number.isInteger(daysIntoTarget) || daysIntoTarget < 0) return null;
  if (daysIntoTarget <= 1) return 'DAY_0_1';
  if (daysIntoTarget <= 7) return 'DAY_2_7';
  return 'DAY_8_PLUS';
}

export function classifyProspectiveForecast(input: {
  targetPeriod: string;
  forecastOrigin: Date;
  historyTemporalIntegrity: boolean;
  targetOutcomeUnknownAtForecast: boolean;
}) {
  const daysIntoTarget = forecastDaysIntoTarget(input.targetPeriod, input.forecastOrigin);
  return {
    daysIntoTarget,
    prospective: input.historyTemporalIntegrity &&
      input.targetOutcomeUnknownAtForecast && daysIntoTarget !== null,
  };
}

function emptyHistory(): AiHistory {
  return {
    phase: 'H00', history: [], targetPeriod: null,
    latestPeriodEnd: null, temporalIntegrity: false,
  };
}

export function buildContiguousHistory(
  observations: AiHistoryObservation[],
  forecastOrigin: Date
): AiHistory {
  const originLocalDate = applicationLocalDate(forecastOrigin);
  const valid = observations
    .filter((item) => (
      /^\d{4}-(0[1-9]|1[0-2])$/.test(item.periodMonth) &&
      /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(item.periodStart) &&
      /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/.test(item.periodEnd) &&
      item.periodStart <= item.periodEnd &&
      item.periodMonth === item.periodEnd.slice(0, 7) &&
      item.periodEnd < originLocalDate &&
      item.usageKwh !== null &&
      Number.isFinite(item.usageKwh) &&
      item.usageKwh >= 0
    ))
    .map((item) => ({
      period_month: item.periodMonth,
      period_end: item.periodEnd,
      usage_kwh: Number(item.usageKwh),
    }))
    .sort((left, right) => left.period_month.localeCompare(right.period_month));
  if (new Set(valid.map((item) => item.period_month)).size !== valid.length) {
    return emptyHistory();
  }
  const contiguous: typeof valid = [];
  for (let index = valid.length - 1; index >= 0; index -= 1) {
    if (contiguous.length === 0 || nextMonth(valid[index].period_month) === contiguous[0].period_month) {
      contiguous.unshift(valid[index]);
    } else {
      break;
    }
  }
  const targetPeriod = contiguous.length > 0 ? nextMonth(contiguous.at(-1)!.period_month) : null;
  return {
    phase: routeHistory(contiguous.length),
    history: contiguous.map(({ period_month, usage_kwh }) => ({ period_month, usage_kwh })),
    targetPeriod,
    latestPeriodEnd: contiguous.at(-1)?.period_end ?? null,
    temporalIntegrity: contiguous.length > 0,
  };
}

export interface AiContext {
  businessType: string | null;
  timezone: string | null;
  buildingArea: number | null;
}

export function buildAiPayload(input: {
  opaqueRequestId: string;
  forecastOrigin: Date;
  history: AiHistory;
  context: AiContext;
}) {
  if (!input.history.targetPeriod) throw new Error('AI_HISTORY_EMPTY');
  return {
    schema_version: '2.0' as const,
    request_id: input.opaqueRequestId,
    forecast_timestamp: input.forecastOrigin.toISOString(),
    target_period: input.history.targetPeriod,
    history: input.history.history,
    contextual_features: {
      dataset_source: 'wattwise_real',
      building_primary_use: null,
      business_type: input.context.businessType,
      building_area: input.context.buildingArea,
      site: null,
      timezone: input.context.timezone,
      profile_eligible: false,
    },
    feature_schema_sha256: AI05_FEATURE_SCHEMA_SHA256,
  };
}

export function historyFingerprint(history: AiHistory): string {
  return createHash('sha256')
    .update(JSON.stringify({
      history: history.history,
      target_period: history.targetPeriod,
      feature_schema_sha256: AI05_FEATURE_SCHEMA_SHA256,
    }))
    .digest('hex');
}

export function opaqueRequestId(input: {
  businessId: string;
  targetPeriod: string;
  forecastOrigin: Date;
  historyFingerprint: string;
  mode: AiMode;
}): string {
  return createHash('sha256')
    .update([
      input.businessId,
      input.targetPeriod,
      input.forecastOrigin.toISOString(),
      input.historyFingerprint,
      AI05_MODEL_VERSION,
      AI05_FEATURE_SCHEMA_SHA256,
      input.mode,
    ].join('|'))
    .digest('hex');
}

const responseSchema = z.object({
  schema_version: z.literal('2.0'),
  request_id: z.string().regex(/^[A-Za-z0-9:._-]{1,128}$/),
  status: z.literal('SUCCESS'),
  history_phase: z.enum(['H06_12', 'H13_PLUS']),
  selected_model: z.literal('nbeats'),
  model_version: z.literal(AI05_MODEL_VERSION),
  prediction_kwh: z.number().finite().nonnegative(),
  artifact_sha256: z.literal(AI05_ARTIFACT_SHA256),
  feature_schema_sha256: z.literal(AI05_FEATURE_SCHEMA_SHA256),
  fallback_used: z.literal(false),
  fallback_reason: z.null(),
  inference_latency_ms: z.number().finite().nonnegative(),
  worker_generation: z.number().int().nonnegative(),
  service_state: z.literal('READY'),
}).strict();

export type AiForecastSuccess = z.infer<typeof responseSchema>;

export function validateAiResponse(value: unknown, requestId: string): AiForecastSuccess {
  const parsed = responseSchema.parse(value);
  if (parsed.request_id !== requestId) throw new Error('AI_REQUEST_ID_MISMATCH');
  return parsed;
}

export async function callAiService(
  payload: ReturnType<typeof buildAiPayload>,
  config: AiEffectiveConfig,
  fetcher: typeof fetch = fetch
): Promise<AiForecastSuccess> {
  if (config.mode === 'OFF' || !config.serviceUrl || !config.serviceToken) {
    throw new Error('AI_MODE_OFF');
  }
  const response = await fetcher(`${config.serviceUrl}/v2/forecast`, {
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
  const contentType = response.headers.get('content-type') || '';
  const length = Number(response.headers.get('content-length') || 0);
  if (!contentType.startsWith('application/json')) throw new Error('AI_CONTENT_TYPE_INVALID');
  if (length > 64 * 1024) throw new Error('AI_RESPONSE_TOO_LARGE');
  if (!response.ok) throw new Error(`AI_HTTP_${response.status}`);
  const text = await response.text();
  if (text.length > 64 * 1024) throw new Error('AI_RESPONSE_TOO_LARGE');
  return validateAiResponse(JSON.parse(text), payload.request_id);
}

const diagnosticsSchema = z.object({
  schema_version: z.literal('2.0'),
  status: z.enum(['READY', 'NOT_READY']),
  service_state: z.enum(['STARTING', 'READY', 'RECOVERING', 'NOT_READY', 'FAILED']),
  model_version: z.string(),
  artifact_sha256: z.string(),
  feature_schema_sha256: z.string(),
  last_failure_code: z.string().nullable(),
}).strict();

export async function getAiIntegrationDiagnostics(
  config: AiEffectiveConfig = getEffectiveAiConfig(),
  fetcher: typeof fetch = fetch
) {
  const base = {
    mode: config.mode,
    integrationEnabled: config.mode !== 'OFF',
    serviceReachable: false,
    serviceReady: false,
    modelVersionMatch: false,
    artifactChecksumMatch: false,
    featureSchemaMatch: false,
    workerState: config.mode === 'OFF' ? 'DISABLED' : 'UNKNOWN',
    lastSafeFailureCode: config.mode === 'OFF' ? config.reason : null,
  };
  if (config.mode === 'OFF' || !config.serviceUrl) return base;
  try {
    const response = await fetcher(`${config.serviceUrl}/health/ready`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(Math.min(config.timeoutMs, 500)),
      redirect: 'error',
      cache: 'no-store',
    });
    const parsed = diagnosticsSchema.parse(await response.json());
    return {
      ...base,
      serviceReachable: true,
      serviceReady: response.ok && parsed.status === 'READY',
      modelVersionMatch: parsed.model_version === AI05_MODEL_VERSION,
      artifactChecksumMatch: parsed.artifact_sha256 === AI05_ARTIFACT_SHA256,
      featureSchemaMatch: parsed.feature_schema_sha256 === AI05_FEATURE_SCHEMA_SHA256,
      workerState: parsed.service_state,
      lastSafeFailureCode: parsed.last_failure_code,
    };
  } catch {
    return { ...base, lastSafeFailureCode: 'DIAGNOSTICS_UNAVAILABLE' };
  }
}

export function deterministicParitySnapshot(result: PredictionResult) {
  return {
    hasPrediction: result.hasPrediction,
    predictedUsageKwh: result.predictedUsageKwh,
    method: result.method,
    confidence: result.confidence,
    risk: result.risk,
    hasGaps: result.hasGaps,
    safeAvailability: result.hasPrediction,
  };
}
