<?php

declare(strict_types=1);

namespace App\Services\Predictions\PhaseAware;

final readonly class PhaseRoute
{
    public function __construct(
        public ReportingPhase $reportingPhase,
        public string $selectedModel,
        public bool $eligible,
        public string $fallbackModel,
        public string $routingReason,
        public string $modelVersion,
        public ?string $ineligibilityReason = null,
    ) {}

    /** @return array<string, bool|string|null> */
    public function toArray(): array
    {
        return [
            'reporting_phase' => $this->reportingPhase->value,
            'selected_model' => $this->selectedModel,
            'eligible' => $this->eligible,
            'fallback_model' => $this->fallbackModel,
            'routing_reason' => $this->routingReason,
            'model_version' => $this->modelVersion,
            'ineligibility_reason' => $this->ineligibilityReason,
        ];
    }
}
