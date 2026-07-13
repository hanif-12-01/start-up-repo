<?php

namespace Tests\Feature;

use App\Models\Appliance;
use App\Models\Business;
use App\Models\BusinessProfile;
use App\Models\ElectricityEntry;
use App\Models\ElectricityProfile;
use App\Models\RevenueEntry;
use App\Models\Subscription;
use App\Models\User;
use App\Services\Recommendations\RecommendationService;
use App\Services\Reports\MonthlyReportService;
use Carbon\Carbon;
use Database\Seeders\WattWiseDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WattWiseDemoSeederTest extends TestCase
{
    use RefreshDatabase;

    private const DEMO_EMAIL = 'demo@wattwise.local';
    private const DEMO_BUSINESS_NAME = 'Kos Melati Purwokerto';

    protected function setUp(): void
    {
        parent::setUp();
        // Set test now to a fixed deterministic date
        Carbon::setTestNow('2026-07-09 12:00:00');
    }

    protected function tearDown(): void
    {
        // Clear Carbon test now
        Carbon::setTestNow();
        parent::tearDown();
    }

    /**
     * Helper: run the demo seeder once.
     */
    private function runSeeder(): void
    {
        $this->seed(WattWiseDemoSeeder::class);
    }

    /**
     * 1. Seeder creates demo user with email demo@wattwise.local.
     */
    public function test_seeder_creates_demo_user(): void
    {
        $this->runSeeder();

        $user = User::where('email', self::DEMO_EMAIL)->first();

        $this->assertNotNull($user);
        $this->assertEquals('Demo WattWise', $user->name);
    }

    /**
     * 2. Seeder creates exactly one demo business named Kos Melati Purwokerto.
     */
    public function test_seeder_creates_one_demo_business(): void
    {
        $this->runSeeder();

        $user = User::where('email', self::DEMO_EMAIL)->first();
        $businesses = Business::where('user_id', $user->id)->get();

        $this->assertCount(1, $businesses);
        $this->assertEquals(self::DEMO_BUSINESS_NAME, $businesses->first()->name);
        $this->assertEquals('KOS_PROPERTY', $businesses->first()->business_type);
        $this->assertEquals('Purwokerto', $businesses->first()->city);
    }

    /**
     * 3. Seeder creates at least 6 electricity entries for demo business.
     */
    public function test_seeder_creates_at_least_6_electricity_entries(): void
    {
        $this->runSeeder();

        $business = $this->getDemoBusiness();
        $entries = ElectricityEntry::where('business_id', $business->id)->get();

        $this->assertGreaterThanOrEqual(6, $entries->count());

        // Verify all entries have required fields
        foreach ($entries as $entry) {
            $this->assertNotNull($entry->usage_kwh);
            $this->assertNotNull($entry->tariff_per_kwh);
            $this->assertNotNull($entry->bill_amount_idr);
            $this->assertNotNull($entry->period_month);
        }
    }

    /**
     * 4. Seeder creates at least 6 revenue entries for demo business.
     */
    public function test_seeder_creates_at_least_6_revenue_entries(): void
    {
        $this->runSeeder();

        $business = $this->getDemoBusiness();
        $entries = RevenueEntry::where('business_id', $business->id)->get();

        $this->assertGreaterThanOrEqual(6, $entries->count());

        // Verify all entries have required fields
        foreach ($entries as $entry) {
            $this->assertNotNull($entry->revenue_amount_idr);
            $this->assertNotNull($entry->period_month);
        }
    }

    /**
     * Verify that the seeded months are exactly 2026-02 through 2026-07 when test time is 2026-07-09.
     * Also prove the latest demo electricity/revenue month equals now()->startOfMonth().
     */
    public function test_seeder_creates_expected_months_ending_at_current_month(): void
    {
        $this->runSeeder();

        $business = $this->getDemoBusiness();

        $electricityMonths = ElectricityEntry::where('business_id', $business->id)
            ->orderBy('period_month', 'asc')
            ->pluck('period_month')
            ->map(fn($date) => Carbon::parse($date)->format('Y-m'))
            ->toArray();

        $revenueMonths = RevenueEntry::where('business_id', $business->id)
            ->orderBy('period_month', 'asc')
            ->pluck('period_month')
            ->map(fn($date) => Carbon::parse($date)->format('Y-m'))
            ->toArray();

        $expectedMonths = [
            '2026-02',
            '2026-03',
            '2026-04',
            '2026-05',
            '2026-06',
            '2026-07',
        ];

        $this->assertEquals($expectedMonths, $electricityMonths);
        $this->assertEquals($expectedMonths, $revenueMonths);

        // Prove latest month equals now()->startOfMonth()
        $latestElectricityMonth = Carbon::parse(
            ElectricityEntry::where('business_id', $business->id)->max('period_month')
        )->startOfMonth();

        $latestRevenueMonth = Carbon::parse(
            RevenueEntry::where('business_id', $business->id)->max('period_month')
        )->startOfMonth();

        $expectedLatest = Carbon::now()->startOfMonth();

        $this->assertTrue($expectedLatest->equalTo($latestElectricityMonth));
        $this->assertTrue($expectedLatest->equalTo($latestRevenueMonth));
    }

    /**
     * 5. Seeder creates at least 10 appliances for demo business.
     */
    public function test_seeder_creates_at_least_10_appliances(): void
    {
        $this->runSeeder();

        $business = $this->getDemoBusiness();
        $appliances = Appliance::where('business_id', $business->id)->get();

        $this->assertGreaterThanOrEqual(10, $appliances->count());

        // Verify expected appliance names
        $names = $appliances->pluck('name')->toArray();
        $expectedNames = [
            'AC kamar',
            'Kipas angin',
            'Lampu kamar',
            'Lampu koridor',
            'Pompa air',
            'Dispenser',
            'Kulkas',
            'Router WiFi',
            'CCTV',
            'Mesin cuci bersama',
        ];

        foreach ($expectedNames as $expectedName) {
            $this->assertContains($expectedName, $names, "Appliance '$expectedName' not found in demo data");
        }

        // Verify all appliances have required fields
        foreach ($appliances as $appliance) {
            $this->assertNotNull($appliance->watt);
            $this->assertNotNull($appliance->hours_per_day);
            $this->assertNotNull($appliance->days_per_month);
            $this->assertNotNull($appliance->category);
        }
    }

    /**
     * 6. Seeder creates an active PRO_TRIAL subscription for demo user.
     */
    public function test_seeder_creates_pro_trial_subscription(): void
    {
        $this->runSeeder();

        $user = User::where('email', self::DEMO_EMAIL)->first();
        $subscription = Subscription::where('user_id', $user->id)->first();

        $this->assertNotNull($subscription);
        $this->assertEquals('PRO_TRIAL', $subscription->plan);
        $this->assertEquals('ACTIVE', $subscription->status);
        $this->assertNotNull($subscription->trial_ends_at);
        $this->assertTrue($subscription->trial_ends_at->isFuture());
    }

    /**
     * 7. Running seeder twice does not duplicate demo data.
     */
    public function test_seeder_is_idempotent(): void
    {
        // Run twice
        $this->runSeeder();
        $this->runSeeder();

        $user = User::where('email', self::DEMO_EMAIL)->first();
        $business = $this->getDemoBusiness();

        // Exactly 1 user with demo email
        $this->assertEquals(1, User::where('email', self::DEMO_EMAIL)->count());

        // Exactly 1 business
        $this->assertEquals(1, Business::where('user_id', $user->id)->count());

        // Exactly 1 subscription
        $this->assertEquals(1, Subscription::where('user_id', $user->id)->count());

        // Exactly 6 electricity entries (not 12)
        $this->assertEquals(6, ElectricityEntry::where('business_id', $business->id)->count());

        // Exactly 6 revenue entries (not 12)
        $this->assertEquals(6, RevenueEntry::where('business_id', $business->id)->count());

        // Exactly 10 appliances (not 20)
        $this->assertEquals(10, Appliance::where('business_id', $business->id)->count());
    }

    /**
     * 8. MonthlyReportService can generate a report for a seeded month.
     * Also verifies generating a report for now()->format('Y-m') from seeded data.
     */
    public function test_monthly_report_service_generates_report_from_demo_data(): void
    {
        $this->runSeeder();

        $business = $this->getDemoBusiness();
        $service = app(MonthlyReportService::class);

        // Generate report for a month in the middle of seeded data (e.g. 2026-06)
        $report = $service->generate($business, '2026-06');

        $this->assertNotNull($report);
        $this->assertEquals('2026-06', $report['selected_month']);

        // Verify electricity data is populated
        $this->assertNotNull($report['electricity']['usage_kwh']);
        $this->assertEquals('AVAILABLE', $report['electricity']['data_status']);

        // Verify revenue data is populated
        $this->assertNotNull($report['revenue']['amount']);
        $this->assertEquals('AVAILABLE', $report['revenue']['data_status']);

        // Verify financial impact is calculated
        $this->assertNotNull($report['financial_impact']['electricity_revenue_ratio_percent']);
        $this->assertNotNull($report['financial_impact']['remaining_revenue_after_electricity']);

        // Verify appliances are listed
        $this->assertGreaterThan(0, $report['appliances']['count']);

        // Verify recommendations are included
        $this->assertIsArray($report['recommendations']);

        // Verify disclaimers are included
        $this->assertNotEmpty($report['disclaimers']);

        // Verify available months includes multiple seeded months
        $this->assertGreaterThanOrEqual(6, count($report['available_months']));

        // Verify generating a report for now()->format('Y-m') (2026-07)
        $currentMonth = Carbon::now()->format('Y-m');
        $currentReport = $service->generate($business, $currentMonth);
        $this->assertNotNull($currentReport);
        $this->assertEquals($currentMonth, $currentReport['selected_month']);
        $this->assertEquals('AVAILABLE', $currentReport['electricity']['data_status']);
        $this->assertEquals('AVAILABLE', $currentReport['revenue']['data_status']);
    }

    /**
     * 9. RecommendationService returns at least one recommendation from demo data.
     */
    public function test_recommendation_service_returns_recommendations_from_demo_data(): void
    {
        $this->runSeeder();

        $business = $this->getDemoBusiness();
        $service = app(RecommendationService::class);

        $recommendations = $service->getRecommendationsForBusiness($business);

        $this->assertIsArray($recommendations);
        $this->assertGreaterThanOrEqual(1, count($recommendations));
    }

    /**
     * 10. Seeder does not create data for other users.
     */
    public function test_seeder_does_not_affect_other_users(): void
    {
        // Create a pre-existing user
        $existingUser = User::create([
            'name' => 'Existing User',
            'email' => 'existing@example.com',
            'password' => 'password',
        ]);

        $existingBusiness = Business::create([
            'user_id' => $existingUser->id,
            'name' => 'Existing Business',
            'business_type' => 'FNB',
            'status' => 'ACTIVE',
        ]);

        $this->runSeeder();

        // Existing user should still exist and be unchanged
        $existingUser->refresh();
        $this->assertEquals('Existing User', $existingUser->name);
        $this->assertEquals('existing@example.com', $existingUser->email);

        // Existing business should still exist
        $this->assertTrue(Business::where('id', $existingBusiness->id)->exists());

        // Existing business should not have demo appliances
        $this->assertEquals(0, Appliance::where('business_id', $existingBusiness->id)->count());

        // Total users = 2 (demo + existing)
        $this->assertEquals(2, User::count());
    }

    /**
     * Helper to get the demo business.
     */
    private function getDemoBusiness(): Business
    {
        $user = User::where('email', self::DEMO_EMAIL)->firstOrFail();
        return Business::where('user_id', $user->id)
            ->where('name', self::DEMO_BUSINESS_NAME)
            ->firstOrFail();
    }

    public function test_seeder_sets_initial_plan_selected_at(): void
    {
        $this->runSeeder();

        $user = User::where('email', self::DEMO_EMAIL)->firstOrFail();
        $this->assertNotNull($user->initial_plan_selected_at);
    }

    public function test_database_seeder_does_not_automatically_seed_demo_data_in_production_or_staging(): void
    {
        $this->app->detectEnvironment(fn () => 'production');

        $this->artisan('db:seed', ['--force' => true]);

        $this->assertDatabaseMissing('users', ['email' => self::DEMO_EMAIL]);
    }
}
