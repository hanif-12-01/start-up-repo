<?php

declare(strict_types=1);

namespace App\Services\Predictions\MachineLearning;

use App\Models\PredictionModelResult;
use App\Models\PredictionRun;
use Illuminate\Support\Facades\Log;

final class PredictionShadowOrchestrator
{
    public function __construct(
        private readonly ModelRegistry $registry,
        private readonly ModelEligibilityResolver $eligibilityResolver,
    ) {}

    /**
     * @param  array<int, array{period_month: string, usage_kwh: float}>  $history
     */
    public function execute(
        int $businessId,
        string $targetPeriod,
        array $history,
        string $businessType,
        ?float $tariffPerKwh,
        string $triggerSource = 'electricity_entry',
    ): ?PredictionRun {
        if (! config('prediction.shadow_enabled', false)) {
            return null;
        }

        if (empty($history)) {
            return null;
        }

        $historyPairs = array_map(
            fn (array $e) => ['period' => $e['period_month'], 'usage' => $e['usage_kwh']],
            $history,
        );

        $manifestPath = base_path('resources/ml/model-manifest.json');
        if (! file_exists($manifestPath)) {
            throw new \RuntimeException('Model manifest file does not exist.');
        }
        $manifestRaw = file_get_contents($manifestPath);
        if ($manifestRaw === false) {
            throw new \RuntimeException('Cannot read model manifest file.');
        }
        $manifestData = json_decode($manifestRaw, true);
        if (json_last_error() !== JSON_ERROR_NONE || ! is_array($manifestData)) {
            throw new \RuntimeException('Invalid model manifest JSON.');
        }

        $manifestVersion = (string) ($manifestData['manifest_version'] ?? 'unknown');
        $manifestContentHash = hash('sha256', $manifestRaw);

        $models = $this->registry->all();
        usort($models, fn ($a, $b) => strcmp($a->key(), $b->key()));

        $modelParts = [];
        foreach ($models as $model) {
            $modelParts[] = "model:{$model->key()}:{$model->version()}:".($model->artifactChecksum() ?? 'null');
        }
        $modelsString = implode('|', $modelParts);

        $policyParts = [
            "manifest_version:{$manifestVersion}",
            "manifest_hash:{$manifestContentHash}",
            "models:{$modelsString}",
            'shadow_enabled:1',
            'ridge_enabled:'.(config('prediction.ridge_enabled', false) ? '1' : '0'),
            'gradient_boosting_enabled:'.(config('prediction.gradient_boosting_enabled', false) ? '1' : '0'),
            'adaptive_router_enabled:'.(config('prediction.adaptive_router_enabled', false) ? '1' : '0'),
            'router_mode:'.(config('prediction.router_mode') ?? 'null'),
        ];
        $manifestFingerprint = hash('sha256', implode('|', $policyParts));

        $fingerprint = InputFingerprintGenerator::generate(
            $businessId,
            $targetPeriod,
            $historyPairs,
            $tariffPerKwh ?? 0.0,
            $businessType,
            $manifestFingerprint,
        );

        $existingRun = PredictionRun::where('business_id', $businessId)
            ->where('target_period', $targetPeriod)
            ->where('input_fingerprint', $fingerprint)
            ->first();

        if ($existingRun !== null) {
            foreach ($this->registry->all() as $model) {
                $existingResult = PredictionModelResult::where('prediction_run_id', $existingRun->id)
                    ->where('model_key', $model->key())
                    ->where('model_version', $model->version())
                    ->first();

                if ($existingResult === null) {
                    try {
                        $this->executeModel($existingRun, $model, $history, $businessType, $tariffPerKwh);
                    } catch (\Throwable $e) {
                        Log::warning("Shadow model {$model->key()} failed during backfill", [
                            'run_id' => $existingRun->id,
                            'error' => $e->getMessage(),
                        ]);

                        $this->persistResult($existingRun, ModelPredictionResult::failed(
                            $model->key(),
                            $model->version(),
                            'UNCAUGHT_EXCEPTION',
                            'Model execution failed safely during backfill.',
                            0.0,
                        ));
                    }
                }
            }

            return $existingRun;
        }

        $historyMonths = count($history);
        $historyBucket = ModelEligibilityResolver::calculateHistoryBucket($historyMonths);

        $run = PredictionRun::create([
            'business_id' => $businessId,
            'target_period' => $targetPeriod,
            'input_fingerprint' => $fingerprint,
            'trigger_source' => $triggerSource,
            'history_months' => $historyMonths,
            'history_bucket' => $historyBucket,
            'business_type_snapshot' => $businessType,
            'tariff_snapshot' => $tariffPerKwh,
            'generated_at' => now(),
        ]);

        foreach ($this->registry->all() as $model) {
            try {
                $this->executeModel($run, $model, $history, $businessType, $tariffPerKwh);
            } catch (\Throwable $e) {
                Log::warning("Shadow model {$model->key()} failed", [
                    'run_id' => $run->id,
                    'error' => $e->getMessage(),
                ]);

                $this->persistResult($run, ModelPredictionResult::failed(
                    $model->key(),
                    $model->version(),
                    'UNCAUGHT_EXCEPTION',
                    'Model execution failed safely.',
                    0.0,
                ));
            }
        }

        return $run;
    }

    private function executeModel(
        PredictionRun $run,
        PredictionModelInterface $model,
        array $history,
        string $businessType,
        ?float $tariffPerKwh,
    ): void {
        $executionMode = $this->registry->getStatus($model->key());

        $eligibility = $this->eligibilityResolver->resolve($model, $history, $businessType, $tariffPerKwh);

        if (! $eligibility->eligible) {
            $this->persistResult($run, ModelPredictionResult::skipped(
                $model->key(),
                $model->version(),
                $eligibility->skipReason ?? 'UNKNOWN',
                0.0,
            ), $executionMode);

            return;
        }

        if ($tariffPerKwh === null || $tariffPerKwh <= 0) {
            $this->persistResult($run, ModelPredictionResult::skipped(
                $model->key(),
                $model->version(),
                'MISSING_TARIFF',
                0.0,
            ), $executionMode);

            return;
        }

        $result = $model->predict($history, $businessType, $tariffPerKwh);
        $this->persistResult($run, $result, $executionMode);
    }

    private function persistResult(
        PredictionRun $run,
        ModelPredictionResult $result,
        string $executionMode = 'SHADOW',
    ): void {
        $exists = PredictionModelResult::where('prediction_run_id', $run->id)
            ->where('model_key', $result->modelKey)
            ->where('model_version', $result->modelVersion)
            ->exists();

        if ($exists) {
            return;
        }

        PredictionModelResult::create([
            'prediction_run_id' => $run->id,
            'model_key' => $result->modelKey,
            'model_version' => $result->modelVersion,
            'execution_mode' => $executionMode,
            'status' => $result->status,
            'predicted_usage_kwh' => $result->predictedUsageKwh,
            'predicted_bill_idr' => $result->predictedBillIdr,
            'feature_snapshot' => $result->featureSnapshot,
            'artifact_sha256' => $result->artifactSha256,
            'duration_ms' => $result->executionDurationMs,
            'skip_reason' => $result->skipReason,
            'failure_code' => $result->failureCode,
            'generated_at' => now(),
        ]);
    }
}
