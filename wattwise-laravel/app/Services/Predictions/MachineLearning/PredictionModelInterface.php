<?php

declare(strict_types=1);

namespace App\Services\Predictions\MachineLearning;

interface PredictionModelInterface
{
    public function key(): string;

    public function version(): string;

    public function minimumHistoryMonths(): int;

    public function requiredFeatureOrder(): array;

    public function artifactChecksum(): ?string;

    public function checkEligibility(array $history, string $businessType, ?float $tariffPerKwh, array $flags): ModelEligibility;

    public function predict(array $history, string $businessType, float $tariffPerKwh): ModelPredictionResult;
}
