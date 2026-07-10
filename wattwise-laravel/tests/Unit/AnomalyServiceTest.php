<?php

namespace Tests\Unit;

use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\ElectricityProfile;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Anomalies\AnomalyService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AnomalyServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Business $business;
    private AnomalyService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->business = Business::create([
            'user_id' => $this->user->id,
            'name' => 'Test Business',
            'business_type' => 'LAUNDRY',
            'status' => 'ACTIVE',
        ]);

        // Default to PRO_TRIAL to unlock detailed analysis/history by default
        Subscription::create([
            'user_id' => $this->user->id,
            'plan' => 'PRO_TRIAL',
            'status' => 'ACTIVE',
            'trial_ends_at' => Carbon::now()->addDays(30),
        ]);

        $this->service = $this->app->make(AnomalyService::class);
    }

    /**
     * 1. Test: No Data
     */
    public function test_no_data_returns_has_data_false(): void
    {
        $result = $this->service->analyze($this->business, '2026-07');

        $this->assertFalse($result['has_data']);
        $this->assertEquals(AnomalyService::STATUS_NORMAL, $result['current_status']);
        $this->assertNull($result['baseline_usage_kwh']);
        $this->assertNull($result['observed_usage_kwh']);
        $this->assertNull($result['difference_kwh']);
        $this->assertNull($result['difference_percent']);
        $this->assertNull($result['estimated_impact_idr']);
        $this->assertEmpty($result['possible_causes']);
        $this->assertEmpty($result['recommended_actions']);
        $this->assertEquals('2026-07', $result['selected_month']);
        $this->assertEmpty($result['history']);

        // Check required wording in missing data message
        $msg = $result['data_requirements']['message'];
        $this->assertStringContainsString('Berdasarkan data input', $msg);
        $this->assertStringContainsString('Pemakaian tercatat', $msg);
        $this->assertStringContainsString('Perlu Verifikasi Manual', $msg);
    }

    /**
     * 2. Test: One Month
     */
    public function test_one_month_returns_no_baseline(): void
    {
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 100.0,
            'tariff_per_kwh' => 1500.0,
        ]);

        $result = $this->service->analyze($this->business, '2026-07');

        $this->assertTrue($result['has_data']);
        $this->assertEquals(AnomalyService::STATUS_NORMAL, $result['current_status']);
        $this->assertNull($result['baseline_usage_kwh']);
        $this->assertEquals(100.0, $result['observed_usage_kwh']);
        $this->assertNull($result['difference_kwh']);
        $this->assertNull($result['difference_percent']);
        $this->assertNull($result['estimated_impact_idr']);
        $this->assertEmpty($result['possible_causes']);
        $this->assertEmpty($result['recommended_actions']);

        // Check required wording in requirements message
        $msg = $result['data_requirements']['message'];
        $this->assertStringContainsString('Berdasarkan data input', $msg);
        $this->assertStringContainsString('Pemakaian tercatat', $msg);
        $this->assertStringContainsString('Perlu Verifikasi Manual', $msg);
    }

    /**
     * 3. Test: Normal
     */
    public function test_normal_usage_within_threshold(): void
    {
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 100.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 100.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 105.0, // 5% increase
            'tariff_per_kwh' => 1500.0,
        ]);

        $result = $this->service->analyze($this->business, '2026-07');

        $this->assertTrue($result['has_data']);
        $this->assertEquals(AnomalyService::STATUS_NORMAL, $result['current_status']);
        $this->assertEquals(100.0, $result['baseline_usage_kwh']);
        $this->assertEquals(105.0, $result['observed_usage_kwh']);
        $this->assertEquals(5.0, $result['difference_kwh']);
        $this->assertEquals(5.0, $result['difference_percent']);
        $this->assertEquals(7500.0, $result['estimated_impact_idr']);

        // Verify wording requirements
        $this->assertNotEmpty($result['possible_causes']);
        $this->assertStringContainsString('Pemakaian tercatat', $result['possible_causes'][0]);
        $this->assertStringContainsString('Berdasarkan data input', $result['possible_causes'][0]);

        $this->assertNotEmpty($result['recommended_actions']);
        $this->assertStringContainsString('Berdasarkan data input', $result['recommended_actions'][0]);
    }

    /**
     * 4. Test: Threshold Crossing
     */
    public function test_threshold_crossing_triggers_warning(): void
    {
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 100.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 100.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 115.0, // 15% increase -> triggers Perlu Dicek
            'tariff_per_kwh' => 1500.0,
        ]);

        $result = $this->service->analyze($this->business, '2026-07');

        $this->assertTrue($result['has_data']);
        $this->assertEquals(AnomalyService::STATUS_WARNING, $result['current_status']);
        $this->assertEquals(15.0, $result['difference_percent']);
        $this->assertEquals(22500.0, $result['estimated_impact_idr']);

        // Verify wording requirements
        $this->assertStringContainsString('Pemakaian tercatat', $result['possible_causes'][0]);
        $this->assertStringContainsString('Kemungkinan penyebab yang perlu dicek', $result['possible_causes'][1]);
        $this->assertStringContainsString('Perlu Verifikasi Manual', $result['possible_causes'][2]);
    }

    /**
     * 5. Test: High Anomaly
     */
    public function test_high_anomaly_triggers_boros(): void
    {
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 100.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 100.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 125.0, // 25% increase -> triggers Boros
            'tariff_per_kwh' => 1500.0,
        ]);

        $result = $this->service->analyze($this->business, '2026-07');

        $this->assertTrue($result['has_data']);
        $this->assertEquals(AnomalyService::STATUS_ANOMALY, $result['current_status']);
        $this->assertEquals(25.0, $result['difference_percent']);

        // Verify wording requirements
        $this->assertStringContainsString('Pemakaian tercatat', $result['possible_causes'][0]);
        $this->assertStringContainsString('Kemungkinan penyebab yang perlu dicek', $result['possible_causes'][1]);
        $this->assertStringContainsString('Perlu Verifikasi Manual', $result['possible_causes'][2]);

        // Verify disclaimer
        $this->assertEquals(AnomalyService::DISCLAIMER, $result['disclaimer']);

        // Verify no forbidden terms
        $allText = implode(' ', array_merge($result['possible_causes'], $result['recommended_actions']));
        $this->assertStringNotContainsString('kebocoran listrik terdeteksi', $allText);
        $this->assertStringNotContainsString('alat rusak', $allText);
        $this->assertStringNotContainsString('alat pasti boros', $allText);
        $this->assertStringNotContainsString('kerusakan alat terdeteksi', $allText);
        $this->assertStringNotContainsString('sensor membaca', $allText);
        $this->assertStringNotContainsString('AI memastikan', $allText);
    }

    /**
     * 6. Test: Decreasing Usage
     */
    public function test_decreasing_usage_is_normal(): void
    {
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 100.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 100.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 80.0, // 20% decrease
            'tariff_per_kwh' => 1500.0,
        ]);

        $result = $this->service->analyze($this->business, '2026-07');

        $this->assertTrue($result['has_data']);
        $this->assertEquals(AnomalyService::STATUS_NORMAL, $result['current_status']);
        $this->assertEquals(-20.0, $result['difference_percent']);
        $this->assertEquals(-30000.0, $result['estimated_impact_idr']);
    }

    /**
     * 7. Test: Zero Baseline
     */
    public function test_zero_baseline_handling(): void
    {
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 0.0,
        ]);

        // Scenario A: Observed is positive (> 0) -> triggers Boros with 100% diff
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 50.0,
            'tariff_per_kwh' => 1500.0,
        ]);

        $result = $this->service->analyze($this->business, '2026-07');
        $this->assertEquals(0.0, $result['baseline_usage_kwh']);
        $this->assertEquals(50.0, $result['difference_kwh']);
        $this->assertEquals(100.0, $result['difference_percent']);
        $this->assertEquals(AnomalyService::STATUS_ANOMALY, $result['current_status']);

        // Scenario B: Observed is also 0 -> Normal status
        $entry = ElectricityEntry::where('business_id', $this->business->id)
            ->whereDate('period_month', '2026-07-01')
            ->first();
        $entry->usage_kwh = 0.0;
        $entry->save();

        $result = $this->service->analyze($this->business, '2026-07');
        $this->assertEquals(AnomalyService::STATUS_NORMAL, $result['current_status']);
        $this->assertEquals(0.0, $result['difference_percent']);
    }

    /**
     * 8. Test: Missing Tariff
     */
    public function test_missing_tariff_returns_null_impact(): void
    {
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 100.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 125.0,
            'tariff_per_kwh' => null,
        ]);

        $result = $this->service->analyze($this->business, '2026-07');
        $this->assertNull($result['estimated_impact_idr']);
    }

    /**
     * 9. Test: Missing kWh
     */
    public function test_missing_kwh_derived_from_bill_and_tariff(): void
    {
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 100.0,
        ]);

        // Missing kWh but bill and tariff are present
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => null,
            'bill_amount_idr' => 180000.00,
            'tariff_per_kwh' => 1500.00, // derived usage = 180000 / 1500 = 120.0 kWh (20% increase)
        ]);

        $result = $this->service->analyze($this->business, '2026-07');

        $this->assertTrue($result['has_data']);
        $this->assertEquals(120.0, $result['observed_usage_kwh']);
        $this->assertEquals(20.0, $result['difference_percent']);
        $this->assertEquals(AnomalyService::STATUS_ANOMALY, $result['current_status']);
    }

    /**
     * 10. Test: Skipped Months
     */
    public function test_skipped_months_calculated_correctly(): void
    {
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-01-01',
            'usage_kwh' => 100.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-04-01', // Feb and Mar skipped
            'usage_kwh' => 120.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01', // May and Jun skipped
            'usage_kwh' => 110.0,
        ]);

        $result = $this->service->analyze($this->business, '2026-07');

        // Baseline is average of 100 and 120 = 110.0
        $this->assertEquals(110.0, $result['baseline_usage_kwh']);
        $this->assertEquals(110.0, $result['observed_usage_kwh']);
        $this->assertEquals(0.0, $result['difference_percent']);
        $this->assertTrue($result['data_requirements']['has_gaps']);
    }

    /**
     * 11. Test: Duplicate Period Behavior
     */
    public function test_duplicate_period_behavior(): void
    {
        $businessMock = \Mockery::mock(Business::class)->makePartial();
        $businessMock->id = 999;
        $businessMock->user = $this->user;

        $entry1 = new ElectricityEntry(['period_month' => '2026-05-01', 'usage_kwh' => 100.0]);
        $entry2 = new ElectricityEntry(['period_month' => '2026-05-01', 'usage_kwh' => 200.0]); // duplicate overrides 100
        $entry3 = new ElectricityEntry(['period_month' => '2026-07-01', 'usage_kwh' => 220.0]);

        $mockRelation = \Mockery::mock(\Illuminate\Database\Eloquent\Relations\HasMany::class);
        $mockRelation->shouldReceive('orderBy')->andReturnSelf();
        $mockRelation->shouldReceive('get')->andReturn(collect([$entry1, $entry2, $entry3]));

        $businessMock->shouldReceive('electricityEntries')->andReturn($mockRelation);
        $businessMock->shouldReceive('getAttribute')->with('electricityProfile')->andReturn(null);

        $result = $this->service->analyze($businessMock, '2026-07');

        // Baseline should only consider 200.0 kwh for 2026-05.
        // Observed is 220.0 kwh. Difference is 20.0 kwh (10% increase -> Perlu Dicek).
        $this->assertEquals(200.0, $result['baseline_usage_kwh']);
        $this->assertEquals(220.0, $result['observed_usage_kwh']);
        $this->assertEquals(10.0, $result['difference_percent']);
        $this->assertEquals(AnomalyService::STATUS_WARNING, $result['current_status']);
    }

    /**
     * 12. Test: Extreme Valid Values
     */
    public function test_extreme_valid_values(): void
    {
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 0.0001,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 9999999.99,
            'tariff_per_kwh' => 9999.99,
        ]);

        $result = $this->service->analyze($this->business, '2026-07');

        $this->assertTrue(is_finite($result['difference_percent']));
        $this->assertTrue(is_finite($result['estimated_impact_idr']));
        $this->assertEquals(AnomalyService::STATUS_ANOMALY, $result['current_status']);
    }

    /**
     * 13. Test: Deterministic Repeatability
     */
    public function test_deterministic_repeatability(): void
    {
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'usage_kwh' => 100.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 110.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 135.0,
            'tariff_per_kwh' => 1500.0,
        ]);

        $result1 = $this->service->analyze($this->business, '2026-07');
        $result2 = $this->service->analyze($this->business, '2026-07');
        $result3 = $this->service->analyze($this->business, '2026-07');

        $this->assertEquals($result1, $result2);
        $this->assertEquals($result2, $result3);
    }
}
