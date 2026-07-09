<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Business;
use App\Models\Appliance;
use App\Models\Subscription;
use App\Models\ElectricityEntry;
use App\Models\RevenueEntry;
use App\Services\FeatureGateService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class DataIsolationRegressionTest extends TestCase
{
    use RefreshDatabase;

    private FeatureGateService $featureGateService;

    protected function setUp(): void
    {
        parent::setUp();
        $this->featureGateService = $this->app->make(FeatureGateService::class);
    }

    /**
     * Test User A cannot see User B's business name in dashboard, even with query manipulation.
     */
    public function test_user_a_cannot_see_user_b_business_name_in_dashboard(): void
    {
        $userA = User::factory()->create();
        $businessA = Business::create([
            'user_id' => $userA->id,
            'name' => 'Bisnis Kepunyaan A',
            'business_type' => 'LAUNDRY',
        ]);

        $userB = User::factory()->create();
        $businessB = Business::create([
            'user_id' => $userB->id,
            'name' => 'Rahasia Bisnis B',
            'business_type' => 'RETAIL',
        ]);

        $this->actingAs($userA);

        // Standard dashboard load
        $response = $this->get(route('dashboard'));
        $response->assertOk();
        $response->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('businessName', 'Bisnis Kepunyaan A')
        );

        // Attempting to query User B's business ID
        $manipulatedResponse = $this->get(route('dashboard', ['business_id' => $businessB->id]));
        $manipulatedResponse->assertOk();
        $manipulatedResponse->assertInertia(fn ($page) => $page
            ->component('Dashboard')
            ->where('businessName', 'Bisnis Kepunyaan A') // fallback to A's business
        );
    }

    /**
     * Test User A cannot see User B's appliance names/data in reports.
     */
    public function test_user_a_cannot_see_user_b_appliance_name_in_reports(): void
    {
        $userA = User::factory()->create();
        $businessA = Business::create([
            'user_id' => $userA->id,
            'name' => 'Bisnis A',
            'business_type' => 'LAUNDRY',
        ]);
        $applianceA = Appliance::create([
            'business_id' => $businessA->id,
            'name' => 'Setrika Uap A',
            'quantity' => 1,
            'watt' => 1000,
            'hours_per_day' => 4,
            'days_per_month' => 30,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        $userB = User::factory()->create();
        $businessB = Business::create([
            'user_id' => $userB->id,
            'name' => 'Bisnis B',
            'business_type' => 'RETAIL',
        ]);
        $applianceB = Appliance::create([
            'business_id' => $businessB->id,
            'name' => 'AC Panasonic B',
            'quantity' => 1,
            'watt' => 800,
            'hours_per_day' => 8,
            'days_per_month' => 30,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        $this->actingAs($userA);

        $response = $this->get(route('reports.index'));
        $response->assertOk();
        
        $inertiaData = $response->original->getData();
        $topCandidates = $inertiaData['page']['props']['report']['appliances']['top_candidates'] ?? [];
        
        $candidateNames = collect($topCandidates)->pluck('name')->toArray();
        $this->assertContains('Setrika Uap A', $candidateNames);
        $this->assertNotContains('AC Panasonic B', $candidateNames);
    }

    /**
     * Test User A cannot see User B's recommendation data.
     */
    public function test_user_a_cannot_see_user_b_recommendation_data(): void
    {
        $userA = User::factory()->create();
        $businessA = Business::create([
            'user_id' => $userA->id,
            'name' => 'Bisnis A',
            'business_type' => 'LAUNDRY',
        ]);

        $userB = User::factory()->create();
        $businessB = Business::create([
            'user_id' => $userB->id,
            'name' => 'Bisnis B',
            'business_type' => 'FNB',
        ]);

        // Create heavy appliance only for User B
        Appliance::create([
            'business_id' => $businessB->id,
            'name' => 'Kulkas Showcase Jumbo B',
            'quantity' => 1,
            'watt' => 1200,
            'hours_per_day' => 24,
            'days_per_month' => 30,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        $this->actingAs($userA);

        $response = $this->get(route('recommendations.index'));
        $response->assertOk();

        $inertiaData = $response->original->getData();
        $recs = $inertiaData['page']['props']['recommendations'];

        $recsJson = json_encode($recs);
        $this->assertStringNotContainsString('Kulkas Showcase Jumbo B', $recsJson);
    }

    /**
     * Test POST /plans/trial creates/updates trial only for the authenticated user.
     */
    public function test_trial_creation_applies_only_to_authenticated_user(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        $this->actingAs($userA);

        $response = $this->post(route('plans.trial'));
        $response->assertRedirect();
        $response->assertSessionHas('success');

        $userA->refresh();
        $userB->refresh();

        $this->assertNotNull($userA->subscription);
        $this->assertEquals('PRO_TRIAL', $userA->subscription->plan);

        // User B's subscription should still be null or default
        $this->assertNull($userB->subscription);
    }

    /**
     * Test FeatureGateService resolves only from the given user's subscription relation.
     */
    public function test_feature_gate_service_does_not_read_another_users_subscription(): void
    {
        $userA = User::factory()->create();
        $userB = User::factory()->create();

        Subscription::create([
            'user_id' => $userA->id,
            'plan' => 'FREE',
            'status' => 'ACTIVE',
        ]);

        Subscription::create([
            'user_id' => $userB->id,
            'plan' => 'PRO',
            'status' => 'ACTIVE',
        ]);

        $planForA = $this->featureGateService->getEffectivePlan($userA);
        $planForB = $this->featureGateService->getEffectivePlan($userB);

        $this->assertEquals('FREE', $planForA['id']);
        $this->assertEquals('PRO', $planForB['id']);
    }

    /**
     * Test that invalid /reports?month=invalid does not crash and fallbacks.
     */
    public function test_invalid_reports_month_does_not_crash(): void
    {
        $user = User::factory()->create();
        Business::create([
            'user_id' => $user->id,
            'name' => 'Bisnis User',
            'business_type' => 'LAUNDRY',
        ]);

        $this->actingAs($user);

        // Invalid month string format
        $response = $this->get(route('reports.index', ['month' => 'invalid-month-here']));
        $response->assertOk();

        // Out-of-bounds dates
        $response2 = $this->get(route('reports.index', ['month' => '2026-99']));
        $response2->assertOk();
    }
}
