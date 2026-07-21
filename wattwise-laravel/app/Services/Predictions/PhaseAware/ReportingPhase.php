<?php

declare(strict_types=1);

namespace App\Services\Predictions\PhaseAware;

enum ReportingPhase: string
{
    case H00 = 'H00';
    case H01_02 = 'H01_02';
    case H03_05 = 'H03_05';
    case H06_12 = 'H06_12';
    case H13_PLUS = 'H13_PLUS';

    public static function fromHistoryMonths(int $months): self
    {
        if ($months < 0) {
            throw new \InvalidArgumentException('History months cannot be negative.');
        }

        return match (true) {
            $months === 0 => self::H00,
            $months <= 2 => self::H01_02,
            $months <= 5 => self::H03_05,
            $months <= 12 => self::H06_12,
            default => self::H13_PLUS,
        };
    }
}
