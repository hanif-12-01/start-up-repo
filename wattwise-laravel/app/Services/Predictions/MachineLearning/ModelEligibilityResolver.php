<?php

declare(strict_types=1);

namespace App\Services\Predictions\MachineLearning;

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
