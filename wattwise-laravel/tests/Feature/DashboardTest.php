<?php

namespace Tests\Feature;

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

    public function test_authenticated_users_can_visit_the_dashboard()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();
    }

    public function test_dashboard_includes_top_appliances_if_business_exists()
    {
        $user = User::factory()->create();
        $business = \App\Models\Business::create([
            'user_id' => $user->id,
            'name' => 'Kos Melati',
            'business_type' => 'KOS_PROPERTY',
        ]);

        \App\Models\Appliance::create([
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
}
