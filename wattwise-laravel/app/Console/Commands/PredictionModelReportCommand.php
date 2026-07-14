<?php

declare(strict_types=1);

namespace App\Console\Commands;

use App\Services\Predictions\MachineLearning\ModelPerformanceEvaluator;
use App\Services\Predictions\MachineLearning\ModelRegistry;
use Illuminate\Console\Command;

class PredictionModelReportCommand extends Command
{
    protected $signature = 'wattwise:prediction-model-report
        {--model= : Filter by model key}
        {--business-type= : Filter by business type}
        {--history-bucket= : Filter by history bucket}
        {--from= : From period (YYYY-MM)}
        {--to= : To period (YYYY-MM)}
        {--json : Output as JSON}';

    protected $description = 'Display aggregate prediction model performance metrics';

    public function handle(ModelPerformanceEvaluator $evaluator, ModelRegistry $registry): int
    {
        $modelFilter = $this->option('model');
        $businessType = $this->option('business-type');
        $historyBucket = $this->option('history-bucket');
        $from = $this->option('from');
        $to = $this->option('to');
        $asJson = $this->option('json');

        $models = $modelFilter
            ? [$modelFilter]
            : array_map(fn ($m) => $m->key(), $registry->all());

        $results = [];

        foreach ($models as $modelKey) {
            $metrics = $evaluator->evaluate($modelKey, null, $businessType, $historyBucket, $from, $to);
            $results[$modelKey] = $metrics;
        }

        if ($asJson) {
            $this->line(json_encode($results, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

            return self::SUCCESS;
        }

        foreach ($results as $key => $m) {
            $this->newLine();
            $this->info("=== {$key} ===");
            $this->table(
                ['Metric', 'Value'],
                [
                    ['Evaluations', $m['evaluation_count']],
                    ['Distinct Businesses', $m['distinct_businesses']],
                    ['MAE (kWh)', $m['mae'] ?? 'N/A'],
                    ['RMSE (kWh)', $m['rmse'] ?? 'N/A'],
                    ['wMAPE', $m['wmape'] ?? 'N/A'],
                    ['Bias (kWh)', $m['mean_signed_error'] ?? 'N/A'],
                    ['Overprediction Rate', $m['overprediction_rate'] ?? 'N/A'],
                    ['Underprediction Rate', $m['underprediction_rate'] ?? 'N/A'],
                    ['Total Results', $m['eligibility_count']],
                    ['Skipped', $m['skipped_count']],
                    ['Failures', $m['failure_count']],
                    ['Failure Rate', $m['failure_rate'] ?? 'N/A'],
                ],
            );
        }

        return self::SUCCESS;
    }
}
