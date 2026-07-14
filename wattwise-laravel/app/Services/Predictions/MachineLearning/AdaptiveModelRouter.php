<?php

declare(strict_types=1);

namespace App\Services\Predictions\MachineLearning;

final class AdaptiveModelRouter
{
    public function __construct(
        private readonly ModelPerformanceEvaluator $evaluator,
        private readonly ModelRegistry $registry,
    ) {}

    /**
     * @return array{
     *   recommended_model: string,
     *   recommendation_status: string,
     *   cohort: array{business_type: ?string, history_bucket: ?string},
     *   evidence_counts: array{evaluations: int, businesses: int},
     *   compared_metrics: array<string, array>,
     *   rejection_reasons: array<string, string>,
     *   generated_at: string,
     * }
     */
    public function recommend(
        ?string $businessType = null,
        ?string $historyBucket = null,
    ): array {
        $generated = now()->toIso8601String();
        $cohort = ['business_type' => $businessType, 'history_bucket' => $historyBucket];

        if (! config('prediction.adaptive_router_enabled', false)) {
            return $this->result('deterministic', 'ROUTER_DISABLED', $cohort, [], [], [], $generated);
        }

        $minEvaluations = (int) config('prediction.router_min_evaluations', 12);
        $minBusinesses = (int) config('prediction.router_min_businesses', 3);
        $maxFailureRate = (float) config('prediction.router_max_failure_rate', 0.05);

        $baselineMetrics = $this->evaluator->evaluate('deterministic', null, $businessType, $historyBucket);

        if ($baselineMetrics['evaluation_count'] < $minEvaluations) {
            return $this->result('deterministic', 'INSUFFICIENT_EVIDENCE', $cohort, [
                'evaluations' => $baselineMetrics['evaluation_count'],
                'businesses' => $baselineMetrics['distinct_businesses'],
            ], ['deterministic' => $baselineMetrics], [], $generated);
        }

        $candidates = [];
        $rejections = [];
        $allMetrics = ['deterministic' => $baselineMetrics];

        foreach ($this->registry->all() as $model) {
            if ($model->key() === 'deterministic') {
                continue;
            }

            $status = $this->registry->getStatus($model->key());
            if ($status === 'DISABLED' || $status === 'BLOCKED_ARTIFACT_INCOMPLETE') {
                $rejections[$model->key()] = 'MODEL_HEALTH_BLOCKED';

                continue;
            }

            $metrics = $this->evaluator->evaluate($model->key(), null, $businessType, $historyBucket);
            $allMetrics[$model->key()] = $metrics;

            if ($metrics['evaluation_count'] < $minEvaluations) {
                $rejections[$model->key()] = 'INSUFFICIENT_EVIDENCE';

                continue;
            }

            if ($metrics['distinct_businesses'] < $minBusinesses) {
                $rejections[$model->key()] = 'INSUFFICIENT_BUSINESSES';

                continue;
            }

            if ($metrics['failure_rate'] !== null && $metrics['failure_rate'] > $maxFailureRate) {
                $rejections[$model->key()] = 'FAILURE_RATE_EXCEEDED';

                continue;
            }

            $candidates[] = $model->key();
        }

        if (empty($candidates)) {
            $status = empty($rejections) ? 'NO_ELIGIBLE_CHALLENGER' : 'BASELINE_RECOMMENDED';

            return $this->result('deterministic', $status, $cohort, [
                'evaluations' => $baselineMetrics['evaluation_count'],
                'businesses' => $baselineMetrics['distinct_businesses'],
            ], $allMetrics, $rejections, $generated);
        }

        usort($candidates, function (string $a, string $b) use ($allMetrics) {
            $ma = $allMetrics[$a];
            $mb = $allMetrics[$b];

            $cmp = ($ma['wmape'] ?? PHP_FLOAT_MAX) <=> ($mb['wmape'] ?? PHP_FLOAT_MAX);
            if ($cmp !== 0) {
                return $cmp;
            }

            $cmp = ($ma['mae'] ?? PHP_FLOAT_MAX) <=> ($mb['mae'] ?? PHP_FLOAT_MAX);
            if ($cmp !== 0) {
                return $cmp;
            }

            $cmp = abs($ma['mean_signed_error'] ?? PHP_FLOAT_MAX) <=> abs($mb['mean_signed_error'] ?? PHP_FLOAT_MAX);
            if ($cmp !== 0) {
                return $cmp;
            }

            return ($ma['failure_rate'] ?? 1.0) <=> ($mb['failure_rate'] ?? 1.0);
        });

        $best = $candidates[0];
        $bestMetrics = $allMetrics[$best];

        $baseWmape = $baselineMetrics['wmape'];
        $bestWmape = $bestMetrics['wmape'];

        if ($baseWmape !== null && $bestWmape !== null && $bestWmape < $baseWmape) {
            return $this->result($best, 'CHALLENGER_RECOMMENDED', $cohort, [
                'evaluations' => $bestMetrics['evaluation_count'],
                'businesses' => $bestMetrics['distinct_businesses'],
            ], $allMetrics, $rejections, $generated);
        }

        return $this->result('deterministic', 'BASELINE_RECOMMENDED', $cohort, [
            'evaluations' => $baselineMetrics['evaluation_count'],
            'businesses' => $baselineMetrics['distinct_businesses'],
        ], $allMetrics, $rejections, $generated);
    }

    private function result(
        string $recommended,
        string $status,
        array $cohort,
        array $evidenceCounts,
        array $comparedMetrics,
        array $rejections,
        string $generated,
    ): array {
        return [
            'recommended_model' => $recommended,
            'recommendation_status' => $status,
            'cohort' => $cohort,
            'evidence_counts' => $evidenceCounts,
            'compared_metrics' => $comparedMetrics,
            'rejection_reasons' => $rejections,
            'generated_at' => $generated,
        ];
    }
}
