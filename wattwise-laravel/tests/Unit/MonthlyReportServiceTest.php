<?php

namespace Tests\Unit;

use App\Models\Appliance;
use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\ElectricityProfile;
use App\Models\RevenueEntry;
use App\Models\User;
use App\Services\Reports\MonthlyReportService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MonthlyReportServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Business $business;
    private MonthlyReportService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->business = Business::create([
            'user_id' => $this->user->id,
            'name' => 'Test Business',
            'business_type' => 'LAUNDRY',
        ]);

        $this->service = $this->app->make(MonthlyReportService::class);
    }

    /**
     * Test report generation when no business is provided.
     */
    public function test_returns_no_business_state(): void
    {
        $report = $this->service->generate(null);

        $this->assertNull($report['business']);
        $this->assertEquals('NO_BUSINESS', $report['data_completeness']);
        $this->assertEmpty($report['available_months']);
        $this->assertEquals('MISSING', $report['electricity']['data_status']);
        $this->assertEquals('MISSING', $report['revenue']['data_status']);
        $this->assertNull($report['financial_impact']['electricity_revenue_ratio_percent']);
        $this->assertCount(4, $report['disclaimers']);
    }

    /**
     * Test that invalid selected month dates fallback safely to available or current months.
     */
    public function test_invalid_selected_month_falls_back_safely(): void
    {
        // Fallback to current month when no months are available
        $report1 = $this->service->generate($this->business, 'invalid-date');
        $this->assertEquals(now()->format('Y-m'), $report1['selected_month']);

        // Fallback to latest available month when months exist
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'bill_amount_idr' => 200000.00,
        ]);

        $report2 = $this->service->generate($this->business, '2026-99');
        $this->assertEquals('2026-05', $report2['selected_month']);
    }

    /**
     * Test that available months list is sorted descending.
     */
    public function test_available_months_are_sorted_descending(): void
    {
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'bill_amount_idr' => 200000.00,
        ]);
        RevenueEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'revenue_amount_idr' => 1000000.00,
        ]);
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-06-01',
            'bill_amount_idr' => 150000.00,
        ]);

        $availableMonths = $this->service->getAvailableMonths($this->business);

        $this->assertEquals(['2026-07', '2026-06', '2026-05'], $availableMonths);
    }

    /**
     * Test that selected month electricity data is retrieved correctly.
     */
    public function test_selected_month_electricity_data_is_loaded_correctly(): void
    {
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'bill_amount_idr' => 200000.00,
            'usage_kwh' => 150.00,
            'tariff_per_kwh' => 1500.00,
        ]);

        $report = $this->service->generate($this->business, '2026-05');

        $this->assertEquals('AVAILABLE', $report['electricity']['data_status']);
        $this->assertEquals(150.00, $report['electricity']['usage_kwh']);
        $this->assertEquals(200000.00, $report['electricity']['bill_amount']);
        $this->assertEquals(1500.00, $report['electricity']['tariff_per_kwh']);
    }

    /**
     * Test that selected month revenue data is retrieved correctly.
     */
    public function test_selected_month_revenue_data_is_loaded_correctly(): void
    {
        RevenueEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'revenue_amount_idr' => 5000000.00,
        ]);

        $report = $this->service->generate($this->business, '2026-05');

        $this->assertEquals('AVAILABLE', $report['revenue']['data_status']);
        $this->assertEquals(5000000.00, $report['revenue']['amount']);
    }

    /**
     * Test that financial impact ratio and remaining revenue calculations are correct.
     */
    public function test_financial_impact_is_calculated_correctly(): void
    {
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'bill_amount_idr' => 500000.00,
        ]);
        RevenueEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'revenue_amount_idr' => 5000000.00,
        ]);

        $report = $this->service->generate($this->business, '2026-05');

        $this->assertEquals(10.0, $report['financial_impact']['electricity_revenue_ratio_percent']);
        $this->assertEquals(4500000.00, $report['financial_impact']['remaining_revenue_after_electricity']);
    }

    /**
     * Test that appliance energy estimations and top candidates are included.
     */
    public function test_appliance_candidates_are_included(): void
    {
        ElectricityProfile::create([
            'business_id' => $this->business->id,
            'tariff_per_kwh' => 1500.00,
            'connection_power_va' => 2200,
        ]);

        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'AC',
            'category' => 'cooling',
            'watt' => 500.00,
            'quantity' => 2,
            'hours_per_day' => 8.0,
            'days_per_month' => 30,
        ]);

        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'Kulkas',
            'category' => 'appliances',
            'watt' => 100.00,
            'quantity' => 1,
            'hours_per_day' => 24.0,
            'days_per_month' => 30,
        ]);

        $report = $this->service->generate($this->business, '2026-05');

        $this->assertEquals(2, $report['appliances']['count']);
        $this->assertCount(2, $report['appliances']['top_candidates']);

        $firstCandidate = $report['appliances']['top_candidates'][0];
        $this->assertEquals('AC', $firstCandidate['name']);
        $this->assertEquals(240.0, $firstCandidate['estimated_monthly_kwh']);
        $this->assertEquals(360000.0, $firstCandidate['estimated_monthly_cost']);
        $this->assertContains('Estimasi Simulatif', $firstCandidate['badges']);
        $this->assertContains('Berdasarkan data input', $firstCandidate['badges']);
        $this->assertContains('Perlu Verifikasi Manual', $firstCandidate['badges']);
    }

    /**
     * Test recommendations are fetched and limited.
     */
    public function test_recommendations_are_included(): void
    {
        $report = $this->service->generate($this->business, '2026-05');

        $this->assertNotEmpty($report['recommendations']);
        $this->assertLessThanOrEqual(5, count($report['recommendations']));
    }

    /**
     * Test that efficiency score metadata is present.
     */
    public function test_efficiency_score_is_included(): void
    {
        $report = $this->service->generate($this->business, '2026-05');

        $this->assertArrayHasKey('score', $report['efficiency_score']);
        $this->assertArrayHasKey('label', $report['efficiency_score']);
        $this->assertArrayHasKey('status', $report['efficiency_score']);
    }

    /**
     * Test that different states of completeness are resolved correctly.
     */
    public function test_missing_data_states_are_handled(): void
    {
        // 1. COMPLETE State
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'bill_amount_idr' => 200000.00,
        ]);
        RevenueEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'revenue_amount_idr' => 1000000.00,
        ]);
        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'AC',
            'category' => 'cooling',
            'watt' => 500.00,
            'quantity' => 1,
            'hours_per_day' => 8.0,
            'days_per_month' => 30,
        ]);

        $report1 = $this->service->generate($this->business, '2026-05');
        $this->assertEquals('COMPLETE', $report1['data_completeness']);

        // 2. NO_ELECTRICITY State
        $this->business->electricityEntries()->delete();
        $report2 = $this->service->generate($this->business, '2026-05');
        $this->assertEquals('NO_ELECTRICITY', $report2['data_completeness']);

        // 3. NO_REVENUE State
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'bill_amount_idr' => 200000.00,
        ]);
        $this->business->revenueEntries()->delete();
        $report3 = $this->service->generate($this->business, '2026-05');
        $this->assertEquals('NO_REVENUE', $report3['data_completeness']);

        // 4. NO_APPLIANCES State
        RevenueEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-05-01',
            'revenue_amount_idr' => 1000000.00,
        ]);
        $this->business->appliances()->delete();
        $report4 = $this->service->generate($this->business, '2026-05');
        $this->assertEquals('NO_APPLIANCES', $report4['data_completeness']);

        // 5. PARTIAL State
        $this->business->electricityEntries()->delete();
        $this->business->revenueEntries()->delete();
        $report5 = $this->service->generate($this->business, '2026-05');
        $this->assertEquals('PARTIAL', $report5['data_completeness']);
    }

    /**
     * Test that report for one business does not leak data from another business.
     */
    public function test_report_does_not_leak_another_business_data(): void
    {
        $otherBusiness = Business::create([
            'user_id' => $this->user->id,
            'name' => 'Other Business',
            'business_type' => 'FOOD',
        ]);

        ElectricityEntry::create([
            'business_id' => $otherBusiness->id,
            'period_month' => '2026-05-01',
            'bill_amount_idr' => 999999.00,
        ]);

        $report = $this->service->generate($this->business, '2026-05');

        $this->assertEquals('MISSING', $report['electricity']['data_status']);
        $this->assertNull($report['electricity']['bill_amount']);
    }
}
