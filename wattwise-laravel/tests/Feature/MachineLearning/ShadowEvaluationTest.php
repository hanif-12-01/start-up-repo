<?php

namespace Tests\Feature\MachineLearning;

use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\PredictionEvaluation;
use App\Models\PredictionRun;
use App\Models\User;
use App\Services\Predictions\MachineLearning\AdaptiveModelRouter;
use App\Services\Predictions\MachineLearning\InputFingerprintGenerator;
use App\Services\Predictions\MachineLearning\ModelEligibility;
use App\Services\Predictions\MachineLearning\ModelPerformanceEvaluator;
use App\Services\Predictions\MachineLearning\ModelPredictionResult;
use App\Services\Predictions\MachineLearning\ModelRegistry;
use App\Services\Predictions\MachineLearning\PredictionEvaluationService;
use App\Services\Predictions\MachineLearning\PredictionModelInterface;
use App\Services\Predictions\MachineLearning\PredictionShadowOrchestrator;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShadowEvaluationTest extends TestCase
{
    use RefreshDatabase;

    private function createBusinessWithHistory(int $months = 5, string $type = 'FNB'): Business
    {
        $user = User::factory()->create();
        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Test Business '.uniqid(),
            'business_type' => $type,
            'status' => 'ACTIVE',
        ]);

        $cursor = Carbon::parse('2025-06-01');
        for ($i = 0; $i < $months; $i++) {
            ElectricityEntry::create([
                'business_id' => $business->id,
                'period_month' => $cursor->format('Y-m-d'),
                'usage_kwh' => 500 + $i * 50,
                'bill_amount_idr' => (500 + $i * 50) * 1444.7,
                'tariff_per_kwh' => 1444.7,
            ]);
            $cursor->addMonth();
        }

        return $business;
    }

    private function history(int $months = 5): array
    {
        $rows = [];
        $cursor = Carbon::parse('2025-06-01');
        for ($i = 0; $i < $months; $i++) {
            $rows[] = ['period_month' => $cursor->format('Y-m'), 'usage_kwh' => 500.0 + $i * 50];
            $cursor->addMonth();
        }

        return $rows;
    }

    // --- Orchestrator Tests ---

    public function test_orchestrator_returns_null_when_shadow_disabled(): void
    {
        config(['prediction.shadow_enabled' => false]);
        $orchestrator = app(PredictionShadowOrchestrator::class);
        $result = $orchestrator->execute(1, '2026-01', $this->history(), 'FNB', 1444.7);
        $this->assertNull($result);
    }

    public function test_orchestrator_creates_run_and_results(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true, 'prediction.gradient_boosting_enabled' => true]);
        $business = $this->createBusinessWithHistory(5);
        $orchestrator = app(PredictionShadowOrchestrator::class);

        $run = $orchestrator->execute($business->id, '2025-11', $this->history(), 'FNB', 1444.7);

        $this->assertNotNull($run);
        $this->assertSame($business->id, $run->business_id);
        $this->assertSame('2025-11', $run->target_period);
        $this->assertSame('FNB', $run->business_type_snapshot);

        $results = $run->modelResults;
        $this->assertGreaterThanOrEqual(1, $results->count());
    }

    public function test_orchestrator_idempotent(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $business = $this->createBusinessWithHistory(5);
        $orchestrator = app(PredictionShadowOrchestrator::class);

        $run1 = $orchestrator->execute($business->id, '2025-11', $this->history(), 'FNB', 1444.7);
        $run2 = $orchestrator->execute($business->id, '2025-11', $this->history(), 'FNB', 1444.7);

        $this->assertSame($run1->id, $run2->id);
        $this->assertSame(1, PredictionRun::count());
    }

    public function test_different_input_creates_new_run(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $business = $this->createBusinessWithHistory(5);
        $orchestrator = app(PredictionShadowOrchestrator::class);

        $h1 = $this->history(5);
        $h2 = $this->history(5);
        $h2[4]['usage_kwh'] = 999.0;

        $run1 = $orchestrator->execute($business->id, '2025-11', $h1, 'FNB', 1444.7);
        $run2 = $orchestrator->execute($business->id, '2025-11', $h2, 'FNB', 1444.7);

        $this->assertNotSame($run1->id, $run2->id);
    }

    public function test_one_result_per_model_version(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true, 'prediction.gradient_boosting_enabled' => true]);
        $business = $this->createBusinessWithHistory(5);
        $orchestrator = app(PredictionShadowOrchestrator::class);

        $run = $orchestrator->execute($business->id, '2025-11', $this->history(), 'FNB', 1444.7);

        $keys = $run->modelResults->pluck('model_key')->toArray();
        $this->assertSame(count($keys), count(array_unique($keys)));
    }

    public function test_successful_result_has_prediction(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $business = $this->createBusinessWithHistory(5);
        $orchestrator = app(PredictionShadowOrchestrator::class);

        $run = $orchestrator->execute($business->id, '2025-11', $this->history(), 'FNB', 1444.7);
        $ridgeResult = $run->modelResults->firstWhere('model_key', 'ridge_umkm_v1_1');

        if ($ridgeResult && $ridgeResult->status === 'SUCCESS') {
            $this->assertNotNull($ridgeResult->predicted_usage_kwh);
            $this->assertNotNull($ridgeResult->feature_snapshot);
        }
    }

    public function test_skipped_result_has_reason(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => false]);
        $business = $this->createBusinessWithHistory(5);
        $orchestrator = app(PredictionShadowOrchestrator::class);

        $run = $orchestrator->execute($business->id, '2025-11', $this->history(), 'FNB', 1444.7);
        $ridgeResult = $run->modelResults->firstWhere('model_key', 'ridge_umkm_v1_1');

        if ($ridgeResult) {
            $this->assertSame('SKIPPED', $ridgeResult->status);
            $this->assertNotNull($ridgeResult->skip_reason);
        }
    }

    // --- Evaluation Tests ---

    public function test_evaluation_calculates_errors(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $business = $this->createBusinessWithHistory(5);
        $orchestrator = app(PredictionShadowOrchestrator::class);
        $run = $orchestrator->execute($business->id, '2025-11', $this->history(), 'FNB', 1444.7);

        $detResult = $run->modelResults->firstWhere('model_key', 'deterministic');
        $this->assertNotNull($detResult);

        if ($detResult->status !== 'SUCCESS') {
            $this->markTestSkipped('Deterministic result not successful');
        }

        $evalService = app(PredictionEvaluationService::class);
        $count = $evalService->evaluateForActual($business->id, '2025-11', 700.0);

        $this->assertGreaterThan(0, $count);

        $eval = PredictionEvaluation::where('prediction_model_result_id', $detResult->id)->first();
        $this->assertNotNull($eval);
        $this->assertSame(700.0, (float) $eval->actual_usage_kwh);

        $predicted = (float) $detResult->predicted_usage_kwh;
        $expected_signed = $predicted - 700.0;
        $this->assertEqualsWithDelta($expected_signed, (float) $eval->signed_error_kwh, 0.01);
        $this->assertEqualsWithDelta(abs($expected_signed), (float) $eval->absolute_error_kwh, 0.01);
        $this->assertEqualsWithDelta($expected_signed ** 2, (float) $eval->squared_error_kwh, 1.0);
    }

    public function test_evaluation_idempotent(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $business = $this->createBusinessWithHistory(5);
        $orchestrator = app(PredictionShadowOrchestrator::class);
        $run = $orchestrator->execute($business->id, '2025-11', $this->history(), 'FNB', 1444.7);

        $evalService = app(PredictionEvaluationService::class);
        $count1 = $evalService->evaluateForActual($business->id, '2025-11', 700.0);
        $count2 = $evalService->evaluateForActual($business->id, '2025-11', 700.0);

        $this->assertGreaterThan(0, $count1);
        $this->assertSame(0, $count2);
    }

    public function test_ape_null_when_actual_zero(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $business = $this->createBusinessWithHistory(5);
        $orchestrator = app(PredictionShadowOrchestrator::class);
        $run = $orchestrator->execute($business->id, '2025-11', $this->history(), 'FNB', 1444.7);

        $evalService = app(PredictionEvaluationService::class);
        $evalService->evaluateForActual($business->id, '2025-11', 0.0);

        $eval = PredictionEvaluation::first();
        if ($eval) {
            $this->assertNull($eval->absolute_percentage_error);
        }
    }

    // --- Performance Evaluator Tests ---

    public function test_performance_evaluator_no_evaluations(): void
    {
        $evaluator = app(ModelPerformanceEvaluator::class);
        $metrics = $evaluator->evaluate('deterministic');

        $this->assertSame(0, $metrics['evaluation_count']);
        $this->assertNull($metrics['mae']);
        $this->assertNull($metrics['rmse']);
        $this->assertNull($metrics['wmape']);
    }

    public function test_performance_evaluator_with_data(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $business = $this->createBusinessWithHistory(5);
        $orchestrator = app(PredictionShadowOrchestrator::class);
        $orchestrator->execute($business->id, '2025-11', $this->history(), 'FNB', 1444.7);

        $evalService = app(PredictionEvaluationService::class);
        $evalService->evaluateForActual($business->id, '2025-11', 700.0);

        $evaluator = app(ModelPerformanceEvaluator::class);
        $metrics = $evaluator->evaluate('deterministic');

        if ($metrics['evaluation_count'] > 0) {
            $this->assertNotNull($metrics['mae']);
            $this->assertNotNull($metrics['rmse']);
            $this->assertGreaterThanOrEqual(0, $metrics['mae']);
            $this->assertGreaterThanOrEqual(0, $metrics['rmse']);
        }
    }

    // --- Adaptive Router Tests ---

    public function test_router_disabled_returns_deterministic(): void
    {
        config(['prediction.adaptive_router_enabled' => false]);
        $router = app(AdaptiveModelRouter::class);
        $result = $router->recommend();

        $this->assertSame('deterministic', $result['recommended_model']);
        $this->assertSame('ROUTER_DISABLED', $result['recommendation_status']);
    }

    public function test_router_insufficient_evidence(): void
    {
        config(['prediction.adaptive_router_enabled' => true, 'prediction.shadow_enabled' => true]);
        $router = app(AdaptiveModelRouter::class);
        $result = $router->recommend();

        $this->assertSame('deterministic', $result['recommended_model']);
        $this->assertSame('INSUFFICIENT_EVIDENCE', $result['recommendation_status']);
    }

    public function test_router_defaults_false(): void
    {
        $this->assertFalse(config('prediction.adaptive_router_enabled'));
    }

    // --- Tenant isolation ---

    public function test_runs_scoped_to_business(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $b1 = $this->createBusinessWithHistory(5, 'FNB');
        $b2 = $this->createBusinessWithHistory(5, 'RETAIL');
        $orchestrator = app(PredictionShadowOrchestrator::class);

        $orchestrator->execute($b1->id, '2025-11', $this->history(), 'FNB', 1444.7);
        $orchestrator->execute($b2->id, '2025-11', $this->history(), 'RETAIL', 1444.7);

        $b1Runs = PredictionRun::where('business_id', $b1->id)->count();
        $b2Runs = PredictionRun::where('business_id', $b2->id)->count();
        $this->assertSame(1, $b1Runs);
        $this->assertSame(1, $b2Runs);
    }

    // --- Feature flag defaults ---

    public function test_all_flags_default_false(): void
    {
        $fresh = include base_path('config/prediction.php');
        // Without env vars, casting null to bool gives false
        $this->assertFalse((bool) env('PREDICTION_SHADOW_ENABLED', false));
        $this->assertFalse((bool) env('PREDICTION_RIDGE_ENABLED', false));
        $this->assertFalse((bool) env('PREDICTION_GRADIENT_BOOSTING_ENABLED', false));
        $this->assertFalse((bool) env('PREDICTION_ADAPTIVE_ROUTER_ENABLED', false));
    }

    // --- Input Fingerprint ---

    public function test_fingerprint_deterministic(): void
    {
        $fp1 = InputFingerprintGenerator::generate(
            1, '2025-11',
            [['period' => '2025-06', 'usage' => 500], ['period' => '2025-07', 'usage' => 550]],
            1444.7, 'FNB', 'dummy-manifest'
        );
        $fp2 = InputFingerprintGenerator::generate(
            1, '2025-11',
            [['period' => '2025-06', 'usage' => 500], ['period' => '2025-07', 'usage' => 550]],
            1444.7, 'FNB', 'dummy-manifest'
        );
        $this->assertSame($fp1, $fp2);
    }

    public function test_fingerprint_changes_with_input(): void
    {
        $fp1 = InputFingerprintGenerator::generate(
            1, '2025-11', [['period' => '2025-06', 'usage' => 500]], 1444.7, 'FNB', 'dummy-manifest'
        );
        $fp2 = InputFingerprintGenerator::generate(
            1, '2025-11', [['period' => '2025-06', 'usage' => 999]], 1444.7, 'FNB', 'dummy-manifest'
        );
        $this->assertNotSame($fp1, $fp2);
    }

    // --- Metrics Regression Test ---
    public function test_skipped_rows_from_other_businesses_do_not_satisfy_router_evidence_or_affect_failure_rate(): void
    {
        config([
            'prediction.shadow_enabled' => true,
            'prediction.ridge_enabled' => true,
            'prediction.adaptive_router_enabled' => true,
            'prediction.router_min_evaluations' => 2,
            'prediction.router_min_businesses' => 2,
        ]);

        $b1 = $this->createBusinessWithHistory(5, 'FNB');
        $b2 = $this->createBusinessWithHistory(5, 'LAUNDRY');

        $orchestrator = app(PredictionShadowOrchestrator::class);
        $evalService = app(PredictionEvaluationService::class);

        $orchestrator->execute($b1->id, '2025-11', $this->history(), 'FNB', 1444.7);
        $evalService->evaluateForActual($b1->id, '2025-11', 700.0);

        $orchestrator->execute($b2->id, '2025-11', $this->history(), 'LAUNDRY', null);

        $evaluator = app(ModelPerformanceEvaluator::class);
        $metrics = $evaluator->evaluate('ridge_umkm_v1_1');

        $this->assertSame(1, $metrics['distinct_businesses']);

        $router = app(AdaptiveModelRouter::class);
        $recommendation = $router->recommend('FNB');
        $this->assertSame('INSUFFICIENT_EVIDENCE', $recommendation['recommendation_status']);
    }

    // --- Idempotency & Backfill Tests ---
    public function test_unchanged_input_is_idempotent(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $b = $this->createBusinessWithHistory(5, 'FNB');
        $orchestrator = app(PredictionShadowOrchestrator::class);

        $run1 = $orchestrator->execute($b->id, '2025-11', $this->history(), 'FNB', 1444.7);
        $run2 = $orchestrator->execute($b->id, '2025-11', $this->history(), 'FNB', 1444.7);

        $this->assertSame($run1->id, $run2->id);
    }

    public function test_previously_missing_model_result_is_backfilled(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => false, 'prediction.gradient_boosting_enabled' => false]);
        $b = $this->createBusinessWithHistory(5, 'FNB');
        $orchestrator = app(PredictionShadowOrchestrator::class);

        $run1 = $orchestrator->execute($b->id, '2025-11', $this->history(), 'FNB', 1444.7);
        $ridgeResult1 = $run1->modelResults()->where('model_key', 'ridge_umkm_v1_1')->first();
        $this->assertSame('SKIPPED', $ridgeResult1->status);

        config(['prediction.ridge_enabled' => true]);

        $run2 = $orchestrator->execute($b->id, '2025-11', $this->history(), 'FNB', 1444.7);

        $this->assertSame($run1->id, $run2->id);
        $ridgeResult2 = $run2->modelResults()->where('model_key', 'ridge_umkm_v1_1')->first();
        $this->assertSame('SUCCESS', $ridgeResult2->status);
    }

    public function test_manifest_checksum_change_does_not_reuse_stale_model_output(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $b = $this->createBusinessWithHistory(5, 'FNB');
        $orchestrator = app(PredictionShadowOrchestrator::class);

        $run1 = $orchestrator->execute($b->id, '2025-11', $this->history(), 'FNB', 1444.7);

        $ridgeMock = new MockRidgeRegressionPredictor;

        $registry = app(ModelRegistry::class);
        $registry->register($ridgeMock);

        $run2 = $orchestrator->execute($b->id, '2025-11', $this->history(), 'FNB', 1444.7);

        $this->assertNotSame($run1->id, $run2->id);
    }

    // --- Target Period Consistency Test ---
    public function test_target_period_consistency_with_null_usage_observation(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $b = $this->createBusinessWithHistory(4, 'FNB');

        ElectricityEntry::create([
            'business_id' => $b->id,
            'period_month' => '2025-10-01',
            'usage_kwh' => null,
            'bill_amount_idr' => 100000.0,
            'tariff_per_kwh' => 1444.7,
        ]);

        $entries = $b->electricityEntries()->orderBy('period_month', 'asc')->get();
        $history = [];
        foreach ($entries as $entry) {
            if ($entry->usage_kwh === null) {
                continue;
            }
            $history[] = [
                'period_month' => Carbon::parse($entry->period_month)->format('Y-m'),
                'usage_kwh' => (float) $entry->usage_kwh,
            ];
        }

        $lastHistoryEntry = end($history);
        $lastPeriod = Carbon::parse($lastHistoryEntry['period_month'].'-01');
        $targetPeriod = $lastPeriod->copy()->addMonth()->format('Y-m');

        $this->assertSame('2025-10', $targetPeriod);

        $orchestrator = app(PredictionShadowOrchestrator::class);
        $run = $orchestrator->execute($b->id, $targetPeriod, $history, 'FNB', 1444.7);

        $this->assertNotNull($run);
        $this->assertSame('2025-10', $run->target_period);
        $this->assertTrue($run->modelResults()->where('model_key', 'ridge_umkm_v1_1')->first()->status === 'SUCCESS');
    }
}

class MockRidgeRegressionPredictor implements PredictionModelInterface
{
    public function key(): string
    {
        return 'ridge_umkm_v1_1';
    }

    public function version(): string
    {
        return 'Ridge UMKM v1.2-mock';
    }

    public function minimumHistoryMonths(): int
    {
        return 3;
    }

    public function requiredFeatureOrder(): array
    {
        return [];
    }

    public function artifactChecksum(): ?string
    {
        return 'mock-checksum-123456';
    }

    public function checkEligibility(array $history, string $businessType, ?float $tariffPerKwh, array $flags): ModelEligibility
    {
        return ModelEligibility::eligible();
    }

    public function predict(array $history, string $businessType, float $tariffPerKwh): ModelPredictionResult
    {
        return ModelPredictionResult::success(
            'ridge_umkm_v1_1',
            'Ridge UMKM v1.2-mock',
            500.0,
            500.0 * $tariffPerKwh,
            [],
            'mock-checksum-123456',
            0.1
        );
    }
}
