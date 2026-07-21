<?php

declare(strict_types=1);

namespace App\Services\Predictions\PhaseAware;

final class PredictionModePolicy
{
    public function resolve(): PredictionModeState
    {
        $configured = strtolower(trim((string) config('prediction.mode', 'off')));
        $mode = PredictionMode::tryFrom($configured);
        $allowProduction = (bool) config('prediction.allow_production_ml', false);
        $approved = (bool) config('prediction.production_approved', false);
        $productionPermitted = $allowProduction && $approved;

        if ($mode === null) {
            return new PredictionModeState(
                $configured,
                PredictionMode::OFF,
                $productionPermitted,
                'INVALID_MODE',
            );
        }

        if ($mode === PredictionMode::OFF) {
            return new PredictionModeState($configured, $mode, $productionPermitted, null);
        }

        if (! app()->environment('production')) {
            return new PredictionModeState($configured, $mode, $productionPermitted, null);
        }

        if ($mode === PredictionMode::EXPERIMENTAL) {
            return new PredictionModeState(
                $configured,
                PredictionMode::OFF,
                $productionPermitted,
                'EXPERIMENTAL_BLOCKED_IN_PRODUCTION',
            );
        }

        if (! $productionPermitted) {
            return new PredictionModeState(
                $configured,
                PredictionMode::OFF,
                false,
                'PRODUCTION_APPROVAL_REQUIRED',
            );
        }

        return new PredictionModeState($configured, $mode, true, null);
    }
}
