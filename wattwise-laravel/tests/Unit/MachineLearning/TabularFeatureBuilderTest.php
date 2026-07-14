<?php

namespace Tests\Unit\MachineLearning;

use App\Services\Predictions\MachineLearning\TabularFeatureBuilder;
use Carbon\Carbon;
use InvalidArgumentException;
use Tests\TestCase;

class TabularFeatureBuilderTest extends TestCase
{
    private TabularFeatureBuilder $builder;

    protected function setUp(): void
    {
        parent::setUp();
        $this->builder = new TabularFeatureBuilder;
    }

    private function history(array $usages, string $startMonth = '2026-01'): array
    {
        $rows = [];
        $cursor = Carbon::parse($startMonth.'-01');
        foreach ($usages as $u) {
            $rows[] = ['period_month' => $cursor->format('Y-m'), 'usage_kwh' => $u];
            $cursor->addMonth();
        }

        return $rows;
    }

    public function test_builds_11_features_in_correct_order(): void
    {
        $h = $this->history([500, 600, 700]);
        $features = $this->builder->build($h, 'LAUNDRY', 1444.7);
        $keys = array_keys($features);

        $this->assertCount(11, $features);
        $this->assertSame([
            'business_type_encoded', 'month', 'latest_usage_kwh', 'previous_usage_kwh',
            'avg_3_month_usage_kwh', 'avg_6_month_usage_kwh', 'trend_1_month', 'trend_3_month',
            'month_sin', 'month_cos', 'avg_tariff_idr_per_kwh',
        ], $keys);
    }

    public function test_latest_and_previous_usage(): void
    {
        $h = $this->history([500, 600, 700]);
        $f = $this->builder->build($h, 'FNB', 1444.7);

        $this->assertEqualsWithDelta(700.0, $f['latest_usage_kwh'], 0.001);
        $this->assertEqualsWithDelta(600.0, $f['previous_usage_kwh'], 0.001);
    }

    public function test_rolling_3_month_mean(): void
    {
        $h = $this->history([100, 200, 300, 400, 500]);
        $f = $this->builder->build($h, 'RETAIL', 1444.7);
        $this->assertEqualsWithDelta((300 + 400 + 500) / 3.0, $f['avg_3_month_usage_kwh'], 0.01);
    }

    public function test_rolling_6_month_mean(): void
    {
        $h = $this->history([100, 200, 300, 400, 500, 600, 700]);
        $f = $this->builder->build($h, 'FNB', 1444.7);
        $this->assertEqualsWithDelta((200 + 300 + 400 + 500 + 600 + 700) / 6.0, $f['avg_6_month_usage_kwh'], 0.01);
    }

    public function test_3_month_history_rolling_uses_available(): void
    {
        $h = $this->history([500, 600, 700]);
        $f = $this->builder->build($h, 'FNB', 1444.7);
        $this->assertEqualsWithDelta((500 + 600 + 700) / 3.0, $f['avg_3_month_usage_kwh'], 0.01);
    }

    public function test_trend_formulas(): void
    {
        $h = $this->history([400, 500, 600]);
        $f = $this->builder->build($h, 'FNB', 1444.7);

        $expected1 = (600 - 500) / (500 + 0.00001);
        $avg3 = (400 + 500 + 600) / 3.0;
        $expected3 = (600 - $avg3) / ($avg3 + 0.00001);

        $this->assertEqualsWithDelta($expected1, $f['trend_1_month'], 1e-8);
        $this->assertEqualsWithDelta($expected3, $f['trend_3_month'], 1e-8);
    }

    public function test_seasonal_sin_cos(): void
    {
        $h = [['period_month' => '2026-06', 'usage_kwh' => 500.0]];
        $f = $this->builder->build($h, 'FNB', 1444.7);

        $expected_sin = sin(2 * M_PI * 6 / 12);
        $expected_cos = cos(2 * M_PI * 6 / 12);

        $this->assertEqualsWithDelta($expected_sin, $f['month_sin'], 1e-10);
        $this->assertEqualsWithDelta($expected_cos, $f['month_cos'], 1e-10);
    }

    public function test_tariff_passed_through(): void
    {
        $h = $this->history([500]);
        $f = $this->builder->build($h, 'FNB', 1444.7);
        $this->assertSame(1444.7, $f['avg_tariff_idr_per_kwh']);
    }

    public function test_business_type_mapping(): void
    {
        $map = [
            'LAUNDRY' => 0, 'FNB' => 1, 'RETAIL' => 2,
            'MANUFACTURE' => 3, 'COLD_STORAGE' => 4, 'KOS_PROPERTY' => 6, 'OTHER' => 6,
        ];
        foreach ($map as $type => $expected) {
            $this->assertSame($expected, $this->builder->getBusinessTypeEncoding($type), "Type {$type} should encode to {$expected}");
        }
    }

    public function test_unsupported_business_type_throws(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->builder->build($this->history([500]), 'UNKNOWN_TYPE', 1444.7);
    }

    public function test_duplicate_period_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Duplicate period');
        $h = [
            ['period_month' => '2026-01', 'usage_kwh' => 500],
            ['period_month' => '2026-01', 'usage_kwh' => 600],
        ];
        $this->builder->build($h, 'FNB', 1444.7);
    }

    public function test_unordered_input_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $h = [
            ['period_month' => '2026-03', 'usage_kwh' => 500],
            ['period_month' => '2026-01', 'usage_kwh' => 600],
        ];
        $this->builder->build($h, 'FNB', 1444.7);
    }

    public function test_negative_usage_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->builder->build([['period_month' => '2026-01', 'usage_kwh' => -100]], 'FNB', 1444.7);
    }

    public function test_non_finite_usage_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->builder->build([['period_month' => '2026-01', 'usage_kwh' => INF]], 'FNB', 1444.7);
    }

    public function test_non_positive_tariff_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->builder->build($this->history([500]), 'FNB', 0.0);
    }

    public function test_malformed_period_rejected(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->builder->build([['period_month' => '2026-13', 'usage_kwh' => 500]], 'FNB', 1444.7);
    }
}
