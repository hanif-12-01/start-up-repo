<?php

declare(strict_types=1);

namespace App\Services\Predictions\PhaseAware;

enum PredictionMode: string
{
    case OFF = 'off';
    case SHADOW = 'shadow';
    case EXPERIMENTAL = 'experimental';
    case ACTIVE = 'active';

    public function requiresMlJob(): bool
    {
        return $this !== self::OFF;
    }
}
