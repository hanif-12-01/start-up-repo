<?php

declare(strict_types=1);

namespace App\Services\Predictions\PhaseAware;

interface PredictionInferenceGateway
{
    /** @param array<string, mixed> $payload */
    public function predict(array $payload): InferenceResponse;

    /**
     * @return array{reachable: bool, readiness: string, inventory: string, code: string|null}
     */
    public function health(): array;
}
