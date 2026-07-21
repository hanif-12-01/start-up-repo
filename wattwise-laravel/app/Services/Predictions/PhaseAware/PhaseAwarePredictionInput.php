<?php

declare(strict_types=1);

namespace App\Services\Predictions\PhaseAware;

final readonly class PhaseAwarePredictionInput
{
    /**
     * @param  list<array{period_month: string, usage_kwh: float}>  $fullHistory
     * @param  list<array{period_month: string, usage_kwh: float}>  $consumptionHistory
     * @param  array<string, mixed>  $contextualFeatures
     */
    public function __construct(
        public int $businessId,
        public int $sourceEntryId,
        public string $targetPeriod,
        public array $fullHistory,
        public array $consumptionHistory,
        public array $contextualFeatures,
        public ?float $tariffPerKwh,
    ) {}

    public function requestId(PhaseRoute $route, PredictionMode $mode): string
    {
        $historyFingerprint = hash('sha256', json_encode(
            $this->consumptionHistory,
            JSON_THROW_ON_ERROR | JSON_PRESERVE_ZERO_FRACTION,
        ));

        return hash('sha256', implode('|', [
            (string) $this->businessId,
            (string) $this->sourceEntryId,
            $this->targetPeriod,
            $route->selectedModel,
            $route->modelVersion,
            $mode->value,
            $historyFingerprint,
        ]));
    }

    /** @return array<string, mixed> */
    public function payload(PhaseRoute $route, PredictionMode $mode): array
    {
        $requestId = $this->requestId($route, $mode);

        return [
            'schema_version' => '1.0',
            'request_id' => $requestId,
            'entity_id' => 'business:'.$this->businessId,
            'reporting_phase' => $route->reportingPhase->value,
            'target_period' => $this->targetPeriod,
            'consumption_history' => $this->consumptionHistory,
            'contextual_features' => $this->contextualFeatures,
            'requested_horizon' => 1,
            'requested_model' => $route->selectedModel,
            'model_version' => $route->modelVersion,
        ];
    }
}
