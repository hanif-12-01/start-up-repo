<?php

declare(strict_types=1);

namespace App\Services\Predictions\PhaseAware;

final readonly class PredictionModeState
{
    public function __construct(
        public string $configuredMode,
        public PredictionMode $effectiveMode,
        public bool $productionPermitted,
        public ?string $blockReason,
    ) {}

    public function shouldDispatch(): bool
    {
        return $this->effectiveMode->requiresMlJob();
    }
}
