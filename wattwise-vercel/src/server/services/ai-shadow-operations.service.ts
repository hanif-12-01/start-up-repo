import { claimAndProcessShadowJob } from '@/server/repositories/ai-shadow.repository';
import { getAiIntegrationDiagnostics, getEffectiveAiConfig } from './ai-forecast.service';
import { logger } from '@/server/logger';

export const SHADOW_BATCH_DEFAULT_MAX_JOBS = 10;
export const SHADOW_BATCH_HARD_MAX_JOBS = 25;
export const SHADOW_BATCH_DEFAULT_TIME_BUDGET_MS = 20_000;
export const SHADOW_BATCH_HARD_TIME_BUDGET_MS = 25_000;

export interface ShadowBatchResult {
  claimed: number;
  succeeded: number;
  retryable: number;
  fallback: number;
  noWork: boolean;
  durationMs: number;
  serviceReady: boolean;
  mode: string;
}

export async function processShadowBatch(input: {
  maxJobs?: number;
  timeBudgetMs?: number;
  fetcher?: typeof fetch;
  now?: () => number;
} = {}): Promise<ShadowBatchResult> {
  const started = (input.now ?? Date.now)();
  const now = input.now ?? Date.now;
  const maxJobs = Math.min(
    Math.max(1, Math.trunc(input.maxJobs ?? SHADOW_BATCH_DEFAULT_MAX_JOBS)),
    SHADOW_BATCH_HARD_MAX_JOBS
  );
  const timeBudgetMs = Math.min(
    Math.max(100, Math.trunc(input.timeBudgetMs ?? SHADOW_BATCH_DEFAULT_TIME_BUDGET_MS)),
    SHADOW_BATCH_HARD_TIME_BUDGET_MS
  );
  const config = getEffectiveAiConfig();
  const base = { claimed: 0, succeeded: 0, retryable: 0, fallback: 0 };
  if (config.mode === 'OFF') {
    return { ...base, noWork: true, durationMs: now() - started, serviceReady: false, mode: 'OFF' };
  }
  const diagnostics = await getAiIntegrationDiagnostics(config, input.fetcher ?? fetch);
  if (!diagnostics.serviceReady || !diagnostics.modelVersionMatch ||
      !diagnostics.artifactChecksumMatch || !diagnostics.featureSchemaMatch) {
    logger.warn('AI shadow batch paused: service not ready', {
      event: 'ai_shadow_batch_not_ready', workerState: diagnostics.workerState,
      failureCode: diagnostics.lastSafeFailureCode,
    });
    return { ...base, noWork: true, durationMs: now() - started, serviceReady: false, mode: config.mode };
  }
  const result = { ...base };
  for (let index = 0; index < maxJobs && now() - started < timeBudgetMs; index += 1) {
    try {
      const outcome = await claimAndProcessShadowJob(input.fetcher ?? fetch);
      if (!outcome) break;
      result.claimed += 1;
      if (outcome.status === 'SUCCEEDED') result.succeeded += 1;
      if (outcome.status === 'FAILED_RETRYABLE') result.retryable += 1;
      if (outcome.status === 'FALLBACK') result.fallback += 1;
    } catch (error) {
      logger.error('AI shadow batch item failed safely', error, { event: 'ai_shadow_batch_item_error' });
    }
  }
  const summary: ShadowBatchResult = {
    ...result, noWork: result.claimed === 0,
    durationMs: now() - started, serviceReady: true, mode: config.mode,
  };
  logger.info('AI shadow batch completed', { event: 'ai_shadow_batch', ...summary });
  return summary;
}
