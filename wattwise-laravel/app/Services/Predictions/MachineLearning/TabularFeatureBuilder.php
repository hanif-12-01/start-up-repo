<?php

declare(strict_types=1);

namespace App\Services\Predictions\MachineLearning;

use InvalidArgumentException;

final class TabularFeatureBuilder
{
    private const BUSINESS_TYPE_MAP = [
        'LAUNDRY' => 0,
        'FNB' => 1,
        'RETAIL' => 2,
        'MANUFACTURE' => 3,
        'COLD_STORAGE' => 4,
        'KOS_PROPERTY' => 6,
        'OTHER' => 6,
    ];

    private const EPSILON = 0.00001;

    public function build(array $history, string $businessType, float $tariffPerKwh): array
    {
        $this->validateHistory($history, $tariffPerKwh);

        $encoding = $this->getBusinessTypeEncoding($businessType);
        if ($encoding === null) {
            throw new InvalidArgumentException("Unsupported business type: {$businessType}");
        }

        $n = count($history);
        $latest = $history[$n - 1]['usage_kwh'];
        $previous = $n >= 2 ? $history[$n - 2]['usage_kwh'] : $latest;

        $recentValues = array_map(
            static fn (array $entry): float => $entry['usage_kwh'],
            array_slice($history, -3),
        );
        $avg3 = array_sum($recentValues) / count($recentValues);

        $recent6Values = array_map(
            static fn (array $entry): float => $entry['usage_kwh'],
            array_slice($history, -6),
        );
        $avg6 = array_sum($recent6Values) / count($recent6Values);

        $month = (int) substr($history[$n - 1]['period_month'], 5, 2);
        $monthRad = 2.0 * M_PI * $month / 12.0;

        return [
            'business_type_encoded' => (float) $encoding,
            'month' => (float) $month,
            'latest_usage_kwh' => $latest,
            'previous_usage_kwh' => $previous,
            'avg_3_month_usage_kwh' => $avg3,
            'avg_6_month_usage_kwh' => $avg6,
            'trend_1_month' => ($latest - $previous) / ($previous + self::EPSILON),
            'trend_3_month' => ($latest - $avg3) / ($avg3 + self::EPSILON),
            'month_sin' => sin($monthRad),
            'month_cos' => cos($monthRad),
            'avg_tariff_idr_per_kwh' => $tariffPerKwh,
        ];
    }

    public function validateHistory(array $history, float $tariffPerKwh = 1.0): void
    {
        if (empty($history)) {
            throw new InvalidArgumentException('History must not be empty.');
        }

        if (! is_finite($tariffPerKwh) || $tariffPerKwh <= 0) {
            throw new InvalidArgumentException('Tariff must be a positive finite number.');
        }

        $seenPeriods = [];
        $previousPeriod = null;

        foreach ($history as $i => $entry) {
            if (! isset($entry['period_month'], $entry['usage_kwh'])) {
                throw new InvalidArgumentException("Entry {$i} missing required keys.");
            }

            $usage = $entry['usage_kwh'];
            if (! is_numeric($usage) || ! is_finite((float) $usage)) {
                throw new InvalidArgumentException("Entry {$i} has non-finite usage.");
            }
            if ((float) $usage < 0) {
                throw new InvalidArgumentException("Entry {$i} has negative usage.");
            }

            $period = $entry['period_month'];
            if (! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $period)) {
                throw new InvalidArgumentException("Entry {$i} has malformed period_month: {$period}");
            }

            if (isset($seenPeriods[$period])) {
                throw new InvalidArgumentException("Duplicate period: {$period}");
            }
            $seenPeriods[$period] = true;

            if ($previousPeriod !== null && $period <= $previousPeriod) {
                throw new InvalidArgumentException("History not in chronological order at entry {$i}.");
            }
            $previousPeriod = $period;
        }
    }

    public function isBusinessTypeSupported(string $type): bool
    {
        return isset(self::BUSINESS_TYPE_MAP[$type]);
    }

    public function getBusinessTypeEncoding(string $type): ?int
    {
        return self::BUSINESS_TYPE_MAP[$type] ?? null;
    }
}
