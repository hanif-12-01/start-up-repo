<?php

declare(strict_types=1);

namespace App\Services\Predictions\PhaseAware;

final class NullPredictionInferenceGateway implements PredictionInferenceGateway
{
    public function __construct(
        private readonly string $reason = 'ML_DISABLED',
    ) {}

    public function predict(array $payload): InferenceResponse
    {
        throw new InferenceGatewayException($this->reason);
    }

    public function health(): array
    {
        return [
            'reachable' => false,
            'readiness' => 'disabled',
            'inventory' => 'not_checked',
            'code' => $this->reason,
        ];
    }
}
