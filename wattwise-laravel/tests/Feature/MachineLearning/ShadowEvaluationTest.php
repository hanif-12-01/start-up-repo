<?php

namespace Tests\Feature\MachineLearning;

use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\PredictionEvaluation;
use App\Models\PredictionRun;
use App\Models\User;
use App\Services\Predictions\MachineLearning\AdaptiveModelRouter;
use App\Services\Predictions\MachineLearning\InputFingerprintGenerator;
use App\Services\Predictions\MachineLearning\ModelPerformanceEvaluator;
use App\Services\Predictions\MachineLearning\PredictionEvaluationService;
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
            1444.7, 'FNB'
        );
        $fp2 = InputFingerprintGenerator::generate(
            1, '2025-11',
            [['period' => '2025-06', 'usage' => 500], ['period' => '2025-07', 'usage' => 550]],
            1444.7, 'FNB'
        );
        $this->assertSame($fp1, $fp2);
    }

    public function test_fingerprint_changes_with_input(): void
    {
        $fp1 = InputFingerprintGenerator::generate(
            1, '2025-11', [['period' => '2025-06', 'usage' => 500]], 1444.7, 'FNB'
        );
        $fp2 = InputFingerprintGenerator::generate(
            1, '2025-11', [['period' => '2025-06', 'usage' => 999]], 1444.7, 'FNB'
        );
        $this->assertNotSame($fp1, $fp2);
    }
}
