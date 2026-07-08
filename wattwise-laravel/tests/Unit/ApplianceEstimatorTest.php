<?php

namespace Tests\Unit;

use App\Services\Appliances\ApplianceEstimator;
use Tests\TestCase;

class ApplianceEstimatorTest extends TestCase
{
    private ApplianceEstimator $estimator;

    protected function setUp(): void
    {
        parent::setUp();
        $this->estimator = new ApplianceEstimator();
    }

    /**
     * Test monthly kWh calculation.
     */
    public function test_monthly_kwh_calculation(): void
    {
        // Formula: watt / 1000 * quantity * hours_per_day * days_per_month
        // Example: 350W, quantity 2, 8 hours/day, 30 days/month
        // Calculation: 350 / 1000 * 2 * 8 * 30 = 0.35 * 2 * 8 * 30 = 168.0 kWh
        $kwh = $this->estimator->estimateMonthlyKwh(350.0, 2, 8.0, 30);
        $this->assertEquals(168.0, $kwh);
    }

    /**
     * Test monthly cost calculation.
     */
    public function test_monthly_cost_calculation(): void
    {
        // Formula: monthly_kwh * tariff_per_kwh
        // Example: 168.0 kWh * 1500.0 tariff
        // Calculation: 168.0 * 1500.0 = 252000.0
        $cost = $this->estimator->estimateMonthlyCost(168.0, 1500.0);
        $this->assertEquals(252000.0, $cost);
    }

    /**
     * Test null returning when required inputs are missing.
     */
    public function test_null_when_required_input_missing(): void
    {
        // kWh estimate missing inputs
        $this->assertNull($this->estimator->estimateMonthlyKwh(null, 1, 8.0, 30));
        $this->assertNull($this->estimator->estimateMonthlyKwh(350.0, null, 8.0, 30));
        $this->assertNull($this->estimator->estimateMonthlyKwh(350.0, 1, null, 30));
        $this->assertNull($this->estimator->estimateMonthlyKwh(350.0, 1, 8.0, null));
        $this->assertNull($this->estimator->estimateMonthlyKwh(null, null, null, null));

        // Cost estimate missing inputs
        $this->assertNull($this->estimator->estimateMonthlyCost(null, 1500.0));
        $this->assertNull($this->estimator->estimateMonthlyCost(168.0, null));
        $this->assertNull($this->estimator->estimateMonthlyCost(null, null));
    }

    /**
     * Test name normalization.
     */
    public function test_name_normalization(): void
    {
        $this->assertEquals('ac kamar', $this->estimator->normalizeApplianceName('AC Kamar'));
        $this->assertEquals('kipas angin', $this->estimator->normalizeApplianceName('  Kipas Angin  '));
        $this->assertEquals('pompa air', $this->estimator->normalizeApplianceName('Pompa   Air'));
        $this->assertEquals('rice cooker', $this->estimator->normalizeApplianceName('rice cooker'));
    }

    /**
     * Test ranking reason detection.
     */
    public function test_ranking_reason_calculation(): void
    {
        $this->assertEquals('Daya besar', $this->estimator->getRankingReason(350.0, 1, 4.0));
        $this->assertEquals('Jam pakai lama', $this->estimator->getRankingReason(100.0, 1, 10.0));
        $this->assertEquals('Jumlah unit banyak', $this->estimator->getRankingReason(50.0, 4, 4.0));
        $this->assertEquals('Daya besar', $this->estimator->getRankingReason(null, null, null));
    }

    /**
     * Test potential cost saving estimation.
     */
    public function test_potential_saving_calculation(): void
    {
        // 350W, quantity 2, 30 days/month, 1500 tariff per kWh
        // Saving: (350 / 1000) * 2 * 1.0 * 30 * 1500 = 0.70 * 30 * 1500 = 31,500 IDR
        $saving = $this->estimator->estimatePotentialSaving(350.0, 2, 30, 1500.0);
        $this->assertEquals(31500.0, $saving);

        // Missing inputs return null
        $this->assertNull($this->estimator->estimatePotentialSaving(null, 2, 30, 1500.0));
        $this->assertNull($this->estimator->estimatePotentialSaving(350.0, null, 30, 1500.0));
    }
}
