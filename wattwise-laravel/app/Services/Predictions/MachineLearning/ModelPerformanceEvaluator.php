<?php

declare(strict_types=1);

namespace App\Services\Predictions\MachineLearning;

use App\Models\PredictionEvaluation;
use App\Models\PredictionModelResult;

final class ModelPerformanceEvaluator
{
    /**
     * @return array{
     *   model_key: string,
     *   model_version: string,
     *   evaluation_count: int,
     *   distinct_businesses: int,
     *   mae: float|null,
     *   rmse: float|null,
     *   wmape: float|null,
     *   mean_signed_error: float|null,
     *   overprediction_rate: float|null,
     *   underprediction_rate: float|null,
     *   eligibility_count: int,
     *   skipped_count: int,
     *   failure_count: int,
     *   failure_rate: float|null,
     * }
     */
    public function evaluate(
        string $modelKey,
        ?string $modelVersion = null,
        ?string $businessType = null,
        ?string $historyBucket = null,
        ?string $fromPeriod = null,
        ?string $toPeriod = null,
    ): array {
        $resultQuery = PredictionModelResult::where('model_key', $modelKey);
        if ($modelVersion !== null) {
            $resultQuery->where('model_version', $modelVersion);
        }

        if ($businessType !== null || $historyBucket !== null || $fromPeriod !== null || $toPeriod !== null) {
            $resultQuery->whereHas('predictionRun', function ($q) use ($businessType, $historyBucket, $fromPeriod, $toPeriod) {
                if ($businessType !== null) {
                    $q->where('business_type_snapshot', $businessType);
                }
                if ($historyBucket !== null) {
                    $q->where('history_bucket', $historyBucket);
                }
                if ($fromPeriod !== null) {
                    $q->where('target_period', '>=', $fromPeriod);
                }
                if ($toPeriod !== null) {
                    $q->where('target_period', '<=', $toPeriod);
                }
            });
        }

        $totalResults = (clone $resultQuery)->count();
        $successCount = (clone $resultQuery)->where('status', 'SUCCESS')->count();
        $skippedCount = (clone $resultQuery)->where('status', 'SKIPPED')->count();
        $failureCount = (clone $resultQuery)->where('status', 'FAILED')->count();

        $failureRate = $totalResults > 0
            ? $failureCount / $totalResults
            : null;

        $distinctBusinesses = (clone $resultQuery)
            ->join('prediction_runs', 'prediction_model_results.prediction_run_id', '=', 'prediction_runs.id')
            ->distinct()
            ->count('prediction_runs.business_id');

        $evalQuery = PredictionEvaluation::whereHas('modelResult', function ($q) use ($modelKey, $modelVersion, $businessType, $historyBucket, $fromPeriod, $toPeriod) {
            $q->where('model_key', $modelKey);
            if ($modelVersion !== null) {
                $q->where('model_version', $modelVersion);
            }
            if ($businessType !== null || $historyBucket !== null || $fromPeriod !== null || $toPeriod !== null) {
                $q->whereHas('predictionRun', function ($rq) use ($businessType, $historyBucket, $fromPeriod, $toPeriod) {
                    if ($businessType !== null) {
                        $rq->where('business_type_snapshot', $businessType);
                    }
                    if ($historyBucket !== null) {
                        $rq->where('history_bucket', $historyBucket);
                    }
                    if ($fromPeriod !== null) {
                        $rq->where('target_period', '>=', $fromPeriod);
                    }
                    if ($toPeriod !== null) {
                        $rq->where('target_period', '<=', $toPeriod);
                    }
                });
            }
        });

        $evaluations = $evalQuery->get();
        $evalCount = $evaluations->count();

        if ($evalCount === 0) {
            return $this->buildResult($modelKey, $modelVersion, 0, $distinctBusinesses, null, null, null, null, null, null, $totalResults, $skippedCount, $failureCount, $failureRate);
        }

        $sumAbsError = 0.0;
        $sumSquaredError = 0.0;
        $sumSignedError = 0.0;
        $sumAbsActual = 0.0;
        $sumAbsPredicted = 0.0;
        $overCount = 0;
        $underCount = 0;

        foreach ($evaluations as $eval) {
            $sumAbsError += (float) $eval->absolute_error_kwh;
            $sumSquaredError += (float) $eval->squared_error_kwh;
            $sumSignedError += (float) $eval->signed_error_kwh;
            $sumAbsActual += abs((float) $eval->actual_usage_kwh);

            $predicted = (float) $eval->modelResult->predicted_usage_kwh;
            $sumAbsPredicted += abs($predicted - (float) $eval->actual_usage_kwh);

            if ((float) $eval->signed_error_kwh > 0) {
                $overCount++;
            } elseif ((float) $eval->signed_error_kwh < 0) {
                $underCount++;
            }
        }

        $mae = $sumAbsError / $evalCount;
        $rmse = sqrt($sumSquaredError / $evalCount);
        $wmape = $sumAbsActual > 0 ? $sumAbsError / $sumAbsActual : null;
        $bias = $sumSignedError / $evalCount;
        $overRate = $overCount / $evalCount;
        $underRate = $underCount / $evalCount;

        return $this->buildResult($modelKey, $modelVersion, $evalCount, $distinctBusinesses, $mae, $rmse, $wmape, $bias, $overRate, $underRate, $totalResults, $skippedCount, $failureCount, $failureRate);
    }

    private function buildResult(
        string $modelKey,
        ?string $modelVersion,
        int $evalCount,
        int $distinctBusinesses,
        ?float $mae,
        ?float $rmse,
        ?float $wmape,
        ?float $bias,
        ?float $overRate,
        ?float $underRate,
        int $eligibilityCount,
        int $skippedCount,
        int $failureCount,
        ?float $failureRate,
    ): array {
        return [
            'model_key' => $modelKey,
            'model_version' => $modelVersion,
            'evaluation_count' => $evalCount,
            'distinct_businesses' => $distinctBusinesses,
            'mae' => $mae !== null ? round($mae, 4) : null,
            'rmse' => $rmse !== null ? round($rmse, 4) : null,
            'wmape' => $wmape !== null ? round($wmape, 6) : null,
            'mean_signed_error' => $bias !== null ? round($bias, 4) : null,
            'overprediction_rate' => $overRate !== null ? round($overRate, 4) : null,
            'underprediction_rate' => $underRate !== null ? round($underRate, 4) : null,
            'eligibility_count' => $eligibilityCount,
            'skipped_count' => $skippedCount,
            'failure_count' => $failureCount,
            'failure_rate' => $failureRate !== null ? round($failureRate, 4) : null,
        ];
    }
}
