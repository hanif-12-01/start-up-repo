<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OnboardingTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test guests are redirected from onboarding GET.
     */
    public function test_guests_are_redirected_to_the_login_page_from_onboarding()
    {
        $response = $this->get(route('onboarding'));
        $response->assertRedirect(route('login'));
    }

    /**
     * Test guests cannot submit onboarding POST.
     */
    public function test_guests_cannot_submit_onboarding()
    {
        $response = $this->post(route('onboarding.store'), [
            'name' => 'Usaha Baru',
            'business_type' => 'LAUNDRY',
        ]);
        $response->assertRedirect(route('login'));
    }

    /**
     * Test authenticated users can visit onboarding.
     */
    public function test_authenticated_users_can_visit_onboarding()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->get(route('onboarding'));
        $response->assertOk();
    }

    /**
     * Test user can submit valid onboarding data.
     */
    public function test_authenticated_users_can_submit_onboarding_successfully()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post(route('onboarding.store'), [
            'name' => 'Laundry Bersih Jaya',
            'business_type' => 'LAUNDRY',
            'city' => 'Bandung',
            'province' => 'Jawa Barat',
            'address' => 'Jl. Kebangsaan No. 45',
            'customer_type' => 'R1',
            'power_va' => 2200,
            'tariff_per_kwh' => 1444.70,
            'payment_method' => 'PRABAYAR',
            'operating_days_per_month' => 30,
        ]);

        $response->assertRedirect(route('dashboard'));
        $response->assertSessionHas('success');

        // Assert database records exist
        $this->assertDatabaseHas('businesses', [
            'user_id' => $user->id,
            'name' => 'Laundry Bersih Jaya',
            'business_type' => 'LAUNDRY',
        ]);

        $business = $user->businesses()->first();
        $this->assertNotNull($business->onboarding_completed_at);

        $this->assertDatabaseHas('business_profiles', [
            'business_id' => $business->id,
            'operating_days_per_month' => 30,
        ]);

        $this->assertDatabaseHas('electricity_profiles', [
            'business_id' => $business->id,
            'power_va' => 2200,
            'tariff_per_kwh' => 1444.70,
        ]);
    }

    /**
     * Test onboarding validation errors.
     */
    public function test_onboarding_fails_with_validation_errors()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        // Missing required fields
        $response = $this->post(route('onboarding.store'), [
            'name' => '',
            'business_type' => 'INVALID_TYPE',
        ]);

        $response->assertSessionHasErrors(['name', 'business_type']);
    }

    /**
     * Test onboarding validation lte:room_count error.
     */
    public function test_onboarding_fails_when_occupied_rooms_greater_than_total_rooms()
    {
        $user = User::factory()->create();
        $this->actingAs($user);

        $response = $this->post(route('onboarding.store'), [
            'name' => 'Kost Asri',
            'business_type' => 'KOS_PROPERTY',
            'room_count' => 10,
            'occupied_room_count' => 12, // invalid: occupied > total
        ]);

        $response->assertSessionHasErrors(['occupied_room_count']);
    }
}
