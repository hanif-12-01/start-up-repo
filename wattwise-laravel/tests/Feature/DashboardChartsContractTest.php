<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\BusinessProfile;
use App\Models\ElectricityEntry;
use App\Models\RevenueEntry;
use App\Models\Subscription;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class DashboardChartsContractTest extends TestCase
{
    use RefreshDatabase;

    private function makeBusiness(User $user, string $type = 'KOS_PROPERTY'): Business
    {
        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Demo Kos',
            'business_type' => $type,
            'status' => 'ACTIVE',
        ]);

        BusinessProfile::create([
            'business_id' => $business->id,
            'room_count' => 20,
            'occupied_room_count' => 10,
        ]);

        return $business;
    }

    // ---------------------------------------------------------------------
    // 1. Guest Rejected
    // ---------------------------------------------------------------------
    public function test_guest_is_redirected_from_dashboard(): void
    {
        $this->get(route('dashboard'))->assertRedirect('/login');
    }

    // ---------------------------------------------------------------------
    // 2. Empty Charts Data State
    // ---------------------------------------------------------------------
    public function test_empty_charts_data_when_no_records_exist(): void
    {
        $user = User::factory()->create();
        $this->makeBusiness($user);

        $this->actingAs($user)
            ->get(route('dashboard'))
            ->assertInertia(fn ($page) => $page
                ->where('chartsData.has_data', false)
                ->where('chartsData.months', [])
                ->where('chartsData.next_month_prediction', null)
            );
    }

    // ---------------------------------------------------------------------
    // 3. Zero Revenue & Ratio Gaps (No Division by Zero)
    // ---------------------------------------------------------------------
    public function test_zero_revenue_and_missing_tariff_no_crash(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user);

        // Month 1: usage exists, bill is null, tariff is null (missing tariff)
        ElectricityEntry::create([
            'business_id' => $business->id,
            'period_month' => '2026-01-01',
            'usage_kwh' => 100.0,
            'bill_amount_idr' => null,
            'tariff_per_kwh' => null,
        ]);

        // Revenue is exactly 0
        RevenueEntry::create([
            'business_id' => $business->id,
            'period_month' => '2026-01-01',
            'revenue_amount_idr' => 0.0,
            'revenue_input_mode' => 'EXACT',
        ]);

        $this->actingAs($user)
            ->get(route('dashboard', ['business_id' => $business->id]))
            ->assertInertia(fn ($page) => $page
                ->where('chartsData.has_data', true)
                ->where('chartsData.months.0.usage_kwh', 100)
                ->where('chartsData.months.0.bill_amount_idr', null) // cannot estimate without tariff
                // Ratio is null because bill is null
                ->where('chartsData.months.0.ratio_percent', null)
            );
    }

    // ---------------------------------------------------------------------
    // 4. Occupancy Note Regex Parsing
    // ---------------------------------------------------------------------
    public function test_occupancy_parsed_correctly_from_revenue_notes(): void
    {
        $user = User::factory()->create();
        $business = $this->makeBusiness($user);

        ElectricityEntry::create([
            'business_id' => $business->id,
            'period_month' => '2026-02-01',
            'usage_kwh' => 200.0,
            'bill_amount_idr' => 300000.0,
        ]);

        // Revenue note says "13 kamar terisi"
        RevenueEntry::create([
            'business_id' => $business->id,
            'period_month' => '2026-02-01',
            'revenue_amount_idr' => 10400000.0,
            'notes' => 'Tingkat hunian baik: 13 kamar terisi bulan ini',
        ]);

        $this->actingAs($user)
            ->get(route('dashboard', ['business_id' => $business->id]))
            ->assertInertia(fn ($page) => $page
                ->where('chartsData.has_data', true)
                ->where('chartsData.months.0.occupied_rooms', 13)
                // 13 out of 20 room_count is 65%
                ->where('chartsData.months.0.occupancy_rate_percent', 65)
            );
    }

    // ---------------------------------------------------------------------
    // 5. Next Month Prediction Integration
    // ---------------------------------------------------------------------
    public function test_next_month_prediction_is_present(): void
    {
        $user = User::factory()->create();
        Subscription::create([
            'user_id' => $user->id,
            'plan' => 'PRO_TRIAL',
            'status' => 'ACTIVE',
            'trial_ends_at' => Carbon::now()->addDays(30),
        ]);
        $business = $this->makeBusiness($user);

        // Seed 3 months of electricity entries to trigger standard prediction
        ElectricityEntry::create([
            'business_id' => $business->id,
            'period_month' => '2026-01-01',
            'usage_kwh' => 100.0,
            'tariff_per_kwh' => 1500.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $business->id,
            'period_month' => '2026-02-01',
            'usage_kwh' => 100.0,
            'tariff_per_kwh' => 1500.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $business->id,
            'period_month' => '2026-03-01',
            'usage_kwh' => 100.0,
            'tariff_per_kwh' => 1500.0,
        ]);

        $this->actingAs($user)
            ->get(route('dashboard', ['business_id' => $business->id]))
            ->assertInertia(fn ($page) => $page
                ->where('chartsData.has_data', true)
                // Next month prediction is included
                ->where('chartsData.next_month_prediction.period_month', '2026-04')
                ->has('chartsData.next_month_prediction.usage_kwh')
                ->has('chartsData.next_month_prediction.bill_amount_idr')
            );
    }

    // ---------------------------------------------------------------------
    // 6. Strict Ownership Isolation
    // ---------------------------------------------------------------------
    public function test_ownership_isolation_prevents_viewing_others_charts_data(): void
    {
        $userA = User::factory()->create();
        $businessA = $this->makeBusiness($userA);

        $userB = User::factory()->create();
        $businessB = $this->makeBusiness($userB);

        // Seed entries for Business B
        ElectricityEntry::create([
            'business_id' => $businessB->id,
            'period_month' => '2026-03-01',
            'usage_kwh' => 150.0,
        ]);

        // User A requests Dashboard with Business B's id → falls back to Business A (which has no data)
        $this->actingAs($userA)
            ->get(route('dashboard', ['business_id' => $businessB->id]))
            ->assertInertia(fn ($page) => $page
                ->where('activeBusinessId', $businessA->id)
                ->where('chartsData.has_data', false)
            );
    }
}
