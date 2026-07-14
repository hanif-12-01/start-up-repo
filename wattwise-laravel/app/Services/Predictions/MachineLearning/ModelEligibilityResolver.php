<?php

declare(strict_types=1);

namespace App\Services\Predictions\MachineLearning;

use Carbon\Carbon;

final class ModelEligibilityResolver
{
    private const CONFIG_KEY_MAP = [
        'deterministic' => 'deterministic',
        'ridge_umkm_v1_1' => 'ridge',
        'gradient_boosting_umkm_v1' => 'gradient_boosting',
    ];

    public function resolve(
        PredictionModelInterface $model,
        array $history,
        string $businessType,
        ?float $tariffPerKwh,
    ): ModelEligibility {
        if (! config('prediction.shadow_enabled', false)) {
            if ($model->key() !== 'deterministic') {
                return ModelEligibility::ineligible('SHADOW_DISABLED');
            }
        }

        $configKey = self::CONFIG_KEY_MAP[$model->key()] ?? $model->key();
        if (! config("prediction.{$configKey}_enabled", false)) {
            if ($model->key() !== 'deterministic') {
                return ModelEligibility::ineligible('MODEL_DISABLED');
            }
        }

        return $model->checkEligibility($history, $businessType, $tariffPerKwh, []);
    }

    public static function validateHistoryContinuity(array $history): ModelEligibility
    {
        if (empty($history)) {
            return ModelEligibility::ineligible('INSUFFICIENT_HISTORY', 'History is empty.');
        }

        $seen = [];
        $prev = null;

        foreach ($history as $i => $entry) {
            if (! isset($entry['period_month'], $entry['usage_kwh'])) {
                return ModelEligibility::ineligible('INVALID_INPUT', "Entry {$i} missing required keys.");
            }

            $period = $entry['period_month'];
            if (! preg_match('/^\d{4}-(0[1-9]|1[0-2])$/', $period)) {
                return ModelEligibility::ineligible('INVALID_INPUT', "Entry {$i} has malformed period_month: {$period}");
            }

            if (isset($seen[$period])) {
                return ModelEligibility::ineligible('DUPLICATE_PERIOD', "Duplicate period found: {$period}");
            }
            $seen[$period] = true;

            if ($prev !== null) {
                if ($period < $prev) {
                    return ModelEligibility::ineligible('CHRONOLOGICAL_ORDER_FAILURE', "History not in chronological order: {$period} is before {$prev}.");
                }

                $expectedNext = Carbon::parse($prev.'-01')->addMonth()->format('Y-m');
                if ($period !== $expectedNext) {
                    return ModelEligibility::ineligible('HISTORY_HAS_GAPS', "Gap detected in history between {$prev} and {$period}.");
                }
            }

            $prev = $period;
        }

        return ModelEligibility::eligible();
    }

    public static function calculateHistoryBucket(int $months): string
    {
        return match (true) {
            $months >= 24 => 'M24_PLUS',
            $months >= 12 => 'M12_23',
            $months >= 6 => 'M06_11',
            $months >= 3 => 'M03_05',
            default => 'M01_02',
        };
    }
}
