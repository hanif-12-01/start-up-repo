<?php

declare(strict_types=1);

namespace App\Services\Predictions\MachineLearning;

use App\Models\PredictionEvaluation;
use App\Models\PredictionModelResult;

final class PredictionEvaluationService
{
    public function evaluateForActual(int $businessId, string $targetPeriod, float $actualUsageKwh): int
    {
        $results = PredictionModelResult::whereHas('predictionRun', function ($q) use ($businessId, $targetPeriod) {
            $q->where('business_id', $businessId)->where('target_period', $targetPeriod);
        })
            ->where('status', 'SUCCESS')
            ->whereDoesntHave('evaluation')
            ->get();

        $count = 0;

        foreach ($results as $result) {
            if ($result->predicted_usage_kwh === null) {
                continue;
            }

            $predicted = (float) $result->predicted_usage_kwh;
            $signedError = $predicted - $actualUsageKwh;
            $absoluteError = abs($signedError);
            $squaredError = $signedError * $signedError;
            $ape = $actualUsageKwh > 0
                ? $absoluteError / $actualUsageKwh
                : null;

            PredictionEvaluation::create([
                'prediction_model_result_id' => $result->id,
                'actual_usage_kwh' => $actualUsageKwh,
                'signed_error_kwh' => $signedError,
                'absolute_error_kwh' => $absoluteError,
                'squared_error_kwh' => $squaredError,
                'absolute_percentage_error' => $ape,
                'evaluated_at' => now(),
            ]);

            $count++;
        }

        return $count;
    }
}
