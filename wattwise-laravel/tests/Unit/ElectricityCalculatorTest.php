<?php

namespace Tests\Unit;

use App\Services\Electricity\ElectricityCalculator;
use InvalidArgumentException;
use Tests\TestCase;

class ElectricityCalculatorTest extends TestCase
{
    private ElectricityCalculator $calculator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->calculator = new ElectricityCalculator();
    }

    public function test_calculate_usage_from_meter_success()
    {
        $usage = $this->calculator->calculateUsageFromMeter(100.50, 250.75);
        $this->assertEquals(150.25, $usage);
    }

    public function test_calculate_usage_from_meter_returns_null_if_inputs_null()
    {
        $this->assertNull($this->calculator->calculateUsageFromMeter(null, 250.75));
        $this->assertNull($this->calculator->calculateUsageFromMeter(100.50, null));
        $this->assertNull($this->calculator->calculateUsageFromMeter(null, null));
    }

    public function test_calculate_usage_from_meter_throws_exception_if_end_less_than_start()
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('Meter end cannot be less than meter start.');

        $this->calculator->calculateUsageFromMeter(200.00, 150.00);
    }

    public function test_estimate_bill_amount_success()
    {
        $bill = $this->calculator->estimateBillAmount(150, 1500.50);
        $this->assertEquals(225075.0, $bill);
    }

    public function test_estimate_bill_amount_returns_null_if_inputs_null()
    {
        $this->assertNull($this->calculator->estimateBillAmount(null, 1500.50));
        $this->assertNull($this->calculator->estimateBillAmount(150, null));
        $this->assertNull($this->calculator->estimateBillAmount(null, null));
    }

    public function test_calculate_electricity_revenue_ratio_success()
    {
        $ratio = $this->calculator->calculateElectricityRevenueRatio(150000, 1500000);
        $this->assertEquals(10.0, $ratio);
    }

    public function test_calculate_electricity_revenue_ratio_returns_null_if_inputs_null_or_invalid()
    {
        $this->assertNull($this->calculator->calculateElectricityRevenueRatio(null, 1500000));
        $this->assertNull($this->calculator->calculateElectricityRevenueRatio(150000, null));
        $this->assertNull($this->calculator->calculateElectricityRevenueRatio(150000, 0));
        $this->assertNull($this->calculator->calculateElectricityRevenueRatio(150000, -1000));
    }

    public function test_calculate_remaining_revenue_after_electricity_success()
    {
        $remaining = $this->calculator->calculateRemainingRevenueAfterElectricity(1500000, 150000);
        $this->assertEquals(1350000.0, $remaining);
    }

    public function test_calculate_remaining_revenue_after_electricity_returns_null_if_inputs_null()
    {
        $this->assertNull($this->calculator->calculateRemainingRevenueAfterElectricity(null, 150000));
        $this->assertNull($this->calculator->calculateRemainingRevenueAfterElectricity(1500000, null));
    }
}
