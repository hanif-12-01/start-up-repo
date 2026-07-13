<?php

namespace Tests\Feature;

use App\Models\Appliance;
use App\Models\Business;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_redirected_to_the_login_page()
    {
        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('login'));
    }

    public function test_authenticated_users_without_business_are_redirected_to_journey()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertRedirect(route('getting-started.plan'));
    }

    public function test_authenticated_users_with_business_can_visit_the_dashboard()
    {
        $user = User::factory()->create();
        Business::create([
            'user_id' => $user->id,
            'name' => 'Test Biz',
            'business_type' => 'KOS_PROPERTY',
        ]);
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();
    }

    public function test_dashboard_includes_top_appliances_if_business_exists()
    {
        $user = User::factory()->create();
        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Kos Melati',
            'business_type' => 'KOS_PROPERTY',
        ]);

        Appliance::create([
            'business_id' => $business->id,
            'name' => 'AC kamar',
            'watt' => 350,
            'quantity' => 1,
            'hours_per_day' => 8,
            'days_per_month' => 30,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();

        $inertiaData = $response->original->getData();
        $this->assertArrayHasKey('topAppliances', $inertiaData['page']['props']);
        $this->assertNotEmpty($inertiaData['page']['props']['topAppliances']);
    }

    /**
     * Test dashboard includes efficiencyScore prop.
     */
    public function test_dashboard_includes_efficiency_score_prop(): void
    {
        $user = User::factory()->create();
        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Kos Melati',
            'business_type' => 'KOS_PROPERTY',
        ]);

        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();

        $inertiaData = $response->original->getData();
        $this->assertArrayHasKey('efficiencyScore', $inertiaData['page']['props']);

        // With incomplete data, score is null and status is INCOMPLETE
        $scoreProp = $inertiaData['page']['props']['efficiencyScore'];
        $this->assertNull($scoreProp['score']);
        $this->assertEquals('INCOMPLETE', $scoreProp['status']);
    }

    /**
     * Test dashboard includes topRecommendations prop.
     */
    public function test_dashboard_includes_top_recommendations_prop(): void
    {
        $user = User::factory()->create();
        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Kos Melati',
            'business_type' => 'KOS_PROPERTY',
        ]);

        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();

        $inertiaData = $response->original->getData();
        $this->assertArrayHasKey('topRecommendations', $inertiaData['page']['props']);
        $this->assertIsArray($inertiaData['page']['props']['topRecommendations']);
    }

    /**
     * Test dashboard does not leak another user's recommendation data.
     */
    public function test_dashboard_does_not_leak_another_users_recommendation_data(): void
    {
        // User A
        $userA = User::factory()->create();
        $businessA = Business::create([
            'user_id' => $userA->id,
            'name' => 'Kos Melati',
            'business_type' => 'KOS_PROPERTY',
        ]);

        // User B
        $userB = User::factory()->create();
        $businessB = Business::create([
            'user_id' => $userB->id,
            'name' => 'Secret Laundry',
            'business_type' => 'LAUNDRY',
        ]);

        // Create heavy appliance for User B only
        Appliance::create([
            'business_id' => $businessB->id,
            'name' => 'Mesin Cuci Raksasa',
            'watt' => 2000,
            'quantity' => 1,
            'hours_per_day' => 12,
            'days_per_month' => 30,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        // Acting as User A
        $this->actingAs($userA);

        $response = $this->get(route('dashboard'));
        $response->assertOk();

        $inertiaData = $response->original->getData();
        $recs = $inertiaData['page']['props']['topRecommendations'];

        // User A should not see User B's high consumption appliance recommendations
        $titles = collect($recs)->pluck('title')->implode(' ');
        $this->assertStringNotContainsString('Mesin Cuci Raksasa', $titles);
    }
}
