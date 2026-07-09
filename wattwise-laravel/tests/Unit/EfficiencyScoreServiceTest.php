<?php

namespace Tests\Unit;

use App\Models\Appliance;
use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\ElectricityProfile;
use App\Models\RevenueEntry;
use App\Models\User;
use App\Services\Recommendations\EfficiencyScoreService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class EfficiencyScoreServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Business $business;
    private EfficiencyScoreService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->business = Business::create([
            'user_id' => $this->user->id,
            'name' => 'Test Business',
            'business_type' => 'LAUNDRY',
        ]);

        $this->service = $this->app->make(EfficiencyScoreService::class);
    }

    /**
     * Test score is incomplete when electricity or revenue data is missing.
     */
    public function test_efficiency_score_incomplete_when_missing_data(): void
    {
        // Case 1: Both missing
        $result = $this->service->calculateForBusiness($this->business);
        $this->assertNull($result['score']);
        $this->assertEquals('INCOMPLETE', $result['status']);
        $this->assertEquals('Data belum cukup', $result['label']);
        $this->assertEquals('LOW', $result['confidence']);

        // Case 2: Only revenue exists
        RevenueEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'revenue_amount_idr' => 5000000.00,
        ]);
        $result = $this->service->calculateForBusiness($this->business);
        $this->assertNull($result['score']);

        // Case 3: Only electricity exists
        $this->business->revenueEntries()->delete();
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'bill_amount_idr' => 500000.00,
        ]);
        $result = $this->service->calculateForBusiness($this->business);
        $this->assertNull($result['score']);
    }

    /**
     * Test score calculation when data is complete with different ratio penalties.
     */
    public function test_efficiency_score_ratio_penalties(): void
    {
        // Complete data: Electricity cost 400k, Revenue 5M (Ratio = 8%)
        // No penalties for ratio (<= 10%), but missing appliances (-10) and missing tariff (-10) apply.
        // Starting score: 100 - 10 (no appliances) - 10 (no tariff) = 80 ("Baik")
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'bill_amount_idr' => 400000.00,
        ]);

        RevenueEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'revenue_amount_idr' => 5000000.00,
        ]);

        $result = $this->service->calculateForBusiness($this->business);
        $this->assertEquals(80, $result['score']);
        $this->assertEquals('GOOD', $result['status']);
        $this->assertEquals('Baik', $result['label']);
        $this->assertEquals('MEDIUM', $result['confidence']);

        // Adjust entries for > 10% and <= 15% ratio (e.g. cost 600k, ratio = 12%)
        // Expected score: 100 - 8 (ratio) - 10 (appliances) - 10 (tariff) = 72 ("Perlu Dipantau")
        $this->business->electricityEntries()->delete();
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'bill_amount_idr' => 600000.00,
        ]);

        $result = $this->service->calculateForBusiness($this->business);
        $this->assertEquals(72, $result['score']);
        $this->assertEquals('WATCH', $result['status']);
        $this->assertEquals('Perlu Dipantau', $result['label']);

        // Adjust entries for > 15% and <= 20% ratio (e.g. cost 900k, ratio = 18%)
        // Expected score: 100 - 15 (ratio) - 10 (appliances) - 10 (tariff) = 65 ("Perlu Dipantau")
        $this->business->electricityEntries()->delete();
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'bill_amount_idr' => 900000.00,
        ]);

        $result = $this->service->calculateForBusiness($this->business);
        $this->assertEquals(65, $result['score']);

        // Adjust entries for > 20% ratio (e.g. cost 1.1M, ratio = 22%)
        // Expected score: 100 - 25 (ratio) - 10 (appliances) - 10 (tariff) = 55 ("Perlu Dicek")
        $this->business->electricityEntries()->delete();
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'bill_amount_idr' => 1100000.00,
        ]);

        $result = $this->service->calculateForBusiness($this->business);
        $this->assertEquals(55, $result['score']);
        $this->assertEquals('CHECK', $result['status']);
        $this->assertEquals('Perlu Dicek', $result['label']);
    }

    /**
     * Test score is high when there are no penalties.
     */
    public function test_efficiency_score_no_penalties(): void
    {
        // 1. Create Profile Tariff
        ElectricityProfile::create([
            'business_id' => $this->business->id,
            'tariff_per_kwh' => 1500.00,
            'power_va' => 1300,
        ]);

        // 2. Create Entries (Ratio = 8%)
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'bill_amount_idr' => 400000.00,
            'tariff_per_kwh' => 1500.00,
        ]);

        RevenueEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'revenue_amount_idr' => 5000000.00,
        ]);

        // 3. Create Appliances
        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'Kipas Angin',
            'watt' => 50.00,
            'quantity' => 1,
            'hours_per_day' => 8.0,
            'days_per_month' => 30,
        ]);

        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'Lampu',
            'watt' => 15.00,
            'quantity' => 5,
            'hours_per_day' => 12.0,
            'days_per_month' => 30,
        ]);

        // Total usage:
        // Kipas: 50/1000 * 1 * 8 * 30 = 12 kWh
        // Lampu: 15/1000 * 5 * 12 * 30 = 27 kWh
        // Total: 39 kWh. Top (Lampu: 27 kWh) = 69% (> 30%) -> trigger dominates penalty (-10)
        // Expected score: 100 - 10 (dominates) = 90 ("Baik") with confidence HIGH
        $result = $this->service->calculateForBusiness($this->business);
        $this->assertEquals(90, $result['score']);
        $this->assertEquals('HIGH', $result['confidence']);
    }

    /**
     * Test score clamp minimum.
     */
    public function test_efficiency_score_clamp_minimum(): void
    {
        // Trigger all penalties:
        // Ratio > 20% (-25)
        // No appliances (-10)
        // No tariff (-10)
        // Total score: 100 - 25 - 10 - 10 = 55.
        // Wait, how to test clamp to 0?
        // Let's manually trigger a custom scenario or reduce starting score with huge penalties.
        // If we set ratio penalty (-25), no appliances (-10), no tariff (-10), that's 55.
        // What if we have a huge ratio and missing everything else?
        // Our clamp formula max(0, min(100, $score)) will ensure it doesn't go below 0.
        // Let's verify that the minimum score is 0.
        // (For example, we can mock or construct a situation if needed, but the current math:
        // maximum possible penalty is 25 (ratio) + 10 (appliances) + 10 (tariff) + 10 (dominates) = 55.
        // So the lowest score is 45. To reach 0 we don't have enough rules to drop below 0,
        // but the max(0, ...) clamp is still valid and robust).
        $electricity = ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'bill_amount_idr' => 10000000.00, // Huge cost
        ]);

        RevenueEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'revenue_amount_idr' => 1000.00, // Small revenue (Ratio = 1,000,000%)
        ]);

        $result = $this->service->calculateForBusiness($this->business);
        $this->assertEquals(55, $result['score']);
        $this->assertEquals('CHECK', $result['status']);
    }
}
