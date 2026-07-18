<?php

namespace App\Services\Demo;

use App\Models\Business;
use App\Models\PredictionRun;
use App\Models\User;
use App\Services\Predictions\MachineLearning\ModelRegistry;
use App\Services\Predictions\MachineLearning\PredictionShadowOrchestrator;
use App\Support\DemoAccount;
use Carbon\Carbon;
use RuntimeException;

final class DemoMlValidationService
{
    public function __construct(
        private readonly PredictionShadowOrchestrator $orchestrator,
        private readonly ModelRegistry $registry,
    ) {}

    /**
     * Build auditable evidence for all five demo scenarios.
     *
     * @return array<string, mixed>
     */
    public function summarize(User $user): array
    {
        $registeredModels = array_map(
            fn ($model): array => [
                'key' => $model->key(),
                'version' => $model->version(),
                'execution_status' => $this->registry->getStatus($model->key()),
                'artifact_sha256' => $model->artifactChecksum(),
            ],
            $this->registry->all(),
        );
        $registeredKeys = array_column($registeredModels, 'key');

        $scenarios = [];
        foreach (DemoAccount::ML_SCENARIOS as $scenarioKey => $definition) {
            /** @var Business|null $business */
            $business = $user->businesses()
                ->where('name', $definition['business_name'])
                ->first();

            if ($business === null) {
                $scenarios[] = [
                    'scenario_key' => $scenarioKey,
                    'business_id' => null,
                    'business_name' => $definition['business_name'],
                    'business_type' => $definition['business_type'],
                    'configured_history_months' => $definition['history_months'],
                    'actual_history_months' => 0,
                    'expected_phase' => $definition['expected_phase'],
                    'detected_phase' => null,
                    'expected_model_key' => $definition['expected_model_key'],
                    'expected_model_label' => $definition['expected_model_label'],
                    'expected_model_registered' => in_array($definition['expected_model_key'], $registeredKeys, true),
                    'phase_match' => false,
                    'history_match' => false,
                    'proof_status' => 'MISSING_BUSINESS',
                    'latest_run' => null,
                    'model_results' => [],
                ];

                continue;
            }

            $actualHistoryMonths = $business->electricityEntries()
                ->whereNotNull('usage_kwh')
                ->count();
            $detectedPhase = self::phaseForMonths($actualHistoryMonths);

            /** @var PredictionRun|null $latestRun */
            $latestRun = PredictionRun::query()
                ->with(['modelResults' => fn ($query) => $query->orderBy('model_key')])
                ->where('business_id', $business->id)
                ->orderByDesc('generated_at')
                ->orderByDesc('id')
                ->first();

            $modelResults = $latestRun?->modelResults
                ->map(fn ($result): array => [
                    'model_key' => $result->model_key,
                    'model_version' => $result->model_version,
                    'execution_mode' => $result->execution_mode,
                    'status' => $result->status,
                    'predicted_usage_kwh' => $result->predicted_usage_kwh !== null
                        ? (float) $result->predicted_usage_kwh
                        : null,
                    'predicted_bill_idr' => $result->predicted_bill_idr !== null
                        ? (float) $result->predicted_bill_idr
                        : null,
                    'duration_ms' => $result->duration_ms !== null
                        ? (float) $result->duration_ms
                        : null,
                    'artifact_sha256' => $result->artifact_sha256,
                    'skip_reason' => $result->skip_reason,
                    'failure_code' => $result->failure_code,
                ])
                ->values()
                ->all() ?? [];

            $expectedModelRegistered = in_array($definition['expected_model_key'], $registeredKeys, true);
            $expectedResult = $latestRun?->modelResults
                ->firstWhere('model_key', $definition['expected_model_key']);

            $scenarios[] = [
                'scenario_key' => $scenarioKey,
                'business_id' => $business->id,
                'business_name' => $business->name,
                'business_type' => $business->business_type,
                'configured_history_months' => $definition['history_months'],
                'actual_history_months' => $actualHistoryMonths,
                'expected_phase' => $definition['expected_phase'],
                'detected_phase' => $detectedPhase,
                'expected_model_key' => $definition['expected_model_key'],
                'expected_model_label' => $definition['expected_model_label'],
                'expected_model_registered' => $expectedModelRegistered,
                'phase_match' => $detectedPhase === $definition['expected_phase'],
                'history_match' => $actualHistoryMonths === (int) $definition['history_months'],
                'proof_status' => $this->proofStatus(
                    $detectedPhase === $definition['expected_phase'],
                    $expectedModelRegistered,
                    $actualHistoryMonths,
                    $latestRun,
                    $expectedResult?->status,
                ),
                'latest_run' => $latestRun === null ? null : [
                    'id' => $latestRun->id,
                    'target_period' => $latestRun->target_period,
                    'history_bucket' => $latestRun->history_bucket,
                    'generated_at' => $latestRun->generated_at?->toIso8601String(),
                ],
                'model_results' => $modelResults,
            ];
        }

        $successfulScenarios = count(array_filter(
            $scenarios,
            fn (array $scenario): bool => $scenario['proof_status'] === 'SUCCESS',
        ));

        $missingPortfolioModels = array_values(array_unique(array_map(
            fn (array $scenario): string => $scenario['expected_model_key'],
            array_filter(
                $scenarios,
                fn (array $scenario): bool => ! $scenario['expected_model_registered'],
            ),
        )));

        return [
            'demoAccount' => [
                'email' => DemoAccount::EMAIL,
                'scenario_count' => count(DemoAccount::ML_SCENARIOS),
            ],
            'flags' => [
                'demo_enabled' => DemoAccount::enabled(),
                'ml_validation_enabled' => DemoAccount::mlValidationEnabled(),
                'shadow_enabled' => (bool) config('prediction.shadow_enabled', false),
                'ridge_enabled' => (bool) config('prediction.ridge_enabled', false),
                'gradient_boosting_enabled' => (bool) config('prediction.gradient_boosting_enabled', false),
                'adaptive_router_enabled' => (bool) config('prediction.adaptive_router_enabled', false),
            ],
            'registeredModels' => $registeredModels,
            'scenarios' => $scenarios,
            'summary' => [
                'successful_scenarios' => $successfulScenarios,
                'total_scenarios' => count($scenarios),
                'missing_portfolio_models' => $missingPortfolioModels,
                'new_portfolio_fully_integrated' => $missingPortfolioModels === [] && $successfulScenarios === count($scenarios),
            ],
        ];
    }

    /**
     * Execute the currently registered shadow models for all demo scenarios that
     * have history. H00 remains a serving-contract case because the existing
     * orchestrator intentionally rejects an empty history.
     *
     * @return array{processed: int, skipped: int, errors: array<int, string>}
     */
    public function run(User $user): array
    {
        if (! config('prediction.shadow_enabled', false)) {
            throw new RuntimeException('Shadow evaluation is disabled. Enable PREDICTION_SHADOW_ENABLED in local/staging first.');
        }

        $report = [
            'processed' => 0,
            'skipped' => 0,
            'errors' => [],
        ];

        foreach (DemoAccount::ML_SCENARIOS as $definition) {
            /** @var Business|null $business */
            $business = $user->businesses()
                ->with('electricityProfile')
                ->where('name', $definition['business_name'])
                ->first();

            if ($business === null) {
                $report['errors'][] = 'Missing demo business: '.$definition['business_name'];
                continue;
            }

            $entries = $business->electricityEntries()
                ->whereNotNull('usage_kwh')
                ->orderBy('period_month')
                ->get();

            $history = $entries
                ->map(fn ($entry): array => [
                    'period_month' => Carbon::parse($entry->period_month)->format('Y-m'),
                    'usage_kwh' => (float) $entry->usage_kwh,
                ])
                ->values()
                ->all();

            if ($history === []) {
                $report['skipped']++;
                continue;
            }

            try {
                $tariff = $business->electricityProfile?->tariff_per_kwh !== null
                    ? (float) $business->electricityProfile->tariff_per_kwh
                    : null;

                if ($tariff === null) {
                    $latestWithTariff = $entries->whereNotNull('tariff_per_kwh')->last();
                    $tariff = $latestWithTariff !== null
                        ? (float) $latestWithTariff->tariff_per_kwh
                        : null;
                }

                $lastHistory = $history[array_key_last($history)];
                $targetPeriod = Carbon::parse($lastHistory['period_month'].'-01')
                    ->addMonth()
                    ->format('Y-m');

                $run = $this->orchestrator->execute(
                    $business->id,
                    $targetPeriod,
                    $history,
                    $business->business_type ?? 'OTHER',
                    $tariff,
                    'demo_ml_validation',
                );

                if ($run === null) {
                    $report['skipped']++;
                } else {
                    $report['processed']++;
                }
            } catch (\Throwable $exception) {
                $report['errors'][] = $business->name.': '.$exception->getMessage();
            }
        }

        return $report;
    }

    public static function phaseForMonths(int $months): string
    {
        return match (true) {
            $months === 0 => 'H00',
            $months <= 2 => 'H01_02',
            $months <= 5 => 'H03_05',
            $months <= 12 => 'H06_12',
            default => 'H13_PLUS',
        };
    }

    private function proofStatus(
        bool $phaseMatches,
        bool $expectedModelRegistered,
        int $historyMonths,
        ?PredictionRun $latestRun,
        ?string $expectedResultStatus,
    ): string {
        if (! $phaseMatches) {
            return 'PHASE_MISMATCH';
        }

        if (! $expectedModelRegistered) {
            return 'PORTFOLIO_MODEL_NOT_REGISTERED';
        }

        if ($historyMonths === 0) {
            return 'H00_SERVING_CONTRACT_REQUIRED';
        }

        if ($latestRun === null) {
            return 'WAITING_FOR_SHADOW_RUN';
        }

        if ($expectedResultStatus === null) {
            return 'EXPECTED_MODEL_RESULT_MISSING';
        }

        return $expectedResultStatus;
    }
}
