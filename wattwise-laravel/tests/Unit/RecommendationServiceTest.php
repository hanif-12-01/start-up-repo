<?php

namespace Tests\Unit;

use App\Models\Appliance;
use App\Models\Business;
use App\Models\ElectricityEntry;
use App\Models\ElectricityProfile;
use App\Models\RevenueEntry;
use App\Models\User;
use App\Services\Recommendations\RecommendationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecommendationServiceTest extends TestCase
{
    use RefreshDatabase;

    private User $user;
    private Business $business;
    private RecommendationService $service;

    protected function setUp(): void
    {
        parent::setUp();

        $this->user = User::factory()->create();
        $this->business = Business::create([
            'user_id' => $this->user->id,
            'name' => 'Test Business',
            'business_type' => 'LAUNDRY',
        ]);

        $this->service = $this->app->make(RecommendationService::class);
    }

    /**
     * Test service returns missing data recommendations.
     */
    public function test_missing_data_recommendations(): void
    {
        // Fresh business has no entries, no profiles, and no appliances.
        $recommendations = $this->service->getRecommendationsForBusiness($this->business);

        $types = collect($recommendations)->pluck('type')->toArray();

        $this->assertContains('MISSING_ELECTRICITY_DATA', $types);
        $this->assertContains('MISSING_REVENUE_DATA', $types);
        $this->assertContains('MISSING_TARIFF_DATA', $types);
        $this->assertContains('MISSING_APPLIANCE_DATA', $types);
        $this->assertContains('DATA_COMPLETENESS_REMINDER', $types);

        // Assert that the missing electricity data recommendation is HIGH priority.
        $electricityRec = collect($recommendations)->firstWhere('type', 'MISSING_ELECTRICITY_DATA');
        $this->assertEquals('HIGH', $electricityRec['priority']);
    }

    /**
     * Test high electricity/revenue ratio generates high priority recommendation.
     */
    public function test_high_electricity_revenue_ratio_recommendation(): void
    {
        // Ratio = 400k / 1.5M * 100 = 26.7% (> 20%) -> priority HIGH
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'bill_amount_idr' => 400000.00,
        ]);

        RevenueEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'revenue_amount_idr' => 1500000.00,
        ]);

        $recommendations = $this->service->getRecommendationsForBusiness($this->business);
        $ratioRec = collect($recommendations)->firstWhere('type', 'HIGH_ELECTRICITY_REVENUE_RATIO');

        $this->assertNotNull($ratioRec);
        $this->assertEquals('HIGH', $ratioRec['priority']);
        $this->assertStringContainsString('26.7%', $ratioRec['description']);

        // Test with medium ratio: 240k / 1.5M * 100 = 16% (> 15%) -> priority MEDIUM
        $this->business->electricityEntries()->delete();
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'bill_amount_idr' => 240000.00,
        ]);

        $recommendations = $this->service->getRecommendationsForBusiness($this->business);
        $ratioRec = collect($recommendations)->firstWhere('type', 'HIGH_ELECTRICITY_REVENUE_RATIO');
        $this->assertEquals('MEDIUM', $ratioRec['priority']);
    }

    /**
     * Test high appliance contribution generates high contribution appliance recommendation.
     */
    public function test_high_contribution_appliance_recommendation(): void
    {
        ElectricityProfile::create([
            'business_id' => $this->business->id,
            'tariff_per_kwh' => 1500.00,
        ]);

        // Add 2 appliances
        // Kulkas: 150W * 1 * 24h * 30 days = 108 kWh (85.7% contribution)
        // Lampu: 15W * 4 * 6h * 30 days = 10.8 kWh (8.5% contribution)
        // Total: 118.8 kWh. Top (Kulkas) = 108 kWh (> 30%) -> triggers HIGH_CONTRIBUTION_APPLIANCE
        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'Kulkas Besar',
            'watt' => 150.00,
            'quantity' => 1,
            'hours_per_day' => 24.0,
            'days_per_month' => 30,
        ]);

        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'Lampu Toko',
            'watt' => 15.00,
            'quantity' => 4,
            'hours_per_day' => 6.0,
            'days_per_month' => 30,
        ]);

        $recommendations = $this->service->getRecommendationsForBusiness($this->business);
        $contribRec = collect($recommendations)->firstWhere('type', 'HIGH_CONTRIBUTION_APPLIANCE');

        $this->assertNotNull($contribRec);
        // 108 / 118.8 = 90.9% contribution (> 50% -> HIGH priority)
        $this->assertEquals('HIGH', $contribRec['priority']);
        $this->assertStringContainsString('Kulkas Besar', $contribRec['title']);
        $this->assertStringContainsString('90.9%', $contribRec['description']);
    }

    /**
     * Test saving scenario is generated when tariff and appliances exist.
     */
    public function test_saving_scenario_recommendation(): void
    {
        // 1. Profile Tariff (1500 per kWh)
        ElectricityProfile::create([
            'business_id' => $this->business->id,
            'tariff_per_kwh' => 1500.00,
        ]);

        // 2. Appliance: AC (400W, quantity 2, hours 8, days 30)
        // Saving: 400 / 1000 * 2 * 1 * 30 * 1500 = 36000.0 IDR
        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'AC Kantor',
            'watt' => 400.00,
            'quantity' => 2,
            'hours_per_day' => 8.0,
            'days_per_month' => 30,
        ]);

        $recommendations = $this->service->getRecommendationsForBusiness($this->business);
        $savingRec = collect($recommendations)->firstWhere('type', 'SAVING_SCENARIO_REDUCE_USAGE');

        $this->assertNotNull($savingRec);
        $this->assertEquals('MEDIUM', $savingRec['priority']);
        $this->assertStringContainsString('Rp36.000', $savingRec['description']);
        $this->assertEquals(36000.0, $savingRec['estimated_saving_idr']);
    }

    /**
     * Test priority sorting returns HIGH first, then MEDIUM, then LOW.
     */
    public function test_priority_sorting(): void
    {
        // Make sure we have a mix of HIGH, MEDIUM, and LOW recommendations.
        // Let's create high ratio (gives HIGH)
        ElectricityEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'bill_amount_idr' => 400000.00,
            'tariff_per_kwh' => 1500.00,
        ]);
        RevenueEntry::create([
            'business_id' => $this->business->id,
            'period_month' => '2026-07-01',
            'revenue_amount_idr' => 1500000.00, // 26.7% ratio -> HIGH
        ]);

        // Missing appliances (gives MEDIUM)
        // Data completeness reminder (gives LOW)

        $recommendations = $this->service->getRecommendationsForBusiness($this->business);

        // Verify priorities are sorted descending (HIGH -> MEDIUM -> LOW)
        $priorities = collect($recommendations)->pluck('priority')->toArray();

        $expectedSortOrder = true;
        $lastWeight = 3; // HIGH
        $priorityWeight = ['HIGH' => 3, 'MEDIUM' => 2, 'LOW' => 1];

        foreach ($priorities as $p) {
            $weight = $priorityWeight[$p] ?? 0;
            if ($weight > $lastWeight) {
                $expectedSortOrder = false;
                break;
            }
            $lastWeight = $weight;
        }

        $this->assertTrue($expectedSortOrder, 'Recommendations are not correctly sorted by priority');
    }

    /**
     * Test recommendations are isolated to active business and do not leak other user data.
     */
    public function test_recommendation_isolation(): void
    {
        // User B's business
        $otherUser = User::factory()->create();
        $otherBusiness = Business::create([
            'user_id' => $otherUser->id,
            'name' => 'Secret Business',
            'business_type' => 'RETAIL',
        ]);

        // User B has appliances and data
        ElectricityProfile::create([
            'business_id' => $otherBusiness->id,
            'tariff_per_kwh' => 1500.00,
        ]);
        Appliance::create([
            'business_id' => $otherBusiness->id,
            'name' => 'Showcase Cooler',
            'watt' => 350.00,
            'quantity' => 1,
            'hours_per_day' => 24.0,
            'days_per_month' => 30,
        ]);

        // User A (this->business) has NO appliances.
        // If isolation is correct, User A should get MISSING_APPLIANCE_DATA,
        // and should NOT see any recommendations related to "Showcase Cooler".
        $recommendations = $this->service->getRecommendationsForBusiness($this->business);
        $types = collect($recommendations)->pluck('type')->toArray();

        $this->assertContains('MISSING_APPLIANCE_DATA', $types);

        $titles = collect($recommendations)->pluck('title')->implode(' ');
        $this->assertStringNotContainsString('Showcase Cooler', $titles);
    }
}
