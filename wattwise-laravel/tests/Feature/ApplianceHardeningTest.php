<?php

namespace Tests\Feature;

use App\Models\Appliance;
use App\Models\Business;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApplianceHardeningTest extends TestCase
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
            'name' => 'Usaha Saya',
            'business_type' => 'KOS_PROPERTY',
        ]);
    }

    /**
     * Test that appliance template application is restricted to the user's own business.
     */
    public function test_apply_template_validates_business_ownership(): void
    {
        $otherUser = User::factory()->create();
        $otherBusiness = Business::create([
            'user_id' => $otherUser->id,
            'name' => 'Usaha Lain',
            'business_type' => 'LAUNDRY',
        ]);

        $this->actingAs($this->user);

        // Attempting to apply template to another user's business
        $response = $this->post(route('appliances.apply-template'), [
            'business_id' => $otherBusiness->id,
        ]);

        // It should redirect back with validation errors
        $response->assertStatus(302);
        $response->assertSessionHasErrors(['business_id']);

        // Database count for other business should remain zero
        $this->assertEquals(0, $otherBusiness->appliances()->count());
    }

    /**
     * Test that top appliances ranking on dashboard is deterministic.
     */
    public function test_top_appliances_ranking_is_deterministic(): void
    {
        // AC Kamar: 450W, qty 1, 8h, 30 days = 108 kWh
        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'AC Kamar',
            'watt' => 450,
            'quantity' => 1,
            'hours_per_day' => 8,
            'days_per_month' => 30,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        // Rice Cooker: 400W, qty 1, 3h, 30 days = 36 kWh
        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'Rice Cooker',
            'watt' => 400,
            'quantity' => 1,
            'hours_per_day' => 3,
            'days_per_month' => 30,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        // Kipas Angin: 50W, qty 2, 10h, 30 days = 30 kWh
        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'Kipas Angin',
            'watt' => 50,
            'quantity' => 2,
            'hours_per_day' => 10,
            'days_per_month' => 30,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        // Dispenser: 350W, qty 1, 8h, 30 days = 84 kWh
        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'Dispenser',
            'watt' => 350,
            'quantity' => 1,
            'hours_per_day' => 8,
            'days_per_month' => 30,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        $this->actingAs($this->user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();

        $inertiaProps = $response->original->getData()['page']['props'];
        $topAppliances = $inertiaProps['topAppliances'];

        // Should return top 3 appliances:
        // 1. AC Kamar (108 kWh)
        // 2. Dispenser (84 kWh)
        // 3. Rice Cooker (36 kWh)
        $this->assertCount(3, $topAppliances);
        $this->assertEquals('AC Kamar', $topAppliances[0]['name']);
        $this->assertEquals('Dispenser', $topAppliances[1]['name']);
        $this->assertEquals('Rice Cooker', $topAppliances[2]['name']);
    }

    /**
     * Test that top appliances ranking breaks ties alphabetically.
     */
    public function test_top_appliances_ranking_tie_breaker(): void
    {
        // Appliance B: 100W, qty 1, 10h, 30 days = 30 kWh
        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'Appliance B',
            'watt' => 100,
            'quantity' => 1,
            'hours_per_day' => 10,
            'days_per_month' => 30,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        // Appliance A: 100W, qty 1, 10h, 30 days = 30 kWh
        Appliance::create([
            'business_id' => $this->business->id,
            'name' => 'Appliance A',
            'watt' => 100,
            'quantity' => 1,
            'hours_per_day' => 10,
            'days_per_month' => 30,
            'source' => 'MANUAL',
            'confidence' => 'USER_CUSTOM',
        ]);

        $this->actingAs($this->user);

        $response = $this->get(route('dashboard'));
        $response->assertOk();

        $inertiaProps = $response->original->getData()['page']['props'];
        $topAppliances = $inertiaProps['topAppliances'];

        // Should sort alphabetically: Appliance A should be first, then Appliance B
        $this->assertCount(2, $topAppliances);
        $this->assertEquals('Appliance A', $topAppliances[0]['name']);
        $this->assertEquals('Appliance B', $topAppliances[1]['name']);
    }
}
