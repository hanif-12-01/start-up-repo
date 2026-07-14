<?php

declare(strict_types=1);

namespace App\Services\Predictions\MachineLearning;

use App\Services\Predictions\PredictionService;

final class DeterministicPredictionAdapter implements PredictionModelInterface
{
    public function __construct(
        private readonly PredictionService $predictionService,
    ) {}

    public function key(): string
    {
        return 'deterministic';
    }

    public function version(): string
    {
        return '1.0';
    }

    public function minimumHistoryMonths(): int
    {
        return 1;
    }

    public function requiredFeatureOrder(): array
    {
        return [];
    }

    public function artifactChecksum(): ?string
    {
        return null;
    }

    public function checkEligibility(array $history, string $businessType, ?float $tariffPerKwh, array $flags): ModelEligibility
    {
        $validMonths = 0;
        foreach ($history as $entry) {
            $usage = $entry['usage_kwh'] ?? null;
            if ($usage !== null && is_finite((float) $usage) && (float) $usage >= 0) {
                $validMonths++;
            }
        }

        if ($validMonths < 1) {
            return ModelEligibility::ineligible('INSUFFICIENT_HISTORY', 'At least 1 month of valid usage required.');
        }

        return ModelEligibility::eligible();
    }

    public function predict(array $history, string $businessType, float $tariffPerKwh): ModelPredictionResult
    {
        $start = hrtime(true);

        try {
            $result = $this->predictionService->predict($history, $tariffPerKwh);
            $durationMs = (hrtime(true) - $start) / 1_000_000;

            if (! ($result['has_prediction'] ?? false)) {
                return ModelPredictionResult::skipped(
                    $this->key(),
                    $this->version(),
                    'NO_PREDICTION',
                    $durationMs,
                );
            }

            return ModelPredictionResult::success(
                modelKey: $this->key(),
                modelVersion: $this->version(),
                predictedUsageKwh: $result['predicted_usage_kwh'],
                predictedBillIdr: $result['estimated_bill_idr'],
                featureSnapshot: null,
                artifactSha256: null,
                executionDurationMs: $durationMs,
            );
        } catch (\Throwable $e) {
            $durationMs = (hrtime(true) - $start) / 1_000_000;

            return ModelPredictionResult::failed(
                $this->key(),
                $this->version(),
                'RUNTIME_ERROR',
                'Deterministic prediction failed.',
                $durationMs,
            );
        }
    }
}
