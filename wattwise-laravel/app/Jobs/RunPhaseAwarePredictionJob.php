<?php

declare(strict_types=1);

namespace App\Jobs;

use App\Models\ElectricityEntry;
use App\Models\PredictionModelResult;
use App\Models\PredictionRun;
use App\Services\Predictions\MachineLearning\ModelEligibilityResolver;
use App\Services\Predictions\MachineLearning\PredictionEvaluationService;
use App\Services\Predictions\PhaseAware\InferenceGatewayException;
use App\Services\Predictions\PhaseAware\PhaseAwarePredictionInput;
use App\Services\Predictions\PhaseAware\PhaseAwareRouter;
use App\Services\Predictions\PhaseAware\PhaseRoute;
use App\Services\Predictions\PhaseAware\PredictionInferenceGateway;
use App\Services\Predictions\PhaseAware\PredictionInputBuilder;
use App\Services\Predictions\PhaseAware\PredictionMode;
use App\Services\Predictions\PhaseAware\PredictionModePolicy;
use App\Services\Predictions\PredictionService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

final class RunPhaseAwarePredictionJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @var list<int> */
    public array $backoff = [5, 30, 120];

    public function __construct(
        public readonly int $electricityEntryId,
    ) {}

    public function handle(
        PredictionModePolicy $modePolicy,
        PredictionInputBuilder $inputBuilder,
        PhaseAwareRouter $router,
        PredictionInferenceGateway $gateway,
        PredictionService $predictionService,
        PredictionEvaluationService $evaluationService,
    ): void {
        $state = $modePolicy->resolve();
        if (! $state->shouldDispatch()) {
            return;
        }

        $entry = ElectricityEntry::find($this->electricityEntryId);
        if ($entry === null) {
            return;
        }

        if ($entry->usage_kwh !== null) {
            $evaluationService->evaluateForActual(
                $entry->business_id,
                $entry->period_month->format('Y-m'),
                (float) $entry->usage_kwh,
            );
        }

        try {
            $input = $inputBuilder->build($entry);
        } catch (\Throwable) {
            return;
        }

        $route = $router->route(
            count($input->consumptionHistory),
            $input->contextualFeatures,
        );
        $requestId = $input->requestId($route, $state->effectiveMode);
        $deterministic = $predictionService->predict(
            $input->fullHistory,
            $input->tariffPerKwh,
        );
        $fallback = ($deterministic['has_prediction'] ?? false)
            ? (float) $deterministic['predicted_usage_kwh']
            : null;

        $run = PredictionRun::firstOrCreate(
            ['request_id' => $requestId],
            $this->initialRunValues(
                $input,
                $route,
                $state->effectiveMode,
                $fallback,
                $requestId,
            ),
        );

        if (! $run->wasRecentlyCreated && $run->phase_status !== 'PENDING') {
            return;
        }

        if ($route->selectedModel === PhaseAwareRouter::FALLBACK_MODEL) {
            $this->completeWithDeterministic($run, $route, $fallback);

            return;
        }

        if (! $route->eligible) {
            $this->completeWithFallback(
                $run,
                $route,
                $fallback,
                'NOT_ELIGIBLE',
                $route->ineligibilityReason ?? 'NOT_ELIGIBLE',
                null,
            );

            return;
        }

        $started = hrtime(true);
        try {
            $response = $gateway->predict(
                $input->payload($route, $state->effectiveMode),
            );
            if ($response->selectedModel !== $route->selectedModel
                || $response->modelVersion !== $route->modelVersion
                || $response->reportingPhase !== $route->reportingPhase->value) {
                throw new InferenceGatewayException('CONTRACT_MISMATCH');
            }

            if ($response->status !== 'SUCCESS' || $response->predictionKwh === null) {
                $this->completeWithFallback(
                    $run,
                    $route,
                    $fallback,
                    $response->status,
                    $response->fallbackReason ?? $response->errorCode ?? 'ML_UNAVAILABLE',
                    $response->latencyMs,
                    $response->artifactIdentifier,
                    $response->artifactSha256,
                    $response->warnings,
                    $response->errorCode,
                );

                return;
            }

            $run->update([
                'phase_status' => 'SUCCESS',
                'prediction_output_kwh' => $response->predictionKwh,
                'eligibility_status' => 'ELIGIBLE',
                'fallback_reason' => null,
                'inference_latency_ms' => $response->latencyMs,
                'artifact_identifier' => $response->artifactIdentifier,
                'artifact_sha256' => $response->artifactSha256,
                'error_category' => null,
                'inference_warnings' => $response->warnings,
            ]);
            $this->persistModelResult(
                $run,
                $route,
                'SUCCESS',
                $response->predictionKwh,
                $input->tariffPerKwh,
                $response->latencyMs,
                $response->artifactSha256,
                null,
                null,
            );
        } catch (InferenceGatewayException $e) {
            $latency = (hrtime(true) - $started) / 1_000_000;
            $this->completeWithFallback(
                $run,
                $route,
                $fallback,
                'FALLBACK',
                $e->category,
                $latency,
                errorCategory: $e->category,
            );
        } catch (\Throwable) {
            $latency = (hrtime(true) - $started) / 1_000_000;
            $this->completeWithFallback(
                $run,
                $route,
                $fallback,
                'FALLBACK',
                'UNEXPECTED_INFERENCE_ERROR',
                $latency,
                errorCategory: 'UNEXPECTED_INFERENCE_ERROR',
            );
        }
    }

    /** @return array<string, mixed> */
    private function initialRunValues(
        PhaseAwarePredictionInput $input,
        PhaseRoute $route,
        PredictionMode $mode,
        ?float $fallback,
        string $requestId,
    ): array {
        return [
            'business_id' => $input->businessId,
            'source_entry_id' => $input->sourceEntryId,
            'target_period' => $input->targetPeriod,
            // The pre-existing prediction_runs uniqueness constraint includes this
            // fingerprint. Reuse the full idempotency key so model/version/mode
            // changes cannot collide with an earlier run for the same period.
            'input_fingerprint' => $requestId,
            'trigger_source' => 'electricity_entry_queue',
            'history_months' => min(255, count($input->consumptionHistory)),
            'history_bucket' => ModelEligibilityResolver::calculateHistoryBucket(max(1, count($input->consumptionHistory))),
            'business_type_snapshot' => (string) ($input->contextualFeatures['business_type'] ?? 'OTHER'),
            'tariff_snapshot' => $input->tariffPerKwh,
            'reporting_phase' => $route->reportingPhase->value,
            'selected_model' => $route->selectedModel,
            'selected_model_version' => $route->modelVersion,
            'prediction_mode' => $mode->value,
            'phase_status' => 'PENDING',
            'deterministic_fallback_kwh' => $fallback,
            'eligibility_status' => $route->eligible ? 'ELIGIBLE' : 'NOT_ELIGIBLE',
            'generated_at' => now(),
        ];
    }

    private function completeWithDeterministic(
        PredictionRun $run,
        PhaseRoute $route,
        ?float $fallback,
    ): void {
        $status = $fallback === null ? 'NOT_ELIGIBLE' : 'SUCCESS';
        $run->update([
            'phase_status' => $status,
            'prediction_output_kwh' => $fallback,
            'eligibility_status' => $fallback === null ? 'NOT_ELIGIBLE' : 'ELIGIBLE',
            'fallback_reason' => $fallback === null ? 'INSUFFICIENT_HISTORY' : null,
            'inference_latency_ms' => 0,
        ]);
        $this->persistModelResult($run, $route, $status, $fallback, $run->tariff_snapshot === null ? null : (float) $run->tariff_snapshot, 0, null, $fallback === null ? 'INSUFFICIENT_HISTORY' : null, null);
    }

    /** @param list<string> $warnings */
    private function completeWithFallback(
        PredictionRun $run,
        PhaseRoute $route,
        ?float $fallback,
        string $status,
        string $reason,
        ?float $latency,
        ?string $artifactIdentifier = null,
        ?string $artifactSha256 = null,
        array $warnings = [],
        ?string $errorCategory = null,
    ): void {
        $run->update([
            'phase_status' => $status === 'NOT_ELIGIBLE' ? 'NOT_ELIGIBLE' : 'FALLBACK',
            'prediction_output_kwh' => null,
            'eligibility_status' => $status === 'NOT_ELIGIBLE' ? 'NOT_ELIGIBLE' : 'ELIGIBLE',
            'fallback_reason' => $reason,
            'inference_latency_ms' => $latency,
            'artifact_identifier' => $artifactIdentifier,
            'artifact_sha256' => $artifactSha256,
            'error_category' => $errorCategory,
            'inference_warnings' => $warnings,
        ]);
        $this->persistModelResult($run, $route, $status === 'NOT_ELIGIBLE' ? 'SKIPPED' : 'FAILED', null, null, $latency, $artifactSha256, $status === 'NOT_ELIGIBLE' ? $reason : null, $errorCategory ?? ($status === 'NOT_ELIGIBLE' ? null : $reason));
    }

    private function persistModelResult(
        PredictionRun $run,
        PhaseRoute $route,
        string $status,
        ?float $prediction,
        ?float $tariff,
        ?float $latency,
        ?string $checksum,
        ?string $skipReason,
        ?string $failureCode,
    ): void {
        PredictionModelResult::updateOrCreate(
            [
                'prediction_run_id' => $run->id,
                'model_key' => $route->selectedModel,
                'model_version' => $route->modelVersion,
            ],
            [
                'execution_mode' => strtoupper((string) $run->prediction_mode),
                'status' => $status,
                'predicted_usage_kwh' => $prediction,
                'predicted_bill_idr' => $prediction !== null && $tariff !== null ? $prediction * $tariff : null,
                'feature_snapshot' => null,
                'artifact_sha256' => $checksum,
                'duration_ms' => $latency,
                'skip_reason' => $skipReason,
                'failure_code' => $failureCode,
                'generated_at' => now(),
            ],
        );
    }
}
