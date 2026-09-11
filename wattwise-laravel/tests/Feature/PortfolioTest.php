<?php

namespace Tests\Feature;

use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\ElectricityProfile;
use App\Models\RevenueEntry;
use App\Models\User;
use App\Services\Portfolio\PortfolioOverviewService;
use App\Support\DemoAccount;
use Database\Seeders\WattWiseDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Tests\TestCase;

class PortfolioTest extends TestCase
{
    use RefreshDatabase;

    private function createVerifiedUser(): User
    {
        return User::factory()->create([
            'email_verified_at' => now(),
            'initial_plan_selected_at' => now(),
        ]);
    }

    private function createActiveBusiness(User $user, string $name, string $type = 'KOS_PROPERTY', ?float $tariff = 1444.70): Business
    {
        $business = Business::create([
            'user_id' => $user->id,
            'name' => $name,
            'business_type' => $type,
            'city' => 'Purwokerto',
            'province' => 'Jawa Tengah',
            'status' => Business::STATUS_ACTIVE,
            'onboarding_completed_at' => now(),
        ]);

        if ($tariff !== null) {
            ElectricityProfile::create([
                'business_id' => $business->id,
                'customer_type' => 'Bisnis/Rumah Tangga',
                'power_va' => 3500,
                'tariff_per_kwh' => $tariff,
                'payment_method' => 'Pascabayar',
            ]);
        }

        return $business;
    }

    // ==================================================
    // 1. AUTHORIZATION
    // ==================================================

    public function test_unauthenticated_user_cannot_access_portfolio(): void
    {
        $response = $this->get(route('portfolio.index'));

        $response->assertRedirect(route('login'));
    }

    public function test_user_sees_only_own_businesses_and_archived_businesses_are_excluded(): void
    {
        $userA = $this->createVerifiedUser();
        $userB = $this->createVerifiedUser();

        $bizA1 = $this->createActiveBusiness($userA, 'Kos Melati A1');
        $bizA2 = $this->createActiveBusiness($userA, 'Laundry Berkah A2');
        $archivedA = Business::create([
            'user_id' => $userA->id,
            'name' => 'Usaha Tutup A3',
            'business_type' => 'RETAIL',
            'status' => Business::STATUS_ARCHIVED,
            'onboarding_completed_at' => now(),
        ]);

        $bizB1 = $this->createActiveBusiness($userB, 'Usaha Orang Lain B1');
        $bizB2 = $this->createActiveBusiness($userB, 'Usaha Orang Lain B2');

        $response = $this->actingAs($userA)->get(route('portfolio.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('portfolio/Index')
            ->has('portfolio.locations', 2)
            ->where('portfolio.summary.active_business_count', 2)
            ->where('portfolio.locations.0.name', 'Kos Melati A1')
            ->where('portfolio.locations.1.name', 'Laundry Berkah A2')
        );
    }

    // ==================================================
    // 2. BUSINESS COUNT BEHAVIOR
    // ==================================================

    public function test_user_with_zero_businesses_redirects_via_journey_middleware(): void
    {
        $user = $this->createVerifiedUser();

        $response = $this->actingAs($user)->get(route('portfolio.index'));

        // Journey middleware redirects users with 0 businesses to onboarding
        $response->assertRedirect(route('onboarding'));
    }

    public function test_user_with_single_business_safely_redirects_to_dashboard(): void
    {
        $user = $this->createVerifiedUser();
        $this->createActiveBusiness($user, 'Tunggal Jaya Kos');

        $response = $this->actingAs($user)->get(route('portfolio.index'));

        $response->assertRedirect(route('dashboard'));
    }

    public function test_user_with_two_or_more_active_businesses_renders_portfolio(): void
    {
        $user = $this->createVerifiedUser();
        $this->createActiveBusiness($user, 'Cabang Satu');
        $this->createActiveBusiness($user, 'Cabang Dua');

        $response = $this->actingAs($user)->get(route('portfolio.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('portfolio/Index')
            ->has('portfolio')
            ->has('portfolio.summary')
            ->has('portfolio.health')
            ->has('portfolio.locations')
            ->has('portfolio.trend')
        );
    }

    // ==================================================
    // 3. AGGREGATION & COVERAGE
    // ==================================================

    public function test_portfolio_aggregates_same_selected_month_and_does_not_mix_months(): void
    {
        $user = $this->createVerifiedUser();
        $biz1 = $this->createActiveBusiness($user, 'Outlet A');
        $biz2 = $this->createActiveBusiness($user, 'Outlet B');
        $biz3 = $this->createActiveBusiness($user, 'Outlet C');

        // July 2026 data
        ElectricityEntry::create([
            'business_id' => $biz1->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 1000.0,
            'bill_amount_idr' => 1500000.0,
            'tariff_per_kwh' => 1500.0,
        ]);
        RevenueEntry::create([
            'business_id' => $biz1->id,
            'period_month' => '2026-07-01',
            'revenue_amount_idr' => 10000000.0,
        ]);

        ElectricityEntry::create([
            'business_id' => $biz2->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 2000.0,
            'bill_amount_idr' => 3000000.0,
            'tariff_per_kwh' => 1500.0,
        ]);

        // Outlet C has data only in June 2026 (NOT July)
        ElectricityEntry::create([
            'business_id' => $biz3->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 5000.0,
            'bill_amount_idr' => 7500000.0,
            'tariff_per_kwh' => 1500.0,
        ]);

        $response = $this->actingAs($user)->get(route('portfolio.index', ['month' => '2026-07']));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('portfolio/Index')
            ->where('portfolio.selected_month', '2026-07')
            ->where('portfolio.summary.active_business_count', 3)
            ->where('portfolio.summary.businesses_with_electricity_data', 2)
            ->where('portfolio.summary.electricity_coverage_percent', 66.7)
            ->where('portfolio.summary.total_usage_kwh', 3000)
            ->where('portfolio.summary.total_electricity_cost_idr', 4500000)
            ->where('portfolio.summary.businesses_with_revenue_data', 1)
            ->where('portfolio.summary.total_revenue_idr', 10000000)
        );
    }

    public function test_portfolio_calculates_bill_fallback_correctly_when_bill_is_missing(): void
    {
        $user = $this->createVerifiedUser();
        $biz1 = $this->createActiveBusiness($user, 'Cabang A', tariff: 1500.0);
        $biz2 = $this->createActiveBusiness($user, 'Cabang B', tariff: 1500.0);

        // Bill is null, usage is 500 kWh, tariff is 1500 -> Bill fallback = 750,000
        ElectricityEntry::create([
            'business_id' => $biz1->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 500.0,
            'bill_amount_idr' => null,
            'tariff_per_kwh' => null, // falls back to profile tariff 1500
        ]);

        // Second business has normal bill 250,000
        ElectricityEntry::create([
            'business_id' => $biz2->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 100.0,
            'bill_amount_idr' => 250000.0,
            'tariff_per_kwh' => 2500.0,
        ]);

        $response = $this->actingAs($user)->get(route('portfolio.index', ['month' => '2026-07']));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->where('portfolio.summary.total_electricity_cost_idr', 1000000)
            ->where('portfolio.locations.0.cost_idr', 750000)
        );
    }

    public function test_missing_data_is_never_treated_as_zero_consumption(): void
    {
        $user = $this->createVerifiedUser();
        $biz1 = $this->createActiveBusiness($user, 'Outlet Data Lengkap');
        $biz2 = $this->createActiveBusiness($user, 'Outlet Belum Ada Data');

        ElectricityEntry::create([
            'business_id' => $biz1->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 1000.0,
            'bill_amount_idr' => 1500000.0,
        ]);

        $response = $this->actingAs($user)->get(route('portfolio.index', ['month' => '2026-07']));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->where('portfolio.locations.1.name', 'Outlet Belum Ada Data')
            ->where('portfolio.locations.1.usage_kwh', null)
            ->where('portfolio.locations.1.cost_idr', null)
            ->where('portfolio.locations.1.status', PortfolioOverviewService::LABEL_DATA_BELUM_LENGKAP)
        );
    }

    // ==================================================
    // 4. MONTH-OVER-MONTH COMPARISON
    // ==================================================

    public function test_month_over_month_comparison_uses_only_comparable_locations(): void
    {
        $user = $this->createVerifiedUser();
        $biz1 = $this->createActiveBusiness($user, 'Outlet Lengkap 2 Bulan');
        $biz2 = $this->createActiveBusiness($user, 'Outlet Hanya Bulan Terpilih');
        $biz3 = $this->createActiveBusiness($user, 'Outlet Tanpa Data');

        // Biz 1 has both June and July (Cost: 1,000,000 in June -> 1,100,000 in July = +10.0%)
        ElectricityEntry::create([
            'business_id' => $biz1->id,
            'period_month' => '2026-06-01',
            'usage_kwh' => 1000.0,
            'bill_amount_idr' => 1000000.0,
        ]);
        ElectricityEntry::create([
            'business_id' => $biz1->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 1100.0,
            'bill_amount_idr' => 1100000.0,
        ]);

        // Biz 2 has ONLY July data (Cost: 5,000,000)
        ElectricityEntry::create([
            'business_id' => $biz2->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 5000.0,
            'bill_amount_idr' => 5000000.0,
        ]);

        $response = $this->actingAs($user)->get(route('portfolio.index', ['month' => '2026-07']));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->where('portfolio.comparison.comparable_business_count', 1)
            ->where('portfolio.comparison.total_active_businesses', 3)
            ->where('portfolio.comparison.is_partial_comparison', true)
            ->where('portfolio.comparison.electricity_cost_change_percent', 10)
            ->where('portfolio.comparison.usage_change_percent', 10)
            // Total July cost includes both Biz1 and Biz2 = 6,100,000
            ->where('portfolio.summary.total_electricity_cost_idr', 6100000)
        );
    }

    // ==================================================
    // 5. HEALTH CLASSIFICATION & SAFE WORDING
    // ==================================================

    public function test_health_classification_maps_to_safe_wording_and_authoritative_thresholds(): void
    {
        $user = $this->createVerifiedUser();
        $bizAman = $this->createActiveBusiness($user, 'Usaha Aman');
        $bizDicek = $this->createActiveBusiness($user, 'Usaha Perlu Dicek');
        $bizPerhatian = $this->createActiveBusiness($user, 'Usaha Perlu Perhatian');
        $bizKosong = $this->createActiveBusiness($user, 'Usaha Data Kosong');

        // Baseline months (1000 kWh baseline for all three)
        foreach ([$bizAman, $bizDicek, $bizPerhatian] as $biz) {
            ElectricityEntry::create([
                'business_id' => $biz->id,
                'period_month' => '2026-05-01',
                'usage_kwh' => 1000.0,
                'bill_amount_idr' => 1500000.0,
                'tariff_per_kwh' => 1500.0,
            ]);
            ElectricityEntry::create([
                'business_id' => $biz->id,
                'period_month' => '2026-06-01',
                'usage_kwh' => 1000.0,
                'bill_amount_idr' => 1500000.0,
                'tariff_per_kwh' => 1500.0,
            ]);
        }

        // Current month (July 2026)
        // BizAman: 1020 kWh (+2.0% -> Aman, threshold < 10%)
        ElectricityEntry::create([
            'business_id' => $bizAman->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 1020.0,
            'bill_amount_idr' => 1530000.0,
            'tariff_per_kwh' => 1500.0,
        ]);

        // BizDicek: 1140 kWh (+14.0% -> Perlu Dicek, threshold 10% to < 20%)
        ElectricityEntry::create([
            'business_id' => $bizDicek->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 1140.0,
            'bill_amount_idr' => 1710000.0,
            'tariff_per_kwh' => 1500.0,
        ]);

        // BizPerhatian: 1250 kWh (+25.0% -> Perlu Perhatian, threshold >= 20%)
        ElectricityEntry::create([
            'business_id' => $bizPerhatian->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 1250.0,
            'bill_amount_idr' => 1875000.0,
            'tariff_per_kwh' => 1500.0,
        ]);

        $response = $this->actingAs($user)->get(route('portfolio.index', ['month' => '2026-07']));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->where('portfolio.health.safe_count', 1)
            ->where('portfolio.health.check_count', 1)
            ->where('portfolio.health.attention_count', 1)
            ->where('portfolio.health.incomplete_count', 1)
        );
    }

    // ==================================================
    // 6. ATTENTION ITEMS (EXCEPTIONS)
    // ==================================================

    public function test_attention_items_priority_ordering_and_max_five_cards(): void
    {
        $user = $this->createVerifiedUser();

        // Create 7 businesses: 1 normal, 2 perlu perhatian, 2 perlu dicek, 2 data belum lengkap
        $businesses = [];
        for ($i = 1; $i <= 7; $i++) {
            $businesses[$i] = $this->createActiveBusiness($user, "Lokasi $i");
            // Baseline 1000 kWh
            ElectricityEntry::create([
                'business_id' => $businesses[$i]->id,
                'period_month' => '2026-06-01',
                'usage_kwh' => 1000.0,
                'bill_amount_idr' => 1500000.0,
                'tariff_per_kwh' => 1500.0,
            ]);
        }

        // Lokasi 1: Normal (1010 kWh) -> should be excluded from attention
        ElectricityEntry::create([
            'business_id' => $businesses[1]->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 1010.0,
            'bill_amount_idr' => 1515000.0,
            'tariff_per_kwh' => 1500.0,
        ]);

        // Lokasi 2: Perlu Perhatian (+35%)
        ElectricityEntry::create([
            'business_id' => $businesses[2]->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 1350.0,
            'bill_amount_idr' => 2025000.0,
            'tariff_per_kwh' => 1500.0,
        ]);

        // Lokasi 3: Perlu Perhatian (+22%)
        ElectricityEntry::create([
            'business_id' => $businesses[3]->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 1220.0,
            'bill_amount_idr' => 1830000.0,
            'tariff_per_kwh' => 1500.0,
        ]);

        // Lokasi 4: Perlu Dicek (+18%)
        ElectricityEntry::create([
            'business_id' => $businesses[4]->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 1180.0,
            'bill_amount_idr' => 1770000.0,
            'tariff_per_kwh' => 1500.0,
        ]);

        // Lokasi 5: Perlu Dicek (+12%)
        ElectricityEntry::create([
            'business_id' => $businesses[5]->id,
            'period_month' => '2026-07-01',
            'usage_kwh' => 1120.0,
            'bill_amount_idr' => 1680000.0,
            'tariff_per_kwh' => 1500.0,
        ]);

        // Lokasi 6 & 7: No July data (Data Belum Lengkap)

        $response = $this->actingAs($user)->get(route('portfolio.index', ['month' => '2026-07']));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            // Capped at 5 items
            ->has('portfolio.attention_items', 5)
            // Priority 1: Perlu Perhatian (Lokasi 2 with +35%, Lokasi 3 with +22%)
            ->where('portfolio.attention_items.0.business_name', 'Lokasi 2')
            ->where('portfolio.attention_items.0.status', PortfolioOverviewService::LABEL_PERLU_PERHATIAN)
            ->where('portfolio.attention_items.1.business_name', 'Lokasi 3')
            ->where('portfolio.attention_items.1.status', PortfolioOverviewService::LABEL_PERLU_PERHATIAN)
            // Priority 2: Perlu Dicek (Lokasi 4 with +18%, Lokasi 5 with +12%)
            ->where('portfolio.attention_items.2.business_name', 'Lokasi 4')
            ->where('portfolio.attention_items.2.status', PortfolioOverviewService::LABEL_PERLU_DICEK)
            ->where('portfolio.attention_items.3.business_name', 'Lokasi 5')
            ->where('portfolio.attention_items.3.status', PortfolioOverviewService::LABEL_PERLU_DICEK)
            // Priority 3: Data Belum Lengkap (5th item)
            ->where('portfolio.attention_items.4.status', PortfolioOverviewService::LABEL_DATA_BELUM_LENGKAP)
        );
    }

    // ==================================================
    // 7. DRILL-DOWN FLOW
    // ==================================================

    public function test_drill_down_selects_active_business_and_redirects_to_dashboard(): void
    {
        $user = $this->createVerifiedUser();
        $biz1 = $this->createActiveBusiness($user, 'Cabang Jakarta');
        $biz2 = $this->createActiveBusiness($user, 'Cabang Surabaya');

        $response = $this->actingAs($user)->post(route('businesses.select'), [
            'business_id' => $biz2->id,
            'redirect_to' => '/dashboard',
        ]);

        $response->assertRedirect('/dashboard');
        $this->assertEquals($biz2->id, session('active_business_id'));
    }

    public function test_user_cannot_select_another_users_business_during_drill_down(): void
    {
        $userA = $this->createVerifiedUser();
        $userB = $this->createVerifiedUser();

        $bizA1 = $this->createActiveBusiness($userA, 'Milik User A 1');
        $bizA2 = $this->createActiveBusiness($userA, 'Milik User A 2');
        $bizB = $this->createActiveBusiness($userB, 'Milik User B');

        $response = $this->actingAs($userA)->post(route('businesses.select'), [
            'business_id' => $bizB->id,
            'redirect_to' => '/dashboard',
        ]);

        $response->assertSessionHasErrors('business_selection');
        $this->assertNotEquals($bizB->id, session('active_business_id'));
    }

    // ==================================================
    // 8. PERFORMANCE / QUERY COUNT REGRESSION
    // ==================================================

    public function test_portfolio_query_count_does_not_explode_with_many_businesses(): void
    {
        $user = $this->createVerifiedUser();

        // Create 20 businesses with data
        for ($i = 1; $i <= 20; $i++) {
            $b = $this->createActiveBusiness($user, "Outlet $i");
            ElectricityEntry::create([
                'business_id' => $b->id,
                'period_month' => '2026-07-01',
                'usage_kwh' => 500.0,
                'bill_amount_idr' => 750000.0,
            ]);
            RevenueEntry::create([
                'business_id' => $b->id,
                'period_month' => '2026-07-01',
                'revenue_amount_idr' => 5000000.0,
            ]);
        }

        DB::enableQueryLog();

        $response = $this->actingAs($user)->get(route('portfolio.index', ['month' => '2026-07']));

        $response->assertOk();
        $queryCount = count(DB::getQueryLog());

        // Under 15 queries total for 20 businesses (batch eager loading ensures O(1) query complexity)
        $this->assertLessThan(15, $queryCount, "Portfolio index query count was $queryCount, indicating an N+1 query regression.");
    }

    // ==================================================
    // 9. MULTI-LOCATION DEMO SEEDER EVIDENCE
    // ==================================================

    public function test_seeder_with_portfolio_demo_enabled_creates_four_realistic_locations(): void
    {
        config(['demo.portfolio_demo_enabled' => true]);

        $this->seed(WattWiseDemoSeeder::class);

        $user = User::where('email', DemoAccount::EMAIL)->firstOrFail();
        $businesses = Business::where('user_id', $user->id)->active()->get();

        $this->assertCount(4, $businesses);

        $response = $this->actingAs($user)->get(route('portfolio.index'));

        $response->assertOk();
        $response->assertInertia(fn (Assert $page) => $page
            ->component('portfolio/Index')
            ->where('portfolio.summary.active_business_count', 4)
            ->where('portfolio.health.safe_count', 1)
            ->where('portfolio.health.check_count', 1)
            ->where('portfolio.health.attention_count', 1)
            ->where('portfolio.health.incomplete_count', 1)
        );
    }
}
