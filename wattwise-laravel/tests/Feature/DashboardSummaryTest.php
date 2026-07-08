<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\RevenueEntry;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class DashboardSummaryTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Business $business;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->business = Business::create([
            'user_id' => $this->user->id,
            'name' => 'Dashboard Test Business',
            'business_type' => 'LAUNDRY',
        ]);
    }

    /**
     * Test dashboard displays the summary metrics for the active business.
     */
    public function test_dashboard_shows_summary_with_entries()
    {
        // Create entries for user's active business
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 200.00,
            'bill_amount_idr' => 300000.00,
        ]);

        RevenueEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'revenue_amount_idr' => 3000000.00,
            'revenue_input_mode' => 'EXACT',
        ]);

        $this->actingAs($this->user);

        $response = $this->get(route('dashboard'));

        $response->assertOk();

        // Assert Inertia variables passed to frontend match calculated results
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('userName', $this->user->name)
            ->where('businessName', 'Dashboard Test Business')
            ->where('electricityCostIdr', '300000.00')
            ->where('usageKwh', '200.00')
            ->where('revenueAmountIdr', '3000000.00')
            ->where('electricityRevenueRatioPercent', 10)
            ->where('remainingRevenueAfterElectricity', 2700000)
            ->where('dataCompleteness', 'COMPLETE')
        );
    }

    /**
     * Test dashboard multi-tenant boundary.
     */
    public function test_dashboard_does_not_leak_another_users_business_data()
    {
        // Create another user and their business/entries
        $otherUser = User::factory()->create();
        $otherBusiness = Business::create([
            'user_id' => $otherUser->id,
            'name' => 'Secret Business',
            'business_type' => 'RETAIL',
        ]);

        ElectricityEntry::create([
            'business_id' => $otherBusiness->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 500.00,
            'bill_amount_idr' => 750000.00,
        ]);

        RevenueEntry::create([
            'business_id' => $otherBusiness->id,
            'period_month' => '2026-07-01',
            'revenue_amount_idr' => 10000000.00,
            'revenue_input_mode' => 'EXACT',
        ]);

        // Login as first user (who only has $this->business with NO entries)
        $this->actingAs($this->user);

        $response = $this->get(route('dashboard'));

        $response->assertOk();

        // Assert dashboard shows empty stats for first user instead of leaking second user's data
        $response->assertInertia(fn (Assert $page) => $page
            ->component('Dashboard')
            ->where('userName', $this->user->name)
            ->where('businessName', 'Dashboard Test Business')
            ->where('electricityCostIdr', null)
            ->where('usageKwh', null)
            ->where('revenueAmountIdr', null)
            ->where('electricityRevenueRatioPercent', null)
            ->where('remainingRevenueAfterElectricity', null)
            ->where('dataCompleteness', 'EMPTY')
        );
    }
}
