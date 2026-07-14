<?php

declare(strict_types=1);

namespace App\Services\Predictions\MachineLearning;

final class InputFingerprintGenerator
{
    public static function generate(
        int $businessId,
        string $targetPeriod,
        array $historyPairs,
        float $tariffPerKwh,
        string $businessType,
    ): string {
        usort($historyPairs, fn (array $a, array $b) => $a['period'] <=> $b['period']);

        $historySegments = array_map(
            fn (array $pair) => $pair['period'].':'.$pair['usage'],
            $historyPairs,
        );

        $canonical = implode('|', [
            "b:{$businessId}",
            "t:{$targetPeriod}",
            'h:'.implode(',', $historySegments),
            "tariff:{$tariffPerKwh}",
            "type:{$businessType}",
            'mv:1.0',
        ]);

        return hash('sha256', $canonical);
    }
}
