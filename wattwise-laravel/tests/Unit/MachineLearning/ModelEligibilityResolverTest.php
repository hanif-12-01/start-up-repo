<?php

namespace Tests\Unit\MachineLearning;

use App\Services\Electricity\ElectricityCalculator;
use App\Services\Predictions\MachineLearning\DeterministicPredictionAdapter;
use App\Services\Predictions\MachineLearning\ModelEligibilityResolver;
use App\Services\Predictions\MachineLearning\RidgeRegressionPredictor;
use App\Services\Predictions\PredictionService;
use Carbon\Carbon;
use Tests\TestCase;

class ModelEligibilityResolverTest extends TestCase
{
    private ModelEligibilityResolver $resolver;

    protected function setUp(): void
    {
        parent::setUp();
        $this->resolver = new ModelEligibilityResolver;
    }

    private function history(int $months): array
    {
        $rows = [];
        $cursor = Carbon::parse('2025-01-01');
        for ($i = 0; $i < $months; $i++) {
            $rows[] = ['period_month' => $cursor->format('Y-m'), 'usage_kwh' => 500.0 + $i * 10];
            $cursor->addMonth();
        }

        return $rows;
    }

    public function test_shadow_disabled_blocks_ml_models(): void
    {
        config(['prediction.shadow_enabled' => false]);
        $ridge = new RidgeRegressionPredictor;
        $e = $this->resolver->resolve($ridge, $this->history(5), 'FNB', 1444.7);
        $this->assertFalse($e->eligible);
        $this->assertSame('SHADOW_DISABLED', $e->skipReason);
    }

    public function test_shadow_disabled_allows_deterministic(): void
    {
        config(['prediction.shadow_enabled' => false]);
        $det = new DeterministicPredictionAdapter(new PredictionService(new ElectricityCalculator));
        $e = $this->resolver->resolve($det, $this->history(3), 'FNB', 1444.7);
        $this->assertTrue($e->eligible);
    }

    public function test_model_disabled_blocks(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => false]);
        $ridge = new RidgeRegressionPredictor;
        $e = $this->resolver->resolve($ridge, $this->history(5), 'FNB', 1444.7);
        $this->assertFalse($e->eligible);
        $this->assertSame('MODEL_DISABLED', $e->skipReason);
    }

    public function test_model_enabled_passes_through(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $ridge = new RidgeRegressionPredictor;
        $e = $this->resolver->resolve($ridge, $this->history(5), 'FNB', 1444.7);
        $this->assertTrue($e->eligible);
    }

    public function test_history_buckets(): void
    {
        $this->assertSame('M01_02', ModelEligibilityResolver::calculateHistoryBucket(1));
        $this->assertSame('M01_02', ModelEligibilityResolver::calculateHistoryBucket(2));
        $this->assertSame('M03_05', ModelEligibilityResolver::calculateHistoryBucket(3));
        $this->assertSame('M03_05', ModelEligibilityResolver::calculateHistoryBucket(5));
        $this->assertSame('M06_11', ModelEligibilityResolver::calculateHistoryBucket(6));
        $this->assertSame('M06_11', ModelEligibilityResolver::calculateHistoryBucket(11));
        $this->assertSame('M12_23', ModelEligibilityResolver::calculateHistoryBucket(12));
        $this->assertSame('M12_23', ModelEligibilityResolver::calculateHistoryBucket(23));
        $this->assertSame('M24_PLUS', ModelEligibilityResolver::calculateHistoryBucket(24));
        $this->assertSame('M24_PLUS', ModelEligibilityResolver::calculateHistoryBucket(36));
    }

    public function test_zero_history_ineligible(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $ridge = new RidgeRegressionPredictor;
        $e = $this->resolver->resolve($ridge, [], 'FNB', 1444.7);
        $this->assertFalse($e->eligible);
    }

    public function test_missing_tariff_ineligible(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $ridge = new RidgeRegressionPredictor;
        $e = $this->resolver->resolve($ridge, $this->history(5), 'FNB', null);
        $this->assertFalse($e->eligible);
    }

    public function test_unsupported_business_type(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $ridge = new RidgeRegressionPredictor;
        $e = $this->resolver->resolve($ridge, $this->history(5), 'UNKNOWN_BUSINESS', 1444.7);
        $this->assertFalse($e->eligible);
        $this->assertSame('UNSUPPORTED_BUSINESS_TYPE', $e->skipReason);
    }

    public function test_consecutive_months_jan_feb_mar_eligible(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $ridge = new RidgeRegressionPredictor;
        $history = [
            ['period_month' => '2026-01', 'usage_kwh' => 500.0],
            ['period_month' => '2026-02', 'usage_kwh' => 550.0],
            ['period_month' => '2026-03', 'usage_kwh' => 600.0],
        ];
        $e = $this->resolver->resolve($ridge, $history, 'FNB', 1444.7);
        $this->assertTrue($e->eligible);
    }

    public function test_consecutive_months_year_boundary_eligible(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $ridge = new RidgeRegressionPredictor;
        $history = [
            ['period_month' => '2025-11', 'usage_kwh' => 500.0],
            ['period_month' => '2025-12', 'usage_kwh' => 550.0],
            ['period_month' => '2026-01', 'usage_kwh' => 600.0],
        ];
        $e = $this->resolver->resolve($ridge, $history, 'FNB', 1444.7);
        $this->assertTrue($e->eligible);
    }

    public function test_consecutive_months_gaps_ineligible(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $ridge = new RidgeRegressionPredictor;
        $history = [
            ['period_month' => '2026-01', 'usage_kwh' => 500.0],
            ['period_month' => '2026-03', 'usage_kwh' => 550.0],
            ['period_month' => '2026-04', 'usage_kwh' => 600.0],
        ];
        $e = $this->resolver->resolve($ridge, $history, 'FNB', 1444.7);
        $this->assertFalse($e->eligible);
        $this->assertSame('HISTORY_HAS_GAPS', $e->skipReason);
    }

    public function test_consecutive_months_duplicate_period_ineligible(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $ridge = new RidgeRegressionPredictor;
        $history = [
            ['period_month' => '2026-01', 'usage_kwh' => 500.0],
            ['period_month' => '2026-01', 'usage_kwh' => 550.0],
            ['period_month' => '2026-02', 'usage_kwh' => 600.0],
        ];
        $e = $this->resolver->resolve($ridge, $history, 'FNB', 1444.7);
        $this->assertFalse($e->eligible);
        $this->assertSame('DUPLICATE_PERIOD', $e->skipReason);
    }

    public function test_consecutive_months_reversed_history_ineligible(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $ridge = new RidgeRegressionPredictor;
        $history = [
            ['period_month' => '2026-02', 'usage_kwh' => 500.0],
            ['period_month' => '2026-01', 'usage_kwh' => 550.0],
            ['period_month' => '2026-03', 'usage_kwh' => 600.0],
        ];
        $e = $this->resolver->resolve($ridge, $history, 'FNB', 1444.7);
        $this->assertFalse($e->eligible);
        $this->assertSame('CHRONOLOGICAL_ORDER_FAILURE', $e->skipReason);
    }

    public function test_consecutive_months_gaps_outside_latest_calculation_window_ineligible(): void
    {
        config(['prediction.shadow_enabled' => true, 'prediction.ridge_enabled' => true]);
        $ridge = new RidgeRegressionPredictor;
        $history = [
            ['period_month' => '2025-01', 'usage_kwh' => 400.0],
            ['period_month' => '2025-03', 'usage_kwh' => 450.0],
            ['period_month' => '2025-04', 'usage_kwh' => 500.0],
            ['period_month' => '2025-05', 'usage_kwh' => 550.0],
            ['period_month' => '2025-06', 'usage_kwh' => 600.0],
            ['period_month' => '2025-07', 'usage_kwh' => 650.0],
            ['period_month' => '2025-08', 'usage_kwh' => 700.0],
            ['period_month' => '2025-09', 'usage_kwh' => 750.0],
        ];
        $e = $this->resolver->resolve($ridge, $history, 'FNB', 1444.7);
        $this->assertFalse($e->eligible);
        $this->assertSame('HISTORY_HAS_GAPS', $e->skipReason);
    }
}
