<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Business;
use App\Models\Appliance;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccessControlRegressionTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test guest users are redirected from protected GET routes.
     */
    public function test_guest_redirected_from_protected_get_routes(): void
    {
        $routes = [
            'dashboard',
            'onboarding',
            'electricity.index',
            'revenue.index',
            'appliances.index',
            'recommendations.index',
            'reports.index',
            'plans.index',
            'profile.edit',
            'security.edit',
        ];

        foreach ($routes as $route) {
            $response = $this->get(route($route));
            $response->assertRedirect(route('login'));
        }
    }

    /**
     * Test guest users cannot POST to protected mutation routes.
     */
    public function test_guest_redirected_from_protected_mutation_routes(): void
    {
        // Onboarding store
        $this->post(route('onboarding.store'), [])->assertRedirect(route('login'));

        // Electricity store
        $this->post(route('electricity.store'), [])->assertRedirect(route('login'));

        // Revenue store
        $this->post(route('revenue.store'), [])->assertRedirect(route('login'));

        // Appliances store
        $this->post(route('appliances.store'), [])->assertRedirect(route('login'));

        // Apply template
        $this->post(route('appliances.apply-template'), [])->assertRedirect(route('login'));

        // Start trial
        $this->post(route('plans.trial'), [])->assertRedirect(route('login'));

        // Update profile
        $this->patch(route('profile.update'), [])->assertRedirect(route('login'));

        // Delete profile
        $this->delete(route('profile.destroy'), [])->assertRedirect(route('login'));

        // Update password
        $this->put(route('user-password.update'), [])->assertRedirect(route('login'));
    }

    /**
     * Test guest redirected from appliance update and destroy routes.
     */
    public function test_guest_redirected_from_appliance_instance_mutations(): void
    {
        // Create a dummy appliance
        $user = User::factory()->create();
        $business = Business::create([
            'user_id' => $user->id,
            'name' => 'Kos Melati',
            'business_type' => 'KOS_PROPERTY',
        ]);
        $appliance = Appliance::create([
            'business_id' => $business->id,
            'name' => 'Kipas Angin',
            'quantity' => 1,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        $this->put(route('appliances.update', $appliance), [])->assertRedirect(route('login'));
        $this->delete(route('appliances.destroy', $appliance))->assertRedirect(route('login'));
    }
}
