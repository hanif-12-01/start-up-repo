<?php

namespace Tests\Unit;

use App\Services\Electricity\ElectricityCalculator;
use App\Services\Predictions\PredictionService;
use Carbon\Carbon;
use Tests\TestCase;

class PredictionServiceTest extends TestCase
{
    private PredictionService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new PredictionService(new ElectricityCalculator());
    }

    /**
     * Build consecutive-month history rows starting at $startMonth.
     *
     * @param array<int, float|null> $usages
     */
    private function history(array $usages, string $startMonth = '2026-01', ?float $tariff = 1000.0): array
    {
        $rows = [];
        $cursor = Carbon::parse($startMonth . '-01');

        foreach ($usages as $usage) {
            $rows[] = [
                'period_month' => $cursor->format('Y-m'),
                'usage_kwh' => $usage,
                'bill_amount_idr' => ($usage !== null && $tariff !== null) ? $usage * $tariff : null,
                'tariff_per_kwh' => $tariff,
            ];
            $cursor->addMonth();
        }

        return $rows;
    }

    /**
     * Build history from explicit period => usage pairs (for gap testing).
     *
     * @param array<string, float|null> $pairs
     */
    private function historyWithPeriods(array $pairs, ?float $tariff = 1000.0): array
    {
        $rows = [];
        foreach ($pairs as $period => $usage) {
            $rows[] = [
                'period_month' => $period,
                'usage_kwh' => $usage,
                'bill_amount_idr' => ($usage !== null && $tariff !== null) ? $usage * $tariff : null,
                'tariff_per_kwh' => $tariff,
            ];
        }

        return $rows;
    }

    /** Recursively assert every numeric value in the result is finite (no NaN/Infinity). */
    private function assertAllFinite(array $result): void
    {
        array_walk_recursive($result, function ($value) {
            if (is_float($value)) {
                $this->assertTrue(is_finite($value), 'Result contains a non-finite float.');
            }
        });
    }

    // ---------------------------------------------------------------------
    // 1. No data
    // ---------------------------------------------------------------------

    public function test_no_data_returns_no_prediction(): void
    {
        $result = $this->service->predict([], 1000.0);

        $this->assertFalse($result['has_prediction']);
        $this->assertNull($result['predicted_usage_kwh']);
        $this->assertNull($result['estimated_bill_idr']);
        $this->assertNull($result['change_percent']);
        $this->assertNull($result['risk_level']);
        $this->assertNull($result['confidence_level']);
        $this->assertNull($result['method_label']);
        $this->assertSame([], $result['possible_causes']);
        $this->assertSame([], $result['chart_data']);
        $this->assertTrue($result['data_requirements']['needs_more_data']);
        $this->assertSame(0, $result['data_requirements']['history_months']);
    }

    // ---------------------------------------------------------------------
    // 2. One month — baseline only, low confidence
    // ---------------------------------------------------------------------

    public function test_one_month_returns_baseline_with_low_confidence(): void
    {
        $result = $this->service->predict($this->history([800]), 1000.0);

        $this->assertTrue($result['has_prediction']);
        $this->assertEqualsWithDelta(800.0, $result['predicted_usage_kwh'], 0.01);
        $this->assertEqualsWithDelta(800.0, $result['previous_usage_kwh'], 0.01);
        $this->assertSame(PredictionService::METHOD_ADAPTIVE, $result['method_label']);
        $this->assertSame(PredictionService::CONFIDENCE_LOW, $result['confidence_level']);
        $this->assertEqualsWithDelta(800000.0, $result['estimated_bill_idr'], 0.01);
        $this->assertAllFinite($result);
    }

    // ---------------------------------------------------------------------
    // 3. Two months — basic trend, low confidence
    // ---------------------------------------------------------------------

    public function test_two_months_returns_basic_trend_with_low_confidence(): void
    {
        $result = $this->service->predict($this->history([800, 900]), 1000.0);

        $this->assertTrue($result['has_prediction']);
        // 2 * 900 - 800 = 1000
        $this->assertEqualsWithDelta(1000.0, $result['predicted_usage_kwh'], 0.01);
        $this->assertSame(PredictionService::METHOD_PATTERN, $result['method_label']);
        $this->assertSame(PredictionService::CONFIDENCE_LOW, $result['confidence_level']);
        $this->assertAllFinite($result);
    }

    // ---------------------------------------------------------------------
    // 4. Three months — hybrid moving average + trend, medium confidence
    // ---------------------------------------------------------------------

    public function test_three_months_uses_hybrid_method(): void
    {
        $result = $this->service->predict($this->history([800, 810, 805]), 1000.0);

        $this->assertTrue($result['has_prediction']);
        $this->assertSame(PredictionService::METHOD_HYBRID, $result['method_label']);
        $this->assertSame(PredictionService::CONFIDENCE_MEDIUM, $result['confidence_level']);
        // 0.75*810 + 0.25*805.8333 = 808.96
        $this->assertEqualsWithDelta(808.96, $result['predicted_usage_kwh'], 0.01);
        $this->assertAllFinite($result);
    }

    // ---------------------------------------------------------------------
    // 5. Increasing trend
    // ---------------------------------------------------------------------

    public function test_increasing_trend_predicts_upward(): void
    {
        $result = $this->service->predict($this->history([700, 800, 900]), 1000.0);

        $this->assertGreaterThan($result['previous_usage_kwh'], $result['predicted_usage_kwh']);
        $this->assertGreaterThan(0.0, $result['change_percent']);
        $this->assertAllFinite($result);
    }

    // ---------------------------------------------------------------------
    // 6. Decreasing trend
    // ---------------------------------------------------------------------

    public function test_decreasing_trend_predicts_downward(): void
    {
        $result = $this->service->predict($this->history([900, 800, 700]), 1000.0);

        $this->assertLessThan($result['previous_usage_kwh'], $result['predicted_usage_kwh']);
        $this->assertLessThan(0.0, $result['change_percent']);
        $this->assertSame(PredictionService::RISK_LOW, $result['risk_level']);
        $this->assertAllFinite($result);
    }

    // ---------------------------------------------------------------------
    // 7. Stable trend
    // ---------------------------------------------------------------------

    public function test_stable_trend_has_low_risk_and_near_zero_change(): void
    {
        $result = $this->service->predict($this->history([800, 800, 800]), 1000.0);

        $this->assertEqualsWithDelta(800.0, $result['predicted_usage_kwh'], 0.01);
        $this->assertEqualsWithDelta(0.0, $result['change_percent'], 0.01);
        $this->assertSame(PredictionService::RISK_LOW, $result['risk_level']);
        $this->assertAllFinite($result);
    }

    // ---------------------------------------------------------------------
    // 8. Zero values — no division by zero, no NaN/Infinity
    // ---------------------------------------------------------------------

    public function test_zero_values_do_not_divide_by_zero(): void
    {
        $result = $this->service->predict($this->history([0, 0, 0]), 1000.0);

        $this->assertTrue($result['has_prediction']);
        $this->assertEqualsWithDelta(0.0, $result['predicted_usage_kwh'], 0.01);
        $this->assertNull($result['change_percent']); // previous usage is 0 => undefined change
        $this->assertSame(PredictionService::RISK_LOW, $result['risk_level']);
        $this->assertAllFinite($result);
    }

    public function test_trailing_zero_month_is_safe(): void
    {
        $result = $this->service->predict($this->history([500, 0]), 1000.0);

        $this->assertTrue($result['has_prediction']);
        $this->assertNull($result['change_percent']); // divides by previous usage 0 => null
        $this->assertGreaterThanOrEqual(0.0, $result['predicted_usage_kwh']); // never negative
        $this->assertAllFinite($result);
    }

    // ---------------------------------------------------------------------
    // 9. Missing tariff — no Rupiah estimate, usage still predicted
    // ---------------------------------------------------------------------

    public function test_missing_tariff_prevents_rupiah_estimate(): void
    {
        $result = $this->service->predict($this->history([800, 850, 900], '2026-01', null), null);

        $this->assertTrue($result['has_prediction']);
        $this->assertNotNull($result['predicted_usage_kwh']);
        $this->assertNull($result['estimated_bill_idr']);
        $this->assertNull($result['previous_bill_idr']);
        $this->assertFalse($result['data_requirements']['has_tariff']);
        $this->assertAllFinite($result);
    }

    // ---------------------------------------------------------------------
    // 10. Skipped months — gap detected, confidence reduced
    // ---------------------------------------------------------------------

    public function test_skipped_months_reduce_confidence(): void
    {
        // Missing 2026-03 between 02 and 04.
        $history = $this->historyWithPeriods([
            '2026-01' => 800,
            '2026-02' => 820,
            '2026-04' => 900,
        ]);

        $result = $this->service->predict($history, 1000.0);

        $this->assertTrue($result['data_requirements']['has_gaps']);
        $this->assertSame(1, $result['data_requirements']['gap_months']);
        // 3 months would be Sedang; a gap drops it to Rendah.
        $this->assertSame(PredictionService::CONFIDENCE_LOW, $result['confidence_level']);
        $this->assertAllFinite($result);
    }

    // ---------------------------------------------------------------------
    // 11. High volatility — confidence reduced despite enough months
    // ---------------------------------------------------------------------

    public function test_high_volatility_reduces_confidence(): void
    {
        $result = $this->service->predict($this->history([300, 1200, 400]), 1000.0);

        // 3 clean months would be Sedang; high volatility drops it to Rendah.
        $this->assertSame(PredictionService::CONFIDENCE_LOW, $result['confidence_level']);
        $this->assertFalse($result['data_requirements']['has_gaps']);
        $this->assertAllFinite($result);
    }

    // ---------------------------------------------------------------------
    // 12. Confidence calculation across depths
    // ---------------------------------------------------------------------

    public function test_confidence_scales_with_history_depth(): void
    {
        $one = $this->service->predict($this->history([800]), 1000.0);
        $two = $this->service->predict($this->history([800, 810]), 1000.0);
        $three = $this->service->predict($this->history([800, 810, 805]), 1000.0);
        $six = $this->service->predict($this->history([800, 810, 805, 808, 802, 806]), 1000.0);

        $this->assertSame(PredictionService::CONFIDENCE_LOW, $one['confidence_level']);
        $this->assertSame(PredictionService::CONFIDENCE_LOW, $two['confidence_level']);
        $this->assertSame(PredictionService::CONFIDENCE_MEDIUM, $three['confidence_level']);
        $this->assertSame(PredictionService::CONFIDENCE_HIGH, $six['confidence_level']);
    }

    // ---------------------------------------------------------------------
    // 13. Deterministic repeatability
    // ---------------------------------------------------------------------

    public function test_identical_inputs_produce_identical_outputs(): void
    {
        $history = $this->history([700, 800, 850, 900]);

        $first = $this->service->predict($history, 1444.70, true);
        $second = $this->service->predict($history, 1444.70, true);

        $this->assertEquals($first, $second);
        $this->assertSame(json_encode($first), json_encode($second));
    }

    // ---------------------------------------------------------------------
    // Deterministic risk classification (LOW / MEDIUM / HIGH)
    // ---------------------------------------------------------------------

    public function test_risk_classification_is_deterministic(): void
    {
        $low = $this->service->predict($this->history([800, 800, 800]), 1000.0);
        $medium = $this->service->predict($this->history([700, 800, 900]), 1000.0);
        $high = $this->service->predict($this->history([500, 900, 1300]), 1000.0);

        $this->assertSame(PredictionService::RISK_LOW, $low['risk_level']);
        $this->assertSame(PredictionService::RISK_MEDIUM, $medium['risk_level']);
        $this->assertSame(PredictionService::RISK_HIGH, $high['risk_level']);
    }

    // ---------------------------------------------------------------------
    // Possible causes — safe wording only, and detailed-analysis lock
    // ---------------------------------------------------------------------

    public function test_possible_causes_use_only_safe_wording(): void
    {
        $forbidden = [
            'penyebab pasti',
            'alat rusak',
            'kebocoran listrik terdeteksi',
            'AI memastikan',
            'sensor membaca',
        ];

        $cases = [
            $this->service->predict($this->history([500, 900, 1300]), 1000.0), // high risk
            $this->service->predict($this->history([800, 800, 800]), 1000.0),   // low risk
        ];

        foreach ($cases as $result) {
            $this->assertNotEmpty($result['possible_causes']);
            $joined = implode(' ', $result['possible_causes']);
            foreach ($forbidden as $phrase) {
                $this->assertStringNotContainsStringIgnoringCase($phrase, $joined);
            }
        }

        // High-risk causes must use the approved framing.
        $high = $this->service->predict($this->history([500, 900, 1300]), 1000.0);
        $joinedHigh = implode(' ', $high['possible_causes']);
        $this->assertStringContainsString('Kemungkinan penyebab yang perlu dicek', $joinedHigh);
        $this->assertStringContainsString('Perlu Verifikasi Manual', $joinedHigh);
        $this->assertStringContainsString('Berdasarkan data input', $joinedHigh);
    }

    public function test_detailed_analysis_lock_redacts_possible_causes(): void
    {
        $locked = $this->service->predict($this->history([500, 900, 1300]), 1000.0, false);
        $unlocked = $this->service->predict($this->history([500, 900, 1300]), 1000.0, true);

        $this->assertTrue($locked['is_detailed_analysis_locked']);
        $this->assertSame([], $locked['possible_causes']);

        $this->assertFalse($unlocked['is_detailed_analysis_locked']);
        $this->assertNotEmpty($unlocked['possible_causes']);

        // Summary numbers remain available even when detail is locked.
        $this->assertNotNull($locked['predicted_usage_kwh']);
        $this->assertSame($unlocked['predicted_usage_kwh'], $locked['predicted_usage_kwh']);
    }

    // ---------------------------------------------------------------------
    // Chart data shape
    // ---------------------------------------------------------------------

    public function test_chart_data_includes_actuals_and_one_prediction(): void
    {
        $result = $this->service->predict($this->history([800, 810, 805], '2026-01'), 1000.0);

        $chart = $result['chart_data'];
        $this->assertCount(4, $chart); // 3 actual + 1 predicted
        $this->assertSame('predicted', $chart[3]['type']);
        $this->assertSame('2026-04', $chart[3]['period_month']); // next month after 2026-03
        $this->assertSame('actual', $chart[0]['type']);
    }
}
